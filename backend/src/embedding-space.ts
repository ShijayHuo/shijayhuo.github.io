import {
  HASH_EMBEDDING_DIMENSIONS,
  VALIDATION_CHAT_BASE_URL,
  VALIDATION_CHAT_MODEL,
  VALIDATION_EMBEDDING_BASE_URL,
  VALIDATION_EMBEDDING_DIMENSIONS,
  VALIDATION_EMBEDDING_MODEL,
} from "./limits.ts";
import type { EmbeddingAdapter, EmbeddingManifest, ServiceConfig } from "./types.ts";

export function embeddingRevision(model: string, dimensions: number): string {
  return `${model}:${dimensions}:float`;
}

export function publicEmbeddingBaseURL(baseURL: string): string | null {
  let url: URL;
  try {
    url = new URL(baseURL.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.search || url.hash) return null;
  return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
}

export function embeddingSpaceError(
  adapter: EmbeddingAdapter,
  manifest: EmbeddingManifest,
  config: ServiceConfig | null,
): string | null {
  if (adapter.provider !== manifest.provider) return "embedding 提供方与知识包不一致。";
  if (adapter.model !== manifest.model) return "embedding 模型与知识包不一致。";
  if (adapter.dimensions !== manifest.dimensions) return "embedding 维度与知识包不一致。";
  if (adapter.baseURL !== manifest.baseURL) return "embedding 地址与知识包不一致。";
  if (adapter.encodingFormat !== manifest.encodingFormat) return "embedding 编码与知识包不一致。";
  if (adapter.revision !== manifest.revision) return "embedding 版本与知识包不一致。";
  if (manifest.provider === "mock" && manifest.dimensions === HASH_EMBEDDING_DIMENSIONS) {
    return "拒绝 512 维哈希向量。";
  }
  if (config) {
    const baseURL = publicEmbeddingBaseURL(config.baseURL);
    if (!baseURL || baseURL !== manifest.baseURL || config.model !== manifest.model || config.dimensions !== manifest.dimensions) {
      return "查询配置与知识包的地址、模型或维度不一致。";
    }
  }
  return null;
}

export function validationProfileError(input: {
  provider: string;
  model: string;
  dimensions: number;
  baseURL: string;
}): string | null {
  if (input.provider === "mock" || /mock|hash/i.test(input.model)) {
    return "哈希或 mock 索引不能用于真实验证。";
  }
  if (input.model === "text-embedding-v4") {
    return "text-embedding-v4 索引不能与 qwen3.7-text-embedding-flash 验证混用。";
  }
  if (/rerank/i.test(input.model)) return "验证模型不是 rerank。";
  if (input.model !== VALIDATION_EMBEDDING_MODEL) return "验证模型必须是 qwen3.7-text-embedding-flash。";
  if (input.dimensions !== VALIDATION_EMBEDDING_DIMENSIONS) {
    return "验证维度必须是 1024，不能使用 512 或其他维度。";
  }
  if (publicEmbeddingBaseURL(input.baseURL) !== VALIDATION_EMBEDDING_BASE_URL) {
    return "验证地址必须是百炼北京 OpenAI 兼容地址。";
  }
  return null;
}

export function validationChatError(input: { model: string; baseURL: string }): string | null {
  if (/rerank/i.test(input.model)) return "对话模型不是 rerank。";
  if (input.model !== VALIDATION_CHAT_MODEL) return "验证对话模型必须是 deepseek-v4.1-flash。";
  if (publicEmbeddingBaseURL(input.baseURL) !== VALIDATION_CHAT_BASE_URL) {
    return "对话地址必须是百炼北京 OpenAI 兼容地址。";
  }
  return null;
}
