export const CONTRACT_VERSION = 1;
export const QUOTA_LIMIT = 20;
export const MAX_QUESTION_CHARS = 2000;
export const MAX_HISTORY_MESSAGES = 6;
export const MAX_HISTORY_CHARS = 4000;
export const MAX_SOURCE_IDS = 8;
export const MAX_BODY_BYTES = 32768;
export const MAX_RETRIEVAL_CHARS = 2400;
export const MAX_CONTEXT_CHARS = 6000;
export const MAX_OUTPUT_TOKENS = 800;
export const MAX_OUTPUT_CHARS = 4000;
export const TOP_K = 5;
export const PRIOR_SOURCE_LIMIT = 5;
export const DEFAULT_MIN_SCORE = 0.25;
export const TIMEOUT_MS = 25000;
export const DEFAULT_ORIGIN = "https://shijayhuo.github.io";
export const CHUNKER_VERSION = "sections-v1";
export const SECTION_LIMIT = 1200;
export const SECTION_OVERLAP = 80;
export const MOCK_DIMENSIONS = 32;

export const MSG = {
  emptyQuestion: "请输入问题。",
  notJson: "请求不是 JSON。",
  badHistory: "历史格式不正确。",
  questionTooLong: "问题太长。",
  origin: "来源不在允许列表里。",
  ip: "无法确认来源，已拒绝。",
  notFound: "没有这个接口。",
  method: "只接受 POST /ask。",
  tooLarge: "请求太大。",
  quota: "已达到 20 次上限。",
  upstream: "检索向量没有生成，次数已计入上限。",
  unavailable: "问答服务尚未配置。",
  streamError: "生成中断，这次次数已计入上限。",
  refusal: "公开文章里没有足够依据回答这个问题。",
} as const;

export const SOURCE_URL = /^\/(?:about\/|posts\/[A-Za-z0-9][A-Za-z0-9._-]*\/)$/;
export const SOURCE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const KNOWLEDGE_VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export const FOLLOW_UP_PREFIXES = ["那", "这个", "继续", "它", "上面", "前面", "刚才"];
