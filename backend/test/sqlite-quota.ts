import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { QuotaDatabase } from "../src/types.ts";

function wrap(db: DatabaseSync): QuotaDatabase {
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

function migrationSql(): string {
  return readFileSync(path.join(import.meta.dirname, "../migrations/0001_quota.sql"), "utf8");
}

export function createSqliteQuotaDatabase(): QuotaDatabase {
  const db = new DatabaseSync(":memory:");
  db.exec(migrationSql());
  return wrap(db);
}

export function createFileQuotaDatabase(file: string): QuotaDatabase {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(migrationSql());
  return wrap(db);
}

export interface QuotaSummary {
  rows: number;
  usedMax: number;
  usedSum: number;
}

export function readQuotaSummary(file: string): QuotaSummary {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const row = db.prepare(
      "SELECT COUNT(*) AS n, COALESCE(MAX(used), 0) AS usedMax, COALESCE(SUM(used), 0) AS usedSum FROM quota",
    ).get() as { n: number; usedMax: number; usedSum: number };
    return { rows: Number(row.n), usedMax: Number(row.usedMax), usedSum: Number(row.usedSum) };
  } finally {
    db.close();
  }
}

export function backupQuotaFile(file: string, stamp: string): string {
  const dest = `${file}.bak-${stamp}`;
  copyFileSync(file, dest);
  return dest;
}

export function snapshotQuota(file: string, expectUsed?: number, stamp = new Date().toISOString().replace(/[:.]/g, "-")): {
  backup: string;
  summary: QuotaSummary;
} {
  if (!existsSync(file)) throw new Error("额度文件不存在。没有新建空库，避免和已有额度分叉。");
  const backup = backupQuotaFile(file, stamp);
  const summary = readQuotaSummary(file);
  const copied = readQuotaSummary(backup);
  if (summary.rows !== copied.rows || summary.usedSum !== copied.usedSum || summary.usedMax !== copied.usedMax) {
    throw new Error("备份和原额度文件不一致。原文件没有修改。");
  }
  if (expectUsed !== undefined && summary.usedMax !== expectUsed) {
    throw new Error(`额度最大 used 是 ${summary.usedMax}，与预期 ${expectUsed} 不符。原文件没有修改。`);
  }
  return { backup, summary };
}
