import { embeddingRevision } from "./embedding-space.ts";
import { MOCK_DIMENSIONS } from "./limits.ts";
import type { ChatAdapter, EmbeddingAdapter } from "./types.ts";

/** 确定性哈希向量，只用于无密钥的控制流测试。它不是语义模型。 */
export function hashEmbedding(text: string, dimensions = MOCK_DIMENSIONS): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const chars = Array.from(text);
  if (chars.length === 0) throw new Error("向量为空。");
  const grams = chars.length === 1 ? [chars[0]] : chars.slice(0, -1).map((char, index) => char + chars[index + 1]);
  for (const gram of grams) {
    let hash = 2166136261;
    for (const char of gram) {
      hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 16777619);
    }
    vector[Math.abs(hash) % dimensions] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) throw new Error("向量为零向量。");
  return vector.map((value) => value / norm);
}

export function createMockEmbedding(dimensions = MOCK_DIMENSIONS): EmbeddingAdapter {
  return {
    provider: "mock",
    model: "mock-embedding-v1",
    dimensions,
    baseURL: "",
    encodingFormat: "float",
    revision: embeddingRevision("mock-embedding-v1", dimensions),
    async createEmbedding(input, signal) {
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      return hashEmbedding(input, dimensions);
    },
  };
}

export function createMockChat(parts: string[]): ChatAdapter {
  return {
    provider: "mock",
    model: "mock-chat-v1",
    async *createChatStream(_messages, signal) {
      for (const part of parts) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        yield part;
      }
    },
  };
}
