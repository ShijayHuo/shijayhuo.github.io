import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildAndSave } from "../src/build-job.ts";
import {
  VALIDATION_EMBEDDING_BASE_URL,
  VALIDATION_EMBEDDING_DIMENSIONS,
  VALIDATION_EMBEDDING_MODEL,
} from "../src/limits.ts";
import { validationProfileError } from "../src/embedding-space.ts";
import { createMockEmbedding } from "../src/mock-adapter.ts";
import { createOpenAIEmbedding } from "../src/openai-adapter.ts";
import { listPublishedPosts } from "../src/publish.ts";
import { redactSecrets, secretValues } from "../src/redact.ts";
import type { EmbeddingCache } from "../src/types.ts";

const backendRoot = path.join(import.meta.dirname, "..");
const repoRoot = path.join(backendRoot, "..");
const generatedModule = path.join(backendRoot, "src/generated/knowledge.ts");
const secrets = secretValues();

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return undefined;
  return process.argv[index + 1];
}

function fail(message: string): never {
  console.error(redactSecrets(message, secrets));
  console.error("已停止，没有替换知识包。");
  process.exit(1);
}

const mock = process.argv.includes("--mock");
const validation = process.argv.includes("--validation");
const writeWorkerModule = process.argv.includes("--write-worker-module");
if (mock && validation) fail("mock 不能用于真实验证构建。");

const root = path.resolve(readFlag("--root") ?? repoRoot);
const defaultOut = mock
  ? path.join(backendRoot, "dist/mock-bundle.json")
  : path.join(backendRoot, "dist/knowledge/bundle.json");
const out = path.resolve(writeWorkerModule ? generatedModule : (readFlag("--out") ?? defaultOut));
const cacheFile = path.resolve(readFlag("--cache") ?? path.join(backendRoot, ".cache/embeddings.json"));

if (mock && (out === generatedModule || writeWorkerModule)) fail("mock 不能写入 Worker 知识模块。");
if (!mock && out === generatedModule && !writeWorkerModule) {
  fail("真实向量不会写入 Worker 模块，除非显式 --write-worker-module。");
}

const embeddingKey = (process.env.EMBEDDING_API_KEY || process.env.BAILIAN_EMBEDDING_API_KEY || "").trim();
const embeddingBase = (process.env.EMBEDDING_BASE_URL || (validation ? VALIDATION_EMBEDDING_BASE_URL : "")).trim();
const embeddingModel = (process.env.EMBEDDING_MODEL || (validation ? VALIDATION_EMBEDDING_MODEL : "")).trim();
const embeddingDimensions = (process.env.EMBEDDING_DIMENSIONS || (validation ? String(VALIDATION_EMBEDDING_DIMENSIONS) : "")).trim();

const embedding = mock
  ? createMockEmbedding()
  : (() => {
    if (!embeddingKey || !embeddingBase || !embeddingModel || !embeddingDimensions) {
      fail("没有真实 embedding 配置，不会用哈希向量冒充。");
    }
    const dimensions = Number(embeddingDimensions);
    if (validation) {
      const profileError = validationProfileError({
        provider: "openai",
        model: embeddingModel,
        dimensions,
        baseURL: embeddingBase,
      });
      if (profileError) fail(profileError);
    }
    return createOpenAIEmbedding({
      apiKey: embeddingKey,
      baseURL: embeddingBase,
      model: embeddingModel,
      dimensions,
    });
  })();

let cache: EmbeddingCache | null = null;
try {
  cache = JSON.parse(readFileSync(cacheFile, "utf8")) as EmbeddingCache;
} catch {
  cache = null;
}

try {
  const summary = await buildAndSave({
    documents: listPublishedPosts(root, new Date()),
    embedding,
    cache,
    out,
    onCache(next) {
      mkdirSync(path.dirname(cacheFile), { recursive: true });
      const temporary = `${cacheFile}.tmp`;
      writeFileSync(temporary, JSON.stringify(next));
      renameSync(temporary, cacheFile);
    },
  });
  console.log(JSON.stringify(summary));
} catch (error) {
  const message = error instanceof Error ? error.message : "构建失败。";
  fail(message);
}
