import { QUOTA_LIMIT } from "./limits.ts";
import type { QuotaDatabase } from "./types.ts";

export const INSERT_QUOTA_SQL = `INSERT INTO quota (key, used, updated_at, day) VALUES (?1, 1, ?2, ?3)
ON CONFLICT(key) DO UPDATE SET used = CASE WHEN day = ?3 THEN used + 1 ELSE 1 END, updated_at = ?2, day = ?3
WHERE used < ${QUOTA_LIMIT} OR day != ?3`;

export const FIND_QUOTA_SQL = `SELECT used, updated_at FROM quota WHERE key = ?1`;

const FIND_DAY_SQL = `SELECT used, day FROM quota WHERE key = ?1`;

const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

export function shanghaiDay(now: number): string {
  const shifted = new Date(now + SHANGHAI_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const date = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

const WEAK_HMAC_KEYS = new Set(["local-only", "test-hmac", "changeme"]);

export function isWeakProductionHmac(secret: string): boolean {
  const value = secret.trim();
  if (value.length < 32) return true;
  return WEAK_HMAC_KEYS.has(value);
}

export async function createQuotaKey(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readTrustedIp(request: Request, env: { ASK_ALLOW_DEV_IP?: string }): string | null {
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp && cloudflareIp.trim()) return cloudflareIp.trim();
  if (env.ASK_ALLOW_DEV_IP === "1") {
    const devIp = request.headers.get("x-ask-dev-ip");
    if (devIp && devIp.trim()) return devIp.trim();
  }
  return null;
}

export async function findOneQuotaByKey(database: QuotaDatabase, key: string): Promise<{ used: number; updatedAt: number } | null> {
  const row = await database.prepare(FIND_QUOTA_SQL).bind(key).first<{ used: number; updated_at: number }>();
  if (!row) return null;
  return { used: Number(row.used), updatedAt: Number(row.updated_at) };
}

export async function readDailyRemaining(database: QuotaDatabase, key: string, now: number): Promise<number> {
  const row = await database.prepare(FIND_DAY_SQL).bind(key).first<{ used: number; day: string | null }>();
  if (!row || String(row.day ?? "") !== shanghaiDay(now)) return QUOTA_LIMIT;
  return Math.max(0, QUOTA_LIMIT - Number(row.used));
}

export async function updateQuotaByKey(database: QuotaDatabase, key: string, now: number): Promise<{ reserved: boolean; used: number }> {
  const result = await database.prepare(INSERT_QUOTA_SQL).bind(key, now, shanghaiDay(now)).run();
  const changes = Number(result.meta?.changes ?? 0);
  const row = await findOneQuotaByKey(database, key);
  return { reserved: changes === 1, used: row?.used ?? 0 };
}
