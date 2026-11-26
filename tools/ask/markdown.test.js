"use strict";

var assert = require("node:assert/strict");
var fs = require("node:fs");
var test = require("node:test");
var path = require("path");

var markdown = require(path.join(__dirname, "../../assets/js/ask-markdown.js"));

function tags(html) {
  return html.match(/<\/?[A-Za-z][^>]*>/g) || [];
}

function bubble() {
  return { textContent: "", innerHTML: "", classList: { add: function () {}, remove: function () {} } };
}

function shown(el) {
  if (el.innerHTML && el.innerHTML.indexOf("<") >= 0) return el.innerHTML;
  return el.textContent;
}

test("回答渲染段落、加粗、斜体、列表和行内代码", function () {
  var html = markdown.answerHtml([
    "从公开文章看，特点主要有：",
    "",
    "- **全栈型技术背景**：以前是 CV 工程师",
    "- *协作* 与 `code`",
    "",
    "1. 第一点",
    "2. 第二点",
    "",
    "同一段",
    "换行"
  ].join("\n"));
  assert.match(html, /<p>从公开文章看，特点主要有：<\/p>/);
  assert.match(html, /<ul><li><strong>全栈型技术背景<\/strong>：以前是 CV 工程师<\/li><li><em>协作<\/em> 与 <code>code<\/code><\/li><\/ul>/);
  assert.match(html, /<ol><li>第一点<\/li><li>第二点<\/li><\/ol>/);
  assert.match(html, /<p>同一段<br>换行<\/p>/);
  assert.equal(markdown.htmlIsSafe(html), true);
  tags(html).forEach(function (tag) {
    assert.match(tag, /^<\/?(p|strong|em|code|ul|ol|li|br)>$/);
  });
});

test("模型写下的 HTML 和链接不会变成可执行或可点的标记", function () {
  var raw = "<script>alert(1)</script><img src=x onerror=alert(1)>";
  var escaped = markdown.answerHtml(raw);
  assert.equal(escaped.includes("<script"), false);
  assert.equal(escaped.includes("<img"), false);
  assert.match(escaped, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  var linked = markdown.answerHtml("看 [点我](javascript:alert(1)) 和 https://evil.example/phish");
  assert.equal(linked.includes("<a"), false);
  assert.equal(linked.includes("href"), false);
  assert.match(linked, /javascript:alert\(1\)/);
  assert.match(linked, /https:\/\/evil\.example\/phish/);
  var mixed = markdown.answerHtml("**加粗** <script>alert(1)</script> ` <b>`");
  assert.equal(mixed.includes("<script"), false);
  assert.equal(mixed.includes("<b>"), false);
  assert.match(mixed, /<strong>加粗<\/strong>/);
  assert.match(mixed, /&lt;script&gt;/);
  assert.match(mixed, /<code> &lt;b&gt;<\/code>/);
  assert.equal(markdown.htmlIsSafe(mixed), true);
  var el = bubble();
  markdown.fillAnswer(el, raw);
  assert.equal(el.textContent, raw);
  assert.equal(el.innerHTML, "");
});

test("未闭合的加粗、代码和列表仍然可读", function () {
  assert.match(markdown.answerHtml("**加粗未完"), /<strong>加粗未完<\/strong>/);
  assert.match(markdown.answerHtml("行内 `code"), /<code>code<\/code>/);
  assert.match(markdown.answerHtml("- 还没写完的一项"), /<ul><li>还没写完的一项<\/li><\/ul>/);
  assert.match(markdown.answerHtml("集合 {a, b} 与 snake_case 和 5 * 3"), /集合 \{a, b\} 与 snake_case 和 5 \* 3/);
  assert.equal(markdown.answerHtml("集合 {a, b} 与 snake_case 和 5 * 3").includes("<em"), false);
});

test("气泡里不出现 cite JSON", function () {
  var glued = "整体看，他呈现出特点。{\"cite\":[\"5eae0b233859c405\",\"4b39ee2766f4625b\",\"7f5b0953f1ecc206\",\"b71e422ad3139ef9\"]}";
  var el = bubble();
  markdown.fillAnswer(el, glued);
  assert.equal(shown(el).includes("cite"), false);
  assert.equal(shown(el).includes("5eae0b"), false);
  assert.match(shown(el), /特点。/);

  var lined = markdown.answerHtml("只根据 Redis 那篇回答。\n{\"cite\":[\"redis-io\"]}");
  assert.equal(lined.includes("cite"), false);
  assert.match(lined, /Redis/);

  var fenced = markdown.answerHtml("只采用 Redis。\n```json\n{\"cite\":[\"redis-io\"]}\n```");
  assert.equal(fenced.includes("cite"), false);
  assert.equal(fenced.includes("```"), false);
  assert.match(fenced, /Redis/);

  var streaming = markdown.answerHtml("特点。{\"cite\":[\"abc", { streaming: true });
  assert.equal(streaming.includes("cite"), false);
  assert.match(streaming, /特点。/);

  var markdownAndCite = markdown.answerHtml([
    "特点主要有：",
    "",
    "- **全栈**：以前是 CV",
    "",
    "{\"cite\":[\"about-intro\"]}"
  ].join("\n"));
  assert.match(markdownAndCite, /<strong>全栈<\/strong>/);
  assert.equal(markdownAndCite.includes("cite"), false);
  assert.equal(markdownAndCite.includes("about-intro"), false);
});

test("问答页在界面脚本之前加载 Markdown 渲染", function () {
  ["_includes/ask-chat.html", "_includes/ask-hero.html", "tools/ask/build-preview.js"].forEach(function (file) {
    var source = fs.readFileSync(path.join(__dirname, "../..", file), "utf8");
    var markdownAt = source.indexOf("ask-markdown.js");
    var demoAt = source.indexOf("ask-demo.js");
    assert.ok(markdownAt >= 0, file);
    assert.ok(demoAt > markdownAt, file);
  });
  var demo = fs.readFileSync(path.join(__dirname, "../../assets/js/ask-demo.js"), "utf8");
  assert.match(demo, /fillAnswer\(el, value, \{ streaming: !!message\.pending \}\)/);
  assert.match(demo, /message\.role === "user"[\s\S]*el\.textContent = value/);
});
