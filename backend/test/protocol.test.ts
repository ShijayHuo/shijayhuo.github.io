import assert from "node:assert/strict";
import { test } from "node:test";
import { MSG } from "../src/limits.ts";
import { createRetrievalQuery, createSourceList, isFollowUpQuestion, parseAskRequest } from "../src/protocol.ts";
import { listAllowedOrigins } from "../src/handler.ts";
import { readFixture, parseSse } from "./harness.ts";

test("契约样例能被同一套 SSE 规则解析", () => {
  for (const name of ["sse-success.txt", "sse-followup.txt", "sse-refusal.txt", "sse-upstream-error.txt", "sse-cancelled.txt"]) {
    const events = parseSse(readFixture(name));
    assert.equal(events[0]?.event, "meta");
    assert.equal(typeof (events[0].data as { remaining: number }).remaining, "number");
  }
  const refusal = parseSse(readFixture("sse-refusal.txt")).filter((event) => event.event === "token")
    .map((event) => (event.data as { text: string }).text).join("");
  assert.equal(refusal, MSG.refusal);
  const cancelled = parseSse(readFixture("sse-cancelled.txt")).map((event) => event.event);
  assert.deepEqual(cancelled.includes("done"), false);
  assert.deepEqual(cancelled.includes("error"), false);
});

test("请求约束按契约拒绝", () => {
  assert.equal(parseAskRequest("{"), MSG.notJson);
  assert.equal(parseAskRequest(readFixture("request-empty.json")), MSG.emptyQuestion);
  assert.equal(parseAskRequest(readFixture("request-bad-role.json")), MSG.badHistory);
  const first = parseAskRequest(readFixture("request-first.json"));
  assert.equal(typeof first === "string", false);
  assert.equal(parseAskRequest(JSON.stringify({ question: "好".repeat(2001) })), MSG.questionTooLong);
  assert.equal(parseAskRequest(JSON.stringify({ question: "好", history: [{ role: "user", content: "x".repeat(4001) }] })), MSG.badHistory);
});

test("追问检索带上最近的用户问题，而不是只看最后一句", () => {
  const follow = parseAskRequest(readFixture("request-followup.json"));
  assert.equal(typeof follow === "string", false);
  if (typeof follow === "string") return;
  assert.equal(isFollowUpQuestion(follow.question), true);
  const query = createRetrievalQuery(follow.question, follow.history);
  assert.match(query, /Cordis 插件怎么管理/);
  assert.match(query, /那这个怎么卸载/);
  assert.equal(isFollowUpQuestion("请详细说明一个公开文章里完全没有的税号和银行账户问题"), false);
});

test("来源只保留站内地址并按地址去重", () => {
  const links = createSourceList([
    { id: "about-intro", title: "关于", url: "/about/", heading: "" },
    { id: "again", title: "重复", url: "/about/", heading: "二" },
    { id: "evil", title: "坏", url: "https://evil.example/phish", heading: "" },
  ]);
  assert.deepEqual(links, [{ id: "about-intro", title: "关于", url: "/about/", heading: "" }]);
});

test("来源名单空值和通配符都拒绝", () => {
  assert.deepEqual(listAllowedOrigins({}), ["https://shijayhuo.github.io"]);
  assert.deepEqual(listAllowedOrigins({ ASK_ALLOWED_ORIGINS: "" }), []);
  assert.deepEqual(listAllowedOrigins({ ASK_ALLOWED_ORIGINS: "*" }), []);
  assert.deepEqual(listAllowedOrigins({ ASK_ALLOWED_ORIGINS: "https://a.example, https://b.example" }), ["https://a.example", "https://b.example"]);
});
