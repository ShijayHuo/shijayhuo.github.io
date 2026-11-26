import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { buildAndSave } from "../src/build-job.ts";
import { createKnowledgeBundle } from "../src/bundle.ts";
import { planEmbeddingBatches } from "../src/embedding-batch.ts";
import { validationChatError, validationProfileError } from "../src/embedding-space.ts";
import { EMBEDDING_SCORE_PROBE, DEFAULT_MIN_SCORE, VALIDATION_CHAT_MODEL } from "../src/limits.ts";
import { hashEmbedding, createMockEmbedding } from "../src/mock-adapter.ts";
import { listPublishedPosts } from "../src/publish.ts";
import { createRecallReport } from "../src/recall-report.ts";
import { decideValidationStart, stopValidationProcess, writePidFile } from "../src/validation-runtime.ts";
import { blogFixture } from "./harness.ts";

test("保守批次最多 10 条，不为 flash 放宽到 20", () => {
  const plans = planEmbeddingBatches(Array.from({ length: 11 }, () => "短句"));
  assert.deepEqual(plans.map((plan) => plan.indexes.length), [10, 1]);
  assert.throws(() => planEmbeddingBatches(["字".repeat(8193)]), /8192/);
  const tight = planEmbeddingBatches(["字".repeat(80), "字".repeat(80)], {
    maxItems: 10,
    maxItemTokens: 8192,
    maxBatchTokens: 100,
  });
  assert.deepEqual(tight.map((plan) => plan.indexes.length), [1, 1]);
});

test("验证配置锁定 flash 1024 与 deepseek 对话，拒绝 v4、512 和 mock", () => {
  const baseURL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
  assert.equal(validationProfileError({
    provider: "openai",
    model: "qwen3.7-text-embedding-flash",
    dimensions: 1024,
    baseURL,
  }), null);
  assert.match(validationProfileError({ provider: "openai", model: "text-embedding-v4", dimensions: 1024, baseURL }) ?? "", /v4/);
  assert.match(validationProfileError({ provider: "mock", model: "mock-embedding-v1", dimensions: 512, baseURL: "" }) ?? "", /mock|哈希/);
  assert.match(validationProfileError({
    provider: "openai",
    model: "qwen3.7-text-embedding-flash",
    dimensions: 512,
    baseURL,
  }) ?? "", /1024/);
  assert.equal(validationChatError({ model: VALIDATION_CHAT_MODEL, baseURL }), null);
  assert.match(validationChatError({ model: "deepseek-v4.1-flash-rerank", baseURL }) ?? "", /rerank|deepseek-v4.1-flash/);
  assert.equal(EMBEDDING_SCORE_PROBE.unrelated > DEFAULT_MIN_SCORE, true);
  assert.equal(EMBEDDING_SCORE_PROBE.related.every((score) => score > EMBEDDING_SCORE_PROBE.unrelated), true);
});

test("构建失败不替换旧知识包，召回报告也不宣布通过", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ask-keep-"));
  const out = path.join(directory, "bundle.json");
  writeFileSync(out, "OLD");
  const embedding = createMockEmbedding();
  embedding.createEmbedding = async () => {
    throw new Error("upstream");
  };
  const documents = listPublishedPosts(blogFixture, new Date("2026-11-25T12:00:00+08:00"));
  await assert.rejects(() => buildAndSave({ documents, embedding, cache: null, out }));
  assert.equal(readFileSync(out, "utf8"), "OLD");

  let caches = 0;
  let calls = 0;
  const batched = createMockEmbedding();
  batched.createEmbeddings = async (inputs) => {
    calls += 1;
    if (calls === 2) throw new Error("第二批失败");
    return inputs.map((text) => hashEmbedding(text, batched.dimensions));
  };
  await assert.rejects(() => createKnowledgeBundle({
    documents: documents.filter((document) => document.slug === "alpha"),
    embedding: batched,
    cache: null,
    batchLimits: { maxItems: 1, maxItemTokens: 8192, maxBatchTokens: 33000 },
    onCache() {
      caches += 1;
    },
  }));
  assert.equal(caches, 1);
  assert.equal(readFileSync(out, "utf8"), "OLD");

  const report = createRecallReport({
    model: "qwen3.7-text-embedding-flash",
    dimensions: 1024,
    results: [],
  });
  assert.equal(report.recallAccepted, false);
  assert.equal(report.thresholdValidated, false);
  assert.equal(report.minScore, 0.25);
});

test("验证进程不绑定保留端口，已有进程时不重启", () => {
  assert.match(decideValidationStart({ port: 8790, profileError: null, pidAlive: false }) ?? "", /不会绑定/);
  assert.match(decideValidationStart({ port: 8791, profileError: null, pidAlive: false }) ?? "", /不会绑定/);
  assert.match(decideValidationStart({ port: 8788, profileError: null, pidAlive: false }) ?? "", /不会绑定/);
  assert.match(decideValidationStart({ port: 18790, profileError: null, pidAlive: false }) ?? "", /不会绑定/);
  assert.match(decideValidationStart({ port: 18791, profileError: null, pidAlive: false }) ?? "", /不会绑定/);
  assert.match(decideValidationStart({ port: 8787, profileError: null, pidAlive: true }) ?? "", /额度文件不会改动/);
  assert.equal(decideValidationStart({ port: 8787, profileError: null, pidAlive: false }), null);
});

test("停止验证进程只结束 pid，不改额度文件", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "ask-stop-"));
  const quotaFile = path.join(directory, "quota.sqlite");
  const pidFile = path.join(directory, "api.pid");
  writeFileSync(quotaFile, "KEEP");
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore" });
  assert.ok(child.pid);
  writePidFile(pidFile, child.pid);
  try {
    const stopped = await stopValidationProcess(pidFile, quotaFile);
    assert.equal(stopped.status, "stopped");
    assert.equal(stopped.quotaUntouched, true);
    assert.equal(readFileSync(quotaFile, "utf8"), "KEEP");
  } finally {
    try {
      child.kill("SIGKILL");
    } catch {
      // 进程已经退出。
    }
  }
});
