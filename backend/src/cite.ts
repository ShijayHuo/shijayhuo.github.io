import type { SourceLink } from "./types.ts";
import { createSourceList } from "./protocol.ts";

export interface CitationSplit {
  text: string;
  citedIds: string[];
}

/** 末行若是 {"cite":[...]}，这些 id 才是模型声明用过的证据。解析失败就不是引用行。 */
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

function couldStartCitation(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("```");
}

function extractTrailingCitation(text: string): { prefix: string; ids: string[] } | null {
  const body = text.trimEnd();
  if (body.endsWith("```")) {
    const close = body.lastIndexOf("```");
    const beforeClose = body.slice(0, close).trimEnd();
    const open = beforeClose.lastIndexOf("```");
    if (open >= 0) {
      const openLine = beforeClose.indexOf("\n", open);
      const inside = openLine >= 0 ? beforeClose.slice(openLine + 1) : "";
      const citation = readCitation(inside);
      if (citation.cited) return { prefix: body.slice(0, open), ids: citation.ids };
    }
  }
  const newline = body.lastIndexOf("\n");
  const last = newline >= 0 ? body.slice(newline + 1) : body;
  const citation = readCitation(last);
  if (!citation.cited) return null;
  return { prefix: newline >= 0 ? body.slice(0, newline + 1) : "", ids: citation.ids };
}

export function createCitationSplitter(): {
  push(part: string): string;
  finish(): CitationSplit;
} {
  let pending = "";
  return {
    push(part: string): string {
      pending += part;
      let emit = "";
      while (true) {
        const newline = pending.indexOf("\n");
        if (newline < 0) break;
        const line = pending.slice(0, newline);
        const rest = pending.slice(newline + 1);
        if (couldStartCitation(line)) break;
        if (rest === "") {
          emit += pending.slice(0, newline + 1);
          pending = "";
          break;
        }
        emit += pending.slice(0, newline + 1);
        pending = rest;
      }
      if (!pending.includes("\n") && !couldStartCitation(pending)) {
        emit += pending;
        pending = "";
      }
      return emit;
    },
    finish(): CitationSplit {
      const held = pending;
      pending = "";
      const citation = extractTrailingCitation(held);
      if (citation) return { text: citation.prefix, citedIds: citation.ids };
      return { text: held, citedIds: [] };
    },
  };
}

export function sourcesFromCitations<T extends Pick<SourceLink, "id" | "title" | "url" | "heading">>(
  evidence: T[],
  citedIds: string[],
): SourceLink[] {
  const allowed = new Set(citedIds);
  return createSourceList(evidence.filter((hit) => allowed.has(hit.id)));
}
