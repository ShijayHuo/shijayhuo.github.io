import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import playwright from "/tmp/pw/node_modules/playwright-core/index.js";

const { chromium } = playwright;
const chrome = "/usr/bin/google-chrome";
const site = "http://127.0.0.1:8765";
const ask = "http://127.0.0.1:8787";
const plain = "http://127.0.0.1:8788";
const probe = JSON.parse(readFileSync(new URL("../../backend/dist/local/probe.json", import.meta.url), "utf8"));

async function control(path, method = "GET") {
  const response = await fetch(`http://127.0.0.1:8791${path}`, { method });
  const body = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(body));
  return body;
}

async function postAsk(question, endpoint = `${ask}/ask`) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      origin: site,
    },
    body: JSON.stringify({ question, history: [] }),
  });
  const text = await response.text();
  return { status: response.status, text };
}

const hour = Number(new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Shanghai",
  hour: "numeric",
  hourCycle: "h23",
}).formatToParts(new Date()).find((part) => part.type === "hour").value);
const greeting = hour >= 5 && hour < 12 ? "上午好" : hour >= 12 && hour < 18 ? "下午好" : "晚上好";

async function shot(page, name) {
  const file = `/opt/cursor/artifacts/${name}`;
  await page.screenshot({ path: file });
  console.log("shot", file);
}

async function waitSettled(page) {
  await page.locator("#ask-stop").waitFor({ state: "hidden", timeout: 20000 });
}

const browser = await chromium.launch({
  executablePath: chrome,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    console.log("ok", name);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.error("fail", name, error);
  }
}

await control("/reset-quota", "POST");
await control("/reset-upstream", "POST");

const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await desktop.newPage();
page.on("request", (request) => {
  if (!request.url().includes("/ask")) return;
  const headers = request.headers();
  assert.equal(headers.authorization, undefined);
  assert.equal(headers.cookie, undefined);
  assert.equal(headers["x-ask-dev-ip"], undefined);
});

try {
  await check("首页连到本地 Worker", async () => {
    await page.goto(`${site}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "domcontentloaded" });
    const config = await page.evaluate(() => ({
      demo: document.documentElement.dataset.askDemo,
      api: document.documentElement.dataset.askApi,
    }));
    assert.equal(config.demo, "false");
    assert.equal(config.api, ask);
    assert.equal(await page.locator("#ask-hero-title").innerText(), greeting);
    assert.equal(await page.locator("#ask-input").getAttribute("placeholder"), "想了解阿杰的经历，或找某个话题的文章？在这里问我");
    assert.equal(await page.locator(".ask-demo-mark").count(), 0);
    assert.equal(await page.locator("#ask-mock-note").count(), 0);
    assert.ok(await page.locator(".post-preview, article, .card").count() > 0 || (await page.locator("body").innerText()).includes("开发者"));
    await shot(page, "live-home-desktop.png");
  });

  await check("菜单进入空问候", async () => {
    await page.locator("a[href$='/ask/']").first().click();
    await page.waitForURL(/\/ask\/?$/);
    assert.equal(new URL(page.url()).search, "");
    assert.equal(await page.locator("#ask-greet").innerText(), greeting);
    assert.equal(await page.locator("#ask-empty").isVisible(), true);
    assert.equal(await page.locator("#ask-messages .ask-msg-user").count(), 0);
    assert.equal(await page.locator("#panel-wrapper").isVisible(), false);
    await shot(page, "live-empty-desktop.png");
    await page.goto(`${site}/`, { waitUntil: "domcontentloaded" });
  });

  await check("文章标题命中公开原文并给出引用", async () => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const cite = await context.newPage();
    try {
      await cite.goto(`${site}/`, { waitUntil: "domcontentloaded" });
      await cite.evaluate(() => sessionStorage.clear());
      const before = await control("/upstream");
      await cite.locator("#ask-input").fill("函数式编程");
      await cite.locator("#ask-input").press("Enter");
      await cite.waitForURL(/\/ask\/?$/);
      assert.equal(new URL(cite.url()).search, "");
      await cite.waitForFunction(() => document.body.innerText.includes("本地测试生成，不是文章结论。"));
      await waitSettled(cite);
      const link = cite.locator("#ask-messages .ask-sources a");
      assert.equal(await link.count(), 1);
      assert.equal(await link.innerText(), "函数式编程");
      assert.equal(await link.getAttribute("href"), "/posts/functional-programming/");
      const after = await control("/upstream");
      assert.equal(after.embeddings, before.embeddings + 1);
      assert.equal(after.chats, before.chats + 1);
      await shot(cite, "live-citation-desktop.png");
    } finally {
      await context.close();
    }
  });

  await check("自然问句依据不足且不调用生成", async () => {
    const before = await control("/upstream");
    const response = await postAsk("阿杰有哪些技术经历？");
    assert.equal(response.status, 200);
    assert.match(response.text, /公开文章里没有足够依据回答这个问题。/);
    assert.match(response.text, /"sources":\[\]/);
    const after = await control("/upstream");
    assert.equal(after.embeddings, before.embeddings + 1);
    assert.equal(after.chats, before.chats);
  });

  await check("首页发问得到真实 SSE 和来源", async () => {
    const before = await control("/upstream");
    await page.locator("#ask-input").fill(probe.question);
    await page.locator("#ask-input").press("Enter");
    await page.waitForURL(/\/ask\/?$/);
    assert.equal(new URL(page.url()).search, "");
    await page.locator(".ask-msg-assistant .ask-bubble-text").waitFor();
    await page.waitForFunction(() => document.body.innerText.includes("本地测试生成，不是文章结论。"));
    await waitSettled(page);
    const link = page.locator("#ask-messages .ask-sources a").first();
    assert.equal(await link.innerText(), "about");
    assert.match(await link.getAttribute("href"), /\/about\/?$/);
    assert.ok((await page.locator("#ask-remaining").innerText()).includes("还可问"));
    assert.equal(await page.locator("#ask-messages img, #ask-messages script").count(), 0);
    const stats = await control("/upstream");
    assert.equal(stats.embeddings, before.embeddings + 1);
    assert.equal(stats.chats, before.chats + 1);
    await shot(page, "live-chat-desktop.png");
  });

  await check("生成中断保留协议文案", async () => {
    await page.locator("#ask-chat-input").fill("请中断[[stream-fail]]");
    await page.locator("#ask-chat-send").click();
    await page.waitForFunction(() => {
      const status = document.getElementById("ask-status");
      const messages = document.getElementById("ask-messages");
      const text = `${status ? status.textContent : ""} ${messages ? messages.textContent : ""}`;
      return text.includes("生成中断，这次次数已计入上限。");
    });
    await waitSettled(page);
  });

  await check("多轮把上一问带进真实上游", async () => {
    await page.locator("#ask-chat-input").fill("那这个呢");
    await page.locator("#ask-chat-input").press("Enter");
    await page.waitForFunction(() => document.querySelectorAll(".ask-msg-assistant").length >= 2);
    await waitSettled(page);
    const stats = await control("/upstream");
    assert.ok(stats.chats >= 2);
    assert.ok(stats.lastUserTurns >= 1);
    assert.equal(await page.locator(".ask-sources a").count() >= 1, true);
  });

  await check("停止保留已生成文本", async () => {
    await page.locator("#ask-chat-input").fill(probe.question);
    await page.locator("#ask-chat-input").press("Enter");
    await page.waitForFunction(() => {
      const nodes = [...document.querySelectorAll(".ask-msg-assistant .ask-bubble-text")];
      return nodes.at(-1)?.textContent.includes("本地测试");
    });
    await page.locator("#ask-stop").click();
    await page.waitForFunction(() => document.body.innerText.includes("已停止"));
    const last = await page.locator(".ask-msg-assistant .ask-bubble-text").last().innerText();
    assert.equal(last.includes("网络异常"), false);
    await waitSettled(page);
  });

  await check("后退回首页，前进恢复对话", async () => {
    await page.goBack();
    await page.waitForURL(/\/$/);
    assert.equal(await page.locator("#ask-input").inputValue(), "");
    await page.goForward();
    await page.waitForURL(/\/ask\/?$/);
    await page.locator(".ask-msg-user").first().waitFor();
    assert.ok((await page.locator(".ask-msg-user").first().innerText()).includes("霍世杰"));
  });

  await check("检索失败 502 不调用生成", async () => {
    const before = await control("/upstream");
    await page.locator("#ask-chat-input").fill("请失败[[upstream-fail]]");
    await page.locator("#ask-chat-input").press("Enter");
    await page.waitForFunction(() => document.body.innerText.includes("检索向量没有生成，次数已计入上限。"));
    await waitSettled(page);
    const after = await control("/upstream");
    assert.equal(after.embeddingErrors, before.embeddingErrors + 1);
    assert.equal(after.chats, before.chats);
  });

  await check("未配置 Worker 返回 503", async () => {
    await page.evaluate((origin) => {
      document.documentElement.dataset.askApi = origin;
    }, plain);
    await page.locator("#ask-chat-input").fill("服务关了吗");
    await page.locator("#ask-chat-input").press("Enter");
    await page.waitForFunction(() => {
      const nodes = [...document.querySelectorAll(".ask-msg-assistant .ask-bubble-text")];
      return nodes.at(-1)?.textContent === "问答服务尚未配置。";
    });
    await page.evaluate((origin) => {
      document.documentElement.dataset.askApi = origin;
    }, ask);
    await shot(page, "live-unconfigured-desktop.png");
  });

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const phone = await mobile.newPage();
  await check("手机首页、空态和对话", async () => {
    await phone.goto(`${site}/`, { waitUntil: "domcontentloaded" });
    await phone.evaluate(() => sessionStorage.clear());
    await phone.reload({ waitUntil: "domcontentloaded" });
    assert.equal(await phone.locator("#ask-hero-title").innerText(), greeting);
    await shot(phone, "live-home-mobile.png");
    await phone.locator("#sidebar-trigger").click();
    await phone.locator("#sidebar a[href$='/ask/']").click();
    await phone.waitForURL(/\/ask\/?$/);
    assert.equal(await phone.locator("#ask-empty").isVisible(), true);
    await shot(phone, "live-empty-mobile.png");
    await phone.locator("#ask-empty-input").fill("[[fast]] 手机上看一句");
    await phone.locator("#ask-empty-input").press("Enter");
    await phone.waitForFunction(() => document.body.innerText.includes("公开文章里没有足够依据") || document.body.innerText.includes("本地测试生成"));
    await waitSettled(phone);
    assert.equal(await phone.locator("#panel-wrapper").isVisible(), false);
    await shot(phone, "live-chat-mobile.png");
  });

  await check("第 21 次 429 且不再调用上游", async () => {
    let sawQuota = false;
    for (let index = 0; index < 25; index += 1) {
      const before = await control("/upstream");
      const response = await postAsk(`[[fast]] 填充额度 ${index}`);
      const after = await control("/upstream");
      if (response.status === 429) {
        assert.match(response.text, /已达到 20 次上限/);
        assert.equal(after.embeddings, before.embeddings);
        assert.equal(after.chats, before.chats);
        sawQuota = true;
        break;
      }
      assert.equal(response.status, 200);
      assert.equal(after.embeddings, before.embeddings + 1);
    }
    assert.equal(sawQuota, true);
    async function sendVisible(target, text) {
      const chat = target.locator("#ask-chat-input");
      if (await chat.isVisible()) {
        await chat.fill(text);
        await target.locator("#ask-chat-send").click();
        return;
      }
      await target.locator("#ask-empty-input").fill(text);
      await target.locator("#ask-empty-send").click();
    }
    await page.goto(`${site}/ask/`, { waitUntil: "domcontentloaded" });
    await sendVisible(page, "第二十一问");
    await page.waitForFunction(() => (document.body.textContent || "").includes("已达到 20 次上限。"));
    await waitSettled(page);
    const beforeUi = await control("/upstream");
    await phone.goto(`${site}/ask/`, { waitUntil: "domcontentloaded" });
    await sendVisible(phone, "手机上的第二十一问");
    await phone.waitForFunction(() => (document.body.textContent || "").includes("已达到 20 次上限。"));
    await waitSettled(phone);
    const afterUi = await control("/upstream");
    assert.equal(afterUi.embeddings, beforeUi.embeddings);
    await shot(page, "live-quota-desktop.png");
    await shot(phone, "live-quota-mobile.png");
  });
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("live e2e passed");
