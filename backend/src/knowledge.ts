import { embeddingRevision, publicEmbeddingBaseURL } from "./embedding-space.ts";
import { CHUNKER_VERSION, HASH_EMBEDDING_DIMENSIONS, KNOWLEDGE_VERSION, SOURCE_ID, SOURCE_URL } from "./limits.ts";
import type { Chunk, KnowledgeBundle } from "./types.ts";

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateVector(vector: number[], dimensions?: number): string | null {
  if (!Array.isArray(vector) || vector.length === 0) return "向量为空。";
  if (dimensions !== undefined && vector.length !== dimensions) return "向量维度不一致。";
  let square = 0;
  for (const value of vector) {
    if (!Number.isFinite(value)) return "向量含有非有限数值。";
    square += value * value;
  }
  if (square === 0) return "向量为零向量。";
  return null;
}

export async function createKnowledgeVersion(bundle: KnowledgeBundle): Promise<string> {
  const payload = {
    chunkerVersion: bundle.manifest.chunkerVersion,
    embedding: {
      provider: bundle.manifest.embedding.provider,
      model: bundle.manifest.embedding.model,
      dimensions: bundle.manifest.embedding.dimensions,
      revision: bundle.manifest.embedding.revision,
      baseURL: bundle.manifest.embedding.baseURL,
      encodingFormat: bundle.manifest.embedding.encodingFormat,
      inputTemplate: bundle.manifest.embedding.inputTemplate,
      queryPrefix: bundle.manifest.embedding.queryPrefix,
      documentPrefix: bundle.manifest.embedding.documentPrefix,
      normalization: bundle.manifest.embedding.normalization,
    },
    documents: bundle.manifest.documents
      .map((document) => ({ id: document.id, url: document.url, contentHash: document.contentHash }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    chunks: bundle.chunks
      .map((chunk) => ({ id: chunk.id, contentHash: chunk.contentHash, vector: chunk.vector }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
  return sha256Hex(JSON.stringify(payload));
}

export async function verifyKnowledgeBundle(bundle: KnowledgeBundle): Promise<string[]> {
  const errors: string[] = [];
  if (!bundle || typeof bundle !== "object" || !bundle.manifest || !Array.isArray(bundle.chunks)) {
    return ["知识包不完整。"];
  }
  const { manifest } = bundle;
  if (manifest.chunkerVersion !== CHUNKER_VERSION) errors.push("切片规则版本不一致。");
  if (!KNOWLEDGE_VERSION.test(manifest.knowledgeVersion) || manifest.knowledgeVersion.length > 64) {
    errors.push("知识版本号无效。");
  }
  const embedding = manifest.embedding;
  if (!embedding?.provider || !embedding.model || !Number.isInteger(embedding.dimensions) || embedding.dimensions <= 0) {
    errors.push("embedding 配置不完整。");
  }
  if (embedding?.inputTemplate !== "text" || embedding.normalization !== "cosine") {
    errors.push("向量空间约定不一致。");
  }
  if (embedding && embedding.encodingFormat !== "float") errors.push("向量编码不是 float。");
  if (embedding && embedding.revision !== embeddingRevision(embedding.model, embedding.dimensions)) {
    errors.push("embedding 版本与模型或维度不一致。");
  }
  if (embedding?.provider === "mock") {
    if (embedding.baseURL !== "") errors.push("哈希向量不能带真实地址。");
    if (!embedding.model.startsWith("mock-embedding-")) errors.push("哈希向量不能冒充真实模型。");
    if (embedding.dimensions === HASH_EMBEDDING_DIMENSIONS) errors.push("拒绝 512 维哈希向量。");
  } else if (embedding && !publicEmbeddingBaseURL(embedding.baseURL)) {
    errors.push("embedding 地址无效。");
  }
  if (embedding?.queryPrefix !== embedding?.documentPrefix) {
    errors.push("查询与文档不在同一向量空间。");
  }
  if (manifest.chunkCount !== bundle.chunks.length) errors.push("切片数量与清单不一致。");
  if (manifest.documents.length === 0 && bundle.chunks.length > 0) errors.push("清单缺少文档。");
  const documentIds = new Set<string>();
  for (const document of manifest.documents) {
    if (documentIds.has(document.id)) errors.push("文档重复。");
    documentIds.add(document.id);
    if (!SOURCE_URL.test(document.url) || document.id !== document.url) errors.push("文档地址无效。");
  }
  const chunkIds = new Set<string>();
  for (const chunk of bundle.chunks) {
    if (chunkIds.has(chunk.id)) errors.push("切片重复。");
    chunkIds.add(chunk.id);
    if (!SOURCE_ID.test(chunk.id) || chunk.id.length > 64) errors.push("切片 id 无效。");
    if (!SOURCE_URL.test(chunk.url) || chunk.documentId !== chunk.url) errors.push("切片地址无效。");
    if (!chunk.text.trim()) errors.push("切片正文为空。");
    if (!documentIds.has(chunk.documentId)) errors.push("切片没有对应文档。");
    const vectorError = embedding ? validateVector(chunk.vector, embedding.dimensions) : "embedding 配置不完整。";
    if (vectorError) errors.push(vectorError);
  }
  if (errors.length === 0) {
    const version = await createKnowledgeVersion(bundle);
    if (version !== manifest.knowledgeVersion) errors.push("知识版本校验失败。");
  }
  return errors;
}

export function listChunksByIds(chunks: Chunk[], ids: string[]): Chunk[] {
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const found: Chunk[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    const chunk = byId.get(id);
    if (!chunk) continue;
    seen.add(id);
    found.push(chunk);
  }
  return found;
}

export function removeChunksWithDocument(chunks: Chunk[], documentId: string): Chunk[] {
  return chunks.filter((chunk) => chunk.documentId !== documentId);
}
