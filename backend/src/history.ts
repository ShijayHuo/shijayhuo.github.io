import { stripCitations } from "./cite.ts";
import { MAX_OUTPUT_CHARS, MAX_QUESTION_CHARS } from "./limits.ts";
import { createSourceList } from "./protocol.ts";
import { readDailyRemaining, shanghaiDay } from "./quota.ts";
import type { QuotaDatabase, SourceLink } from "./types.ts";

const DELETE_OLD_SQL = `DELETE FROM ask_exchange WHERE day < ?1`;

const INSERT_EXCHANGE_SQL = `INSERT INTO ask_exchange (key, day, question, answer, sources, created_at)
VALUES (?1, ?2, ?3, ?4, ?5, ?6)`;

const LIST_EXCHANGE_SQL = `SELECT question, answer, sources FROM ask_exchange
WHERE key = ?1 AND day = ?2
ORDER BY id ASC
LIMIT 20`;

type ExchangeRow = { question: string; answer: string; sources: string };

async function selectAll<T>(database: QuotaDatabase, sql: string, values: unknown[]): Promise<T[]> {
  const raw = await database.prepare(sql).bind(...values).all<T>();
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.results)) return raw.results;
  return [];
}

function parseSources(text: string): SourceLink[] {
  try {
    const value = JSON.parse(text) as unknown;
    if (!Array.isArray(value)) return [];
    return createSourceList(value.filter((item): item is SourceLink => {
      if (!item || typeof item !== "object") return false;
      const source = item as Partial<SourceLink>;
      return typeof source.id === "string" && typeof source.title === "string" && typeof source.url === "string" && typeof source.heading === "string";
    }));
  } catch {
    return [];
  }
}

export async function rememberExchange(
  database: QuotaDatabase,
  key: string,
  now: number,
  question: string,
  answer: string,
  sources: Array<Pick<SourceLink, "id" | "title" | "url" | "heading">>,
): Promise<void> {
  const day = shanghaiDay(now);
  const visible = stripCitations(answer).slice(0, MAX_OUTPUT_CHARS);
  const links = createSourceList(sources);
  await database.prepare(DELETE_OLD_SQL).bind(day).run();
  await database.prepare(INSERT_EXCHANGE_SQL).bind(
    key,
    day,
    question.slice(0, MAX_QUESTION_CHARS),
    visible,
    JSON.stringify(links),
    now,
  ).run();
}

export async function readDayTranscript(database: QuotaDatabase, key: string, now: number): Promise<{
  day: string;
  remaining: number;
  messages: Array<{ role: "user" | "assistant"; content: string; sources?: SourceLink[] }>;
}> {
  const day = shanghaiDay(now);
  await database.prepare(DELETE_OLD_SQL).bind(day).run();
  const remaining = await readDailyRemaining(database, key, now);
  const rows = await selectAll<ExchangeRow>(database, LIST_EXCHANGE_SQL, [key, day]);
  const messages: Array<{ role: "user" | "assistant"; content: string; sources?: SourceLink[] }> = [];
  for (const row of rows) {
    messages.push({ role: "user", content: String(row.question ?? "") });
    const content = stripCitations(String(row.answer ?? ""));
    const sources = parseSources(String(row.sources ?? ""));
    if (content || sources.length > 0) messages.push({ role: "assistant", content, sources });
  }
  return { day, remaining, messages };
}
