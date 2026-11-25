import assert from "node:assert/strict";
import { test } from "node:test";
import { createKnowledgeBundle } from "../src/bundle.ts";
import { createMockEmbedding } from "../src/mock-adapter.ts";
import { removeChunksWithDocument } from "../src/knowledge.ts";
import { listPublishedPosts } from "../src/publish.ts";
import type { EmbeddingAdapter, PublishedDocument } from "../src/types.ts";
import { blogFixture } from "./harness.ts";

function counting(inner: EmbeddingAdapter): EmbeddingAdapter & { calls: number } {
  const state = { calls: 0 };
  return {
    provider: inner.provider,
    model: inner.model,
    dimensions: inner.dimensions,
    get calls() {
      return state.calls;
    },
    async createEmbedding(input, signal) {
      state.calls += 1;
      return inner.createEmbedding(input, signal);
    },
  };
}

function withBody(document: PublishedDocument, body: string): PublishedDocument {
  return { ...document, body, contentHash: `edited-${body.length}` };
}

test("增删改只重嵌变化的切片，换模型则全部重嵌", async () => {
  const now = new Date("2026-11-25T12:00:00+08:00");
  const documents = listPublishedPosts(blogFixture, now);
  const firstEmbedding = counting(createMockEmbedding());
  const first = await createKnowledgeBundle({ documents, embedding: firstEmbedding, cache: null, now });
  assert.equal(first.embedded, first.bundle.chunks.length);
  assert.equal(first.reused, 0);
  assert.equal(first.bundle.manifest.embedding.provider, "mock");

  const same = counting(createMockEmbedding());
  const second = await createKnowledgeBundle({ documents, embedding: same, cache: first.cache, now });
  assert.equal(same.calls, 0);
  assert.equal(second.reused, first.bundle.chunks.length);

  const edited = documents.map((document) => document.slug === "alpha" ? withBody(document, "插件卸载步骤已经改写。") : document);
  const editedEmbedding = counting(createMockEmbedding());
  const third = await createKnowledgeBundle({ documents: edited, embedding: editedEmbedding, cache: second.cache, now });
  assert.ok(editedEmbedding.calls > 0);
  assert.ok(editedEmbedding.calls < first.bundle.chunks.length);
  assert.match(third.bundle.chunks.map((chunk) => chunk.text).join("\n"), /已经改写/);

  const removed = edited.filter((document) => document.slug !== "beta");
  const removedEmbedding = counting(createMockEmbedding());
  const fourth = await createKnowledgeBundle({ documents: removed, embedding: removedEmbedding, cache: third.cache, now });
  assert.equal(fourth.bundle.chunks.some((chunk) => chunk.url === "/posts/beta/"), false);
  assert.equal(removeChunksWithDocument(third.bundle.chunks, "/posts/beta/").some((chunk) => chunk.url === "/posts/beta/"), false);

  const renamed = createMockEmbedding();
  renamed.model = "mock-embedding-v2";
  const renamedCounter = counting(renamed);
  const fifth = await createKnowledgeBundle({ documents: removed, embedding: renamedCounter, cache: fourth.cache, now });
  assert.equal(renamedCounter.calls, fifth.bundle.chunks.length);
  assert.notEqual(fifth.bundle.manifest.knowledgeVersion, fourth.bundle.manifest.knowledgeVersion);
});
