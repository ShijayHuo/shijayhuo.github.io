import assert from "node:assert/strict";
import { test } from "node:test";
import { validateVector } from "../src/knowledge.ts";
import { cosineSimilarity, findChunksByQuery } from "../src/retrieve.ts";
import { chunk, createFixtureBundle } from "./harness.ts";

test("余弦相似度识别同向、正交和零向量", () => {
  assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
  assert.ok(Math.abs(cosineSimilarity([1, 0], [1, 1]) - 1 / Math.sqrt(2)) < 1e-12);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(Number.isNaN(cosineSimilarity([0, 0], [1, 0])), true);
  assert.equal(Number.isNaN(cosineSimilarity([1, 0], [Number.NaN, 0])), true);
  assert.match(validateVector([], 2) ?? "", /空/);
  assert.match(validateVector([0, 0], 2) ?? "", /零/);
  assert.match(validateVector([1], 2) ?? "", /维度/);
});

test("低分命中不会因为排在前面就被当成证据", async () => {
  const bundle = await createFixtureBundle([
    chunk({ id: "near", text: "接近但不够", url: "/posts/near-topic/", vector: [1, 1], title: "接近" }),
    chunk({ id: "exact", text: "完全对应", url: "/posts/exact-topic/", vector: [1, 0], title: "对应" }),
  ]);
  const hits = findChunksByQuery(bundle, [1, 0], 5);
  assert.equal(hits[0]?.id, "exact");
  assert.equal(hits.filter((hit) => hit.score >= 0.9).length, 1);
  assert.equal(hits.filter((hit) => hit.score >= 0.9)[0]?.url, "/posts/exact-topic/");
});

test("查询向量维度不一致时检索直接失败", async () => {
  const bundle = await createFixtureBundle([
    chunk({ id: "only", text: "正文", url: "/posts/only-topic/", vector: [1, 0] }),
  ]);
  assert.throws(() => findChunksByQuery(bundle, [1, 0, 0], 5), /维度/);
});
