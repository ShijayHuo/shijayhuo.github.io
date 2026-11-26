import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  OLD_CONTROL_PORT,
  OLD_MOCK_PORT,
  PROTECTED_PORTS,
  SITE_PORT,
  LOCAL_API_PORT,
  integratedParentPid,
  listListeners,
  orphanWorkerPid,
  planLocalSwitch,
  readParentPid,
  readProcessCommand,
  signalAllowed,
  type PortListener,
} from "../src/local-switch.ts";
import { listenSite } from "./serve-site.ts";
import { isPidAlive } from "../src/validation-runtime.ts";
import { snapshotQuota } from "../test/sqlite-quota.ts";

const watched = [SITE_PORT, LOCAL_API_PORT, OLD_MOCK_PORT, OLD_CONTROL_PORT];

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function held(listeners: PortListener[]): PortListener[] {
  return listeners.filter((item) => watched.includes(item.port));
}

async function waitUntilClear(parentPid: number): Promise<void> {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (portsClear(listListeners())) return;
    await sleep(200);
  }
  let listeners = listListeners();
  if (!portsClear(listeners) && isPidAlive(parentPid)) {
    if (!signalAllowed(parentPid, listeners)) fail("父进程碰到受保护端口，没有发信号。");
    process.kill(parentPid, "SIGKILL");
    await sleep(500);
    listeners = listListeners();
  }
  if (portsClear(listeners)) return;
  const orphan = orphanWorkerPid({
    listeners,
    deadParentPid: parentPid,
    ppid: readParentPid,
    command: readProcessCommand,
  });
  if (orphan.message && orphan.pid === null) fail(orphan.message);
  if (orphan.pid !== null) {
    const current = listListeners();
    if (!signalAllowed(orphan.pid, current)) fail("残留 workerd 碰到受保护端口，没有发信号。");
    process.kill(orphan.pid, "SIGTERM");
    await sleep(1000);
  }
  if (!portsClear(listListeners())) {
    const left = held(listListeners()).map((item) => `${item.port}:${item.pid}`).join(", ");
    fail(`旧端口还没放开：${left}。没有启动新的静态服务。`);
  }
}

function portsClear(listeners: PortListener[]): boolean {
  return held(listeners).length === 0;
}

async function stopParent(pid: number): Promise<void> {
  const before = listListeners();
  if (!signalAllowed(pid, before)) fail("目标进程碰到受保护端口，没有发信号。");
  const protectedBefore = before
    .filter((item) => (PROTECTED_PORTS as readonly number[]).includes(item.port))
    .map((item) => item.pid);
  process.kill(pid, "SIGTERM");
  await waitUntilClear(pid);
  const protectedAfter = listListeners()
    .filter((item) => (PROTECTED_PORTS as readonly number[]).includes(item.port))
    .map((item) => item.pid);
  console.log(JSON.stringify({
    stoppedParent: pid,
    protectedPorts: PROTECTED_PORTS,
    protectedPidsBefore: protectedBefore,
    protectedPidsAfter: protectedAfter,
    signaledProtected: false,
  }));
}

async function detach(expectedPid?: number): Promise<void> {
  const listeners = listListeners();
  const plan = planLocalSwitch({
    listeners,
    command: readProcessCommand,
    expectedPid,
  });
  if (plan.action === "refuse") fail(plan.message);
  if (plan.action === "already") {
    console.log(JSON.stringify({ site: "already-running", pid: plan.pid }));
    return;
  }
  if (plan.action === "stop") {
    await stopParent(plan.pid);
    return;
  }
  const parent = integratedParentPid({ listeners, command: readProcessCommand, expectedPid });
  if (parent !== null) {
    await stopParent(parent);
    return;
  }
  const busy = listeners.filter((item) => item.port === LOCAL_API_PORT || item.port === OLD_MOCK_PORT || item.port === OLD_CONTROL_PORT);
  if (busy.length === 0) {
    console.log("8765 空闲，没有需要停止的旧进程。");
    return;
  }
  const orphan = orphanWorkerPid({
    listeners,
    deadParentPid: expectedPid ?? -1,
    ppid: readParentPid,
    command: readProcessCommand,
  });
  if (orphan.pid !== null && signalAllowed(orphan.pid, listeners)) {
    process.kill(orphan.pid, "SIGTERM");
    await sleep(1000);
    if (portsClear(listListeners())) return;
  }
  const left = held(listListeners()).map((item) => `${item.port}:${item.pid}`).join(", ");
  fail(`8765 空闲，但旧端口仍被占用：${left}。没有启动静态服务，避免页面继续指向哈希 mock。`);
}

function quotaFile(): string {
  return process.env.ASK_QUOTA_FILE
    ? path.resolve(process.env.ASK_QUOTA_FILE)
    : path.resolve(import.meta.dirname, "../dist/validation/quota.sqlite");
}

function siteRoot(): string {
  return process.env.ASK_SITE_ROOT
    ? path.resolve(process.env.ASK_SITE_ROOT)
    : path.resolve(import.meta.dirname, "../../_site");
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

if (isDirectRun()) {
  const planOnly = process.argv.includes("--plan");
  const detachAndServe = process.argv.includes("--detach-and-serve");
  const parentText = flagValue("--parent");
  const expectedPid = parentText === undefined ? undefined : Number(parentText);
  if (planOnly === detachAndServe) fail("请只选一个：--plan，或 --detach-and-serve。");
  if (expectedPid !== undefined && (!Number.isInteger(expectedPid) || expectedPid <= 1)) {
    fail("--parent 不是可用的 pid。");
  }
  if (planOnly) {
    const plan = planLocalSwitch({
      listeners: listListeners(),
      command: readProcessCommand,
      expectedPid,
    });
    console.log(JSON.stringify({ plan, protectedPorts: PROTECTED_PORTS, signaled: false }));
    process.exit(plan.action === "refuse" ? 1 : 0);
  }
  const expectText = flagValue("--expect-used");
  const expectUsed = Number(expectText);
  if (!Number.isInteger(expectUsed) || expectUsed < 0) fail("请带上 --expect-used，例如 8。额度文件还没打开。");
  await detach(expectedPid);
  let snapshot: ReturnType<typeof snapshotQuota>;
  try {
    snapshot = snapshotQuota(quotaFile(), expectUsed);
  } catch (error) {
    fail(error instanceof Error ? error.message : "额度校验失败。");
  }
  console.log(JSON.stringify({
    quotaFile: quotaFile(),
    backup: snapshot.backup,
    rows: snapshot.summary.rows,
    usedMax: snapshot.summary.usedMax,
    usedSum: snapshot.summary.usedSum,
    remainingAtMax: 20 - snapshot.summary.usedMax,
    quotaReset: false,
    hmacRotated: false,
  }));
  const listeners = listListeners();
  if (listeners.some((item) => item.port === SITE_PORT)) {
    const running = planLocalSwitch({ listeners, command: readProcessCommand });
    if (running.action === "already") {
      console.log(JSON.stringify({ site: "kept", pid: running.pid }));
      process.exit(0);
    }
    fail("8765 仍被占用，没有启动新的静态服务。");
  }
  const root = siteRoot();
  if (!existsSync(root)) fail(`静态目录不存在：${root}。没有重新构建，也没有改页面源码。`);
  const after = listListeners();
  const stale = after.filter((item) => item.port === OLD_MOCK_PORT || item.port === OLD_CONTROL_PORT
    || (item.port === LOCAL_API_PORT && readProcessCommand(item.pid).includes("workerd")));
  if (stale.length > 0) {
    const left = stale.map((item) => `${item.port}:${item.pid}`).join(", ");
    fail(`旧 mock 还在：${left}。没有启动静态服务，避免页面指向哈希索引。`);
  }
  const server = await listenSite(root);
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  }
}
