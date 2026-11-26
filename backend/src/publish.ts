import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { stripForKnowledge } from "./chunk.ts";
import type { PublishedDocument } from "./types.ts";

const LAYOUT_ONLY = new Set(["tags", "categories", "archives"]);

interface FrontMatter {
  title: string;
  date: string;
  layout: string;
  published: boolean;
  tags: string[];
  categories: string[];
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readList(value: string): string[] {
  const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "");
  if (!inner.trim()) return [];
  return inner.split(",").map((item) => unquote(item)).filter(Boolean);
}

export function readFrontMatter(raw: string): { data: FrontMatter; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const data: FrontMatter = { title: "", date: "", layout: "", published: true, tags: [], categories: [] };
  if (!match) return { data, body: raw };
  const lines = match[1].split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || line.startsWith(" ") || line.startsWith("\t")) continue;
    const found = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!found) continue;
    const key = found[1];
    let value = found[2];
    if (value === "" && (key === "tags" || key === "categories")) {
      const items: string[] = [];
      while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
        index += 1;
        items.push(unquote(lines[index].replace(/^\s+-\s+/, "")));
      }
      if (key === "tags") data.tags = items.filter(Boolean);
      if (key === "categories") data.categories = items.filter(Boolean);
      continue;
    }
    if (key === "title") data.title = unquote(value);
    if (key === "date") data.date = unquote(value);
    if (key === "layout") data.layout = unquote(value);
    if (key === "published") data.published = unquote(value) !== "false";
    if (key === "tags") data.tags = readList(value);
    if (key === "categories") data.categories = readList(value);
  }
  return { data, body: raw.slice(match[0].length) };
}

export function parseContentDate(value: string | undefined, filename: string): Date | null {
  const fromName = filename.match(/(\d{4}-\d{2}-\d{2})/);
  const raw = value?.trim() || (fromName ? fromName[1] : "");
  if (!raw) return null;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?(?:\s*([+-]\d{2}:?\d{2}|Z))?$/);
  if (!match) return null;
  const time = match[2] ?? "00:00:00";
  let offset = match[3] ?? "+08:00";
  if (/^[+-]\d{4}$/.test(offset)) offset = `${offset.slice(0, 3)}:${offset.slice(3)}`;
  const parsed = new Date(`${match[1]}T${time}${offset === "Z" ? "Z" : offset}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function listMarkdown(directory: string): string[] {
  try {
    return readdirSync(directory)
      .filter((name) => name.endsWith(".md"))
      .map((name) => path.join(directory, name))
      .filter((file) => statSync(file).isFile());
  } catch {
    return [];
  }
}

export function listPublishedPosts(root: string, now: Date): PublishedDocument[] {
  const documents: PublishedDocument[] = [];
  const posts = listMarkdown(path.join(root, "_posts"));
  const about = path.join(root, "_tabs", "about.md");
  const files = [...posts];
  try {
    if (statSync(about).isFile()) files.push(about);
  } catch {
    // 没有关于页时不补别的标签页。
  }
  for (const file of files) {
    const base = path.basename(file);
    const isPost = file.includes(`${path.sep}_posts${path.sep}`);
    if (isPost && !/^\d{4}-\d{2}-\d{2}-.+\.md$/.test(base)) continue;
    const slug = isPost ? base.slice(11, -3) : base.slice(0, -3);
    if (LAYOUT_ONLY.has(slug)) continue;
    const raw = readFileSync(file, "utf8");
    const { data, body } = readFrontMatter(raw);
    if (LAYOUT_ONLY.has(data.layout) || !data.published) continue;
    const parsed = parseContentDate(data.date, base);
    if (isPost && !parsed) continue;
    if (parsed && parsed.getTime() > now.getTime()) continue;
    const text = stripForKnowledge(body);
    if (!text) continue;
    const url = isPost ? `/posts/${slug}/` : `/${slug}/`;
    documents.push({
      sourcePath: path.relative(root, file).split(path.sep).join("/"),
      slug,
      title: data.title || slug,
      url,
      date: data.date || base.slice(0, 10),
      tags: data.tags,
      categories: data.categories,
      body: text,
      contentHash: createHash("sha256").update(text).digest("hex"),
    });
  }
  documents.sort((left, right) => left.url.localeCompare(right.url));
  return documents;
}
