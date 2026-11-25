import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { splitSections } from "../src/chunk.ts";
import { listPublishedPosts } from "../src/publish.ts";
import { blogFixture, repoRoot } from "./harness.ts";

const now = new Date("2026-11-25T12:00:00+08:00");

test("样例博客排除草稿、未发布、未来文章和版面页", () => {
  const documents = listPublishedPosts(blogFixture, now);
  const urls = documents.map((document) => document.url);
  assert.deepEqual(urls.sort(), ["/about/", "/posts/alpha/", "/posts/beta/"]);
  const text = documents.map((document) => document.body).join("\n");
  assert.match(text, /霍世杰/);
  assert.equal(text.includes("SECRET-HIDDEN-TOKEN"), false);
  assert.equal(text.includes("FUTURE-TOKEN"), false);
  assert.equal(text.includes("DRAFT-UNWIND-TOKEN"), false);
  assert.equal(text.includes("这段标签页不能入库"), false);
  assert.equal(text.includes("BAD-NAME-TOKEN"), false);
  assert.deepEqual(documents.find((document) => document.url === "/posts/alpha/")?.tags, ["插件"]);
});

test("长章节会按段落切开并保留标题路径", () => {
  const heading = "## 父\n### 子\n";
  const paragraph = `${"段落".repeat(300)}\n`;
  const sections = splitSections(`${heading}${paragraph}${paragraph}`);
  assert.ok(sections.length > 1);
  assert.equal(sections.every((section) => section.heading === "父 / 子"), true);
  assert.ok(sections.every((section) => section.text.length <= 1200));
});

test("真实仓库只留下已发布正文", () => {
  const documents = listPublishedPosts(repoRoot, now);
  const urls = new Set(documents.map((document) => document.url));
  assert.equal(urls.has("/about/"), true);
  assert.equal(urls.has("/posts/cordis-plugin-guide/"), true);
  for (const slug of ["career", "ai-is-making-us-impatient", "relearn-javascript-numbers"]) {
    assert.equal(urls.has(`/posts/${slug}/`), false);
  }
  assert.equal([...urls].some((url) => url === "/tags/" || url === "/categories/" || url === "/archives/"), false);
  const forbidden = ["FlowGPT", "连表 leftJoin、innerJoin", "DRAFT-UNWIND-TOKEN"];
  for (const document of documents) {
    assert.equal(document.sourcePath.includes("_drafts"), false);
    for (const word of forbidden) assert.equal(document.body.includes(word), false, document.sourcePath);
  }
  const questions = JSON.parse(readFileSync(path.join(import.meta.dirname, "../eval/questions.json"), "utf8")) as {
    questions: Array<{ expectUrls?: string[]; mustNotMention?: string[] }>;
  };
  for (const question of questions.questions) {
    for (const url of question.expectUrls ?? []) assert.equal(urls.has(url), true, url);
    for (const word of question.mustNotMention ?? []) {
      assert.equal(documents.some((document) => document.body.includes(word)), false, word);
    }
  }
});
