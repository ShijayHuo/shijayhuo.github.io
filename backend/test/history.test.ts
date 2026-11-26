import assert from "node:assert/strict";
import { test } from "node:test";
import { createAnswer } from "../src/handler.ts";
import { MSG } from "../src/limits.ts";
import { createQuotaKey, findOneQuotaByKey, updateQuotaByKey } from "../src/quota.ts";
import { askEnv, askRequest, chunk, createFixtureBundle, fixedChat, fixedEmbedding, readFixture } from "./harness.ts";
import { createSqliteQuotaDatabase } from "./sqlite-quota.ts";

const DAY_ONE = Date.parse("2026-11-25T15:30:00.000Z");
const DAY_TWO = Date.parse("2026-11-25T16:30:00.000Z");
const ORIGIN = "https://shijayhuo.github.io";

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

function historyRequest(ip: string, search = ""): Request {
  return new Request(`https://ask.example/ask/history${search}`, {
    method: "GET",
    headers: { origin: ORIGIN, "cf-connecting-ip": ip, "x-ask-dev-ip": "203.0.113.10" },
  });
}

test("同一 IP 当天的问答会回显，读取不占额度，伪造参数读不到别人的记录", async () => {
  const database = createSqliteQuotaDatabase();
  const embedding = fixedEmbedding([1, 0, 0]);
  const bundle = await aboutBundle();
  const deps = { bundle, database, embedding, chat: fixedChat(["特点。{\"cite\":[\"about-intro\",\"nope\"]}"]), now: () => DAY_ONE };
  const response = await createAnswer(askRequest(readFixture("request-first.json"), { ip: "203.0.113.10" }), askEnv(), deps);
  assert.equal(response.status, 200);
  await response.text();
  const key = await createQuotaKey("203.0.113.10", "test-hmac");
  const before = await findOneQuotaByKey(database, key);
  assert.equal(before?.used, 1);
  assert.equal(embedding.calls.length, 1);

  for (let index = 0; index < 3; index += 1) {
    const history = await createAnswer(historyRequest("203.0.113.10", "?ip=198.51.100.8&key=stolen&user=1"), askEnv(), deps);
    assert.equal(history.status, 200);
    assert.equal(history.headers.get("access-control-allow-origin"), ORIGIN);
    assert.equal(history.headers.get("cache-control"), "no-store");
    const body = await history.json() as { day: string; remaining: number; messages: Array<{ role: string; content: string; sources?: Array<{ url: string }> }> };
    assert.equal(body.day, "2026-11-25");
    assert.equal(body.remaining, 19);
    assert.equal(body.messages.length, 2);
    assert.equal(body.messages[0]?.role, "user");
    assert.equal(body.messages[0]?.content, "你是谁？");
    assert.equal(body.messages[1]?.content, "特点。");
    assert.equal(JSON.stringify(body).includes("cite"), false);
    assert.equal(JSON.stringify(body).includes("203.0.113.10"), false);
    assert.equal(JSON.stringify(body).includes(key), false);
    assert.deepEqual(body.messages[1]?.sources?.map((source) => source.url), ["/about/"]);
  }
  assert.equal((await findOneQuotaByKey(database, key))?.used, 1);
  assert.equal(embedding.calls.length, 1);

  const forgedBody = JSON.stringify({ question: "只属于这个 IP", history: [], ip: "198.51.100.9", key: key });
  const posted = await createAnswer(askRequest(forgedBody, { ip: "203.0.113.77" }), askEnv(), {
    ...deps,
    chat: fixedChat(["另一段回答。"]),
  });
  assert.equal(posted.status, 200);
  await posted.text();
  const stolen = await createAnswer(historyRequest("198.51.100.9", "?ip=203.0.113.77&key=" + key), askEnv(), deps);
  const stolenBody = await stolen.json() as { messages: unknown[]; remaining: number };
  assert.deepEqual(stolenBody.messages, []);
  assert.equal(stolenBody.remaining, 20);
  const owner = await createAnswer(historyRequest("203.0.113.77"), askEnv(), deps);
  const ownerBody = await owner.json() as { messages: Array<{ content: string }> };
  assert.equal(ownerBody.messages[0]?.content, "只属于这个 IP");
  assert.equal(ownerBody.messages.some((message) => message.content === "你是谁？"), false);
  assert.equal((await findOneQuotaByKey(database, key))?.used, 1);
});

test("跨过北京时间自然日后额度从 20 次重计，过期问答不再回显", async () => {
  const database = createSqliteQuotaDatabase();
  const embedding = fixedEmbedding([1, 0, 0]);
  const bundle = await aboutBundle();
  const env = askEnv();
  const key = await createQuotaKey("203.0.113.50", "test-hmac");
  for (let index = 0; index < 19; index += 1) {
    assert.equal((await updateQuotaByKey(database, key, DAY_ONE)).reserved, true);
  }
  const twentieth = await createAnswer(askRequest(readFixture("request-first.json"), { ip: "203.0.113.50" }), env, {
    bundle,
    database,
    embedding,
    chat: fixedChat(["第一天。"]),
    now: () => DAY_ONE,
  });
  assert.equal(twentieth.status, 200);
  await twentieth.text();
  const blocked = await createAnswer(askRequest(JSON.stringify({ question: "第 21 次", history: [] }), { ip: "203.0.113.50" }), env, {
    bundle,
    database,
    embedding,
    chat: fixedChat(["不应出现"]),
    now: () => DAY_ONE,
  });
  assert.equal(blocked.status, 429);
  assert.equal((await blocked.json() as { message: string }).message, MSG.quota);
  assert.equal(embedding.calls.length, 1);
  const sameDay = await createAnswer(historyRequest("203.0.113.50"), env, { bundle, database, embedding, now: () => DAY_ONE });
  const sameBody = await sameDay.json() as { remaining: number; messages: Array<{ content: string }> };
  assert.equal(sameBody.remaining, 0);
  assert.deepEqual(sameBody.messages.map((message) => message.content), ["你是谁？", "第一天。"]);

  const next = await createAnswer(askRequest(JSON.stringify({ question: "第二天", history: [] }), { ip: "203.0.113.50" }), env, {
    bundle,
    database,
    embedding,
    chat: fixedChat(["新的一天。"]),
    now: () => DAY_TWO,
  });
  assert.equal(next.status, 200);
  await next.text();
  assert.equal(embedding.calls.length, 2);
  const nextDay = await createAnswer(historyRequest("203.0.113.50"), env, { bundle, database, embedding, now: () => DAY_TWO });
  const nextBody = await nextDay.json() as { day: string; remaining: number; messages: Array<{ content: string }> };
  assert.equal(nextBody.day, "2026-11-26");
  assert.equal(nextBody.remaining, 19);
  assert.deepEqual(nextBody.messages.map((message) => message.content), ["第二天", "新的一天。"]);
  const stale = await database.prepare("SELECT day FROM ask_exchange WHERE day < ?1").bind("2026-11-26").all<{ day: string }>();
  const staleRows = Array.isArray(stale) ? stale : stale.results ?? [];
  assert.equal(staleRows.length, 0);
  assert.equal((await findOneQuotaByKey(database, key))?.used, 1);
});

test("读取历史不要求模型，错误来源和未配置都不占用额度", async () => {
  const database = createSqliteQuotaDatabase();
  const embedding = fixedEmbedding([1, 0, 0]);
  const missing = await createAnswer(historyRequest("203.0.113.10"), askEnv({ QUOTA_HMAC_KEY: "" }), {
    bundle: await aboutBundle(),
    database,
    embedding,
  });
  assert.equal(missing.status, 503);
  assert.equal((await missing.json() as { message: string }).message, MSG.unavailable);
  assert.equal(embedding.calls.length, 0);
  assert.equal(await findOneQuotaByKey(database, await createQuotaKey("203.0.113.10", "test-hmac")), null);
  const blocked = await createAnswer(new Request("https://ask.example/ask/history?ip=203.0.113.10", {
    method: "GET",
    headers: { origin: "https://evil.example", "cf-connecting-ip": "203.0.113.10" },
  }), askEnv(), { database, embedding, now: () => DAY_ONE });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);
  const nameless = await createAnswer(new Request("https://ask.example/ask/history", {
    method: "GET",
    headers: { origin: ORIGIN },
  }), askEnv(), { database, embedding, now: () => DAY_ONE });
  assert.equal(nameless.status, 403);
  assert.equal((await nameless.json() as { message: string }).message, MSG.ip);
  assert.equal(embedding.calls.length, 0);
});
