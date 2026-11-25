import { QUOTA_LIMIT } from "./limits.ts";
import type { QuotaDatabase } from "./types.ts";

export const INSERT_QUOTA_SQL = `INSERT INTO quota (key, used, updated_at) VALUES (?1, 1, ?2)
ON CONFLICT(key) DO UPDATE SET used = used + 1, updated_at = ?2
WHERE used < ${QUOTA_LIMIT}`;

export const FIND_QUOTA_SQL = `SELECT used, updated_at FROM quota WHERE key = ?1`;

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

export async function updateQuotaByKey(database: QuotaDatabase, key: string, now: number): Promise<{ reserved: boolean; used: number }> {
  const result = await database.prepare(INSERT_QUOTA_SQL).bind(key, now).run();
  const changes = Number(result.meta?.changes ?? 0);
  const row = await findOneQuotaByKey(database, key);
  return { reserved: changes === 1, used: row?.used ?? 0 };
}
