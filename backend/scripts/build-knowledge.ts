import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createKnowledgeBundle, saveKnowledgeBundle } from "../src/bundle.ts";
import { createMockEmbedding } from "../src/mock-adapter.ts";
import { createOpenAIEmbedding } from "../src/openai-adapter.ts";
import { listPublishedPosts } from "../src/publish.ts";
import { readServiceConfig } from "../src/handler.ts";
import type { EmbeddingCache } from "../src/types.ts";

const backendRoot = path.join(import.meta.dirname, "..");
const repoRoot = path.join(backendRoot, "..");
const generatedModule = path.join(backendRoot, "src/generated/knowledge.ts");

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return undefined;
  return process.argv[index + 1];
}

const mock = process.argv.includes("--mock");
const root = path.resolve(readFlag("--root") ?? repoRoot);
const out = path.resolve(readFlag("--out") ?? (mock ? path.join(backendRoot, "dist/mock-bundle.json") : generatedModule));
const cacheFile = path.resolve(readFlag("--cache") ?? path.join(backendRoot, ".cache/embeddings.json"));

if (mock && path.resolve(out) === path.resolve(generatedModule)) {
  console.error("mock 不能写入 Worker 知识模块。");
  process.exit(1);
}

const embedding = mock
  ? createMockEmbedding()
  : (() => {
    const config = readServiceConfig({
      EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
      EMBEDDING_BASE_URL: process.env.EMBEDDING_BASE_URL,
      EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
      EMBEDDING_DIMENSIONS: process.env.EMBEDDING_DIMENSIONS,
    }, "EMBEDDING");
    if (!config?.dimensions) {
      console.error("缺少 embedding 的 baseURL、model、key 或维度，已停止，没有写入知识包。");
      process.exit(1);
    }
    return createOpenAIEmbedding(config);
  })();

let cache: EmbeddingCache | null = null;
try {
  cache = JSON.parse(readFileSync(cacheFile, "utf8")) as EmbeddingCache;
} catch {
  cache = null;
}

const documents = listPublishedPosts(root, new Date());
const result = await createKnowledgeBundle({
  documents,
  embedding,
  cache,
  onCache(next) {
    mkdirSync(path.dirname(cacheFile), { recursive: true });
    const temporary = `${cacheFile}.tmp`;
    writeFileSync(temporary, JSON.stringify(next));
    renameSync(temporary, cacheFile);
  },
});
await saveKnowledgeBundle(out, result.bundle);
console.log(JSON.stringify({
  documents: result.bundle.manifest.documents.length,
  chunks: result.bundle.manifest.chunkCount,
  embedded: result.embedded,
  reused: result.reused,
  provider: result.bundle.manifest.embedding.provider,
  model: result.bundle.manifest.embedding.model,
  dimensions: result.bundle.manifest.embedding.dimensions,
  knowledgeVersion: result.bundle.manifest.knowledgeVersion,
  out,
}));
