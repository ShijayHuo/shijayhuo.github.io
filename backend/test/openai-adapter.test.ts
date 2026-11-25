import assert from "node:assert/strict";
import { test } from "node:test";
import { createOpenAIChat, createOpenAIEmbedding } from "../src/openai-adapter.ts";

const config = {
  apiKey: "sk-test-secret",
  baseURL: "https://models.example/v1",
  model: "embed-test",
  dimensions: 3,
};

test("embedding 适配器把取消信号传给上游且不重试", async () => {
  let calls = 0;
  const adapter = createOpenAIEmbedding(config, async (url, init) => {
    calls += 1;
    assert.equal(String(url), "https://models.example/v1/embeddings");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer sk-test-secret");
    assert.equal(init?.signal?.aborted, false);
    return new Response(JSON.stringify({ data: [{ embedding: [1, 0, 0] }], model: "embed-test" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  const vector = await adapter.createEmbedding("问题", new AbortController().signal);
  assert.deepEqual(vector, [1, 0, 0]);
  assert.equal(calls, 1);
});

test("embedding 拒绝模型不一致、空向量和非流式失败", async () => {
  const mismatch = createOpenAIEmbedding(config, async () => new Response(JSON.stringify({
    data: [{ embedding: [1, 0, 0] }],
    model: "other-model",
  }), { status: 200 }));
  await assert.rejects(() => mismatch.createEmbedding("问题"), /模型/);
  const zero = createOpenAIEmbedding(config, async () => new Response(JSON.stringify({
    data: [{ embedding: [0, 0, 0] }],
    model: "embed-test",
  }), { status: 200 }));
  await assert.rejects(() => zero.createEmbedding("问题"), /零/);
  let failedCalls = 0;
  const failed = createOpenAIEmbedding(config, async () => {
    failedCalls += 1;
    return new Response("no", { status: 500 });
  });
  await assert.rejects(() => failed.createEmbedding("问题"), /失败/);
  assert.equal(failedCalls, 1);
  const errorText = await failed.createEmbedding("问题").catch((error: Error) => error.message);
  assert.equal(String(errorText).includes("sk-test-secret"), false);
});

test("生成适配器只接收流式 Chat Completions，并跳过坏行", async () => {
  const chat = createOpenAIChat({ ...config, model: "chat-test" }, async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { stream: boolean; max_tokens: number };
    assert.equal(body.stream, true);
    assert.equal(body.max_tokens, 800);
    const sse = [
      'data: {"choices":[{"delta":{"content":"你"}}]}',
      "",
      "data: NOT JSON",
      "",
      "data: [DONE]",
      "",
    ].join("\n");
    return new Response(sse, { status: 200, headers: { "content-type": "text/event-stream" } });
  });
  let text = "";
  for await (const part of chat.createChatStream([{ role: "user", content: "问" }])) text += part;
  assert.equal(text, "你");
  const jsonChat = createOpenAIChat({ ...config, model: "chat-test" }, async () => new Response(
    JSON.stringify({ error: "not stream" }),
    { status: 200, headers: { "content-type": "application/json" } },
  ));
  await assert.rejects(async () => {
    for await (const part of jsonChat.createChatStream([{ role: "user", content: "问" }])) part;
  }, /流式/);
});
