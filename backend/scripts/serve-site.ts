import { createServer, type Server } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ASK_API_ASSIGNMENT,
  SITE_PORT,
  resolveSiteFile,
  rewriteAskApi,
  siteContentType,
} from "../src/local-switch.ts";
import { readPid, writePidFile } from "../src/validation-runtime.ts";

const API_ORIGIN = "http://127.0.0.1:8787";

export function createSiteServer(root: string, apiOrigin = API_ORIGIN): Server {
  const siteRoot = path.resolve(root);
  let warned = false;
  return createServer((request, response) => {
    const file = resolveSiteFile(siteRoot, request.url ?? "/");
    if (!file) {
      response.statusCode = 404;
      response.end("not found");
      return;
    }
    const body = readFileSync(file);
    const type = siteContentType(file);
    response.setHeader("content-type", type);
    if (!type.startsWith("text/html")) {
      response.end(body);
      return;
    }
    response.setHeader("cache-control", "no-store");
    const text = body.toString("utf8");
    const rewritten = rewriteAskApi(text, apiOrigin);
    if (!rewritten.rewritten && !warned && text.includes("askApi")) {
      warned = true;
      console.error("HTML 里没有空的 askApi 赋值，页面仍按原文件返回。");
    }
    response.end(rewritten.html);
  });
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return pathToFileURL(path.resolve(entry)).href === import.meta.url;
}

export function listenSite(root: string, port = SITE_PORT): Promise<Server> {
  if (port !== SITE_PORT) return Promise.reject(new Error("静态站只监听 127.0.0.1:8765。"));
  const server = createSiteServer(root);
  const pidFile = path.join(import.meta.dirname, "../dist/validation/site.pid");
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      mkdirSync(path.dirname(pidFile), { recursive: true });
      writePidFile(pidFile, process.pid);
      console.log(JSON.stringify({
        listen: `http://127.0.0.1:${port}`,
        root: path.resolve(root),
        pid: process.pid,
        pidFile,
        apiOrigin: API_ORIGIN,
        rewrite: ASK_API_ASSIGNMENT,
        quotaReset: false,
      }));
      resolve(server);
    });
  });
}

if (isDirectRun()) {
  const root = process.env.ASK_SITE_ROOT
    ? path.resolve(process.env.ASK_SITE_ROOT)
    : path.resolve(import.meta.dirname, "../../_site");
  if (!existsSync(root)) {
    console.error(`静态目录不存在：${root}。没有重新构建，也没有改页面源码。`);
    process.exit(1);
  }
  const pidFile = path.join(import.meta.dirname, "../dist/validation/site.pid");
  const existing = readPid(pidFile);
  if (existing && existing !== process.pid) {
    try {
      process.kill(existing, 0);
      console.error("静态服务的 pid 文件仍存活。没有再绑 8765。");
      process.exit(1);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") {
        console.error("静态服务的 pid 文件仍存活。没有再绑 8765。");
        process.exit(1);
      }
    }
  }
  const server = await listenSite(root);
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  }
}
