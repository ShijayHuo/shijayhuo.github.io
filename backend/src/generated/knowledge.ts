import type { KnowledgeBundle } from "../types.ts";

/** 生产构建会在部署任务里覆盖本文件。仓库里的空值使未构建的 Worker 拒绝回答。 */
export const bundledKnowledge: KnowledgeBundle | null = null;
