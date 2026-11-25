import {
  EMBEDDING_MAX_BATCH_ITEMS,
  EMBEDDING_MAX_BATCH_TOKENS,
  EMBEDDING_MAX_ITEM_TOKENS,
} from "./limits.ts";

export interface EmbeddingBatchLimits {
  maxItems: number;
  maxItemTokens: number;
  maxBatchTokens: number;
}

export const CONSERVATIVE_EMBEDDING_LIMITS: EmbeddingBatchLimits = {
  maxItems: EMBEDDING_MAX_BATCH_ITEMS,
  maxItemTokens: EMBEDDING_MAX_ITEM_TOKENS,
  maxBatchTokens: EMBEDDING_MAX_BATCH_TOKENS,
};

export interface EmbeddingBatchPlan {
  indexes: number[];
  tokenEstimate: number;
}

/** 按码点估算，宁多勿少。中文博客切片远小于单条上限。 */
export function estimateEmbeddingTokens(text: string): number {
  const count = Array.from(text).length;
  return Math.max(1, count);
}

export function planEmbeddingBatches(
  inputs: string[],
  limits: EmbeddingBatchLimits = CONSERVATIVE_EMBEDDING_LIMITS,
): EmbeddingBatchPlan[] {
  const batches: EmbeddingBatchPlan[] = [];
  let current: EmbeddingBatchPlan = { indexes: [], tokenEstimate: 0 };
  inputs.forEach((text, index) => {
    const tokens = estimateEmbeddingTokens(text);
    if (tokens > limits.maxItemTokens) {
      throw new Error(`单条超过 ${limits.maxItemTokens} tokens，已停止，没有发送。`);
    }
    const nextCount = current.indexes.length + 1;
    const nextTokens = current.tokenEstimate + tokens;
    if (current.indexes.length > 0 && (nextCount > limits.maxItems || nextTokens > limits.maxBatchTokens)) {
      batches.push(current);
      current = { indexes: [], tokenEstimate: 0 };
    }
    current.indexes.push(index);
    current.tokenEstimate += tokens;
  });
  if (current.indexes.length > 0) batches.push(current);
  return batches;
}
