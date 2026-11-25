import { createServer } from "node:http";
import { readFileSync, statSync, mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import playwright from "/tmp/pw/node_modules/playwright-core/index.js";

const { chromium } = playwright;

const root = new URL("../..", import.meta.url).pathname;
const siteDir = join(root, "_site");
const shotDir = "/opt/cursor/artifacts";
const chrome = "/usr/bin/google-chrome";
const successBody = readFileSync(join(root, "docs/ask/fixtures/sse-success.txt"), "utf8");
const quotaBody = readFileSync(join(root, "docs/ask/fixtures/http-429.json"), "utf8");

mkdirSync(shotDir, { recursive: true });

function contentType(file) {
  const ext = extname(file);
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".xml") return "application/xml";
  if (ext === ".json") return "application/json";
  return "application/octet-stream";
}

function startStatic(dir, port) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://127.0.0.1");
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = normalize(join(dir, pathname));
    if (!file.startsWith(dir)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const info = statSync(file);
      const target = info.isDirectory() ? join(file, "index.html") : file;
      res.writeHead(200, { "Content-Type": contentType(target), "Cache-Control": "no-store" });
      res.end(readFileSync(target));
    } catch (error) {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

function startApi(port) {
  const seen = [];
  const server = createServer((req, res) => {
    const origin = req.headers.origin || "http://127.0.0.1:8765";
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const record = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body
      };
      seen.push(record);
      if (req.method !== "POST" || !req.url.endsWith("/ask")) {
        res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "invalid", message: "只接受 POST /ask。" }));
        return;
      }
      let parsed = {};
      try { parsed = JSON.parse(body); } catch (error) { parsed = {}; }
      if (parsed.question === "额度") {
        res.writeHead(429, { "Content-Type": "application/json; charset=utf-8" });
        res.end(quotaBody);
        return;
      }
      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(successBody);
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, seen })));
}

const shanghaiHour = Number(new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Shanghai",
  hour: "numeric",
  hourCycle: "h23"
}).formatToParts(new Date()).find((part) => part.type === "hour").value);
const greeting = shanghaiHour >= 5 && shanghaiHour < 12 ? "上午好" : shanghaiHour >= 12 && shanghaiHour < 18 ? "下午好" : "晚上好";

async function shot(page, name) {
  const file = join(shotDir, name);
  await page.screenshot({ path: file });
  console.log("shot", file);
}

async function sendAsk(page, text, which) {
  const input = page.locator(which);
  await input.fill(text);
  await input.press("Enter");
}

const site = await startStatic(siteDir, 8765);
const api = await startApi(8766);
const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"]
});
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log("ok", name);
  } catch (error) {
    failures.push(name + ": " + error.message);
    console.error("fail", name, error);
  }
}

try {
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "block"
  });
  const page = await desktop.newPage();
  let dialogs = 0;
  page.on("dialog", () => { dialogs += 1; });

  await check("首页生产态", async () => {
    await page.goto("http://127.0.0.1:8765/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    assert(await page.locator("#ask-hero-title").innerText() === greeting, "问候不是上海时段");
    assert((await page.locator("#ask-input").getAttribute("placeholder")).includes("想了解阿杰的经历"), "placeholder");
    assert(await page.locator("#post-list article").count() > 0, "首页没有文章");
    assert(await page.locator(".ask-demo-mark").count() === 0, "生产首页出现交互演示");
    assert(await page.locator("#ask-mock-note").count() === 0, "首页出现模拟说明");
    const hero = await page.locator("#ask-hero").innerText();
    assert(!hero.includes("推荐"), "首页多了推荐");
    assert(!hero.includes("预写"), "首页多了说明");
    await page.evaluate(() => document.documentElement.setAttribute("data-bs-theme", "light"));
    await shot(page, "ask-home-desktop-light.png");
    await page.evaluate(() => document.documentElement.setAttribute("data-bs-theme", "dark"));
    await shot(page, "ask-home-desktop-dark.png");
    await page.evaluate(() => document.documentElement.setAttribute("data-bs-theme", "light"));
  });

  await check("空输入、输入法和换行", async () => {
    const field = page.locator("#ask-hero .ask-field");
    const radius = await field.evaluate((el) => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
      return Math.abs(parseFloat(getComputedStyle(el).borderTopLeftRadius) - 0.9 * rem);
    });
    assert(radius < 0.6, "输入框圆角被改掉");
    assert(await page.locator("#ask-input").evaluate((el) => getComputedStyle(el).resize) === "none", "还能拖拽高度");
    assert(await page.locator("#ask-send").isDisabled(), "空内容仍能点发送");
    const buttonSize = await page.locator("#ask-send").evaluate((el) => {
      const hit = el.getBoundingClientRect().width;
      const visual = parseFloat(getComputedStyle(el, "::before").width);
      return { hit, visual };
    });
    assert(buttonSize.hit >= 43, "可点区域小于 44px: " + buttonSize.hit);
    assert(buttonSize.visual > 30 && buttonSize.visual < buttonSize.hit - 4, "视觉按钮没有缩小: " + buttonSize.visual);
    const before = await page.locator("#ask-input").evaluate((el) => el.getBoundingClientRect().height);
    await page.locator("#ask-input").press("Enter");
    assert((await page.locator("#ask-hero-hint").innerText()).includes("请输入内容后再发送"), "空白提示");
    assert(page.url().replace(/\/$/, "").endsWith("8765"), "空白发送离开了首页");
    await page.locator("#ask-input").fill("一行\n两行\n三行\n四行\n五行\n六行");
    const grown = await page.locator("#ask-input").evaluate((el) => el.getBoundingClientRect().height);
    assert(grown > before + 20, "输入没有自动增高");
    await page.locator("#ask-input").fill("一二三四五六七八".repeat(80));
    const capped = await page.locator("#ask-input").evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      overflow: getComputedStyle(el).overflowY,
      scroll: el.scrollHeight > el.clientHeight + 1
    }));
    assert(capped.height <= 180, "超过上限还在撑高");
    assert(capped.overflow === "auto" && capped.scroll, "上限后没有内部滚动");
    await page.locator("#ask-input").fill("");
    const restored = await page.locator("#ask-input").evaluate((el) => el.getBoundingClientRect().height);
    assert(Math.abs(restored - before) < 4, "清空后没有回到原高度");
    assert(await page.locator("#ask-send").isDisabled(), "清空后发送仍可用");
    await page.evaluate(() => {
      const el = document.getElementById("ask-input");
      el.focus();
      el.value = "你好";
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      el.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 229,
        isComposing: true,
        bubbles: true,
        cancelable: true
      }));
    });
    assert(!page.url().includes("/ask"), "输入法回车被当成发送");
    await page.locator("#ask-input").press("Shift+Enter");
    const value = await page.locator("#ask-input").inputValue();
    assert(value.includes("\n"), "Shift+Enter 没有换行");
    assert(!page.url().includes("/ask"), "换行离开了首页");
  });

  await check("菜单进入空问候", async () => {
    await page.evaluate(() => {
      sessionStorage.setItem("ajie-ask-pending", "s-old");
      sessionStorage.setItem("ajie-ask-demo-v1", JSON.stringify({
        currentId: "s-old",
        sessions: {
          "s-old": {
            id: "s-old",
            updatedAt: Date.now(),
            messages: [{ id: "m-old", role: "user", text: "不应该自动打开" }]
          }
        }
      }));
    });
    await page.locator("[data-ask-nav='ask']").click();
    await page.waitForURL(/\/ask\/?$/);
    assert(await page.locator("#ask-greet").innerText() === greeting, "空态问候");
    assert(await page.locator("#ask-empty").isVisible(), "空态不可见");
    assert(await page.locator(".ask-msg").count() === 0, "菜单带出了旧对话");
    assert(await page.locator("#post-list").count() === 0, "问答页还有文章列表");
    assert(await page.locator("#panel-wrapper").isHidden(), "右侧栏还在");
    assert(await page.locator("#ask-mock-note").isHidden(), "生产空态露出模拟说明");
    await shot(page, "ask-empty-desktop.png");
    await page.evaluate(() => document.documentElement.setAttribute("data-bs-theme", "dark"));
    await shot(page, "ask-empty-desktop-dark.png");
    await page.evaluate(() => document.documentElement.setAttribute("data-bs-theme", "light"));
  });

  await check("未配置不预写回答", async () => {
    await page.goto("http://127.0.0.1:8765/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.clear());
    await page.locator("#ask-input").fill("你是谁");
    await page.locator("#ask-send").click();
    await page.waitForURL(/\/ask\/?$/);
    await page.locator(".ask-msg-assistant").waitFor();
    const answer = await page.locator(".ask-msg-assistant .ask-bubble-text").innerText();
    assert(answer === "问答服务尚未配置。", "未配置文案不对: " + answer);
    assert(await page.locator(".ask-sources li").count() === 0, "未配置却有来源");
    assert(!(await page.locator("#ask-messages").innerText()).includes("下面只转述已经发布的关于页"), "悄悄使用了预写回答");
    assert(!page.url().includes("你是谁"), "问题进了网址");
    await shot(page, "ask-unconfigured-desktop.png");
    await page.goBack();
    await page.waitForURL(/127\.0\.0\.1:8765\/?$/);
    assert(await page.locator("#ask-input").inputValue() === "", "返回首页没有清空输入");
    await page.goForward();
    await page.locator(".ask-msg-assistant").waitFor();
    assert((await page.locator(".ask-msg-assistant .ask-bubble-text").innerText()) === "问答服务尚未配置。", "前进后回答丢失");
  });

  await check("第二页没有提问区", async () => {
    const response = await page.goto("http://127.0.0.1:8765/page2/", { waitUntil: "domcontentloaded" });
    assert(response && response.status() === 200, "第二页打不开");
    assert(await page.locator("#post-list").count() === 1, "第二页没有文章列表");
    assert(await page.locator("#ask-hero").count() === 0, "第二页还有提问区");
  });

  await check("模拟正常、停止、多轮和注入", async () => {
    await page.goto("http://127.0.0.1:8765/ask/?ask-mock=normal", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.evaluate(() => { window.ASK_MOCK_DELAY_MS = 0; });
    assert(await page.locator("#ask-mock-note").isVisible(), "模拟入口没有标出来");
    assert((await page.locator("#ask-mock-note").innerText()).includes("不是访问限额"), "没有标明次数边界");
    await sendAsk(page, "你是谁", "#ask-empty-input");
    await page.locator(".ask-msg-assistant .ask-bubble-text").waitFor();
    assert((await page.locator(".ask-msg-assistant .ask-bubble-text").innerText()).includes("关于页写的是霍世杰。"), "正常样例正文");
    assert(await page.locator("#ask-remaining").innerText() === "还可问 19 次", "剩余次数文案");
    const source = page.locator(".ask-sources a");
    assert(await source.innerText() === "关于", "来源文字");
    const href = await source.getAttribute("href");
    assert(href.endsWith("/about/") || href.endsWith("/about"), "来源地址不受控: " + href);
    assert(!page.url().includes("你是谁"), "模拟问题进了网址");
    await shot(page, "ask-chat-desktop.png");
    await page.evaluate(() => document.documentElement.setAttribute("data-bs-theme", "dark"));
    await shot(page, "ask-chat-desktop-dark.png");
    await page.evaluate(() => document.documentElement.setAttribute("data-bs-theme", "light"));
    await sendAsk(page, "那这个怎么卸载", "#ask-chat-input");
    await page.waitForFunction(() => document.body.innerText.includes("卸载要看 Cordis"));
    assert(await page.locator("#ask-remaining").innerText() === "还可问 18 次", "追问次数");
    assert(await page.locator(".ask-msg-user").count() === 2, "没有多轮用户消息");

    await page.goto("http://127.0.0.1:8765/ask/?ask-mock=normal", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.ASK_MOCK_DELAY_MS = 0;
      window.ASK_FIXTURES.files["sse-success.txt"].body = [
        "event: meta",
        'data: {"remaining":19,"knowledgeVersion":"kv-fixture-1"}',
        "",
        "event: token",
        'data: {"text":"<img src=x onerror=alert(1)>"}',
        "",
        "event: sources",
        'data: {"sources":[{"id":"about-intro","title":"<script>alert(1)</script>","url":"/about/"},{"id":"bad","title":"坏链接","url":"javascript:alert(1)"},{"id":"dup","title":"重复","url":"/about/"}]}',
        "",
        "event: done",
        "data: {}",
        ""
      ].join("\n");
    });
    await sendAsk(page, "再问一次注入", "#ask-empty-input");
    await page.waitForFunction(() => document.body.innerText.includes("<img src=x onerror=alert(1)>"));
    assert(await page.locator(".ask-bubble img").count() === 0, "正文被当成 HTML");
    assert(await page.locator(".ask-bubble script").count() === 0, "来了 script");
    assert(await page.locator(".ask-sources a").count() === 1, "坏来源或重复来源被渲染");
    assert((await page.locator(".ask-sources a").last().innerText()) === "<script>alert(1)</script>", "链接文字被解析");
    assert(dialogs === 0, "出现了对话框");
  });

  await check("模拟停止、429、失败和未配置", async () => {
    await page.goto("http://127.0.0.1:8765/ask/?ask-mock=stop", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.evaluate(() => { window.ASK_MOCK_DELAY_MS = 0; });
    await sendAsk(page, "停一下", "#ask-empty-input");
    await page.locator(".ask-stopped").waitFor();
    const stopped = await page.locator(".ask-msg-assistant").innerText();
    assert(stopped.includes("已停止"), "没有已停止");
    assert(stopped.includes("关于页"), "停止时丢掉了已到达正文");
    assert(!stopped.includes("网络异常"), "停止被写成网络错误");

    await page.selectOption("#ask-mock-scenario", "quota");
    await sendAsk(page, "第二十一问", "#ask-chat-input");
    await page.waitForFunction(() => document.body.innerText.includes("已达到 20 次上限。"));
    assert(await page.locator("#ask-remaining").innerText() === "已达到 20 次上限", "429 剩余文案");
    await shot(page, "ask-quota-desktop.png");
    const beforeQuota = await page.locator(".ask-msg-assistant").count();
    await page.selectOption("#ask-mock-scenario", "normal");
    await sendAsk(page, "限额之后仍可看界面", "#ask-chat-input");
    await page.waitForFunction((count) => document.querySelectorAll(".ask-msg-assistant").length > count, beforeQuota);
    const afterQuota = await page.locator(".ask-msg-assistant .ask-bubble-text").last().innerText();
    assert(!afterQuota.includes("已达到 20 次上限"), "浏览器把样例次数当成了拦截: " + afterQuota);

    await page.selectOption("#ask-mock-scenario", "failure");
    await sendAsk(page, "流式失败", "#ask-chat-input");
    await page.waitForFunction(() => document.body.innerText.includes("生成中断，这次次数已计入上限。"));
    const failed = await page.locator(".ask-msg-assistant").last().innerText();
    assert(failed.includes("关于页"), "流式失败丢掉了已到达文字");

    await page.selectOption("#ask-mock-scenario", "unconfigured");
    await sendAsk(page, "服务呢", "#ask-chat-input");
    await page.waitForFunction(() => {
      const nodes = document.querySelectorAll(".ask-msg-assistant .ask-bubble-text");
      return nodes[nodes.length - 1].textContent === "问答服务尚未配置。";
    });
    await page.selectOption("#ask-mock-scenario", "network");
    await sendAsk(page, "断网", "#ask-chat-input");
    await page.waitForFunction(() => document.body.innerText.includes("网络异常，这次没有收到完整回答。"));
  });

  await check("停止按钮", async () => {
    await page.goto("http://127.0.0.1:8765/ask/?ask-mock=normal", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.evaluate(() => { window.ASK_MOCK_DELAY_MS = 400; });
    await page.locator("#ask-empty-input").fill("慢一点");
    await page.locator("#ask-empty-send").click();
    await page.locator("#ask-stop").waitFor({ state: "visible" });
    assert(await page.locator("#ask-chat-send").isDisabled(), "生成中还能发送");
    assert((await page.locator("#ask-stop").getAttribute("aria-label")) === "停止", "停止没有可访问名称");
    await page.locator("#ask-stop").click();
    await page.locator(".ask-stopped").waitFor();
    const text = await page.locator(".ask-msg-assistant").innerText();
    assert(text.includes("已停止"), "按钮没有停止");
    assert(!text.includes("网络异常"), "按钮停止变成网络错误");
    assert(!text.includes("关于页写的是霍世杰。从业 9 年。"), "停得太晚，整段都出来了");
  });

  await check("真实 fetch 传输", async () => {
    await page.goto("http://127.0.0.1:8765/ask/", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.evaluate((endpoint) => {
      document.documentElement.dataset.askDemo = "false";
      document.documentElement.dataset.askTransport = "";
      document.documentElement.dataset.askApi = endpoint;
    }, "http://127.0.0.1:8766");
    const before = api.seen.length;
    await sendAsk(page, "你是谁？", "#ask-empty-input");
    await page.waitForFunction(() => document.body.innerText.includes("关于页写的是霍世杰。"));
    const first = api.seen[api.seen.length - 1];
    assert(first.method === "POST", "不是 POST");
    assert(first.url === "/ask", "端点不是 /ask: " + first.url);
    assert(!first.headers.authorization, "带了 Authorization");
    assert(!first.headers.cookie, "带了 Cookie");
    assert(!first.headers["x-ask-dev-ip"], "带了开发 IP 头");
    const payload = JSON.parse(first.body);
    assert.deepEqual(payload.history, []);
    assert.equal(payload.question, "你是谁？");
    assert(api.seen.length === before + 1, "请求次数不对");
    await sendAsk(page, "那这个怎么卸载？", "#ask-chat-input");
    await page.waitForFunction(() => {
      const nodes = document.querySelectorAll(".ask-msg-assistant .ask-bubble-text");
      const stop = document.getElementById("ask-stop");
      return nodes.length >= 2 && nodes[1].textContent.includes("关于页写的是霍世杰。") && stop && stop.hidden;
    });
    const second = JSON.parse(api.seen[api.seen.length - 1].body);
    assert.equal(second.question, "那这个怎么卸载？");
    assert.equal(second.history.length, 2);
    assert.equal(second.history[0].role, "user");
    assert.equal(second.history[1].role, "assistant");
    assert.deepEqual(second.history[1].sourceIds, ["about-intro"]);
    await page.evaluate(() => { document.documentElement.dataset.askApi = "http://127.0.0.1:8766"; });
    await sendAsk(page, "额度", "#ask-chat-input");
    await page.waitForFunction(() => document.body.innerText.includes("已达到 20 次上限。"));
    const longBefore = api.seen.length;
    await page.locator("#ask-chat-input").fill("长".repeat(2001));
    await page.locator("#ask-chat-send").click();
    await page.waitForFunction(() => document.body.innerText.includes("问题太长。"));
    assert(api.seen.length === longBefore, "过长问题仍然发出了请求");
  });

  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
    isMobile: true,
    hasTouch: true
  });
  const phone = await mobile.newPage();
  await check("手机首页、空态、聊天和额度", async () => {
    await phone.goto("http://127.0.0.1:8765/", { waitUntil: "domcontentloaded" });
    await phone.evaluate(() => sessionStorage.clear());
    await phone.reload({ waitUntil: "domcontentloaded" });
    assert(await phone.locator("#ask-hero").isVisible(), "手机首页没有提问区");
    assert(await phone.locator("#post-list").isVisible(), "手机首页没有文章");
    await shot(phone, "ask-home-mobile-light.png");
    await phone.goto("http://127.0.0.1:8765/ask/", { waitUntil: "domcontentloaded" });
    assert(await phone.locator("#ask-empty").isVisible(), "手机空态");
    await shot(phone, "ask-empty-mobile.png");
    await phone.goto("http://127.0.0.1:8765/ask/?ask-mock=normal", { waitUntil: "domcontentloaded" });
    await phone.evaluate(() => { window.ASK_MOCK_DELAY_MS = 0; });
    await sendAsk(phone, "手机上问一句", "#ask-empty-input");
    await phone.locator(".ask-msg-assistant").waitFor();
    await shot(phone, "ask-chat-mobile.png");
    await phone.selectOption("#ask-mock-scenario", "quota");
    await sendAsk(phone, "手机额度", "#ask-chat-input");
    await phone.waitForFunction(() => document.body.innerText.includes("已达到 20 次上限。"));
    await shot(phone, "ask-quota-mobile.png");
  });
  await mobile.close();

  const preview = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const local = await preview.newPage();
  await check("自包含预览", async () => {
    await local.goto(pathToFileURL(join(root, "docs/ask/preview.html")).href);
    await local.evaluate(() => { window.ASK_MOCK_DELAY_MS = 0; });
    assert((await local.locator(".preview-banner").innerText()).includes("尚未部署"), "预览假装已经上线");
    assert(await local.locator("#post-list .post-link").count() >= 4, "预览没有文章链接");
    const postHref = await local.locator(".post-link").first().getAttribute("href");
    assert(postHref.startsWith("https://shijayhuo.github.io/posts/"), "文章没有链到线上: " + postHref);
    await local.locator("#ask-input").fill("本地预览");
    await local.locator("#ask-send").click();
    await local.locator("#view-ask:not([hidden]) .ask-msg-assistant").waitFor();
    assert((await local.locator(".ask-msg-assistant").innerText()).includes("关于页写的是霍世杰。"), "预览没有回放样例");
    const about = await local.locator(".ask-sources a").getAttribute("href");
    assert(about.startsWith("https://shijayhuo.github.io/about"), "预览来源没有链到线上: " + about);
    assert(local.url().startsWith("file:"), "预览跳到了线上问答页");
    await local.locator("[data-ask-nav='ask']").click();
    assert(await local.locator("#ask-empty").isVisible(), "预览菜单没有回到空态");
  });
  await preview.close();
} finally {
  await browser.close();
  site.close();
  api.server.close();
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("browser checks passed");
