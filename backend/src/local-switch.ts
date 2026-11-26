import { execFileSync } from "node:child_process";
import { readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

export const SITE_PORT = 8765;
export const LOCAL_API_PORT = 8787;
export const OLD_MOCK_PORT = 18790;
export const OLD_CONTROL_PORT = 18791;
export const PROTECTED_PORTS = [8790, 8791] as const;
const SWITCH_PORTS = [SITE_PORT, LOCAL_API_PORT, OLD_MOCK_PORT, OLD_CONTROL_PORT] as const;

export interface PortListener {
  port: number;
  pid: number;
  address: string;
}

export type SwitchPlan =
  | { action: "start" }
  | { action: "already"; pid: number }
  | { action: "stop"; pid: number }
  | { action: "refuse"; message: string };

export function parseSsListeners(text: string): PortListener[] {
  const found: PortListener[] = [];
  for (const line of text.split("\n")) {
    const fields = line.trim().split(/\s+/);
    const local = fields[3] ?? "";
    const portMatch = local.match(/:(\d+)$/);
    if (!portMatch) continue;
    const port = Number(portMatch[1]);
    for (const match of line.matchAll(/pid=(\d+)/g)) {
      found.push({ port, pid: Number(match[1]), address: local });
    }
  }
  return found;
}

export function listListeners(): PortListener[] {
  let text = "";
  try {
    text = execFileSync("ss", ["-H", "-ltnp"], { encoding: "utf8" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    throw new Error(`无法列出监听端口，没有停止任何进程。${detail}`);
  }
  return parseSsListeners(text);
}

export function readProcessCommand(pid: number): string {
  try {
    return readFileSync(`/proc/${pid}/cmdline`, "utf8").replaceAll("\0", " ");
  } catch {
    return "";
  }
}

export function readParentPid(pid: number): number | null {
  try {
    const match = readFileSync(`/proc/${pid}/status`, "utf8").match(/^PPid:\s*(\d+)/m);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

export function signalAllowed(pid: number, listeners: PortListener[]): boolean {
  if (!Number.isInteger(pid) || pid <= 1) return false;
  return !listeners.some((item) => item.pid === pid && (PROTECTED_PORTS as readonly number[]).includes(item.port));
}

export function integratedParentPid(input: {
  listeners: PortListener[];
  command: (pid: number) => string;
  expectedPid?: number;
}): number | null {
  const pids = [...new Set(input.listeners.filter((item) =>
    item.port === SITE_PORT || item.port === OLD_MOCK_PORT || item.port === OLD_CONTROL_PORT
  ).map((item) => item.pid))];
  const matches = pids.filter((pid) => {
    if (!signalAllowed(pid, input.listeners)) return false;
    if (input.expectedPid !== undefined && pid !== input.expectedPid) return false;
    return input.command(pid).includes("serve-integrated");
  });
  return matches.length === 1 ? matches[0] ?? null : null;
}

export function planLocalSwitch(input: {
  listeners: PortListener[];
  command: (pid: number) => string;
  expectedPid?: number;
}): SwitchPlan {
  const protectedPids = new Set(
    input.listeners.filter((item) => (PROTECTED_PORTS as readonly number[]).includes(item.port)).map((item) => item.pid),
  );
  const site = input.listeners.filter((item) => item.port === SITE_PORT);
  if (site.length === 0) return { action: "start" };
  const pids = [...new Set(site.map((item) => item.pid))];
  if (pids.length !== 1) return { action: "refuse", message: "8765 有多个监听进程，没有停止任何进程。" };
  const pid = pids[0] ?? 0;
  if (protectedPids.has(pid) || !signalAllowed(pid, input.listeners)) {
    return { action: "refuse", message: `pid ${pid} 碰到受保护端口，没有发信号。` };
  }
  const command = input.command(pid);
  if (command.includes("serve-site.ts")) return { action: "already", pid };
  if (command.includes("workerd") && !command.includes("serve-integrated")) {
    return { action: "refuse", message: "8765 上是 workerd。只杀它会被父进程拉起，没有发信号。" };
  }
  if (!command.includes("serve-integrated")) {
    return { action: "refuse", message: "8765 不是旧的 serve-integrated，没有停止它。" };
  }
  if (input.expectedPid !== undefined && pid !== input.expectedPid) {
    return { action: "refuse", message: `8765 的 pid 是 ${pid}，与指定的 ${input.expectedPid} 不同，没有停止。` };
  }
  for (const port of [OLD_MOCK_PORT, OLD_CONTROL_PORT]) {
    const holders = [...new Set(input.listeners.filter((item) => item.port === port).map((item) => item.pid))];
    if (holders.length === 0) continue;
    if (holders.length !== 1 || holders[0] !== pid) {
      return { action: "refuse", message: `${port} 不是同一个整合进程，没有停止。` };
    }
  }
  return { action: "stop", pid };
}

export function orphanWorkerPid(input: {
  listeners: PortListener[];
  deadParentPid: number;
  ppid: (pid: number) => number | null;
  command: (pid: number) => string;
}): { pid: number | null; message?: string } {
  const holders = input.listeners.filter((item) => (SWITCH_PORTS as readonly number[]).includes(item.port));
  if (holders.length === 0) return { pid: null };
  const pids = [...new Set(holders.map((item) => item.pid))];
  if (pids.length !== 1) return { pid: null, message: "旧端口仍由多个进程占用，没有继续发信号。" };
  const pid = pids[0] ?? 0;
  if (!signalAllowed(pid, input.listeners)) return { pid: null, message: "残留进程占用受保护端口，没有发信号。" };
  const command = input.command(pid);
  if (!command.includes("workerd")) return { pid: null, message: "残留进程不是 workerd，没有发信号。" };
  const parent = input.ppid(pid);
  if (parent !== 1 && parent !== input.deadParentPid) {
    return { pid: null, message: "workerd 的父进程不是刚停掉的整合进程，没有发信号。" };
  }
  return { pid };
}

export const ASK_API_ASSIGNMENT = 'document.documentElement.dataset.askApi = ""';
const PRODUCTION_ASK_ASSIGNMENT = 'document.documentElement.dataset.askApi = "https://ajie-ask.aaaaaajie666.workers.dev/ask"';

export function rewriteAskApi(html: string, origin = "http://127.0.0.1:8787"): { html: string; rewritten: boolean } {
  const next = `document.documentElement.dataset.askApi = ${JSON.stringify(origin)}`;
  let output = html;
  let rewritten = false;
  for (const pattern of [ASK_API_ASSIGNMENT, PRODUCTION_ASK_ASSIGNMENT]) {
    if (!output.includes(pattern)) continue;
    output = output.split(pattern).join(next);
    rewritten = true;
  }
  return { html: output, rewritten };
}

export function resolveSiteFile(root: string, urlPath: string): string | null {
  let decoded = "/";
  try {
    decoded = decodeURIComponent((urlPath.split("?")[0] ?? "/"));
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const normalized = path.posix.normalize(decoded.startsWith("/") ? decoded : `/${decoded}`);
  if (!normalized.startsWith("/") || normalized.includes("..")) return null;
  const relative = normalized.slice(1);
  const candidates = relative === "" || relative.endsWith("/")
    ? [`${relative}index.html`]
    : [relative, `${relative}.html`, `${relative}/index.html`];
  const rootResolved = path.resolve(root);
  const prefix = rootResolved.endsWith(path.sep) ? rootResolved : `${rootResolved}${path.sep}`;
  for (const candidate of candidates) {
    const file = path.resolve(rootResolved, candidate);
    if (file !== rootResolved && !file.startsWith(prefix)) continue;
    if (!existsSync(file)) continue;
    if (!statSync(file).isFile()) continue;
    return file;
  }
  return null;
}

export function siteContentType(file: string): string {
  const extension = path.extname(file).toLowerCase();
  const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml",
  };
  return types[extension] ?? "application/octet-stream";
}
