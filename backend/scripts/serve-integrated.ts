import { createServer, type IncomingMessage } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { Miniflare, type MiniflareOptions } from "miniflare";
import { createKnowledgeBundle, saveKnowledgeBundle } from "../src/bundle.ts";
import { hashEmbedding } from "../src/mock-adapter.ts";
import { createOpenAIEmbedding } from "../src/openai-adapter.ts";
import { listPublishedPosts } from "../src/publish.ts";
import { findChunksByQuery } from "../src/retrieve.ts";
import type { KnowledgeBundle } from "../src/types.ts";
import {
  MOCK_API_KEY,
  MOCK_CHAT_MODEL,
  MOCK_DIMENSIONS_USED,
  MOCK_EMBEDDING_MODEL,
  startMockUpstream,
} from "./mock-upstream.ts";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(backendRoot, "..");
const localDir = path.join(backendRoot, "dist", "local");
const knowledgeFile = path.join(localDir, "knowledge.json");
const stampFile = path.join(localDir, "knowledge-stamp.json");
const probeFile = path.join(localDir, "probe.json");
const stateDir = path.join(localDir, "d1");

const sitePort = Number(process.env.ASK_SITE_PORT ?? "8765");
const workerPort = Number(process.env.ASK_WORKER_PORT ?? "8787");
const plainPort = Number(process.env.ASK_UNCONFIGURED_PORT ?? "8788");
const upstreamPort = Number(process.env.ASK_UPSTREAM_PORT ?? "8790");
const controlPort = Number(process.env.ASK_CONTROL_PORT ?? "8791");
const siteOrigin = `http://127.0.0.1:${sitePort}`;
const workerOrigin = `http://127.0.0.1:${workerPort}`;
const plainOrigin = `http://127.0.0.1:${plainPort}`;
const upstreamOrigin = `http://127.0.0.1:${upstreamPort}/v1`;

const LOCAL_STAMP = {
  provider: "openai",
  model: MOCK_EMBEDDING_MODEL,
  dimensions: MOCK_DIMENSIONS_USED,
  chatModel: MOCK_CHAT_MODEL,
  note: "512 维字符哈希，本地最低分 0.55。只说明摘录重合，不是语义召回。",
};

function textBinding(value: string): { type: "text"; value: string } {
  return { type: "text", value };
}

function workerOptions(name: string, script: string, env: Record<string, unknown>, persist: string | undefined): MiniflareOptions {
  const root = localDir;
  return {
    host: "127.0.0.1",
    port: name === "ajie-ask-live" ? workerPort : plainPort,
    enableDevRegistry: false,
    logRequests: false,
    resourcePersistencePath: persist,
    workers: [{
      config: {
        name,
        compatibilityDate: "2026-11-25",
        compatibilityFlags: ["nodejs_compat"],
        env,
        manifest: {
          mainModule: "worker.js",
          modulesRoot: root,
          modules: { "worker.js": { type: "esm", contents: script } },
        },
      },
      dev: {
        rootPath: root,
        outboundService: {
          type: "fetcher",
          handler(request: Request) {
            const controller = new AbortController();
            if (request.signal.aborted) controller.abort();
            else request.signal.addEventListener("abort", () => controller.abort(), { once: true });
            const method = request.method;
            const hasBody = method !== "GET" && method !== "HEAD";
            const init: RequestInit & { duplex?: "half" } = {
              method,
              headers: request.headers,
              body: hasBody ? request.body : undefined,
              signal: controller.signal,
            };
            if (hasBody) init.duplex = "half";
            return fetch(request.url, init);
          },
        },
      },
    }],
  };
}

async function bundleWorker(entry: string, outfile: string): Promise<string> {
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    outfile,
    logLevel: "silent",
  });
  return readFile(outfile, "utf8");
}

async function ensureKnowledge(rebuild: boolean): Promise<KnowledgeBundle> {
  await mkdir(localDir, { recursive: true });
  if (!rebuild && existsSync(knowledgeFile) && existsSync(stampFile)) {
    const stamp = JSON.parse(await readFile(stampFile, "utf8")) as typeof LOCAL_STAMP;
    if (stamp.model === LOCAL_STAMP.model && stamp.dimensions === LOCAL_STAMP.dimensions && stamp.provider === LOCAL_STAMP.provider) {
      return JSON.parse(await readFile(knowledgeFile, "utf8")) as KnowledgeBundle;
    }
  }
  const embedding = createOpenAIEmbedding({
    apiKey: MOCK_API_KEY,
    baseURL: upstreamOrigin,
    model: MOCK_EMBEDDING_MODEL,
    dimensions: MOCK_DIMENSIONS_USED,
  });
  let embeddedCount = 0;
  const documents = listPublishedPosts(repoRoot, new Date());
  console.log(JSON.stringify({ phase: "embed", documents: documents.length, note: LOCAL_STAMP.note }));
  const result = await createKnowledgeBundle({
    documents,
    embedding: {
      ...embedding,
      async createEmbedding(input, signal) {
        embeddedCount += 1;
        if (embeddedCount % 20 === 0) console.log(JSON.stringify({ phase: "embed", chunks: embeddedCount }));
        return embedding.createEmbedding(input, signal);
      },
    },
    cache: null,
  });
  await saveKnowledgeBundle(knowledgeFile, result.bundle);
  await writeFile(stampFile, `${JSON.stringify(LOCAL_STAMP, null, 2)}\n`);
  console.log(JSON.stringify({
    phase: "embed-done",
    documents: result.bundle.manifest.documents.length,
    chunks: result.bundle.manifest.chunkCount,
    embedded: result.embedded,
  }));
  return result.bundle;
}

async function writeProbe(bundle: KnowledgeBundle): Promise<void> {
  const ordered = [
    ...bundle.chunks.filter((chunk) => chunk.url === "/about/"),
    ...bundle.chunks.filter((chunk) => chunk.url !== "/about/"),
  ];
  let best: { question: string; score: number; url: string; title: string; id: string } | null = null;
  for (const chunk of ordered) {
    for (const size of [140, 220, 360]) {
      const question = chunk.text.slice(0, size).trim();
      if (question.length < 80 || question.startsWith("-") || question.startsWith("标签：")) continue;
      const hits = findChunksByQuery(bundle, hashEmbedding(question, MOCK_DIMENSIONS_USED), 2);
      const hit = hits[0];
      const second = hits[1]?.score ?? 0;
      if (!hit || hit.id !== chunk.id || hit.score < 0.55 || second >= 0.55) continue;
      best = { question, score: hit.score, url: hit.url, title: hit.title, id: hit.id };
      break;
    }
    if (best?.url === "/about/") break;
  }
  const probe = best ?? { question: "霍世杰的从业经历是什么？", score: 0, url: "", title: "", id: "" };
  await writeFile(probeFile, `${JSON.stringify({ ...probe, note: LOCAL_STAMP.note }, null, 2)}\n`);
}

function contentType(file: string): string {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".jpg") || file.endsWith(".jpeg")) return "image/jpeg";
  if (file.endsWith(".webp")) return "image/webp";
  if (file.endsWith(".xml")) return "application/xml";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".webmanifest")) return "application/manifest+json";
  return "application/octet-stream";
}

function startSite(directory: string): Promise<void> {
  const root = path.resolve(directory);
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", siteOrigin);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("not found");
      return;
    }
    if (file.endsWith(".html")) {
      readFile(file, "utf8").then((html) => {
        const patched = html.replace(
          'document.documentElement.dataset.askApi = "";',
          `document.documentElement.dataset.askApi = ${JSON.stringify(workerOrigin)};`,
        );
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        });
        response.end(patched);
      }).catch(() => {
        response.writeHead(500).end();
      });
      return;
    }
    response.writeHead(200, { "content-type": contentType(file) });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve) => server.listen(sitePort, "127.0.0.1", () => resolve()));
}

function readControlBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function startControl(resetQuota: () => Promise<number>, resetUpstream: () => Promise<unknown>): void {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://127.0.0.1:${controlPort}`);
    if (request.method === "GET" && url.pathname === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }
    if (request.method === "POST" && url.pathname === "/reset-quota") {
      const removed = await resetQuota();
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ reset: true, removed }));
      return;
    }
    if (request.method === "POST" && url.pathname === "/reset-upstream") {
      const stats = await resetUpstream();
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(stats));
      return;
    }
    if (request.method === "GET" && url.pathname === "/upstream") {
      const stats = await fetch(`http://127.0.0.1:${upstreamPort}/stats`).then((item) => item.json());
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(stats));
      return;
    }
    await readControlBody(request);
    response.writeHead(404).end();
  });
  server.listen(controlPort, "127.0.0.1");
}

async function applyQuotaMigration(database: { exec: (sql: string) => Promise<unknown> }): Promise<void> {
  const sql = await readFile(path.join(backendRoot, "migrations", "0001_quota.sql"), "utf8");
  const statement = sql.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();
  await database.exec(statement);
}

async function main(): Promise<void> {
  const siteDir = path.join(repoRoot, "_site");
  if (!existsSync(path.join(siteDir, "index.html"))) {
    console.error("缺少预构建站点 _site/index.html。先在仓库根目录执行 Jekyll 构建。");
    process.exit(1);
  }
  const upstream = await startMockUpstream(upstreamPort);
  const rebuild = process.argv.includes("--rebuild");
  const bundle = await ensureKnowledge(rebuild);
  await writeProbe(bundle);
  const liveEntry = path.join(localDir, "live-entry.ts");
  const plainEntry = path.join(localDir, "plain-entry.ts");
  await writeFile(liveEntry, `import { createAnswer } from "../../src/handler.ts";
import bundle from "./knowledge.json" with { type: "json" };
export default {
  async fetch(request, env) {
    return createAnswer(request, env, { bundle });
  },
};
`);
  await writeFile(plainEntry, `import { createAnswer } from "../../src/handler.ts";
export default {
  async fetch(request, env) {
    return createAnswer(request, env, { bundle: null });
  },
};
`);
  const liveScript = await bundleWorker(liveEntry, path.join(localDir, "live-worker.js"));
  const plainScript = await bundleWorker(plainEntry, path.join(localDir, "plain-worker.js"));
  const liveEnv: Record<string, unknown> = {
    QUOTA_DB: { type: "d1", name: "ajie-ask-quota" },
    QUOTA_HMAC_KEY: textBinding("local-only"),
    ASK_ALLOW_MOCK: textBinding("0"),
    ASK_ALLOW_DEV_IP: textBinding("0"),
    ASK_ALLOWED_ORIGINS: textBinding(siteOrigin),
    ASK_MIN_SCORE: textBinding("0.55"),
    EMBEDDING_API_KEY: textBinding(MOCK_API_KEY),
    EMBEDDING_BASE_URL: textBinding(upstreamOrigin),
    EMBEDDING_MODEL: textBinding(MOCK_EMBEDDING_MODEL),
    EMBEDDING_DIMENSIONS: textBinding(String(MOCK_DIMENSIONS_USED)),
    CHAT_API_KEY: textBinding(MOCK_API_KEY),
    CHAT_BASE_URL: textBinding(upstreamOrigin),
    CHAT_MODEL: textBinding(MOCK_CHAT_MODEL),
  };
  const plainEnv: Record<string, unknown> = {
    ASK_ALLOW_MOCK: textBinding("0"),
    ASK_ALLOW_DEV_IP: textBinding("0"),
    ASK_ALLOWED_ORIGINS: textBinding(siteOrigin),
  };
  const live = new Miniflare(workerOptions("ajie-ask-live", liveScript, liveEnv, stateDir));
  const plain = new Miniflare(workerOptions("ajie-ask-plain", plainScript, plainEnv, path.join(localDir, "d1-plain")));
  await live.ready;
  await plain.ready;
  const database = await live.getD1Database("QUOTA_DB");
  await applyQuotaMigration(database);
  await startSite(siteDir);
  startControl(async () => {
    const result = await database.prepare("DELETE FROM quota").run();
    return Number(result.meta?.changes ?? 0);
  }, async () => {
    const response = await fetch(`http://127.0.0.1:${upstreamPort}/stats/reset`, { method: "POST" });
    return response.json();
  });
  const ready = {
    ready: true,
    site: `${siteOrigin}/`,
    ask: `${workerOrigin}/ask`,
    unconfigured: `${plainOrigin}/ask`,
    upstream: `http://127.0.0.1:${upstreamPort}`,
    control: `http://127.0.0.1:${controlPort}`,
    reset: `POST http://127.0.0.1:${controlPort}/reset-quota`,
    probe: probeFile,
    mock: LOCAL_STAMP.note,
    runtime: "miniflare-local-d1",
  };
  console.log(JSON.stringify(ready));
  const shutdown = async () => {
    await live.dispose();
    await plain.dispose();
    await upstream.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
  await new Promise(() => {});
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
