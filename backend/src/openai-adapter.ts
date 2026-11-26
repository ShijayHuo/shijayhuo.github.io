import { planEmbeddingBatches } from "./embedding-batch.ts";
import { embeddingRevision, publicEmbeddingBaseURL } from "./embedding-space.ts";
import { validateVector } from "./knowledge.ts";
import { EMBEDDING_MAX_ATTEMPTS, MAX_OUTPUT_TOKENS } from "./limits.ts";
import type { ChatAdapter, ChatMessage, EmbeddingAdapter, ServiceConfig } from "./types.ts";

export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export interface AdapterOptions {
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

function endpoint(baseURL: string, path: string): string {
  return `${baseURL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function delayMs(attempt: number, random: () => number): number {
  return Math.min(2000, 200 * 2 ** (attempt - 1)) + Math.floor(random() * 50);
}

interface EmbeddingRow {
  embedding?: number[];
  index?: number;
}

interface EmbeddingJson {
  data?: EmbeddingRow[];
  model?: string;
}

function readAnswerContent(delta: { content?: unknown }): string {
  const content = delta.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => {
    if (typeof part === "string") return part;
    if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") {
      return (part as { text: string }).text;
    }
    return "";
  }).join("");
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
    const json = JSON.parse(text) as {
      choices?: Array<{ delta?: { content?: unknown } }>;
    };
    const delta = json.choices?.[0]?.delta;
    if (!delta) return "";
    return readAnswerContent(delta);
  } catch {
    return "";
  }
}

function vectorsFrom(json: EmbeddingJson, count: number, dimensions: number | undefined, model: string): number[][] {
  if (json.model && json.model !== model) throw new UpstreamError("embedding 模型与配置不一致。");
  const rows = json.data ?? [];
  if (rows.length !== count) throw new UpstreamError("embedding 响应条数不一致。");
  const ordered: Array<number[] | undefined> = new Array(count);
  for (const row of rows) {
    const index = row.index ?? (count === 1 ? 0 : undefined);
    if (index === undefined || index < 0 || index >= count || ordered[index]) {
      throw new UpstreamError("embedding 响应序号无效。");
    }
    const vectorError = validateVector(row.embedding ?? [], dimensions);
    if (vectorError || !row.embedding) throw new UpstreamError(vectorError ?? "embedding 响应里没有向量。");
    ordered[index] = row.embedding;
  }
  return ordered as number[][];
}

export function createOpenAIEmbedding(
  config: ServiceConfig,
  fetchImpl: typeof fetch = fetch,
  options: AdapterOptions = {},
): EmbeddingAdapter {
  const resolvedBase = publicEmbeddingBaseURL(config.baseURL);
  if (!resolvedBase) throw new UpstreamError("embedding 地址无效。");
  const baseURL: string = resolvedBase;
  const dimensions = config.dimensions && config.dimensions > 0 ? config.dimensions : 0;
  const maxAttempts = options.maxAttempts ?? EMBEDDING_MAX_ATTEMPTS;
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const random = options.random ?? Math.random;
  const expectedDimensions = dimensions > 0 ? dimensions : undefined;

  async function postEmbeddings(body: unknown, signal?: AbortSignal): Promise<EmbeddingJson> {
    let attempt = 0;
    while (attempt < maxAttempts) {
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      attempt += 1;
      let response: Response;
      try {
        response = await fetchImpl(endpoint(baseURL, "embeddings"), {
          method: "POST",
          headers: {
            authorization: `Bearer ${config.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
          signal,
        });
      } catch (error) {
        if (isAbortError(error) || signal?.aborted) throw new DOMException("aborted", "AbortError");
        if (attempt >= maxAttempts) throw new UpstreamError("embedding 请求失败。");
        await sleep(delayMs(attempt, random));
        continue;
      }
      if (response.ok) {
        try {
          return await response.json() as EmbeddingJson;
        } catch {
          throw new UpstreamError("embedding 响应无效。");
        }
      }
      try {
        await response.body?.cancel();
      } catch {
        // 不读取失败正文，避免把密钥或请求内容写进日志。
      }
      if (!RETRYABLE_STATUS.has(response.status) || attempt >= maxAttempts) {
        throw new UpstreamError(`embedding 请求失败（HTTP ${response.status}）。`);
      }
      await sleep(delayMs(attempt, random));
    }
    throw new UpstreamError("embedding 请求失败。");
  }

  async function embedMany(inputs: string[], signal?: AbortSignal): Promise<number[][]> {
    if (inputs.length === 0) throw new UpstreamError("embedding 批次为空。");
    if (planEmbeddingBatches(inputs).length !== 1) {
      throw new UpstreamError("embedding 批次超过保守上限，没有发送。");
    }
    const json = await postEmbeddings({
      model: config.model,
      input: inputs.length === 1 ? inputs[0] : inputs,
      encoding_format: "float",
      ...(expectedDimensions ? { dimensions: expectedDimensions } : {}),
    }, signal);
    return vectorsFrom(json, inputs.length, expectedDimensions, config.model);
  }

  return {
    provider: "openai",
    model: config.model,
    dimensions,
    baseURL,
    encodingFormat: "float",
    revision: embeddingRevision(config.model, dimensions),
    createEmbedding(input, signal) {
      return embedMany([input], signal).then((vectors) => vectors[0] ?? Promise.reject(new UpstreamError("embedding 响应里没有向量。")));
    },
    createEmbeddings(inputs, signal) {
      return embedMany(inputs, signal);
    },
  };
}

export function createOpenAIChat(config: ServiceConfig, fetchImpl: typeof fetch = fetch): ChatAdapter {
  const baseURL = publicEmbeddingBaseURL(config.baseURL);
  if (!baseURL) throw new UpstreamError("生成地址无效。");
  return {
    provider: "openai",
    model: config.model,
    async *createChatStream(messages: ChatMessage[], signal) {
      let response: Response;
      try {
        response = await fetchImpl(endpoint(baseURL, "chat/completions"), {
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
