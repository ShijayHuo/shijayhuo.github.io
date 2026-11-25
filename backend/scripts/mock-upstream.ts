import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { hashEmbedding } from "../src/mock-adapter.ts";
export const MOCK_EMBEDDING_MODEL = "local-hash-embedding";
export const MOCK_CHAT_MODEL = "local-mock-chat";
export const MOCK_API_KEY = "local-test";
// 32 维哈希几乎会把无关切片的余弦顶到 0.8 以上。本地联调用 512 维，只让摘录重合的切片明显高于其余。
export const MOCK_DIMENSIONS_USED = 512;

export interface UpstreamStats {
  embeddings: number;
  chats: number;
  lastUserTurns: number;
  embeddingErrors: number;
  chatErrors: number;
  aborted: number;
  hangs: number;
}

const MARK_FAST = "[[fast]]";
const MARK_EMBED_FAIL = "[[upstream-fail]]";
const MARK_STREAM_FAIL = "[[stream-fail]]";
const MARK_HANG = "[[hang]]";

function emptyStats(): UpstreamStats {
  return { embeddings: 0, chats: 0, lastUserTurns: 0, embeddingErrors: 0, chatErrors: 0, aborted: 0, hangs: 0 };
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function authorized(request: IncomingMessage): boolean {
  return request.headers.authorization === `Bearer ${MOCK_API_KEY}`;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function currentQuestion(payload: string): string {
  const marker = "当前问题（数据）：";
  const index = payload.lastIndexOf(marker);
  if (index === -1) {
    const lines = payload.split("\n");
    return lines[lines.length - 1] ?? payload;
  }
  return payload.slice(index);
}

function firstEvidencePath(text: string): string {
  const match = text.match(/路径：(\/(?:about\/|posts\/[A-Za-z0-9][A-Za-z0-9._-]*\/))/);
  return match?.[1] ?? "";
}

function replyText(payload: string): string {
  const path = firstEvidencePath(payload);
  const where = path ? `本次提示里的证据路径是 ${path}。` : "本次提示里没有写出证据路径。";
  return `本地测试生成，不是文章结论。${where}向量是字符哈希，不是语义检索。`;
}

function writeChat(response: ServerResponse, text: string, fast: boolean): void {
  response.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
  });
  const parts: string[] = [];
  const chars = Array.from(text);
  for (let index = 0; index < chars.length; index += 8) parts.push(chars.slice(index, index + 8).join(""));
  let cursor = 0;
  const send = () => {
    if (response.destroyed) return;
    if (cursor >= parts.length) {
      response.write("data: [DONE]\n\n");
      response.end();
      return;
    }
    const delta = { choices: [{ delta: { content: parts[cursor] } }] };
    response.write(`data: ${JSON.stringify(delta)}\n\n`);
    cursor += 1;
    if (fast) send();
    else setTimeout(send, 160);
  };
  send();
}

export function startMockUpstream(port: number): Promise<{ stats: UpstreamStats; close: () => Promise<void>; reset: () => void }> {
  const stats = emptyStats();
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
    if (request.method === "GET" && url.pathname === "/stats") {
      sendJson(response, 200, stats);
      return;
    }
    if (request.method === "POST" && url.pathname === "/stats/reset") {
      Object.assign(stats, emptyStats());
      sendJson(response, 200, stats);
      return;
    }
    if (request.method !== "POST") {
      sendJson(response, 404, { error: "not-found" });
      return;
    }
    if (!authorized(request)) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }
    const body = await readBody(request);
    if (url.pathname === "/v1/embeddings") {
      stats.embeddings += 1;
      let embeddingQuestion = "";
      try {
        const input = (JSON.parse(body) as { input?: unknown }).input;
        const text = typeof input === "string" ? input : "";
        const lines = text.split("\n");
        embeddingQuestion = lines[lines.length - 1] ?? "";
      } catch {
        embeddingQuestion = "";
      }
      if (embeddingQuestion.includes(MARK_HANG)) {
        stats.hangs += 1;
        request.on("close", () => {
          if (!response.writableEnded) stats.aborted += 1;
        });
        return;
      }
      if (embeddingQuestion.includes(MARK_EMBED_FAIL)) {
        stats.embeddingErrors += 1;
        sendJson(response, 500, { error: "mock embedding failure" });
        return;
      }
      let input = "";
      try {
        const json = JSON.parse(body) as { input?: unknown; model?: unknown };
        input = typeof json.input === "string" ? json.input : "";
        if (json.model !== MOCK_EMBEDDING_MODEL) {
          stats.embeddingErrors += 1;
          sendJson(response, 400, { error: "model" });
          return;
        }
      } catch {
        stats.embeddingErrors += 1;
        sendJson(response, 400, { error: "json" });
        return;
      }
      sendJson(response, 200, {
        model: MOCK_EMBEDDING_MODEL,
        data: [{ embedding: hashEmbedding(input, MOCK_DIMENSIONS_USED) }],
      });
      return;
    }
    if (url.pathname === "/v1/chat/completions") {
      stats.chats += 1;
      stats.lastUserTurns = (body.match(/用户：/g) ?? []).length;
      let chatQuestion = "";
      try {
        const messages = (JSON.parse(body) as { messages?: Array<{ content?: string }> }).messages ?? [];
        chatQuestion = currentQuestion(messages.map((item) => item.content ?? "").join("\n"));
      } catch {
        chatQuestion = "";
      }
      if (chatQuestion.includes(MARK_HANG)) {
        stats.hangs += 1;
        request.on("close", () => {
          if (!response.writableEnded) stats.aborted += 1;
        });
        return;
      }
      if (chatQuestion.includes(MARK_STREAM_FAIL)) {
        stats.chatErrors += 1;
        sendJson(response, 500, { error: "mock chat failure" });
        return;
      }
      let model = "";
      try {
        model = (JSON.parse(body) as { model?: string }).model ?? "";
      } catch {
        model = "";
      }
      if (model !== MOCK_CHAT_MODEL) {
        stats.chatErrors += 1;
        sendJson(response, 400, { error: "model" });
        return;
      }
      request.on("close", () => {
        if (!response.writableEnded) stats.aborted += 1;
      });
      writeChat(response, replyText(body), body.includes(MARK_FAST));
      return;
    }
    sendJson(response, 404, { error: "not-found" });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolve({
        stats,
        reset() {
          Object.assign(stats, emptyStats());
        },
        close() {
          return new Promise((done) => server.close(() => done()));
        },
      });
    });
  });
}
