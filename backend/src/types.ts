export interface Chunk {
  id: string;
  documentId: string;
  title: string;
  url: string;
  heading: string;
  text: string;
  date: string;
  contentHash: string;
  tags: string[];
  categories: string[];
  vector: number[];
}

export interface DocumentInfo {
  id: string;
  title: string;
  url: string;
  date: string;
  sourcePath: string;
  tags: string[];
  categories: string[];
  contentHash: string;
}

export interface EmbeddingManifest {
  provider: string;
  model: string;
  dimensions: number;
  revision: string;
  baseURL: string;
  encodingFormat: "float";
  inputTemplate: "text";
  queryPrefix: string;
  documentPrefix: string;
  normalization: "cosine";
}

export interface KnowledgeManifest {
  knowledgeVersion: string;
  builtAt: string;
  chunkerVersion: string;
  embedding: EmbeddingManifest;
  documents: DocumentInfo[];
  chunkCount: number;
}

export interface KnowledgeBundle {
  manifest: KnowledgeManifest;
  chunks: Chunk[];
}

export interface EmbeddingAdapter {
  provider: string;
  model: string;
  dimensions: number;
  baseURL: string;
  encodingFormat: "float";
  revision: string;
  createEmbedding(input: string, signal?: AbortSignal): Promise<number[]>;
  createEmbeddings?(inputs: string[], signal?: AbortSignal): Promise<number[][]>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatAdapter {
  provider: string;
  model: string;
  createChatStream(messages: ChatMessage[], signal?: AbortSignal): AsyncIterable<string>;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  sourceIds?: string[];
}

export interface SourceLink {
  id: string;
  title: string;
  url: string;
  heading: string;
}

export interface QuotaStatement {
  bind(...values: unknown[]): {
    run(): Promise<{ meta?: { changes?: number } }>;
    first<T>(): Promise<T | null>;
  };
}

export interface QuotaDatabase {
  prepare(sql: string): QuotaStatement;
}

export interface AskBindings {
  QUOTA_DB?: QuotaDatabase;
  QUOTA_HMAC_KEY?: string;
  ASK_ALLOW_DEV_IP?: string;
  ASK_ALLOW_MOCK?: string;
  ASK_ALLOWED_ORIGINS?: string;
  ASK_MIN_SCORE?: string;
  EMBEDDING_API_KEY?: string;
  EMBEDDING_BASE_URL?: string;
  EMBEDDING_MODEL?: string;
  EMBEDDING_DIMENSIONS?: string;
  CHAT_API_KEY?: string;
  CHAT_BASE_URL?: string;
  CHAT_MODEL?: string;
}

export interface PublishedDocument {
  sourcePath: string;
  slug: string;
  title: string;
  url: string;
  date: string;
  tags: string[];
  categories: string[];
  body: string;
  contentHash: string;
}

export interface EmbeddingCache {
  configHash: string;
  entries: Record<string, number[]>;
}

export interface ServiceConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  dimensions?: number;
}
