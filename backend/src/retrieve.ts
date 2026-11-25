import { validateVector } from "./knowledge.ts";
import type { Chunk, KnowledgeBundle } from "./types.ts";

export interface ChunkHit extends Chunk {
  score: number;
}

export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length === 0) return Number.NaN;
  let dot = 0;
  let leftSquare = 0;
  let rightSquare = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.NaN;
    dot += a * b;
    leftSquare += a * a;
    rightSquare += b * b;
  }
  if (leftSquare === 0 || rightSquare === 0) return Number.NaN;
  return dot / (Math.sqrt(leftSquare) * Math.sqrt(rightSquare));
}

export function findChunksByQuery(bundle: KnowledgeBundle, vector: number[], limit: number): ChunkHit[] {
  const vectorError = validateVector(vector, bundle.manifest.embedding.dimensions);
  if (vectorError) throw new Error(vectorError);
  const hits: ChunkHit[] = [];
  for (const chunk of bundle.chunks) {
    const score = cosineSimilarity(vector, chunk.vector);
    if (!Number.isFinite(score)) continue;
    hits.push({ ...chunk, score });
  }
  hits.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
  return hits.slice(0, Math.max(0, limit));
}
