import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { RECORDED_SMOKE, admitsRecordedNegatives, describeSmokeSeparation } from "../src/abstain.ts";
import { DEFAULT_MIN_SCORE } from "../src/limits.ts";
import {
  ASK_API_ASSIGNMENT,
  integratedParentPid,
  orphanWorkerPid,
  parseSsListeners,
  planLocalSwitch,
  resolveSiteFile,
  rewriteAskApi,
  signalAllowed,
  type PortListener,
} from "../src/local-switch.ts";
import { createRecallReport } from "../src/recall-report.ts";
import { createSiteServer } from "../scripts/serve-site.ts";

test("全库冒烟不能把间隙写成有效阈值", () => {
  const file = JSON.parse(readFileSync(path.join(import.meta.dirname, "../eval/smoke-2026-11-25.json"), "utf8")) as {
    bundle: { documents: number; chunks: number; jsonBytes: number; gzipBytes: number };
    positives: { count: number; top1Correct: number; minScore: number; maxScore: number };
    negatives: Array<{ id: string; topUrl: string; topScore: number }>;
    recallAccepted: boolean;
    thresholdValidated: boolean;
    defaultMinScore: number;
  };
  assert.equal(file.bundle.documents, RECORDED_SMOKE.documents);
  assert.equal(file.bundle.chunks, RECORDED_SMOKE.chunks);
  assert.equal(file.bundle.jsonBytes, RECORDED_SMOKE.jsonBytes);
  assert.equal(file.bundle.gzipBytes, RECORDED_SMOKE.gzipBytes);
  assert.equal(file.positives.count, RECORDED_SMOKE.positiveCount);
  assert.equal(file.positives.top1Correct, RECORDED_SMOKE.positiveTop1);
  assert.equal(file.positives.minScore, RECORDED_SMOKE.positiveMin);
  assert.equal(file.positives.maxScore, RECORDED_SMOKE.positiveMax);
  assert.deepEqual(file.negatives.map((item) => item.topScore), RECORDED_SMOKE.negatives.map((item) => item.score));
  assert.equal(file.defaultMinScore, DEFAULT_MIN_SCORE);
  assert.equal(file.recallAccepted, false);
  assert.equal(file.thresholdValidated, false);
  const report = describeSmokeSeparation();
  assert.equal(report.negativeMax, 0.4507);
  assert.equal(report.recallAccepted, false);
  assert.equal(report.thresholdValidated, false);
  assert.equal(report.validatedThreshold, null);
  assert.equal(report.defaultMinScoreAdmitsNegatives, true);
  assert.equal(admitsRecordedNegatives(DEFAULT_MIN_SCORE), true);
  assert.equal(admitsRecordedNegatives(0.4507), true);
  assert.equal(admitsRecordedNegatives(report.positiveMin), false);
  const recall = createRecallReport({ model: "qwen3.7-text-embedding-flash", dimensions: 1024, results: [] });
  assert.equal(recall.recallAccepted, false);
  assert.equal(recall.thresholdValidated, false);
  assert.equal(recall.minScore, 0.25);
  assert.match(recall.reason, /不改门限/);
});

test("只停止整合父进程，不碰受保护端口，也不把 workerd 当成父进程", () => {
  const listeners: PortListener[] = [
    { port: 8765, pid: 1613691, address: "127.0.0.1:8765" },
    { port: 18790, pid: 1613691, address: "127.0.0.1:18790" },
    { port: 18791, pid: 1613691, address: "127.0.0.1:18791" },
    { port: 8787, pid: 1702655, address: "127.0.0.1:8787" },
    { port: 8790, pid: 42, address: "127.0.0.1:8790" },
    { port: 8791, pid: 43, address: "127.0.0.1:8791" },
  ];
  const command = (pid: number) => {
    if (pid === 1613691) return "node --experimental-strip-types scripts/serve-integrated.ts";
    if (pid === 1702655) return "/usr/bin/workerd serve";
    return "unrelated";
  };
  assert.deepEqual(planLocalSwitch({ listeners, command, expectedPid: 1613691 }), { action: "stop", pid: 1613691 });
  assert.equal(planLocalSwitch({ listeners, command, expectedPid: 99 }).action, "refuse");
  const parentWithoutSite: PortListener[] = [
    { port: 18790, pid: 1613691, address: "127.0.0.1:18790" },
    { port: 18791, pid: 1613691, address: "127.0.0.1:18791" },
    { port: 8787, pid: 1702655, address: "127.0.0.1:8787" },
    { port: 8790, pid: 42, address: "127.0.0.1:8790" },
  ];
  assert.equal(integratedParentPid({ listeners: parentWithoutSite, command, expectedPid: 1613691 }), 1613691);
  assert.equal(integratedParentPid({ listeners: parentWithoutSite, command, expectedPid: 42 }), null);
  assert.equal(signalAllowed(42, listeners), false);
  assert.equal(signalAllowed(1613691, listeners), true);
  assert.equal(signalAllowed(1, listeners), false);
  const workerOnSite: PortListener[] = [{ port: 8765, pid: 1702655, address: "127.0.0.1:8765" }];
  assert.equal(planLocalSwitch({ listeners: workerOnSite, command }).action, "refuse");
  const orphan = orphanWorkerPid({
    listeners: [{ port: 8787, pid: 1702655, address: "127.0.0.1:8787" }, { port: 8790, pid: 42, address: "127.0.0.1:8790" }],
    deadParentPid: 1613691,
    ppid: (pid) => pid === 1702655 ? 1 : 2,
    command,
  });
  assert.equal(orphan.pid, 1702655);
  const protectedOrphan = orphanWorkerPid({
    listeners: [{ port: 8787, pid: 42, address: "127.0.0.1:8787" }, { port: 8790, pid: 42, address: "127.0.0.1:8790" }],
    deadParentPid: 1613691,
    ppid: () => 1,
    command: () => "workerd",
  });
  assert.equal(protectedOrphan.pid, null);
  assert.match(protectedOrphan.message ?? "", /受保护/);
});

test("ss 输出能认出旧端口上的 pid", () => {
  const text = [
    "LISTEN 0 511 127.0.0.1:8765 0.0.0.0:* users:((\"node\",pid=1613691,fd=20))",
    "LISTEN 0 511 127.0.0.1:8787 0.0.0.0:* users:((\"workerd\",pid=1702655,fd=4))",
    "LISTEN 0 511 127.0.0.1:8790 0.0.0.0:* users:((\"other\",pid=42,fd=3))",
  ].join("\n");
  const listeners = parseSsListeners(text);
  assert.equal(listeners.find((item) => item.port === 8765)?.pid, 1613691);
  assert.equal(listeners.find((item) => item.port === 8787)?.pid, 1702655);
  assert.equal(listeners.find((item) => item.port === 8790)?.pid, 42);
});

test("静态页只改写空的 askApi，文章和脚本原样返回", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "ask-site-"));
  const marker = `<script>${ASK_API_ASSIGNMENT};</script>`;
  writeFileSync(path.join(root, "index.html"), `<html>${marker}<a href="/posts/demo/">文章</a></html>`);
  const scriptFile = `/* ${ASK_API_ASSIGNMENT} */\n`;
  writeFileSync(path.join(root, "app.js"), scriptFile);
  const postDir = path.join(root, "posts", "demo");
  mkdirSync(postDir, { recursive: true });
  const nested = path.join(postDir, "index.html");
  writeFileSync(nested, `<html>${marker}<p>原文</p></html>`);
  writeFileSync(path.join(root, "pic.png"), Buffer.from([1, 2, 3]));
  assert.equal(resolveSiteFile(root, "/../../etc/passwd"), null);
  assert.equal(resolveSiteFile(root, "/posts/demo/"), nested);
  const server = createSiteServer(root);
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    const html = await fetch(`http://127.0.0.1:${port}/`);
    const htmlText = await html.text();
    assert.equal(html.headers.get("cache-control"), "no-store");
    assert.match(htmlText, /dataset\.askApi = "http:\/\/127\.0\.0\.1:8787"/);
    assert.equal(htmlText.includes(ASK_API_ASSIGNMENT), false);
    assert.match(htmlText, /文章/);
    const script = await (await fetch(`http://127.0.0.1:${port}/app.js`)).text();
    assert.equal(script, scriptFile);
    const article = await (await fetch(`http://127.0.0.1:${port}/posts/demo`)).text();
    assert.match(article, /原文/);
    assert.match(article, /127\.0\.0\.1:8787/);
    const image = Buffer.from(await (await fetch(`http://127.0.0.1:${port}/pic.png`)).arrayBuffer());
    assert.deepEqual([...image], [1, 2, 3]);
    const missing = await fetch(`http://127.0.0.1:${port}/posts/missing`);
    assert.equal(missing.status, 404);
    await missing.text();
  } finally {
    server.closeAllConnections();
    if (server.listening) {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }
  const rewritten = rewriteAskApi(`<b>${ASK_API_ASSIGNMENT}</b>`);
  assert.equal(rewritten.rewritten, true);
  assert.equal(rewriteAskApi("<p>no marker</p>").rewritten, false);
});
