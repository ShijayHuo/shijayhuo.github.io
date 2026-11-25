import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { createAnswer } from "../src/handler.ts";
import { publicEmbeddingBaseURL, validationChatError, validationProfileError } from "../src/embedding-space.ts";
import { CHAT_PROBE_STATUS, VALIDATION_API_PORT, VALIDATION_CHAT_BASE_URL, VALIDATION_CHAT_MODEL, VALIDATION_EMBEDDING_BASE_URL, VALIDATION_EMBEDDING_DIMENSIONS, VALIDATION_EMBEDDING_MODEL } from "../src/limits.ts";
import { verifyKnowledgeBundle } from "../src/knowledge.ts";
import { createMockChat } from "../src/mock-adapter.ts";
import { redactSecrets, secretValues } from "../src/redact.ts";
import {
  decideValidationStart,
  isPidAlive,
  readPid,
  stopValidationProcess,
  writePidFile,
} from "../src/validation-runtime.ts";
import { LOCAL_API_PORT, listListeners } from "../src/local-switch.ts";
import { createFileQuotaDatabase, snapshotQuota } from "../test/sqlite-quota.ts";
import type { AskBindings, KnowledgeBundle } from "../src/types.ts";

const backendRoot = path.join(import.meta.dirname, "..");
const secrets = secretValues();
const runtimeDir = path.join(backendRoot, "dist/validation");
const pidFile = process.env.ASK_PID_FILE ? path.resolve(process.env.ASK_PID_FILE) : path.join(runtimeDir, "api.pid");
const quotaFile = process.env.ASK_QUOTA_FILE ? path.resolve(process.env.ASK_QUOTA_FILE) : path.join(runtimeDir, "quota.sqlite");
const mockChat = process.argv.includes("--mock-chat");

function fail(message: string): never {
  console.error(redactSecrets(message, secrets));
  process.exit(1);
}

if (process.argv.includes("--stop")) {
  const stopped = await stopValidationProcess(pidFile, quotaFile);
  console.log(JSON.stringify({ action: "stop", ...stopped, quotaFile, pidFile }));
  process.exit(stopped.status === "still-running" ? 1 : 0);
}

const port = Number(process.env.ASK_LOCAL_PORT ?? String(VALIDATION_API_PORT));
const embeddingKey = (process.env.EMBEDDING_API_KEY || process.env.BAILIAN_EMBEDDING_API_KEY || "").trim();
const embeddingBase = (process.env.EMBEDDING_BASE_URL || VALIDATION_EMBEDDING_BASE_URL).trim();
const embeddingModel = (process.env.EMBEDDING_MODEL || VALIDATION_EMBEDDING_MODEL).trim();
const embeddingDimensions = Number(process.env.EMBEDDING_DIMENSIONS || String(VALIDATION_EMBEDDING_DIMENSIONS));
const chatKey = (process.env.CHAT_API_KEY || process.env.BAILIAN_CHAT_API_KEY || "").trim();
const chatBase = (process.env.CHAT_BASE_URL || VALIDATION_CHAT_BASE_URL).trim();
const chatModel = (process.env.CHAT_MODEL || VALIDATION_CHAT_MODEL).trim();
const bundleFile = path.resolve(process.env.ASK_BUNDLE_FILE || path.join(backendRoot, "dist/knowledge/bundle.json"));

if (!embeddingKey) fail("没有真实 embedding 配置，不会用哈希向量冒充。");
const embeddingProfile = validationProfileError({
  provider: "openai",
  model: embeddingModel,
  dimensions: embeddingDimensions,
  baseURL: embeddingBase,
});
if (embeddingProfile) fail(embeddingProfile);
if (!mockChat) {
  if (!chatKey) fail("没有真实对话配置。要只测检索，请显式加上 --mock-chat。不会自动改用 mock。");
  const chatProfile = validationChatError({ model: chatModel, baseURL: chatBase });
  if (chatProfile) fail(chatProfile);
}

let bundle: KnowledgeBundle;
try {
  bundle = JSON.parse(readFileSync(bundleFile, "utf8")) as KnowledgeBundle;
} catch {
  fail("没有真实知识包，不会用哈希向量冒充。");
}
const bundleErrors = await verifyKnowledgeBundle(bundle);
if (bundleErrors.length > 0) fail(bundleErrors.join(" "));
const bundleProfile = validationProfileError({
  provider: bundle.manifest.embedding.provider,
  model: bundle.manifest.embedding.model,
  dimensions: bundle.manifest.embedding.dimensions,
  baseURL: bundle.manifest.embedding.baseURL,
});
if (bundleProfile) fail(bundleProfile);
const normalizedEmbeddingBase = publicEmbeddingBaseURL(embeddingBase);
const normalizedChatBase = publicEmbeddingBaseURL(chatBase);
if (!normalizedEmbeddingBase || ( !mockChat && !normalizedChatBase)) fail("地址无效。");
if (
  bundle.manifest.embedding.model !== embeddingModel
  || bundle.manifest.embedding.dimensions !== embeddingDimensions
  || bundle.manifest.embedding.baseURL !== normalizedEmbeddingBase
) {
  fail("知识包与查询 embedding 的地址、模型或维度不一致。");
}

const hmac = process.env.QUOTA_HMAC_KEY?.trim() ?? "";
if (!hmac) fail("缺少 QUOTA_HMAC_KEY。不会生成新键，避免额度看起来被清零。");
const startError = decideValidationStart({
  port,
  profileError: null,
  pidAlive: isPidAlive(readPid(pidFile) ?? 0),
});
if (startError) fail(startError);
if (port !== LOCAL_API_PORT) fail("验证接口只监听 127.0.0.1:8787。");
let listeners: ReturnType<typeof listListeners>;
try {
  listeners = listListeners();
} catch (error) {
  fail(error instanceof Error ? `${error.message} 额度文件尚未打开。` : "无法确认 8787 是否空闲。额度文件尚未打开。");
}
if (listeners.some((item) => item.port === port)) {
  fail("8787 仍被占用。不要只杀 workerd，先停掉 serve-integrated 父进程。额度文件尚未打开。");
}
if (!existsSync(quotaFile)) fail("额度文件不存在。没有新建空库，避免和已有额度分叉。");
const expectText = process.env.ASK_QUOTA_EXPECT_USED;
const expectUsed = expectText === undefined ? undefined : Number(expectText);
if (expectText !== undefined && !Number.isInteger(expectUsed)) fail("ASK_QUOTA_EXPECT_USED 不是整数。额度文件尚未当作写入打开。");
let quotaSnapshot: ReturnType<typeof snapshotQuota>;
try {
  quotaSnapshot = snapshotQuota(quotaFile, expectUsed);
} catch (error) {
  fail(error instanceof Error ? error.message : "额度校验失败。");
}

mkdirSync(path.dirname(pidFile), { recursive: true });
const database = createFileQuotaDatabase(quotaFile);
const env: AskBindings = {
  QUOTA_HMAC_KEY: hmac,
  ASK_ALLOW_DEV_IP: "0",
  ASK_ALLOW_MOCK: "0",
  ASK_ALLOWED_ORIGINS: process.env.ASK_ALLOWED_ORIGINS ?? "http://127.0.0.1:8765,http://localhost:8765,https://shijayhuo.github.io",
  EMBEDDING_API_KEY: embeddingKey,
  EMBEDDING_BASE_URL: normalizedEmbeddingBase,
  EMBEDDING_MODEL: embeddingModel,
  EMBEDDING_DIMENSIONS: String(embeddingDimensions),
  ...(mockChat ? {} : {
    CHAT_API_KEY: chatKey,
    CHAT_BASE_URL: normalizedChatBase ?? "",
    CHAT_MODEL: chatModel,
  }),
};
const chat = mockChat
  ? createMockChat(["这是显式 mock 生成，用来查看检索来源。不是 deepseek-v4.1-flash 的回答。"])
  : undefined;

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
  const response = await createAnswer(request, env, { bundle, database, chat });
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
  writePidFile(pidFile, process.pid);
  console.log(JSON.stringify({
    listen: `http://127.0.0.1:${port}/ask`,
    pid: process.pid,
    pidFile,
    quotaFile,
    quotaBackup: quotaSnapshot.backup,
    quotaRows: quotaSnapshot.summary.rows,
    quotaUsedMax: quotaSnapshot.summary.usedMax,
    quotaRemainingAtMax: 20 - quotaSnapshot.summary.usedMax,
    quotaReset: false,
    embedding: {
      baseURL: normalizedEmbeddingBase,
      model: embeddingModel,
      dimensions: embeddingDimensions,
      key: "present",
    },
    chat: mockChat
      ? { mode: "mock", probe: "not-run" }
      : { mode: "real", baseURL: normalizedChatBase, model: chatModel, key: "present", probe: CHAT_PROBE_STATUS },
    thresholdCalibrated: false,
    note: "检索使用真实向量。0.25 不是已校准阈值，全库冒烟里 0.45 的无依据负例仍会被送进生成。对话短句探测已收到 content、stop 和 [DONE]，这不是博客问答验收。这不是生产部署。",
  }));
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    server.close(() => {
      try {
        if (readPid(pidFile) === process.pid) unlinkPid();
      } catch {
        // 停止时只删 pid，不删额度文件。
      }
      process.exit(0);
    });
  });
}

function unlinkPid(): void {
  if (readPid(pidFile) === process.pid) unlinkSync(pidFile);
}
