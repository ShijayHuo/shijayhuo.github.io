import { readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { QuotaDatabase } from "../src/types.ts";

export function createSqliteQuotaDatabase(): QuotaDatabase {
  const db = new DatabaseSync(":memory:");
  db.exec(readFileSync(path.join(import.meta.dirname, "../migrations/0001_quota.sql"), "utf8"));
  return {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          const params = values as Array<string | number | null>;
          return {
            async run() {
              const info = db.prepare(sql).run(...params);
              return { meta: { changes: Number(info.changes) } };
            },
            async first<T>() {
              const row = db.prepare(sql).get(...params) as T | undefined;
              return row ?? null;
            },
          };
        },
      };
    },
  };
}
