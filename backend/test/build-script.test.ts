import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { blogFixture } from "./harness.ts";

const backendRoot = path.join(import.meta.dirname, "..");
const stub = path.join(backendRoot, "src/generated/knowledge.ts");

function cleanEnv(): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH ?? "",
    ASK_ALLOWED_ORIGINS: "https://shijayhuo.github.io",
    ASK_ALLOW_MOCK: "0",
    ASK_ALLOW_DEV_IP: "0",
  };
}

function run(args: string[]) {
  return spawnSync(process.execPath, ["--experimental-strip-types", "scripts/build-knowledge.ts", ...args], {
    cwd: backendRoot,
    env: cleanEnv(),
    encoding: "utf8",
  });
}

test("没有密钥时构建失败，也不会把 mock 写进 Worker 模块", () => {
  const out = path.join(mkdtempSync(path.join(tmpdir(), "ask-build-")), "bundle.json");
  const missing = run(["--root", blogFixture, "--out", out]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /没有替换/);
  const blocked = run(["--mock", "--out", stub, "--root", blogFixture]);
  assert.notEqual(blocked.status, 0);
  assert.match(readFileSync(stub, "utf8"), /bundledKnowledge: KnowledgeBundle \| null = null/);
});

test("验证构建拒绝 v4 和 mock，并且不打印密钥", () => {
  const secret = "sk-box-secret-do-not-print";
  const out = path.join(mkdtempSync(path.join(tmpdir(), "ask-v4-")), "bundle.json");
  const rejected = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/build-knowledge.ts", "--validation", "--root", blogFixture, "--out", out], {
    cwd: backendRoot,
    env: {
      ...cleanEnv(),
      EMBEDDING_API_KEY: secret,
      EMBEDDING_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      EMBEDDING_MODEL: "text-embedding-v4",
      EMBEDDING_DIMENSIONS: "1024",
    } as NodeJS.ProcessEnv,
    encoding: "utf8",
  });
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /text-embedding-v4/);
  assert.equal(`${rejected.stdout}${rejected.stderr}`.includes(secret), false);
  const mockMix = spawnSync(process.execPath, ["--experimental-strip-types", "scripts/build-knowledge.ts", "--validation", "--mock"], {
    cwd: backendRoot,
    env: cleanEnv(),
    encoding: "utf8",
  });
  assert.notEqual(mockMix.status, 0);
  assert.match(mockMix.stderr, /mock/);
});

test("mock 构建能写出可校验的知识包，并声明它不是生产检索", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ask-mock-"));
  const out = path.join(directory, "bundle.json");
  const result = run(["--mock", "--root", blogFixture, "--out", out, "--cache", path.join(directory, "cache.json")]);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "{}") as { provider: string; chunks: number };
  assert.equal(summary.provider, "mock");
  assert.ok(summary.chunks > 0);
  const bundle = JSON.parse(readFileSync(out, "utf8")) as { manifest: { embedding: { provider: string } } };
  assert.equal(bundle.manifest.embedding.provider, "mock");
});
