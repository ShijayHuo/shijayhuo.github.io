import assert from "node:assert/strict";
import { test } from "node:test";
import { createAnswer } from "../src/handler.ts";
import { MSG } from "../src/limits.ts";
import { SYSTEM_RULES } from "../src/prompt.ts";
import { createQuotaKey, findOneQuotaByKey } from "../src/quota.ts";
import type { ChatAdapter, ChatMessage } from "../src/types.ts";
import {
  askEnv,
  askRequest,
  chunk,
  createFixtureBundle,
  fixedChat,
  fixedEmbedding,
  parseSse,
  readEvents,
  readFixture,
  readJsonFixture,
} from "./harness.ts";
import { createSqliteQuotaDatabase } from "./sqlite-quota.ts";

async function aboutBundle() {
  return createFixtureBundle([
    chunk({
      id: "about-intro",
      title: "关于",
      url: "/about/",
      heading: "",
      text: "关于页写的是霍世杰。",
      vector: [1, 0, 0],
    }),
  ]);
}

test("非流式契约错误与样例文案一致，且不占用额度", async () => {
  const database = createSqliteQuotaDatabase();
  const embedding = fixedEmbedding([1, 0, 0]);
  const bundle = await aboutBundle();
  const cases = [
    { body: readFixture("request-empty.json"), expected: "http-400-empty.json", status: 400 },
    { body: readFixture("request-bad-role.json"), expected: "http-400-role.json", status: 400 },
    { body: "{", expectedBody: { error: "invalid", message: MSG.notJson }, status: 400 },
    { body: JSON.stringify({ question: "好".repeat(2001) }), expectedBody: { error: "invalid", message: MSG.questionTooLong }, status: 400 },
  ];
  for (const item of cases) {
    const response = await createAnswer(askRequest(item.body), askEnv(), { bundle, database, embedding, chat: fixedChat(["不会出现"]) });
    assert.equal(response.status, item.status);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    const actual = await response.json();
    assert.deepEqual(actual, item.expected ? readJsonFixture(item.expected) : item.expectedBody);
  }
  const origin = await createAnswer(
    askRequest(readFixture("request-first.json"), { origin: "https://evil.example" }),
    askEnv(),
    { bundle, database, embedding, chat: fixedChat(["不会出现"]) },
  );
  assert.equal(origin.status, 403);
  assert.equal(origin.headers.get("access-control-allow-origin"), null);
  assert.deepEqual(await origin.json(), readJsonFixture("http-403-origin.json"));
  const missingIp = await createAnswer(
    askRequest(readFixture("request-first.json"), { ip: null }),
    askEnv(),
    { bundle, database, embedding, chat: fixedChat(["不会出现"]) },
  );
  assert.deepEqual(await missingIp.json(), readJsonFixture("http-403-ip.json"));
  const unavailable = await createAnswer(askRequest(readFixture("request-first.json")), askEnv({ QUOTA_HMAC_KEY: "" }), {
    bundle,
    database,
    embedding,
    chat: fixedChat(["不会出现"]),
  });
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), readJsonFixture("http-503.json"));
  assert.equal(embedding.calls.length, 0);
  assert.equal(await findOneQuotaByKey(database, "unused"), null);
});

test("mock 知识包在未显式允许时不会回答", async () => {
  const bundle = await aboutBundle();
  const embedding = fixedEmbedding([1, 0, 0]);
  const response = await createAnswer(
    askRequest(readFixture("request-first.json")),
    askEnv({ ASK_ALLOW_MOCK: "0" }),
    { bundle, database: createSqliteQuotaDatabase(), embedding, chat: fixedChat(["不会出现"]) },
  );
  assert.deepEqual(await response.json(), readJsonFixture("http-503.json"));
  assert.equal(embedding.calls.length, 0);
});

test("证据足够时按契约输出 SSE，来源不采用模型写下的网址", async () => {
  const database = createSqliteQuotaDatabase();
  const embedding = fixedEmbedding([1, 0, 0]);
  const chat = fixedChat(["见 https://evil.example/phish\n{\"cite\":[\"about-intro\"]}"]);
  const response = await createAnswer(askRequest(readFixture("request-first.json")), askEnv(), {
    bundle: await aboutBundle(),
    database,
    embedding,
    chat,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
  const events = await readEvents(response);
  assert.deepEqual(events.map((event) => event.event), ["meta", "token", "sources", "done"]);
  assert.deepEqual((events[2]?.data as { sources: unknown }).sources, (parseSse(readFixture("sse-success.txt")).find((event) => event.event === "sources")?.data as { sources: unknown }).sources);
  const sources = JSON.stringify((events.find((event) => event.event === "sources")?.data as { sources: unknown }).sources);
  assert.equal(sources.includes("evil.example"), false);
  const answer = events.filter((event) => event.event === "token").map((event) => (event.data as { text: string }).text).join("");
  assert.match(answer, /evil\.example/);
  assert.equal(answer.includes("\"cite\""), false);
  assert.equal((chat.calls[0]?.[0]?.content), SYSTEM_RULES);
  assert.equal(chat.calls[0]?.[0]?.content.includes("你是谁"), false);
  assert.match(chat.calls[0]?.[1]?.content ?? "", /你是谁/);
  assert.equal(embedding.calls.length, 1);
});

test("追问会重新解析历史来源，孤立的弱检索不会硬答", async () => {
  const bundle = await createFixtureBundle([
    chunk({
      id: "cordis-uninstall-01",
      title: "DeepSeek Harness 的底层基石——Cordis（一）",
      url: "/posts/cordis-plugin-guide/",
      heading: "什么是 Cordis？",
      text: "卸载要看插件生命周期。",
      vector: [1, 0, 0],
    }),
  ]);
  const embedding = fixedEmbedding([0, 1, 0]);
  const chat = fixedChat(["根据上一篇来源回答。\n{\"cite\":[\"cordis-uninstall-01\"]}"]);
  const follow = await createAnswer(askRequest(readFixture("request-followup.json")), askEnv(), {
    bundle,
    database: createSqliteQuotaDatabase(),
    embedding,
    chat,
  });
  const events = await readEvents(follow);
  const fixtureSources = (parseSse(readFixture("sse-followup.txt")).find((event) => event.event === "sources")?.data as { sources: unknown }).sources;
  assert.deepEqual((events.find((event) => event.event === "sources")?.data as { sources: unknown }).sources, fixtureSources);
  assert.equal(chat.calls.length, 1);
  assert.match(embedding.calls[0] ?? "", /Cordis 插件怎么管理/);

  const freshChat = fixedChat(["不应调用"]);
  const freshEmbedding = fixedEmbedding([0, 1, 0]);
  const unrelated = await createAnswer(askRequest(JSON.stringify({
    question: "请详细说明一个公开文章里完全没有的税号和银行账户问题",
    history: JSON.parse(readFixture("request-followup.json")).history,
  })), askEnv(), {
    bundle,
    database: createSqliteQuotaDatabase(),
    embedding: freshEmbedding,
    chat: freshChat,
  });
  const refusal = await readEvents(unrelated);
  const text = refusal.filter((event) => event.event === "token").map((event) => (event.data as { text: string }).text).join("");
  assert.equal(text, MSG.refusal);
  assert.deepEqual((refusal.find((event) => event.event === "sources")?.data as { sources: unknown[] }).sources, []);
  assert.equal(freshChat.calls.length, 0);
});

test("没有证据时拒绝编造，额度仍然占用", async () => {
  const database = createSqliteQuotaDatabase();
  const chat = fixedChat(["不应调用"]);
  const response = await createAnswer(askRequest(readFixture("request-unknown.json")), askEnv(), {
    bundle: await aboutBundle(),
    database,
    embedding: fixedEmbedding([0, 1, 0]),
    chat,
  });
  const events = await readEvents(response);
  const text = events.filter((event) => event.event === "token").map((event) => (event.data as { text: string }).text).join("");
  assert.equal(text, (parseSse(readFixture("sse-refusal.txt")).find((event) => event.event === "token")?.data as { text: string }).text);
  assert.equal(chat.calls.length, 0);
  const key = await import("../src/quota.ts").then((quota) => quota.createQuotaKey("203.0.113.10", "test-hmac"));
  assert.equal((await findOneQuotaByKey(database, key))?.used, 1);
});

test("embedding 失败返回 502 且不退还次数", async () => {
  const database = createSqliteQuotaDatabase();
  const embedding = fixedEmbedding([1, 0, 0]);
  embedding.createEmbedding = async () => {
    throw new Error("boom sk-test-secret");
  };
  const response = await createAnswer(askRequest(readFixture("request-first.json")), askEnv(), {
    bundle: await aboutBundle(),
    database,
    embedding,
    chat: fixedChat(["不会出现"]),
  });
  assert.equal(response.status, 502);
  const body = await response.json() as { error: string; message: string; remaining: number };
  const fixture = readJsonFixture("http-502.json") as { error: string; message: string };
  assert.equal(body.error, fixture.error);
  assert.equal(body.message, fixture.message);
  assert.equal(Number.isInteger(body.remaining), true);
  assert.equal(JSON.stringify(body).includes("sk-test-secret"), false);
  const key = await import("../src/quota.ts").then((quota) => quota.createQuotaKey("203.0.113.10", "test-hmac"));
  assert.equal((await findOneQuotaByKey(database, key))?.used, 1);
});

test("第 21 次在调用 embedding 之前返回 429", async () => {
  const database = createSqliteQuotaDatabase();
  const embedding = fixedEmbedding([1, 0, 0]);
  const bundle = await aboutBundle();
  for (let index = 0; index < 20; index += 1) {
    const response = await createAnswer(askRequest(readFixture("request-first.json"), { ip: "203.0.113.20" }), askEnv(), {
      bundle,
      database,
      embedding,
      chat: fixedChat(["好"]),
    });
    assert.equal(response.status, 200);
    await response.text();
  }
  const blocked = await createAnswer(askRequest(readFixture("request-first.json"), { ip: "203.0.113.20" }), askEnv(), {
    bundle,
    database,
    embedding,
    chat: fixedChat(["不应出现"]),
  });
  assert.equal(blocked.status, 429);
  assert.deepEqual(await blocked.json(), readJsonFixture("http-429.json"));
  assert.equal(embedding.calls.length, 20);
});

test("同一 IP 并发第 21 个请求不会调用模型", async () => {
  const database = createSqliteQuotaDatabase();
  const embedding = fixedEmbedding([1, 0, 0]);
  const bundle = await aboutBundle();
  const responses = await Promise.all(Array.from({ length: 25 }, () => createAnswer(
    askRequest(readFixture("request-first.json"), { ip: "203.0.113.30" }),
    askEnv(),
    { bundle, database, embedding, chat: fixedChat(["好"]) },
  )));
  const statuses = await Promise.all(responses.map(async (response) => {
    const status = response.status;
    await response.text();
    return status;
  }));
  assert.equal(statuses.filter((status) => status === 200).length, 20);
  assert.equal(statuses.filter((status) => status === 429).length, 5);
  assert.equal(embedding.calls.length, 20);
});

test("生成中途失败发送 error 且不再发送 done", async () => {
  const chat: ChatAdapter = {
    provider: "mock",
    model: "mock-chat-v1",
    async *createChatStream() {
      yield "关于页";
      throw new Error("upstream");
    },
  };
  const response = await createAnswer(askRequest(readFixture("request-first.json")), askEnv(), {
    bundle: await aboutBundle(),
    database: createSqliteQuotaDatabase(),
    embedding: fixedEmbedding([1, 0, 0]),
    chat,
  });
  const events = await readEvents(response);
  assert.deepEqual(events.map((event) => event.event), ["meta", "token", "error"]);
  assert.equal((events.at(-1)?.data as { message: string }).message, MSG.streamError);
});

test("客户端取消会传到上游，并且不补 error 或 done", async () => {
  const controller = new AbortController();
  let sawAbort = false;
  const chat: ChatAdapter = {
    provider: "mock",
    model: "mock-chat-v1",
    async *createChatStream(_messages: ChatMessage[], signal?: AbortSignal) {
      yield "关于页";
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 5000);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          sawAbort = true;
          reject(new DOMException("aborted", "AbortError"));
        });
      });
      yield "第二段不应出现";
    },
  };
  const response = await createAnswer(askRequest(readFixture("request-first.json"), { signal: controller.signal }), askEnv(), {
    bundle: await aboutBundle(),
    database: createSqliteQuotaDatabase(),
    embedding: fixedEmbedding([1, 0, 0]),
    chat,
  });
  const reader = response.body?.getReader();
  assert.ok(reader);
  const decoder = new TextDecoder();
  let text = "";
  const first = await reader.read();
  text += decoder.decode(first.value);
  controller.abort();
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    text += decoder.decode(next.value);
  }
  assert.equal(sawAbort, true);
  assert.equal(text.includes("第二段不应出现"), false);
  assert.equal(text.includes("event: done"), false);
  assert.equal(text.includes("event: error"), false);
  assert.match(text, /event: meta/);
  assert.match(text, /关于页/);
});

test("服务端超时中止上游并写出锁定的错误事件", async () => {
  const chat: ChatAdapter = {
    provider: "mock",
    model: "mock-chat-v1",
    async *createChatStream(_messages, signal) {
      yield "关于页";
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, 1000);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    },
  };
  const response = await createAnswer(askRequest(readFixture("request-first.json")), askEnv(), {
    bundle: await aboutBundle(),
    database: createSqliteQuotaDatabase(),
    embedding: fixedEmbedding([1, 0, 0]),
    chat,
    timeoutMs: 30,
  });
  const events = await readEvents(response);
  assert.equal(events.at(-1)?.event, "error");
  assert.equal((events.at(-1)?.data as { message: string }).message, MSG.streamError);
  assert.equal(events.some((event) => event.event === "done"), false);
});

test("方法、路径和过大的正文使用锁定文案", async () => {
  const bundle = await aboutBundle();
  const database = createSqliteQuotaDatabase();
  const headers = new Headers({ origin: "https://shijayhuo.github.io", "content-type": "application/json", "cf-connecting-ip": "203.0.113.10" });
  const missing = await createAnswer(new Request("https://ask.example/other", { method: "POST", headers, body: "{}" }), askEnv(), { bundle, database });
  assert.equal((await missing.json() as { message: string }).message, MSG.notFound);
  const method = await createAnswer(new Request("https://ask.example/ask", { method: "GET", headers }), askEnv(), { bundle, database });
  assert.equal(method.status, 405);
  assert.equal((await method.json() as { message: string }).message, MSG.method);
  const huge = await createAnswer(new Request("https://ask.example/ask", {
    method: "POST",
    headers,
    body: `{"question":"${"问".repeat(20000)}"}`,
  }), askEnv(), { bundle, database });
  assert.equal(huge.status, 413);
  assert.equal((await huge.json() as { message: string }).message, MSG.tooLarge);
});

test("真实 embedding 配置不能查询哈希知识包，也不占用额度", async () => {
  const database = createSqliteQuotaDatabase();
  const embedding = fixedEmbedding([1, 0, 0]);
  const response = await createAnswer(
    askRequest(readFixture("request-first.json")),
    askEnv({
      EMBEDDING_API_KEY: "sk-test-secret",
      EMBEDDING_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      EMBEDDING_MODEL: "qwen3.7-text-embedding-flash",
      EMBEDDING_DIMENSIONS: "1024",
    }),
    { bundle: await aboutBundle(), database, embedding, chat: fixedChat(["不会出现"]) },
  );
  assert.equal(response.status, 503);
  assert.equal(embedding.calls.length, 0);
  assert.equal(await findOneQuotaByKey(database, await createQuotaKey("203.0.113.10", "test-hmac")), null);
});

test("允许的预检不占用额度", async () => {
  const database = createSqliteQuotaDatabase();
  const response = await createAnswer(new Request("https://ask.example/ask", {
    method: "OPTIONS",
    headers: { origin: "https://shijayhuo.github.io", "access-control-request-method": "POST" },
  }), askEnv(), { bundle: await aboutBundle(), database, embedding: fixedEmbedding([1, 0, 0]) });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://shijayhuo.github.io");
  assert.equal(await response.text(), "");
  const key = await import("../src/quota.ts").then((quota) => quota.createQuotaKey("203.0.113.10", "test-hmac"));
  assert.equal(await findOneQuotaByKey(database, key), null);
});
