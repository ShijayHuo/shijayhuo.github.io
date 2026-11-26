#!/usr/bin/env node
/* Build a self-contained ask preview. It is not a deployment.
   Article links point at the public site. Answers replay the contract fixtures. */
"use strict";

var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "../..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function inlineScript(source) {
  return source.replace(/<\/script/gi, "<\\/script");
}

function askCss() {
  var scss = read("assets/css/jekyll-theme-chirpy.scss");
  var start = scss.indexOf("/* ASK_DEMO_CSS_START */");
  var end = scss.indexOf("/* ASK_DEMO_CSS_END */");
  if (start < 0 || end < start) throw new Error("ask css markers missing");
  return scss.slice(start, end);
}

var posts = [
  ["这个时代到底需要什么样的开发者？", "/posts/developers-in-the-ai-era/"],
  ["漫谈架构师", "/posts/talking-about-architects/"],
  ["RxJS 全面解析", "/posts/rxjs-complete-guide/"],
  ["PingCode Wiki 权限设计之ACL", "/posts/pingcode-wiki-acl-permission-design/"],
  ["软件的 AI 味儿——Don't make me think", "/posts/ai-taste-dont-make-me-think/"],
  ["领域驱动设计实践总结", "/posts/domain-driven-design-and-layered-architecture/"]
];

var postHtml = posts.map(function (post) {
  var href = "https://shijayhuo.github.io" + post[1];
  return '<a class="post-link" href="' + href + '" target="_blank" rel="noopener noreferrer">' + post[0] + "</a>";
}).join("\n");

var html = `<!DOCTYPE html>
<html lang="zh-CN" data-ask-demo="false" data-ask-api="" data-ask-transport="mock" data-bs-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>本地预览 · Ajie's 思源地问答</title>
  <style>
    :root[data-bs-theme="light"] {
      color-scheme: light;
      --main-bg: #fff;
      --text-color: #34343c;
      --text-muted-color: #757575;
      --heading-color: #2a2a2a;
      --link-color: #0056b2;
      --btn-border-color: #e9ecef;
      --sidebar-bg: #f6f8fa;
      --sidebar-active: #1d1d1d;
      --main-border-color: #f3f3f3;
    }
    :root[data-bs-theme="dark"] {
      color-scheme: dark;
      --main-bg: rgb(27, 27, 30);
      --text-color: rgb(175, 176, 177);
      --text-muted-color: #868686;
      --heading-color: #ccc;
      --link-color: rgb(138, 180, 248);
      --btn-border-color: #2e2f31;
      --sidebar-bg: #161618;
      --sidebar-active: #eee;
      --main-border-color: rgb(44, 45, 45);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--main-bg);
      color: var(--text-color);
      font-family: "Source Sans Pro", "Microsoft Yahei", sans-serif;
    }
    a { color: var(--link-color); }
    .preview-banner {
      margin: 0;
      padding: 0.45rem 1rem;
      background: var(--sidebar-bg);
      color: var(--text-muted-color);
      font-size: 0.82rem;
      text-align: center;
    }
    .layout { display: flex; min-height: calc(100vh - 2rem); }
    #sidebar {
      width: 220px;
      flex: 0 0 220px;
      padding: 1.4rem 1rem;
      background: var(--sidebar-bg);
    }
    .site-title { color: var(--heading-color); font-weight: 700; text-decoration: none; }
    .site-subtitle { margin: 0.25rem 0 1rem; color: var(--text-muted-color); font-size: 0.9rem; }
    .nav-item { list-style: none; margin: 0.15rem 0; }
    .nav { margin: 0; padding: 0; }
    .nav-link {
      display: block;
      padding: 0.35rem 0.55rem;
      border-radius: 0.45rem;
      color: var(--text-color);
      text-decoration: none;
    }
    .nav-item.active .nav-link, .nav-link:hover { color: var(--sidebar-active); background: color-mix(in srgb, var(--link-color) 8%, transparent); }
    #main { flex: 1 1 auto; min-width: 0; padding: 1.2rem 1.25rem 2rem; }
    .topbar { display: flex; justify-content: flex-end; margin-bottom: 0.4rem; }
    #theme-toggle, .menu-button {
      border: 1px solid var(--btn-border-color);
      background: var(--main-bg);
      color: var(--text-color);
      border-radius: 0.45rem;
      padding: 0.25rem 0.7rem;
      font: inherit;
      cursor: pointer;
    }
    .menu-button { display: none; margin-right: auto; }
    #topbar-title { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
    #post-list { max-width: 42rem; margin: 0 auto; }
    .post-link {
      display: block;
      padding: 0.95rem 0;
      border-top: 1px solid var(--main-border-color);
      color: var(--heading-color);
      font-size: 1.2rem;
      font-weight: 650;
      text-decoration: none;
    }
    @media (max-width: 849px) {
      #sidebar { display: none; }
      #sidebar.open { display: block; position: fixed; z-index: 6; inset: 0 auto 0 0; }
      .menu-button { display: inline-block; }
    }
    ${askCss()}
  </style>
</head>
<body data-ask-runtime="file" data-ask-link-base="https://shijayhuo.github.io">
  <p class="preview-banner">本地预览，尚未部署。问答走契约模拟；文章链接打开线上站点。</p>
  <div class="layout">
    <aside id="sidebar">
      <a class="site-title" href="#home" data-ask-nav="home">Ajie's 思源地</a>
      <p class="site-subtitle">保持好奇，持续学习</p>
      <ul class="nav">
        <li class="nav-item active"><a class="nav-link" href="#home" data-ask-nav="home">首页</a></li>
        <li class="nav-item"><a class="nav-link" href="#ask" data-ask-nav="ask">AI 问答</a></li>
        <li class="nav-item"><a class="nav-link" href="https://shijayhuo.github.io/categories/" target="_blank" rel="noopener noreferrer">分类</a></li>
        <li class="nav-item"><a class="nav-link" href="https://shijayhuo.github.io/tags/" target="_blank" rel="noopener noreferrer">标签</a></li>
        <li class="nav-item"><a class="nav-link" href="https://shijayhuo.github.io/archives/" target="_blank" rel="noopener noreferrer">归档</a></li>
      </ul>
    </aside>
    <main id="main">
      <div class="topbar">
        <button class="menu-button" type="button" id="menu-button">菜单</button>
        <span id="topbar-title">Ajie's 思源地</span>
        <button id="theme-toggle" type="button">深色</button>
      </div>
      <div id="view-home">
        <section id="ask-hero" class="ask-hero" data-ask-url="/ask/" aria-labelledby="ask-hero-title">
          <h2 class="ask-title"><span id="ask-hero-title">下午好</span></h2>
          <form id="ask-hero-form" class="ask-form">
            <div class="ask-field">
              <label class="ask-sr" for="ask-input">问题</label>
              <textarea id="ask-input" rows="1" placeholder="想了解阿杰的经历，或找某个话题的文章？在这里问我" autocomplete="off" enterkeyhint="send"></textarea>
              <div class="ask-field-bar">
                <p id="ask-hero-hint" class="ask-hint" role="status"></p>
                <div class="ask-field-actions">
                  <button id="ask-send" class="ask-send" type="submit" disabled aria-label="发送" title="发送">
                    <svg class="ask-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>
        <div id="post-list">
          ${postHtml}
        </div>
      </div>
      <div id="view-ask" hidden>
        <div id="ask-app" class="ask-chat" data-ask-state="empty">
          <p id="ask-status" class="ask-sr" role="status"></p>
          <div id="ask-mock-note" class="ask-mock-note" hidden>
            <span>模拟传输</span>
            <label>场景 <select id="ask-mock-scenario" aria-label="模拟场景"></select></label>
            <span>回放契约样例，不是线上问答。显示的次数不是访问限额。</span>
          </div>
          <div id="ask-empty" class="ask-empty">
            <h2 class="ask-greet" id="ask-greet">下午好</h2>
            <form id="ask-empty-form" class="ask-form">
              <div class="ask-field">
                <label class="ask-sr" for="ask-empty-input">问题</label>
                <textarea id="ask-empty-input" rows="1" placeholder="想了解阿杰的经历，或找某个话题的文章？在这里问我" autocomplete="off" enterkeyhint="send"></textarea>
                <div class="ask-field-bar">
                  <p id="ask-empty-hint" class="ask-hint" role="status"></p>
                  <div class="ask-field-actions">
                    <button id="ask-empty-send" class="ask-send" type="submit" disabled aria-label="发送" title="发送">
                      <svg class="ask-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div id="ask-thread" class="ask-thread" hidden>
            <h2 class="ask-sr">AI 问答</h2>
            <div id="ask-messages" class="ask-messages" aria-label="对话" tabindex="-1"></div>
          </div>
          <div class="ask-footer">
            <p id="ask-remaining" class="ask-remaining" hidden></p>
            <form id="ask-chat-form" class="ask-form ask-composer" hidden>
              <div class="ask-field">
                <label class="ask-sr" for="ask-chat-input">消息</label>
                <textarea id="ask-chat-input" rows="1" placeholder="想了解阿杰的经历，或找某个话题的文章？在这里问我" autocomplete="off" enterkeyhint="send"></textarea>
                <div class="ask-field-bar">
                  <p id="ask-chat-hint" class="ask-hint" role="status"></p>
                  <div class="ask-field-actions">
                    <button id="ask-stop" class="ask-stop" type="button" hidden aria-label="停止" title="停止">
                      <svg class="ask-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor"/></svg>
                    </button>
                    <button id="ask-chat-send" class="ask-send" type="submit" disabled aria-label="发送" title="发送">
                      <svg class="ask-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  </div>
  <script>${inlineScript(read("assets/js/ask-sse.js"))}</script>
  <script>${inlineScript(read("assets/js/ask-fixtures.js"))}</script>
  <script>${inlineScript(read("assets/js/ask-demo.js"))}</script>
  <script>
    document.getElementById("theme-toggle").addEventListener("click", function () {
      var root = document.documentElement;
      var next = root.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-bs-theme", next);
      this.textContent = next === "dark" ? "浅色" : "深色";
    });
    document.getElementById("menu-button").addEventListener("click", function () {
      document.getElementById("sidebar").classList.toggle("open");
    });
  </script>
</body>
</html>
`;

var targets = [
  path.join(root, "docs/ask/preview.html"),
  "/opt/cursor/artifacts/ajie-ask-prototype.html"
];
targets.forEach(function (target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
  process.stdout.write("wrote " + target + " (" + html.length + " bytes)\n");
});
