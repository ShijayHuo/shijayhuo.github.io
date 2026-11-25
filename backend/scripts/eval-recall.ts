import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { publicEmbeddingBaseURL, validationProfileError } from "../src/embedding-space.ts";
import { VALIDATION_EMBEDDING_BASE_URL, VALIDATION_EMBEDDING_DIMENSIONS, VALIDATION_EMBEDDING_MODEL, TOP_K } from "../src/limits.ts";
import { verifyKnowledgeBundle } from "../src/knowledge.ts";
import { createOpenAIEmbedding } from "../src/openai-adapter.ts";
import { createRecallReport, type RecallCaseResult } from "../src/recall-report.ts";
import { redactSecrets, secretValues } from "../src/redact.ts";
import { findChunksByQuery } from "../src/retrieve.ts";
import type { KnowledgeBundle } from "../src/types.ts";

const backendRoot = path.join(import.meta.dirname, "..");
const secrets = secretValues();

function fail(message: string, status = 1): never {
  console.error(redactSecrets(message, secrets));
  process.exit(status);
}

if (process.argv.includes("--min-score")) {
  fail("不能在评测脚本里改阈值。0.25 尚未校准，调低也不算通过。");
}

const key = (process.env.EMBEDDING_API_KEY || process.env.BAILIAN_EMBEDDING_API_KEY || "").trim();
if (!key) fail("没有真实 embedding 配置，不会用哈希向量冒充，也不能把召回标成通过。", 2);

const baseURL = (process.env.EMBEDDING_BASE_URL || VALIDATION_EMBEDDING_BASE_URL).trim();
const model = (process.env.EMBEDDING_MODEL || VALIDATION_EMBEDDING_MODEL).trim();
const dimensions = Number(process.env.EMBEDDING_DIMENSIONS || String(VALIDATION_EMBEDDING_DIMENSIONS));
const profileError = validationProfileError({ provider: "openai", model, dimensions, baseURL });
if (profileError) fail(profileError);

const bundleFile = path.resolve(process.env.ASK_BUNDLE_FILE || path.join(backendRoot, "dist/knowledge/bundle.json"));
const outFile = path.resolve(process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1] ?? ""
  : path.join(backendRoot, "dist/knowledge/recall-report.json"));
if (!outFile || outFile.endsWith(".ts")) fail("评测结果不能写进源码。");

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
const normalized = publicEmbeddingBaseURL(baseURL);
if (
  !normalized
  || bundle.manifest.embedding.baseURL !== normalized
  || bundle.manifest.embedding.model !== model
  || bundle.manifest.embedding.dimensions !== dimensions
) {
  fail("知识包与查询 embedding 的地址、模型或维度不一致。");
}

interface QuestionFile {
  questions: Array<{
    id: string;
    question: string;
    expectUrls?: string[];
    forbiddenUrls?: string[];
  }>;
}

const questions = JSON.parse(readFileSync(path.join(backendRoot, "eval/questions.json"), "utf8")) as QuestionFile;
const embedding = createOpenAIEmbedding({ apiKey: key, baseURL: normalized, model, dimensions });
const results: RecallCaseResult[] = [];
for (const item of questions.questions) {
  const vector = await embedding.createEmbedding(item.question);
  const hits = findChunksByQuery(bundle, vector, TOP_K);
  const top = hits.map((hit) => ({ url: hit.url, score: hit.score, title: hit.title }));
  const expectedUrls = item.expectUrls ?? [];
  const forbiddenUrls = item.forbiddenUrls ?? [];
  const expectedRank = expectedUrls.length === 0
    ? null
    : top.findIndex((hit) => expectedUrls.includes(hit.url));
  results.push({
    id: item.id,
    question: item.question,
    top,
    expectedUrls,
    forbiddenUrls,
    expectedRank: expectedRank === null || expectedRank < 0 ? null : expectedRank + 1,
    forbiddenHit: top.some((hit) => forbiddenUrls.includes(hit.url)),
  });
}

const report = createRecallReport({ model, dimensions, results });
if (results.some((item) => item.forbiddenHit)) {
  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
  fail("评测命中了禁止来源。召回仍未通过。");
}
mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  out: outFile,
  recallAccepted: report.recallAccepted,
  thresholdValidated: report.thresholdValidated,
  cases: results.length,
}));
