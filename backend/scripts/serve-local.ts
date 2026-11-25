import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createAnswer } from "../src/handler.ts";
import { createSqliteQuotaDatabase } from "../test/sqlite-quota.ts";
import type { AskBindings, KnowledgeBundle } from "../src/types.ts";

const port = Number(process.env.ASK_LOCAL_PORT ?? "8787");
const bundleFile = process.env.ASK_BUNDLE_FILE;
if (!bundleFile) {
  console.error("设置 ASK_BUNDLE_FILE 指向已校验的知识包。未配置时不会启动。");
  process.exit(1);
}
const bundle = JSON.parse(readFileSync(bundleFile, "utf8")) as KnowledgeBundle;
const database = createSqliteQuotaDatabase();
const env: AskBindings = {
  QUOTA_HMAC_KEY: process.env.QUOTA_HMAC_KEY,
  ASK_ALLOW_DEV_IP: "0",
  ASK_ALLOW_MOCK: process.env.ASK_ALLOW_MOCK,
  ASK_ALLOWED_ORIGINS: process.env.ASK_ALLOWED_ORIGINS ?? "http://127.0.0.1:8765,https://shijayhuo.github.io",
  EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
  EMBEDDING_BASE_URL: process.env.EMBEDDING_BASE_URL,
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS: process.env.EMBEDDING_DIMENSIONS,
  CHAT_API_KEY: process.env.CHAT_API_KEY,
  CHAT_BASE_URL: process.env.CHAT_BASE_URL,
  CHAT_MODEL: process.env.CHAT_MODEL,
};
if (!env.QUOTA_HMAC_KEY) {
  console.error("缺少 QUOTA_HMAC_KEY，已停止。");
  process.exit(1);
}

const server = createServer(async (nodeRequest, nodeResponse) => {
  const chunks: Buffer[] = [];
  for await (const chunk of nodeRequest) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeRequest.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  headers.set("cf-connecting-ip", "127.0.0.1");
  const request = new Request(`http://127.0.0.1:${port}${nodeRequest.url ?? "/"}`, {
    method: nodeRequest.method,
    headers,
    body: nodeRequest.method === "GET" || nodeRequest.method === "HEAD" ? undefined : body,
  });
  const response = await createAnswer(request, env, { bundle });
  nodeResponse.statusCode = response.status;
  response.headers.forEach((value, key) => nodeResponse.setHeader(key, value));
  if (!response.body) {
    nodeResponse.end();
    return;
  }
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    nodeResponse.write(Buffer.from(value));
  }
  nodeResponse.end();
});

server.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({
    listen: `http://127.0.0.1:${port}/ask`,
    mock: env.ASK_ALLOW_MOCK === "1",
    note: "本地包装器写入 CF-Connecting-IP。mock 知识包不是语义召回。这不是生产部署。",
  }));
});
