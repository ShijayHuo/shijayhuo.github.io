import {
  FOLLOW_UP_PREFIXES,
  MAX_HISTORY_CHARS,
  MAX_HISTORY_MESSAGES,
  MAX_QUESTION_CHARS,
  MAX_RETRIEVAL_CHARS,
  MAX_SOURCE_IDS,
  MSG,
  SOURCE_ID,
  SOURCE_URL,
} from "./limits.ts";
import type { HistoryMessage, SourceLink } from "./types.ts";

export function isAllowedSourceUrl(url: string): boolean {
  return SOURCE_URL.test(url);
}

export function isFollowUpQuestion(question: string): boolean {
  const text = question.trim();
  if (text.length <= 24) return true;
  return FOLLOW_UP_PREFIXES.some((prefix) => text.startsWith(prefix));
}

export function createRetrievalQuery(question: string, history: HistoryMessage[]): string {
  const previous = history
    .filter((message) => message.role === "user")
    .slice(-2)
    .map((message) => message.content.slice(0, 200));
  return [...previous, question].join("\n").slice(0, MAX_RETRIEVAL_CHARS);
}

export function createSourceList(hits: Array<Pick<SourceLink, "id" | "title" | "url" | "heading">>): SourceLink[] {
  const seen = new Set<string>();
  const links: SourceLink[] = [];
  for (const hit of hits) {
    if (!isAllowedSourceUrl(hit.url) || !SOURCE_ID.test(hit.id) || hit.id.length > 64) continue;
    if (seen.has(hit.url)) continue;
    seen.add(hit.url);
    links.push({
      id: hit.id,
      title: hit.title.slice(0, 120),
      url: hit.url,
      heading: hit.heading.slice(0, 160),
    });
  }
  return links;
}

export function parseAskRequest(text: string): { question: string; history: HistoryMessage[] } | string {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return MSG.notJson;
  }
  if (!body || typeof body !== "object") return MSG.notJson;
  const record = body as { question?: unknown; history?: unknown };
  if (typeof record.question !== "string") return MSG.emptyQuestion;
  const question = record.question.trim();
  if (!question) return MSG.emptyQuestion;
  if (question.length > MAX_QUESTION_CHARS) return MSG.questionTooLong;
  const historyRaw = record.history ?? [];
  if (!Array.isArray(historyRaw) || historyRaw.length > MAX_HISTORY_MESSAGES) return MSG.badHistory;
  const history: HistoryMessage[] = [];
  for (const item of historyRaw) {
    if (!item || typeof item !== "object") return MSG.badHistory;
    const message = item as { role?: unknown; content?: unknown; sourceIds?: unknown };
    if (message.role !== "user" && message.role !== "assistant") return MSG.badHistory;
    if (typeof message.content !== "string" || message.content.length > MAX_HISTORY_CHARS) return MSG.badHistory;
    let sourceIds: string[] | undefined;
    if (message.sourceIds !== undefined) {
      if (!Array.isArray(message.sourceIds) || message.sourceIds.length > MAX_SOURCE_IDS) return MSG.badHistory;
      sourceIds = [];
      for (const id of message.sourceIds) {
        if (typeof id !== "string" || id.length < 1 || id.length > 64 || !SOURCE_ID.test(id)) return MSG.badHistory;
        sourceIds.push(id);
      }
    }
    history.push({ role: message.role, content: message.content, sourceIds });
  }
  return { question, history };
}

export function encodeSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
