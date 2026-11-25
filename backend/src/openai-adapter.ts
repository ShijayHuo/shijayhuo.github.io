import { MAX_OUTPUT_TOKENS } from "./limits.ts";
import { validateVector } from "./knowledge.ts";
import type { ChatAdapter, ChatMessage, EmbeddingAdapter, ServiceConfig } from "./types.ts";

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

function endpoint(baseURL: string, path: string): string {
  return `${baseURL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function readDelta(block: string): Promise<string | null> {
  const data: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    if (!line.startsWith("data:")) continue;
    data.push(line.slice(5).replace(/^ /, ""));
  }
  if (data.length === 0) return "";
  const text = data.join("\n");
  if (text.trim() === "[DONE]") return null;
  try {
    const json = JSON.parse(text) as { choices?: Array<{ delta?: { content?: string } }> };
    return json.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

export function createOpenAIEmbedding(config: ServiceConfig, fetchImpl: typeof fetch = fetch): EmbeddingAdapter {
  return {
    provider: "openai",
    model: config.model,
    dimensions: config.dimensions ?? 0,
    async createEmbedding(input, signal) {
      let response: Response;
      try {
        response = await fetchImpl(endpoint(config.baseURL, "embeddings"), {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            input,
            ...(config.dimensions ? { dimensions: config.dimensions } : {}),
          }),
          signal,
        });
      } catch (error) {
        if (isAbortError(error)) throw error;
        throw new UpstreamError("embedding 请求失败。");
      }
      if (!response.ok) throw new UpstreamError("embedding 请求失败。");
      let json: { data?: Array<{ embedding?: number[] }>; model?: string };
      try {
        json = await response.json() as typeof json;
      } catch {
        throw new UpstreamError("embedding 响应无效。");
      }
      if (json.model && json.model !== config.model) throw new UpstreamError("embedding 模型与配置不一致。");
      const vector = json.data?.[0]?.embedding;
      if (!vector) throw new UpstreamError("embedding 响应里没有向量。");
      const vectorError = validateVector(vector, config.dimensions);
      if (vectorError) throw new UpstreamError(vectorError);
      return vector;
    },
  };
}

export function createOpenAIChat(config: ServiceConfig, fetchImpl: typeof fetch = fetch): ChatAdapter {
  return {
    provider: "openai",
    model: config.model,
    async *createChatStream(messages: ChatMessage[], signal) {
      let response: Response;
      try {
        response = await fetchImpl(endpoint(config.baseURL, "chat/completions"), {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            max_tokens: MAX_OUTPUT_TOKENS,
            stream: true,
          }),
          signal,
        });
      } catch (error) {
        if (isAbortError(error)) throw error;
        throw new UpstreamError("生成请求失败。");
      }
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || type.includes("application/json") || !response.body) {
        throw new UpstreamError("上游没有返回流式 Chat Completions。");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          if (signal?.aborted) throw new DOMException("aborted", "AbortError");
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(/\n\n/);
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const delta = await readDelta(part);
            if (delta === null) return;
            if (delta) yield delta;
          }
        }
        if (buffer.trim()) {
          const delta = await readDelta(buffer);
          if (delta) yield delta;
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
