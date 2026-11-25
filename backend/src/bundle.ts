import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createChunks } from "./chunk.ts";
import { planEmbeddingBatches, type EmbeddingBatchLimits } from "./embedding-batch.ts";
import { createKnowledgeVersion, sha256Hex, validateVector, verifyKnowledgeBundle } from "./knowledge.ts";
import { CHUNKER_VERSION } from "./limits.ts";
import type { Chunk, EmbeddingAdapter, EmbeddingCache, KnowledgeBundle, PublishedDocument } from "./types.ts";

export async function createEmbeddingConfigHash(embedding: EmbeddingAdapter): Promise<string> {
  return sha256Hex(JSON.stringify({
    provider: embedding.provider,
    model: embedding.model,
    dimensions: embedding.dimensions,
    baseURL: embedding.baseURL,
    encodingFormat: embedding.encodingFormat,
    revision: embedding.revision,
    chunkerVersion: CHUNKER_VERSION,
    inputTemplate: "text",
    queryPrefix: "",
    documentPrefix: "",
    normalization: "cosine",
  }));
}

export async function createKnowledgeBundle(options: {
  documents: PublishedDocument[];
  embedding: EmbeddingAdapter;
  cache: EmbeddingCache | null;
  now?: Date;
  signal?: AbortSignal;
  onCache?: (cache: EmbeddingCache) => void;
  batchLimits?: EmbeddingBatchLimits;
}): Promise<{ bundle: KnowledgeBundle; embedded: number; reused: number; cache: EmbeddingCache }> {
  const configHash = await createEmbeddingConfigHash(options.embedding);
  const entries = options.cache && options.cache.configHash === configHash ? { ...options.cache.entries } : {};
  let embedded = 0;
  let reused = 0;
  const ordered: Array<Chunk | null> = [];
  const pending: Array<{ slot: number; text: string; contentHash: string; chunk: Omit<Chunk, "vector"> }> = [];
  for (const document of options.documents) {
    for (const chunk of await createChunks(document)) {
      const slot = ordered.length;
      ordered.push(null);
      const cached = entries[chunk.contentHash];
      const cachedError = cached ? validateVector(cached, options.embedding.dimensions) : "missing";
      if (cached && !cachedError) {
        ordered[slot] = { ...chunk, vector: cached };
        reused += 1;
        continue;
      }
      pending.push({ slot, text: chunk.text, contentHash: chunk.contentHash, chunk });
    }
  }
  const plans = pending.length > 0 ? planEmbeddingBatches(pending.map((item) => item.text), options.batchLimits) : [];
  for (const plan of plans) {
    const group = plan.indexes.map((index) => pending[index]).filter((item) => item !== undefined);
    if (group.length !== plan.indexes.length) throw new Error("批次不完整，已停止，没有替换知识包。");
    const vectors = options.embedding.createEmbeddings
      ? await options.embedding.createEmbeddings(group.map((item) => item.text), options.signal)
      : await Promise.all(group.map((item) => options.embedding.createEmbedding(item.text, options.signal)));
    if (vectors.length !== group.length) throw new Error("批次条数不一致，已停止，没有替换知识包。");
    for (let index = 0; index < group.length; index += 1) {
      const vector = vectors[index];
      const vectorError = vector ? validateVector(vector, options.embedding.dimensions) : "向量为空。";
      if (vectorError || !vector) throw new Error(vectorError ?? "向量为空。");
      const item = group[index];
      if (!item) throw new Error("批次不完整，已停止，没有替换知识包。");
      entries[item.contentHash] = vector;
      ordered[item.slot] = { ...item.chunk, vector };
      embedded += 1;
    }
    options.onCache?.({ configHash, entries: { ...entries } });
  }
  if (ordered.some((item) => item === null)) throw new Error("知识包不完整，已停止，没有替换知识包。");
  const chunks = ordered as Chunk[];
  const bundle: KnowledgeBundle = {
    manifest: {
      knowledgeVersion: "pending",
      builtAt: (options.now ?? new Date()).toISOString(),
      chunkerVersion: CHUNKER_VERSION,
      embedding: {
        provider: options.embedding.provider,
        model: options.embedding.model,
        dimensions: options.embedding.dimensions,
        revision: options.embedding.revision,
        baseURL: options.embedding.baseURL,
        encodingFormat: options.embedding.encodingFormat,
        inputTemplate: "text",
        queryPrefix: "",
        documentPrefix: "",
        normalization: "cosine",
      },
      documents: options.documents.map((document) => ({
        id: document.url,
        title: document.title,
        url: document.url,
        date: document.date,
        sourcePath: document.sourcePath,
        tags: document.tags,
        categories: document.categories,
        contentHash: document.contentHash,
      })),
      chunkCount: chunks.length,
    },
    chunks,
  };
  bundle.manifest.knowledgeVersion = await createKnowledgeVersion(bundle);
  const errors = await verifyKnowledgeBundle(bundle);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  return { bundle, embedded, reused, cache: { configHash, entries } };
}

export function renderKnowledgeModule(bundle: KnowledgeBundle): string {
  return `import type { KnowledgeBundle } from "../types.ts";\nconst bundle = ${JSON.stringify(bundle)} as KnowledgeBundle;\nexport const bundledKnowledge: KnowledgeBundle | null = bundle;\n`;
}

export async function saveKnowledgeBundle(file: string, bundle: KnowledgeBundle): Promise<void> {
  const errors = await verifyKnowledgeBundle(bundle);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  const body = file.endsWith(".ts") ? renderKnowledgeModule(bundle) : `${JSON.stringify(bundle)}\n`;
  await writeFile(temporary, body);
  if (file.endsWith(".json")) {
    const readBack = JSON.parse(await readFile(temporary, "utf8")) as KnowledgeBundle;
    const again = await verifyKnowledgeBundle(readBack);
    if (again.length > 0) {
      await unlink(temporary);
      throw new Error(again.join("\n"));
    }
  }
  await rename(temporary, file);
  const manifestFile = file.endsWith(".ts") ? `${file}.manifest.json` : file.replace(/\.json$/, ".manifest.json");
  await writeFile(manifestFile, `${JSON.stringify(bundle.manifest, null, 2)}\n`);
}
