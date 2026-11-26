import { embeddingSpaceError, publicEmbeddingBaseURL } from "./embedding-space.ts";
import { verifyKnowledgeBundle, listChunksByIds } from "./knowledge.ts";
import {
  DEFAULT_MIN_SCORE,
  DEFAULT_ORIGIN,
  MSG,
  PRIOR_SOURCE_LIMIT,
  QUOTA_LIMIT,
  TIMEOUT_MS,
  TOP_K,
  MAX_BODY_BYTES,
  MAX_OUTPUT_CHARS,
} from "./limits.ts";
import { createMockChat, createMockEmbedding } from "./mock-adapter.ts";
import { createOpenAIChat, createOpenAIEmbedding } from "./openai-adapter.ts";
import { createPrompt } from "./prompt.ts";
import { rememberExchange, readDayTranscript } from "./history.ts";
import { createQuotaKey, isWeakProductionHmac, readTrustedIp, updateQuotaByKey } from "./quota.ts";
import { createCitationSplitter, sourcesFromCitations } from "./cite.ts";
import { createRetrievalQuery, encodeSse, isFollowUpQuestion, parseAskRequest } from "./protocol.ts";
import { findChunksByQuery } from "./retrieve.ts";
import type { AskBindings, ChatAdapter, EmbeddingAdapter, KnowledgeBundle, QuotaDatabase, ServiceConfig, SourceLink } from "./types.ts";

export interface AnswerDeps {
  now?: () => number;
  bundle?: KnowledgeBundle | null;
  embedding?: EmbeddingAdapter;
  chat?: ChatAdapter;
  database?: QuotaDatabase;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

function json(status: number, body: unknown, headers: Headers): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("content-type", "application/json; charset=utf-8");
  responseHeaders.set("cache-control", "no-store");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function logOutcome(status: number, error: string | null): void {
  console.log(JSON.stringify({ msg: "ask", status, error }));
}

export function listAllowedOrigins(env: AskBindings): string[] {
  if (env.ASK_ALLOWED_ORIGINS === undefined) return [DEFAULT_ORIGIN];
  const raw = env.ASK_ALLOWED_ORIGINS.trim();
  if (raw === "" || raw.includes("*")) return [];
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

export function readServiceConfig(env: AskBindings, prefix: "EMBEDDING" | "CHAT"): ServiceConfig | null {
  const apiKey = env[`${prefix}_API_KEY`]?.trim() ?? "";
  const model = env[`${prefix}_MODEL`]?.trim() ?? "";
  const baseURL = publicEmbeddingBaseURL(env[`${prefix}_BASE_URL`] ?? "");
  if (!apiKey || !baseURL || !model) return null;
  const config: ServiceConfig = { apiKey, baseURL, model };
  if (prefix === "EMBEDDING") {
    const dimensions = Number(env.EMBEDDING_DIMENSIONS);
    if (!Number.isInteger(dimensions) || dimensions <= 0) return null;
    config.dimensions = dimensions;
  }
  return config;
}

function readMinScore(env: AskBindings): number | null {
  if (env.ASK_MIN_SCORE === undefined || env.ASK_MIN_SCORE.trim() === "") return DEFAULT_MIN_SCORE;
  const score = Number(env.ASK_MIN_SCORE);
  if (!Number.isFinite(score) || score < 0 || score > 1) return null;
  return score;
}

function applyCors(headers: Headers, origin: string): void {
  headers.set("access-control-allow-origin", origin);
  headers.set("vary", "Origin");
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("access-control-allow-headers", "Content-Type");
}

async function readLimitedBody(request: Request): Promise<{ ok: true; text: string } | { ok: false }> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > MAX_BODY_BYTES) return { ok: false };
  if (!request.body) return { ok: true, text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false };
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    all.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, text: new TextDecoder().decode(all) };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function recordExchangeSafe(
  database: QuotaDatabase,
  key: string,
  now: number,
  question: string,
  answer: string,
  sources: Array<Pick<SourceLink, "id" | "title" | "url" | "heading">>,
): Promise<void> {
  try {
    await rememberExchange(database, key, now, question, answer, sources);
  } catch {
    // 次数已经占用。记录失败不改响应，也不退还。
  }
}

async function answerHistory(
  request: Request,
  env: AskBindings,
  deps: AnswerDeps,
  cors: Headers,
  originAllowed: boolean,
): Promise<Response> {
  if (request.method !== "GET") return json(404, { error: "invalid", message: MSG.notFound }, cors);
  if (!originAllowed) return json(403, { error: "forbidden", message: MSG.origin }, new Headers());
  const database = deps.database ?? env.QUOTA_DB;
  const secret = env.QUOTA_HMAC_KEY?.trim() ?? "";
  const weakHmac = env.ASK_REQUIRE_STRONG_HMAC === "1" && isWeakProductionHmac(secret);
  if (!database || !secret || weakHmac) return json(503, { error: "unavailable", message: MSG.unavailable }, cors);
  const ip = readTrustedIp(request, env);
  if (!ip) return json(403, { error: "forbidden", message: MSG.ip }, cors);
  const quotaKey = await createQuotaKey(ip, secret);
  const transcript = await readDayTranscript(database, quotaKey, deps.now?.() ?? Date.now());
  return json(200, transcript, cors);
}

export async function createAnswer(request: Request, env: AskBindings, deps: AnswerDeps = {}): Promise<Response> {
  const url = new URL(request.url);
  const pathName = url.pathname === "/" ? url.pathname : url.pathname.replace(/\/$/, "");
  const allowed = listAllowedOrigins(env);
  const origin = request.headers.get("origin");
  const originAllowed = origin !== null && allowed.includes(origin);
  const cors = new Headers();
  if (originAllowed && origin) applyCors(cors, origin);

  const finish = (response: Response, error: string | null): Response => {
    logOutcome(response.status, error);
    return response;
  };

  if (request.method === "OPTIONS") {
    if (!originAllowed) return finish(json(403, { error: "forbidden", message: MSG.origin }, new Headers()), "forbidden");
    return finish(new Response(null, { status: 204, headers: cors }), null);
  }
  if (pathName === "/ask/history") {
    try {
      const response = await answerHistory(request, env, deps, cors, originAllowed);
      const error = response.status === 200 ? null : response.status === 403 ? "forbidden" : response.status === 404 ? "invalid" : "unavailable";
      return finish(response, error);
    } catch {
      return finish(json(503, { error: "unavailable", message: MSG.unavailable }, cors), "unavailable");
    }
  }
  if (pathName !== "/ask") return finish(json(404, { error: "invalid", message: MSG.notFound }, cors), "invalid");
  if (request.method !== "POST") return finish(json(405, { error: "invalid", message: MSG.method }, cors), "invalid");
  if (!originAllowed) return finish(json(403, { error: "forbidden", message: MSG.origin }, new Headers()), "forbidden");

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return finish(json(400, { error: "invalid", message: MSG.notJson }, cors), "invalid");
  }
  const body = await readLimitedBody(request);
  if (!body.ok) return finish(json(413, { error: "invalid", message: MSG.tooLarge }, cors), "invalid");
  const parsed = parseAskRequest(body.text);
  if (typeof parsed === "string") {
    const message = parsed;
    const error = "invalid";
    return finish(json(400, { error, message }, cors), error);
  }

  const bundle = deps.bundle === undefined ? null : deps.bundle;
  const database = deps.database ?? env.QUOTA_DB;
  const secret = env.QUOTA_HMAC_KEY?.trim() ?? "";
  const minScore = readMinScore(env);
  const mockAllowed = env.ASK_ALLOW_MOCK === "1";
  const bundleErrors = bundle ? await verifyKnowledgeBundle(bundle) : ["知识包不存在。"];
  const configured = Boolean(bundle && bundleErrors.length === 0 && database && secret && minScore !== null);
  const mockBundle = bundle?.manifest.embedding.provider === "mock";
  const weakHmac = env.ASK_REQUIRE_STRONG_HMAC === "1" && isWeakProductionHmac(secret);
  if (!configured || weakHmac || (mockBundle && !mockAllowed) || minScore === null) {
    return finish(json(503, { error: "unavailable", message: MSG.unavailable }, cors), "unavailable");
  }
  const readyBundle = bundle;
  if (!readyBundle || !database) return finish(json(503, { error: "unavailable", message: MSG.unavailable }, cors), "unavailable");

  const embeddingConfig = readServiceConfig(env, "EMBEDDING");
  const chatConfig = readServiceConfig(env, "CHAT");
  let embedding = deps.embedding;
  let chat = deps.chat;
  if (!embedding) {
    if (mockBundle && mockAllowed) embedding = createMockEmbedding(readyBundle.manifest.embedding.dimensions);
    else if (embeddingConfig && !mockBundle) embedding = createOpenAIEmbedding(embeddingConfig, deps.fetchImpl);
  }
  if (!chat) {
    if (chatConfig) chat = createOpenAIChat(chatConfig, deps.fetchImpl);
    else if (mockAllowed) chat = createMockChat(["问答服务使用了 mock 生成，这不是文章结论。"]);
  }
  if (!embedding || !chat) return finish(json(503, { error: "unavailable", message: MSG.unavailable }, cors), "unavailable");
  const embeddingAdapter = embedding;
  const chatAdapter = chat;
  if (embeddingSpaceError(embeddingAdapter, readyBundle.manifest.embedding, embeddingConfig)) {
    return finish(json(503, { error: "unavailable", message: MSG.unavailable }, cors), "unavailable");
  }

  const ip = readTrustedIp(request, env);
  if (!ip) return finish(json(403, { error: "forbidden", message: MSG.ip }, cors), "forbidden");

  const quotaDatabase = database;
  const now = deps.now?.() ?? Date.now();
  const quotaKey = await createQuotaKey(ip, secret);
  let reserved: { reserved: boolean; used: number };
  try {
    reserved = await updateQuotaByKey(quotaDatabase, quotaKey, now);
  } catch {
    return finish(json(503, { error: "unavailable", message: MSG.unavailable }, cors), "unavailable");
  }
  if (!reserved.reserved) {
    return finish(json(429, { error: "quota", message: MSG.quota, remaining: 0 }, cors), "quota");
  }
  const remaining = Math.max(0, Math.min(QUOTA_LIMIT - 1, QUOTA_LIMIT - reserved.used));

  const timeout = AbortSignal.timeout(deps.timeoutMs ?? TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeout]);
  const retrievalText = createRetrievalQuery(parsed.question, parsed.history);
  let vector: number[];
  try {
    vector = await embeddingAdapter.createEmbedding(retrievalText, signal);
  } catch {
    if (request.signal.aborted) return finish(new Response(null, { status: 200, headers: cors }), null);
    await recordExchangeSafe(quotaDatabase, quotaKey, now, parsed.question, MSG.upstream, []);
    return finish(json(502, { error: "upstream", message: MSG.upstream, remaining }, cors), "upstream");
  }

  let hits: ReturnType<typeof findChunksByQuery> = [];
  try {
    hits = findChunksByQuery(readyBundle, vector, TOP_K);
  } catch {
    await recordExchangeSafe(quotaDatabase, quotaKey, now, parsed.question, MSG.upstream, []);
    return finish(json(502, { error: "upstream", message: MSG.upstream, remaining }, cors), "upstream");
  }
  const strong = hits.filter((hit) => hit.score >= minScore);
  let evidence = strong;
  if (strong.length === 0 && isFollowUpQuestion(parsed.question)) {
    const ids = parsed.history.flatMap((message) => message.sourceIds ?? []).slice(-PRIOR_SOURCE_LIMIT);
    evidence = listChunksByIds(readyBundle.chunks, ids).slice(0, PRIOR_SOURCE_LIMIT).map((chunk) => ({ ...chunk, score: 1 }));
  }
  const messages = evidence.length > 0
    ? createPrompt({
      question: parsed.question,
      history: parsed.history,
      hits: evidence,
      knowledgeVersion: readyBundle.manifest.knowledgeVersion,
    })
    : null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };
      let produced = "";
      let answerText = "";
      let answerSources: SourceLink[] = [];
      let persist = false;
      try {
        send("meta", { remaining, knowledgeVersion: readyBundle.manifest.knowledgeVersion });
        if (!messages) {
          answerText = MSG.refusal;
          persist = true;
          send("token", { text: MSG.refusal });
          send("sources", { sources: [] });
          send("done", {});
          return;
        }
        const citations = createCitationSplitter();
        const emit = (part: string) => {
          const text = part.slice(0, MAX_OUTPUT_CHARS - produced.length);
          if (!text) return false;
          produced += text;
          send("token", { text });
          return produced.length < MAX_OUTPUT_CHARS;
        };
        for await (const part of chatAdapter.createChatStream(messages, signal)) {
          if (request.signal.aborted) return;
          if (!part) continue;
          const visible = citations.push(part);
          if (visible && !emit(visible)) break;
        }
        if (request.signal.aborted) return;
        const cited = citations.finish();
        if (cited.text) emit(cited.text);
        answerText = produced;
        answerSources = sourcesFromCitations(evidence, cited.citedIds);
        persist = true;
        send("sources", { sources: answerSources });
        send("done", {});
      } catch (error) {
        if (request.signal.aborted || closed) return;
        if (isAbortError(error) && request.signal.aborted) return;
        answerText = produced || MSG.streamError;
        persist = true;
        send("error", { message: MSG.streamError });
      } finally {
        closed = true;
        if (!persist && produced) {
          answerText = produced;
          persist = true;
        }
        if (persist) await recordExchangeSafe(quotaDatabase, quotaKey, now, parsed.question, answerText, answerSources);
        try {
          controller.close();
        } catch {
          // 客户端已经离开。
        }
      }
    },
    cancel() {
      // 取消由 request.signal 传给上游。这里不再额外占用额度。
    },
  });
  const headers = new Headers(cors);
  headers.set("content-type", "text/event-stream; charset=utf-8");
  headers.set("cache-control", "no-store");
  return finish(new Response(stream, { status: 200, headers }), null);
}
