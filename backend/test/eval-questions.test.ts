import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { DEFAULT_MIN_SCORE, EMBEDDING_SCORE_PROBE, VALIDATION_EMBEDDING_MODEL } from "../src/limits.ts";
import { listPublishedPosts } from "../src/publish.ts";
import { repoRoot } from "./harness.ts";

interface EvalFile {
  embedding: { model: string; dimensions: number; baseURL: string };
  minScore: number;
  thresholdValidated: boolean;
  probe: { unrelated: number; related: number[] };
  questions: Array<{ id: string; question: string; expectUrls?: string[]; forbiddenUrls?: string[]; expectRefusal?: boolean }>;
}

test("召回问句来自公开文章的改述，career 不是应命中，阈值未校准", () => {
  const file = JSON.parse(readFileSync(path.join(import.meta.dirname, "../eval/questions.json"), "utf8")) as EvalFile;
  const now = new Date("2026-11-25T12:00:00+08:00");
  const documents = listPublishedPosts(repoRoot, now);
  const urls = new Set(documents.map((document) => document.url));
  const titles = new Map(documents.map((document) => [document.url, document.title]));
  assert.equal(urls.has("/posts/career/"), false);
  assert.equal(file.embedding.model, VALIDATION_EMBEDDING_MODEL);
  assert.equal(file.embedding.dimensions, 1024);
  assert.equal(file.minScore, DEFAULT_MIN_SCORE);
  assert.equal(file.thresholdValidated, false);
  assert.equal(file.probe.unrelated, EMBEDDING_SCORE_PROBE.unrelated);
  assert.equal(file.probe.unrelated > file.minScore, true);
  assert.ok(file.questions.length >= 6);
  for (const item of file.questions) {
    assert.equal((item.expectUrls ?? []).includes("/posts/career/"), false);
    for (const url of item.expectUrls ?? []) {
      assert.equal(urls.has(url), true, url);
      const title = titles.get(url) ?? "";
      assert.equal(item.question.includes(title), false);
    }
    if (item.id === "unpublished-career") {
      assert.equal(item.expectRefusal, true);
      assert.deepEqual(item.forbiddenUrls, ["/posts/career/"]);
      assert.equal(item.expectUrls, undefined);
    }
  }
  const backendRoot = path.join(import.meta.dirname, "..");
  const missing = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/eval-recall.ts"], {
    cwd: backendRoot,
    env: { PATH: process.env.PATH ?? "", ASK_ALLOWED_ORIGINS: "https://shijayhuo.github.io", ASK_ALLOW_MOCK: "0", ASK_ALLOW_DEV_IP: "0" },
    encoding: "utf8",
  });
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /不会用哈希/);
  const lowered = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/eval-recall.ts", "--min-score", "0.1"], {
    cwd: backendRoot,
    env: { PATH: process.env.PATH ?? "", ASK_ALLOWED_ORIGINS: "https://shijayhuo.github.io", ASK_ALLOW_MOCK: "0", ASK_ALLOW_DEV_IP: "0" },
    encoding: "utf8",
  });
  assert.equal(lowered.status, 1);
  assert.match(lowered.stderr, /不能在评测脚本里改阈值/);
});
