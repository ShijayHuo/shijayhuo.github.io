import type { SourceLink } from "./types.ts";
import { createSourceList } from "./protocol.ts";

export interface CitationSplit {
  text: string;
  citedIds: string[];
}

/** 整段去掉空白后必须就是 {"cite":[...]}。解析失败就不是引用对象。 */
export function readCitation(line: string): { cited: true; ids: string[] } | { cited: false } {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return { cited: false };
  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return { cited: false };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return { cited: false };
  const cite = (value as { cite?: unknown }).cite;
  if (!Array.isArray(cite)) return { cited: false };
  const ids: string[] = [];
  for (const item of cite) {
    if (typeof item !== "string" || item.length < 1 || item.length > 64) continue;
    ids.push(item);
  }
  return { cited: true, ids };
}

function isFenceOpen(text: string, index: number): boolean {
  if (index > 0 && text[index - 1] !== "\n") return false;
  const lineEnd = text.indexOf("\n", index);
  const line = lineEnd < 0 ? text.slice(index) : text.slice(index, lineEnd);
  return /^[ \t]*```/.test(line);
}

function readFence(text: string, start: number): { closed: boolean; end: number; inner: string } {
  const lineEnd = text.indexOf("\n", start);
  if (lineEnd < 0) return { closed: false, end: text.length, inner: "" };
  let cursor = lineEnd + 1;
  while (cursor <= text.length) {
    const next = text.indexOf("\n", cursor);
    const line = next < 0 ? text.slice(cursor) : text.slice(cursor, next);
    if (/^[ \t]*```/.test(line)) {
      const end = next < 0 ? text.length : next + 1;
      return { closed: true, end, inner: text.slice(lineEnd + 1, cursor).replace(/\n$/, "") };
    }
    if (next < 0) break;
    cursor = next + 1;
  }
  return { closed: false, end: text.length, inner: text.slice(lineEnd + 1) };
}

function scanJsonObject(text: string, start: number): { kind: "object"; end: number } | { kind: "incomplete" } {
  let depth = 1;
  let inString = false;
  let escape = false;
  for (let i = start + 1; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") inString = false;
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") {
      depth += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return { kind: "object", end: i + 1 };
    }
  }
  return { kind: "incomplete" };
}

function skipWs(text: string, index: number): number {
  let i = index;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  return i;
}

function readJsonString(text: string, index: number): number | null {
  let escape = false;
  for (let i = index + 1; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === "\"") return i + 1;
  }
  return null;
}

/** suffix 还能不能长成 {"cite":[...]}。已经走样就不要再藏。 */
function couldBecomeCite(suffix: string): boolean {
  if (!suffix.startsWith("{")) return false;
  let i = skipWs(suffix, 1);
  if (i >= suffix.length) return true;
  if (suffix[i] !== "\"") return false;
  i += 1;
  const key = "cite";
  let k = 0;
  while (i < suffix.length && k < key.length && suffix[i] === key[k]) {
    i += 1;
    k += 1;
  }
  if (i >= suffix.length) return true;
  if (k !== key.length || suffix[i] !== "\"") return false;
  i += 1;
  i = skipWs(suffix, i);
  if (i >= suffix.length) return true;
  if (suffix[i] !== ":") return false;
  i += 1;
  i = skipWs(suffix, i);
  if (i >= suffix.length) return true;
  if (suffix[i] !== "[") return false;
  i += 1;
  let expectValue = true;
  while (i < suffix.length) {
    i = skipWs(suffix, i);
    if (i >= suffix.length) return true;
    const ch = suffix[i];
    if (ch === "]") {
      i = skipWs(suffix, i + 1);
      if (i >= suffix.length) return true;
      return suffix[i] === "}";
    }
    if (!expectValue && ch === ",") {
      expectValue = true;
      i += 1;
      continue;
    }
    if (ch !== "\"") return false;
    const closed = readJsonString(suffix, i);
    if (closed === null) return true;
    i = closed;
    expectValue = false;
  }
  return true;
}

function startedCiteKey(suffix: string): boolean {
  return /^\{\s*"c/.test(suffix);
}

/**
 * 从正文里拿掉引用对象。独立一行、贴在句号后面、包在只含该对象的代码块里都算。
 * 流还没结束时，可能长成引用的尾巴先留下来，避免半截 JSON 先送出去。
 */
function extractVisible(text: string, final: boolean): { emit: string; hold: string; ids: string[] } {
  const ids: string[] = [];
  let emit = "";
  let i = 0;
  while (i < text.length) {
    if (isFenceOpen(text, i)) {
      const fence = readFence(text, i);
      if (fence.closed) {
        const citation = readCitation(fence.inner);
        if (citation.cited) {
          ids.push(...citation.ids);
          i = fence.end;
          continue;
        }
        emit += text.slice(i, fence.end);
        i = fence.end;
        continue;
      }
      if (!final) return { emit, hold: text.slice(i), ids };
      const citation = readCitation(fence.inner);
      if (citation.cited) {
        ids.push(...citation.ids);
        return { emit, hold: "", ids };
      }
      emit += text.slice(i);
      return { emit, hold: "", ids };
    }

    if (text[i] === "{") {
      const scanned = scanJsonObject(text, i);
      if (scanned.kind === "object") {
        const raw = text.slice(i, scanned.end);
        const citation = readCitation(raw);
        if (citation.cited) {
          ids.push(...citation.ids);
          i = scanned.end;
          continue;
        }
        emit += raw;
        i = scanned.end;
        continue;
      }
      const suffix = text.slice(i);
      if (couldBecomeCite(suffix)) {
        if (!final) return { emit, hold: suffix, ids };
        if (startedCiteKey(suffix)) return { emit, hold: "", ids };
        emit += suffix;
        return { emit, hold: "", ids };
      }
    }

    emit += text[i];
    i += 1;
  }
  return { emit, hold: "", ids };
}

export function createCitationSplitter(): {
  push(part: string): string;
  finish(): CitationSplit;
} {
  let pending = "";
  const citedIds: string[] = [];
  return {
    push(part: string): string {
      const extracted = extractVisible(pending + part, false);
      pending = extracted.hold;
      citedIds.push(...extracted.ids);
      return extracted.emit;
    },
    finish(): CitationSplit {
      const extracted = extractVisible(pending, true);
      pending = "";
      citedIds.push(...extracted.ids);
      return { text: extracted.emit, citedIds };
    },
  };
}

export function stripCitations(text: string): string {
  const splitter = createCitationSplitter();
  return `${splitter.push(text)}${splitter.finish().text}`;
}

export function sourcesFromCitations<T extends Pick<SourceLink, "id" | "title" | "url" | "heading">>(
  evidence: T[],
  citedIds: string[],
): SourceLink[] {
  const allowed = new Set(citedIds);
  return createSourceList(evidence.filter((hit) => allowed.has(hit.id)));
}
