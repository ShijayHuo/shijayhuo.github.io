import { readFileSync } from "node:fs";
import path from "node:path";
import { embeddingRevision } from "../src/embedding-space.ts";
import { createKnowledgeVersion, verifyKnowledgeBundle } from "../src/knowledge.ts";
import { CHUNKER_VERSION } from "../src/limits.ts";
import type { AskBindings, ChatAdapter, ChatMessage, Chunk, EmbeddingAdapter, KnowledgeBundle } from "../src/types.ts";

export const fixtureRoot = path.join(import.meta.dirname, "../../docs/ask/fixtures");
export const blogFixture = path.join(import.meta.dirname, "fixtures/blog");
export const repoRoot = path.join(import.meta.dirname, "../..");

export function readFixture(name: string): string {
  return readFileSync(path.join(fixtureRoot, name), "utf8");
}

export function readJsonFixture(name: string): unknown {
  return JSON.parse(readFixture(name));
}

export interface ParsedEvent {
  event: string;
  data: unknown;
}

export function parseSse(text: string): ParsedEvent[] {
  const blocks = text.replace(/\n$/, "").split(/\n\n/).filter(Boolean);
  return blocks.map((block) => {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (!line || line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    return { event, data: JSON.parse(data.join("\n")) as unknown };
  });
}

export async function readEvents(response: Response): Promise<ParsedEvent[]> {
  return parseSse(await response.text());
}

export async function createFixtureBundle(chunks: Chunk[]): Promise<KnowledgeBundle> {
  const documents = new Map<string, KnowledgeBundle["manifest"]["documents"][number]>();
  for (const chunk of chunks) {
    documents.set(chunk.url, {
      id: chunk.url,
      title: chunk.title,
      url: chunk.url,
      date: chunk.date,
      sourcePath: chunk.url === "/about/" ? "_tabs/about.md" : `_posts/x-${chunk.id}.md`,
      tags: chunk.tags,
      categories: chunk.categories,
      contentHash: chunk.contentHash,
    });
  }
  const dimensions = chunks[0]?.vector.length ?? 3;
  const bundle: KnowledgeBundle = {
    manifest: {
      knowledgeVersion: "pending",
      builtAt: "2026-11-25T00:00:00.000Z",
      chunkerVersion: CHUNKER_VERSION,
      embedding: {
        provider: "mock",
        model: "mock-embedding-v1",
        dimensions,
        revision: embeddingRevision("mock-embedding-v1", dimensions),
        baseURL: "",
        encodingFormat: "float",
        inputTemplate: "text",
        queryPrefix: "",
        documentPrefix: "",
        normalization: "cosine",
      },
      documents: [...documents.values()],
      chunkCount: chunks.length,
    },
    chunks,
  };
  bundle.manifest.knowledgeVersion = await createKnowledgeVersion(bundle);
  const errors = await verifyKnowledgeBundle(bundle);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  return bundle;
}

export function chunk(partial: Partial<Chunk> & Pick<Chunk, "id" | "text" | "url" | "vector">): Chunk {
  return {
    title: partial.title ?? partial.id,
    heading: partial.heading ?? "",
    date: partial.date ?? "2020-01-01",
    contentHash: partial.contentHash ?? partial.id,
    tags: partial.tags ?? [],
    categories: partial.categories ?? [],
    ...partial,
    documentId: partial.url,
  };
}

export function fixedEmbedding(vector: number[]): EmbeddingAdapter & { calls: string[] } {
  const calls: string[] = [];
  return {
    provider: "mock",
    model: "mock-embedding-v1",
    dimensions: vector.length,
    baseURL: "",
    encodingFormat: "float",
    revision: embeddingRevision("mock-embedding-v1", vector.length),
    calls,
    async createEmbedding(input, signal) {
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      calls.push(input);
      return vector;
    },
  };
}

export function fixedChat(parts: string[]): ChatAdapter & { calls: ChatMessage[][] } {
  const calls: ChatMessage[][] = [];
  return {
    provider: "mock",
    model: "mock-chat-v1",
    calls,
    async *createChatStream(messages, signal) {
      calls.push(messages);
      for (const part of parts) {
        if (signal?.aborted) throw new DOMException("aborted", "AbortError");
        yield part;
      }
    },
  };
}

export function askEnv(extra: AskBindings = {}): AskBindings {
  return {
    QUOTA_HMAC_KEY: "test-hmac",
    ASK_ALLOW_MOCK: "1",
    ASK_ALLOWED_ORIGINS: "https://shijayhuo.github.io",
    ...extra,
  };
}

export function askRequest(body: string, init: { origin?: string; ip?: string | null; signal?: AbortSignal } = {}): Request {
  const headers = new Headers({ "content-type": "application/json" });
  headers.set("origin", init.origin ?? "https://shijayhuo.github.io");
  if (init.ip !== null) headers.set("cf-connecting-ip", init.ip ?? "203.0.113.10");
  return new Request("https://ask.example/ask", {
    method: "POST",
    headers,
    body,
    signal: init.signal,
  });
}
