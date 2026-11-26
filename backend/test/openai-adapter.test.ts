import assert from "node:assert/strict";
import { test } from "node:test";
import { createOpenAIChat, createOpenAIEmbedding } from "../src/openai-adapter.ts";

const config = {
  apiKey: "sk-test-secret",
  baseURL: "https://models.example/v1",
  model: "embed-test",
  dimensions: 3,
};

const fast = { maxAttempts: 3, sleep: async () => {}, random: () => 0 };

test("embedding 适配器发送 float 批次字段，并把取消信号传给上游", async () => {
  let calls = 0;
  const adapter = createOpenAIEmbedding(config, async (url, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as { encoding_format: string; dimensions: number; input: string };
    assert.equal(String(url), "https://models.example/v1/embeddings");
    assert.equal(body.encoding_format, "float");
    assert.equal(body.dimensions, 3);
    assert.equal(body.input, "问题");
    assert.equal(JSON.stringify(body).includes("enable_thinking"), false);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer sk-test-secret");
    assert.equal(init?.signal?.aborted, false);
    return new Response(JSON.stringify({ data: [{ embedding: [1, 0, 0], index: 0 }], model: "embed-test" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }, fast);
  const vector = await adapter.createEmbedding("问题", new AbortController().signal);
  assert.deepEqual(vector, [1, 0, 0]);
  assert.equal(calls, 1);
});

test("embedding 拒绝模型不一致和零向量，500 有限重试，400 与密钥不重试进错误", async () => {
  const mismatch = createOpenAIEmbedding(config, async () => new Response(JSON.stringify({
    data: [{ embedding: [1, 0, 0], index: 0 }],
    model: "other-model",
  }), { status: 200 }), fast);
  await assert.rejects(() => mismatch.createEmbedding("问题"), /模型/);
  const zero = createOpenAIEmbedding(config, async () => new Response(JSON.stringify({
    data: [{ embedding: [0, 0, 0], index: 0 }],
    model: "embed-test",
  }), { status: 200 }), fast);
  await assert.rejects(() => zero.createEmbedding("问题"), /零/);
  let failedCalls = 0;
  const failed = createOpenAIEmbedding(config, async () => {
    failedCalls += 1;
    return new Response("sk-test-secret", { status: 500 });
  }, fast);
  const errorText = await failed.createEmbedding("问题").catch((error: Error) => error.message);
  assert.match(String(errorText), /失败/);
  assert.equal(String(errorText).includes("sk-test-secret"), false);
  assert.equal(failedCalls, 3);
  let clientCalls = 0;
  const clientError = createOpenAIEmbedding(config, async () => {
    clientCalls += 1;
    return new Response("sk-test-secret", { status: 400 });
  }, fast);
  await assert.rejects(() => clientError.createEmbedding("问题"), /400/);
  assert.equal(clientCalls, 1);
});

test("embedding 超过 10 条或单条 token 上限时不发送", async () => {
  let calls = 0;
  const adapter = createOpenAIEmbedding(config, async () => {
    calls += 1;
    return new Response("no", { status: 500 });
  }, fast);
  assert.ok(adapter.createEmbeddings);
  const embedBatch = adapter.createEmbeddings;
  await assert.rejects(() => embedBatch(Array.from({ length: 11 }, () => "短")), /上限/);
  await assert.rejects(() => adapter.createEmbedding("字".repeat(8193)), /8192/);
  assert.equal(calls, 0);
});

test("embedding 按 index 重排，并在 429 之后重试成功", async () => {
  let calls = 0;
  const adapter = createOpenAIEmbedding(config, async (_url, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as { input: string[] };
    assert.equal(Array.isArray(body.input), true);
    if (calls === 1) return new Response("busy", { status: 429 });
    return new Response(JSON.stringify({
      model: "embed-test",
      data: [
        { index: 1, embedding: [0, 1, 0] },
        { index: 0, embedding: [1, 0, 0] },
      ],
    }), { status: 200 });
  }, fast);
  const vectors = await adapter.createEmbeddings?.(["甲", "乙"]);
  assert.equal(calls, 2);
  assert.deepEqual(vectors, [[1, 0, 0], [0, 1, 0]]);
});

test("生成适配器只接收流式 Chat Completions，并跳过坏行和思考字段", async () => {
  const chat = createOpenAIChat({ ...config, model: "deepseek-v4.1-flash" }, async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    assert.deepEqual(Object.keys(body).sort(), ["max_tokens", "messages", "model", "stream"]);
    assert.equal(body.stream, true);
    assert.equal(body.max_tokens, 800);
    assert.equal(JSON.stringify(body).includes("enable_thinking"), false);
    assert.equal(JSON.stringify(body).includes("reasoning_effort"), false);
    const sse = [
      'data: {"choices":[{"delta":{"reasoning_content":"不要泄露思考"}}]}',
      "",
      'data: {"choices":[{"delta":{"reasoning_content":"仍然不要","content":"你"}}]}',
      "",
      "data: NOT JSON",
      "",
      'data: {"choices":[{"delta":{"content":[{"type":"text","text":"好"}]}}]}',
      "",
      "data: [DONE]",
      "",
    ].join("\n");
    return new Response(sse, { status: 200, headers: { "content-type": "text/event-stream" } });
  });
  let text = "";
  for await (const part of chat.createChatStream([{ role: "user", content: "问" }])) text += part;
  assert.equal(text, "你好");
  assert.equal(text.includes("不要泄露"), false);
  assert.equal(text.includes("思考"), false);
  const jsonChat = createOpenAIChat({ ...config, model: "chat-test" }, async () => new Response(
    JSON.stringify({ error: "not stream" }),
    { status: 200, headers: { "content-type": "application/json" } },
  ));
  await assert.rejects(async () => {
    for await (const part of jsonChat.createChatStream([{ role: "user", content: "问" }])) part;
  }, /流式/);
});
