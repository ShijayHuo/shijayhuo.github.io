import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { FIND_QUOTA_SQL, INSERT_QUOTA_SQL, createQuotaKey, readTrustedIp, updateQuotaByKey } from "../src/quota.ts";
import { createFileQuotaDatabase, createSqliteQuotaDatabase, readQuotaSummary, snapshotQuota } from "./sqlite-quota.ts";

test("额度 SQL 在第二十一次不再增加", async () => {
  assert.match(INSERT_QUOTA_SQL, /ON CONFLICT\(key\) DO UPDATE/);
  assert.match(INSERT_QUOTA_SQL, /WHERE used < 20/);
  assert.match(FIND_QUOTA_SQL, /WHERE key = \?1/);
  const database = createSqliteQuotaDatabase();
  const results = [];
  for (let index = 0; index < 22; index += 1) {
    results.push(await updateQuotaByKey(database, "same-key", index));
  }
  assert.equal(results.filter((result) => result.reserved).length, 20);
  assert.equal(results[20]?.reserved, false);
  assert.equal(results[21]?.used, 20);
});

test("同一个摘要上的并发占用也不会超过 20", async () => {
  const database = createSqliteQuotaDatabase();
  const results = await Promise.all(Array.from({ length: 25 }, () => updateQuotaByKey(database, "same-key", 1)));
  assert.equal(results.filter((result) => result.reserved).length, 20);
  assert.equal(results.filter((result) => !result.reserved).length, 5);
});

test("额度键是 IP 的 HMAC，明文 IP 不进入键", async () => {
  const left = await createQuotaKey("203.0.113.10", "test-hmac");
  const right = await createQuotaKey("203.0.113.10", "test-hmac");
  const other = await createQuotaKey("203.0.113.11", "test-hmac");
  assert.equal(left, right);
  assert.notEqual(left, other);
  assert.equal(left.length, 64);
  assert.equal(left.includes("203.0.113.10"), false);
});

test("只信任 CF-Connecting-IP，开发头必须显式打开", () => {
  const forwarded = new Request("https://ask.example/ask", { headers: { "x-forwarded-for": "198.51.100.8" } });
  assert.equal(readTrustedIp(forwarded, {}), null);
  const dev = new Request("https://ask.example/ask", { headers: { "x-ask-dev-ip": "198.51.100.8" } });
  assert.equal(readTrustedIp(dev, {}), null);
  assert.equal(readTrustedIp(dev, { ASK_ALLOW_DEV_IP: "1" }), "198.51.100.8");
  const both = new Request("https://ask.example/ask", {
    headers: { "cf-connecting-ip": "203.0.113.10", "x-ask-dev-ip": "198.51.100.8" },
  });
  assert.equal(readTrustedIp(both, { ASK_ALLOW_DEV_IP: "1" }), "203.0.113.10");
});

test("文件额度库重启后保留次数，迁移语句不清零", async () => {
  const sql = readFileSync(path.join(import.meta.dirname, "../migrations/0001_quota.sql"), "utf8");
  const executable = sql.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
  assert.equal(/\bDROP\b|\bDELETE\b/i.test(executable), false);
  const file = path.join(mkdtempSync(path.join(tmpdir(), "ask-quota-")), "quota.sqlite");
  const first = createFileQuotaDatabase(file);
  for (let index = 0; index < 7; index += 1) await updateQuotaByKey(first, "same-key", index);
  const second = createFileQuotaDatabase(file);
  const row = await second.prepare("SELECT used FROM quota WHERE key = ?1").bind("same-key").first<{ used: number }>();
  assert.equal(row?.used, 7);
  const snap = snapshotQuota(file, 7, "keep");
  assert.equal(readQuotaSummary(snap.backup).usedMax, 7);
  createFileQuotaDatabase(file);
  assert.equal(readQuotaSummary(file).usedMax, 7);
  assert.equal(readQuotaSummary(file).usedSum, 7);
  assert.throws(() => snapshotQuota(file, 8, "mismatch"), /不符/);
  assert.equal(readQuotaSummary(file).usedMax, 7);
});
