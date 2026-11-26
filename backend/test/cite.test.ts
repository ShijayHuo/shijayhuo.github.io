import assert from "node:assert/strict";
import { test } from "node:test";
import { createAnswer } from "../src/handler.ts";
import { createCitationSplitter, readCitation, sourcesFromCitations } from "../src/cite.ts";
import type { ChatAdapter, ChatMessage } from "../src/types.ts";
import { askEnv, askRequest, chunk, createFixtureBundle, fixedEmbedding, readEvents } from "./harness.ts";
import { createSqliteQuotaDatabase } from "./sqlite-quota.ts";

test("引用行只接受 cite 数组，正文里的网址不能变成来源", () => {
  assert.deepEqual(readCitation('{"cite":["redis-io","redis-thread"]}'), { cited: true, ids: ["redis-io", "redis-thread"] });
  assert.deepEqual(readCitation('{"cite":[]}'), { cited: true, ids: [] });
  assert.deepEqual(readCitation("公开文章里没有足够依据。"), { cited: false });
  assert.deepEqual(readCitation('见 https://evil.example/phish {"cite":["about-intro"]}'), { cited: false });
  const links = sourcesFromCitations([
    { id: "redis-io", title: "为什么 Redis 快", url: "/posts/why-redis-is-fast/", heading: "IO" },
    { id: "import-01", title: "百万导入", url: "/posts/million-import/", heading: "" },
    { id: "evil", title: "坏", url: "https://evil.example/phish", heading: "" },
  ], ["missing", "import-01", "evil"]);
  assert.deepEqual(links.map((item) => item.url), ["/posts/million-import/"]);
});

test("流式切分会留下最后的引用行，并立刻送出普通正文", () => {
  const splitter = createCitationSplitter();
  assert.equal(splitter.push("关于页"), "关于页");
  const streamed = splitter.push("\nRedis 用内存和多路复用。\n{\"cite\":[\"redis-io\",");
  assert.match(streamed, /Redis/);
  assert.equal(streamed.includes("cite"), false);
  assert.equal(splitter.push("\"redis-thread\"]}").includes("cite"), false);
  assert.deepEqual(splitter.finish(), { text: "", citedIds: ["redis-io", "redis-thread"] });
  const fenced = createCitationSplitter();
  const visible = fenced.push("只采用 Redis。\n```json\n{\"cite\":[\"redis-io\"]}\n```");
  assert.match(visible, /Redis/);
  assert.equal(visible.includes("cite"), false);
  assert.equal(visible.includes("```"), false);
  assert.deepEqual(fenced.finish().citedIds, ["redis-io"]);
});

test("模型拒答或只点名一篇时，来源是证据交集", async () => {
  const bundle = await createFixtureBundle([
    chunk({ id: "about-intro", title: "关于", url: "/about/", heading: "", text: "关于页。", vector: [1, 0, 0] }),
    chunk({ id: "mongo-01", title: "Mongo", url: "/posts/mongo-expr/", heading: "", text: "表达式。", vector: [1, 0, 0] }),
    chunk({ id: "redis-io", title: "为什么 Redis 快", url: "/posts/why-redis-is-fast/", heading: "IO", text: "多路复用。", vector: [1, 0, 0] }),
    chunk({ id: "import-01", title: "百万导入", url: "/posts/million-import/", heading: "", text: "批量导入。", vector: [1, 0, 0] }),
  ]);
  const refuse: ChatAdapter = {
    provider: "mock",
    model: "mock-chat-v1",
    async *createChatStream() {
      yield "公开文章里没有足够依据回答这个问题。\n{\"ci";
      yield "te\":[]}";
    },
  };
  const refused = await createAnswer(askRequest(JSON.stringify({ question: "一个公开文章没有写过的数字是多少？", history: [] })), askEnv(), {
    bundle,
    database: createSqliteQuotaDatabase(),
    embedding: fixedEmbedding([1, 0, 0]),
    chat: refuse,
  });
  const refusedEvents = await readEvents(refused);
  const refusedText = refusedEvents.filter((event) => event.event === "token").map((event) => (event.data as { text: string }).text).join("");
  assert.match(refusedText, /没有足够依据/);
  assert.equal(refusedText.includes("cite"), false);
  assert.deepEqual((refusedEvents.find((event) => event.event === "sources")?.data as { sources: unknown[] }).sources, []);

  const calls: ChatMessage[][] = [];
  const support: ChatAdapter = {
    provider: "mock",
    model: "mock-chat-v1",
    async *createChatStream(messages: ChatMessage[]) {
      calls.push(messages);
      yield "只根据 Redis 那篇回答。\n{\"cite\":[\"redis-io\",\"https://evil.example/phish\"]}";
    },
  };
  const supported = await createAnswer(askRequest(JSON.stringify({ question: "这种数据库为什么读写延迟比较低？", history: [] })), askEnv(), {
    bundle,
    database: createSqliteQuotaDatabase(),
    embedding: fixedEmbedding([1, 0, 0]),
    chat: support,
  });
  const events = await readEvents(supported);
  const text = events.filter((event) => event.event === "token").map((event) => (event.data as { text: string }).text).join("");
  assert.equal(text.includes("cite"), false);
  assert.equal(text.includes("evil.example"), false);
  const sources = (events.find((event) => event.event === "sources")?.data as { sources: Array<{ url: string }> }).sources;
  assert.deepEqual(sources.map((item) => item.url), ["/posts/why-redis-is-fast/"]);
  assert.match(calls[0]?.[1]?.content ?? "", /\[redis-io\]/);
  assert.match(calls[0]?.[1]?.content ?? "", /\[import-01\]/);
});

test("贴在句号后面的 cite 会拆掉，非法 id 不进 sources", () => {
  const splitter = createCitationSplitter();
  const visible = splitter.push("整体看，他呈现出特点。{\"cite\":[\"5eae0b233859c405\",\"4b39ee2766f4625b\",\"bad id\",\"\",1]}");
  assert.equal(visible.includes("cite"), false);
  assert.equal(visible.includes("5eae0b"), false);
  assert.match(visible, /特点。$/);
  const done = splitter.finish();
  assert.equal(done.text, "");
  assert.deepEqual(done.citedIds, ["5eae0b233859c405", "4b39ee2766f4625b", "bad id"]);
  const links = sourcesFromCitations([
    { id: "5eae0b233859c405", title: "关于", url: "/about/", heading: "" },
    { id: "4b39ee2766f4625b", title: "另一篇", url: "/posts/another-note/", heading: "小节" },
    { id: "not-cited", title: "未点名", url: "/posts/other-note/", heading: "" },
  ], done.citedIds);
  assert.deepEqual(links.map((item) => item.url), ["/about/", "/posts/another-note/"]);

  const spaced = createCitationSplitter();
  assert.equal(spaced.push("只采用 Redis。{ \"cite\" : [ \"redis-io\" ] }").includes("cite"), false);
  assert.deepEqual(spaced.finish().citedIds, ["redis-io"]);

  const partial = createCitationSplitter();
  assert.equal(partial.push("特点。{"), "特点。");
  const rest = partial.push("\"cite\":[\"redis-io\"]}后面");
  assert.equal(rest.includes("cite"), false);
  assert.match(rest, /后面/);
  assert.deepEqual(partial.finish().citedIds, ["redis-io"]);

  const onlyBad = createCitationSplitter();
  const refused = onlyBad.push("没有足够依据。{\"cite\":[\"bad id\",\"\"]}");
  assert.match(refused, /没有足够依据/);
  assert.equal(refused.includes("cite"), false);
  assert.deepEqual(sourcesFromCitations([
    { id: "5eae0b233859c405", title: "关于", url: "/about/", heading: "" },
  ], onlyBad.finish().citedIds), []);

  const braces = createCitationSplitter();
  assert.equal(braces.push("集合 {a, b} 就这样。"), "集合 {a, b} 就这样。");
  assert.deepEqual(braces.finish(), { text: "", citedIds: [] });
});

test("独立末行和代码块里的 cite 仍然不会进正文", () => {
  const line = createCitationSplitter();
  const streamed = line.push("只根据 Redis 那篇回答。\n{\"cite\":[\"redis-io\"]}");
  assert.match(streamed, /Redis/);
  assert.equal(streamed.includes("cite"), false);
  assert.deepEqual(line.finish(), { text: "", citedIds: ["redis-io"] });

  const pretty = createCitationSplitter();
  const shown = pretty.push("特点。\n{\n  \"cite\": [\"redis-io\"]\n}\n");
  assert.equal(shown.includes("cite"), false);
  assert.match(shown, /特点/);
  assert.deepEqual(pretty.finish().citedIds, ["redis-io"]);

  const code = createCitationSplitter();
  const kept = code.push("看代码。\n```js\nconst x = {a: 1};\n```\n结束");
  assert.match(kept, /const x = \{a: 1\}/);
  assert.match(kept, /结束/);
  assert.deepEqual(code.finish().citedIds, []);
});

test("同行 cite 经回答接口后不进 token，来源是证据交集", async () => {
  const bundle = await createFixtureBundle([
    chunk({ id: "5eae0b233859c405", title: "关于", url: "/about/", heading: "", text: "关于页。", vector: [1, 0, 0] }),
    chunk({ id: "not-cited", title: "别的", url: "/posts/other-note/", heading: "", text: "别的。", vector: [1, 0, 0] }),
  ]);
  const chat: ChatAdapter = {
    provider: "mock",
    model: "mock-chat-v1",
    async *createChatStream() {
      yield "整体看，他呈现出特点。{\"cite\":[\"5eae0b233859c405\",\"missing\",\"https://evil.example/phish\"]}";
    },
  };
  const response = await createAnswer(askRequest(JSON.stringify({ question: "介绍一下阿杰", history: [] })), askEnv(), {
    bundle,
    database: createSqliteQuotaDatabase(),
    embedding: fixedEmbedding([1, 0, 0]),
    chat,
  });
  const events = await readEvents(response);
  const text = events.filter((event) => event.event === "token").map((event) => (event.data as { text: string }).text).join("");
  assert.match(text, /特点/);
  assert.equal(text.includes("cite"), false);
  assert.equal(text.includes("evil.example"), false);
  const sources = (events.find((event) => event.event === "sources")?.data as { sources: Array<{ url: string }> }).sources;
  assert.deepEqual(sources.map((item) => item.url), ["/about/"]);
});
