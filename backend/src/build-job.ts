import { createKnowledgeBundle } from "./bundle.ts";
import type { EmbeddingBatchLimits } from "./embedding-batch.ts";
import { saveKnowledgeBundle } from "./bundle.ts";
import type { EmbeddingAdapter, EmbeddingCache, PublishedDocument } from "./types.ts";

export async function buildAndSave(options: {
  documents: PublishedDocument[];
  embedding: EmbeddingAdapter;
  cache: EmbeddingCache | null;
  out: string;
  now?: Date;
  signal?: AbortSignal;
  onCache?: (cache: EmbeddingCache) => void;
  batchLimits?: EmbeddingBatchLimits;
}): Promise<{
  documents: number;
  chunks: number;
  embedded: number;
  reused: number;
  provider: string;
  model: string;
  dimensions: number;
  baseURL: string;
  knowledgeVersion: string;
  out: string;
}> {
  const result = await createKnowledgeBundle(options);
  await saveKnowledgeBundle(options.out, result.bundle);
  return {
    documents: result.bundle.manifest.documents.length,
    chunks: result.bundle.manifest.chunkCount,
    embedded: result.embedded,
    reused: result.reused,
    provider: result.bundle.manifest.embedding.provider,
    model: result.bundle.manifest.embedding.model,
    dimensions: result.bundle.manifest.embedding.dimensions,
    baseURL: result.bundle.manifest.embedding.baseURL,
    knowledgeVersion: result.bundle.manifest.knowledgeVersion,
    out: options.out,
  };
}
