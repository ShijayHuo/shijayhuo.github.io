import { CHUNKER_VERSION, SECTION_LIMIT, SECTION_OVERLAP } from "./limits.ts";
import { sha256Hex } from "./knowledge.ts";
import type { Chunk, PublishedDocument } from "./types.ts";

export { CHUNKER_VERSION };

export function stripForKnowledge(markdown: string): string {
  const withoutLiquid = markdown.replace(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/g, "");
  const withAlt = withoutLiquid.replace(/<img\b[^>]*\balt=["']([^"']*)["'][^>]*>/gi, " $1 ");
  return withAlt.replace(/<[^>]+>/g, "").replace(/\r\n/g, "\n").trim();
}

function splitLong(text: string): string[] {
  if (text.length <= SECTION_LIMIT) return [text];
  const parts: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(text.length, start + SECTION_LIMIT);
    if (end < text.length) {
      const breakAt = text.lastIndexOf("\n", end);
      if (breakAt > start + Math.floor(SECTION_LIMIT / 2)) end = breakAt;
    }
    const slice = text.slice(start, end).trim();
    if (slice) parts.push(slice);
    if (end >= text.length) break;
    const next = end - SECTION_OVERLAP;
    start = next > start ? next : end;
  }
  return parts;
}

export function splitSections(markdown: string): { heading: string; text: string }[] {
  const sections: { heading: string; text: string }[] = [];
  let headingStack: string[] = [];
  let buffer: string[] = [];
  const flush = () => {
    const text = buffer.join("\n").trim();
    buffer = [];
    if (!text) return;
    const heading = headingStack.filter(Boolean).join(" / ");
    for (const part of splitLong(text)) sections.push({ heading, text: part });
  };
  for (const line of markdown.split("\n")) {
    const match = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (!match) {
      buffer.push(line);
      continue;
    }
    flush();
    const title = match[2].replace(/\s+#+\s*$/, "").trim();
    headingStack = headingStack.slice(0, match[1].length - 1);
    headingStack.push(title);
  }
  flush();
  return sections;
}

export async function createChunks(document: PublishedDocument): Promise<Omit<Chunk, "vector">[]> {
  const sections = splitSections(document.body);
  const usable = sections.length > 0 ? sections : document.body.trim() ? [{ heading: "", text: document.body.trim() }] : [];
  const chunks: Omit<Chunk, "vector">[] = [];
  for (let index = 0; index < usable.length; index += 1) {
    const section = usable[index];
    const notes: string[] = [];
    if (index === 0 && document.tags.length > 0) notes.push(`标签：${document.tags.join("、")}`);
    if (index === 0 && document.categories.length > 0) notes.push(`分类：${document.categories.join("、")}`);
    const text = notes.length > 0 ? `${notes.join("\n")}\n${section.text}` : section.text;
    const contentHash = await sha256Hex(text);
    const id = (await sha256Hex(`${document.url}\n${section.heading}\n${contentHash}`)).slice(0, 16);
    chunks.push({
      id,
      documentId: document.url,
      title: document.title,
      url: document.url,
      heading: section.heading,
      text,
      date: document.date,
      contentHash,
      tags: document.tags,
      categories: document.categories,
    });
  }
  return chunks;
}
