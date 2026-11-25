import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { test } from "node:test";
import { build } from "esbuild";
import { createKnowledgeBundle } from "../src/bundle.ts";
import { createMockEmbedding } from "../src/mock-adapter.ts";
import { listPublishedPosts } from "../src/publish.ts";
import { repoRoot } from "./harness.ts";

test("Worker 脚本可以打包，包体字节数被记录；CPU 和内存未在 Cloudflare 测量", async () => {
  const result = await build({
    absWorkingDir: path.join(import.meta.dirname, ".."),
    entryPoints: ["src/index.ts"],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    write: false,
    metafile: true,
  });
  const worker = result.outputFiles[0]?.contents ?? new Uint8Array();
  const gzip = gzipSync(worker);
  const inputs = Object.keys(result.metafile?.inputs ?? {});
  assert.equal(inputs.some((file) => file.includes("node:fs") || file.includes("publish.ts")), false);
  assert.ok(worker.byteLength > 0);
  assert.ok(worker.byteLength < 5_000_000);
  const now = new Date("2026-11-25T12:00:00+08:00");
  const documents = listPublishedPosts(repoRoot, now);
  const started = Date.now();
  const built = await createKnowledgeBundle({
    documents,
    embedding: createMockEmbedding(),
    cache: null,
    now,
  });
  const elapsedMs = Date.now() - started;
  const encoded = Buffer.byteLength(JSON.stringify(built.bundle));
  console.log(JSON.stringify({
    workerBytes: worker.byteLength,
    workerGzipBytes: gzip.byteLength,
    publishedDocuments: documents.length,
    mockChunks: built.bundle.chunks.length,
    mockDimensions: built.bundle.manifest.embedding.dimensions,
    mockBundleBytes: encoded,
    localBuildMs: elapsedMs,
    workersCpu: "unmeasured",
    workersMemory: "unmeasured",
    note: "mock 向量只证明打包和过滤，不证明语义召回。float32 体积要等真实维度。",
  }));
});
