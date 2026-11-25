import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { createChunks } from "./chunk.ts";
import { createKnowledgeVersion, sha256Hex, validateVector, verifyKnowledgeBundle } from "./knowledge.ts";
import { CHUNKER_VERSION } from "./limits.ts";
import type { EmbeddingAdapter, EmbeddingCache, KnowledgeBundle, PublishedDocument } from "./types.ts";

export async function createEmbeddingConfigHash(embedding: EmbeddingAdapter): Promise<string> {
  return sha256Hex(JSON.stringify({
    provider: embedding.provider,
    model: embedding.model,
    dimensions: embedding.dimensions,
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
}): Promise<{ bundle: KnowledgeBundle; embedded: number; reused: number; cache: EmbeddingCache }> {
  const configHash = await createEmbeddingConfigHash(options.embedding);
  const entries = options.cache && options.cache.configHash === configHash ? { ...options.cache.entries } : {};
  let embedded = 0;
  let reused = 0;
  const chunks = [];
  for (const document of options.documents) {
    for (const chunk of await createChunks(document)) {
      const cached = entries[chunk.contentHash];
      const cachedError = cached ? validateVector(cached, options.embedding.dimensions) : "missing";
      if (cached && !cachedError) {
        chunks.push({ ...chunk, vector: cached });
        reused += 1;
        continue;
      }
      const vector = await options.embedding.createEmbedding(chunk.text, options.signal);
      const vectorError = validateVector(vector, options.embedding.dimensions);
      if (vectorError) throw new Error(vectorError);
      entries[chunk.contentHash] = vector;
      chunks.push({ ...chunk, vector });
      embedded += 1;
      options.onCache?.({ configHash, entries: { ...entries } });
    }
  }
  const bundle: KnowledgeBundle = {
    manifest: {
      knowledgeVersion: "pending",
      builtAt: (options.now ?? new Date()).toISOString(),
      chunkerVersion: CHUNKER_VERSION,
      embedding: {
        provider: options.embedding.provider,
        model: options.embedding.model,
        dimensions: options.embedding.dimensions,
        revision: `${options.embedding.model}:${options.embedding.dimensions}`,
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
