import assert from "node:assert/strict";
import { copyFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { FIND_QUOTA_SQL, INSERT_QUOTA_SQL, createQuotaKey, isWeakProductionHmac, readDailyRemaining, readTrustedIp, shanghaiDay, updateQuotaByKey } from "../src/quota.ts";
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

test("快照读到 WAL 里尚未写回主文件的次数", () => {
  const sql = readFileSync(path.join(import.meta.dirname, "../migrations/0001_quota.sql"), "utf8");
  const executable = sql.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
  const file = path.join(mkdtempSync(path.join(tmpdir(), "ask-quota-wal-")), "quota.sqlite");
  const writer = new DatabaseSync(file);
  writer.exec("PRAGMA journal_mode = WAL");
  writer.exec(executable);
  writer.prepare("INSERT INTO quota (key, used, updated_at) VALUES (?, ?, ?)").run("k", 14, 1);
  const naive = `${file}.naive`;
  copyFileSync(file, naive);
  const snap = snapshotQuota(file, 14, "wal");
  assert.equal(readQuotaSummary(snap.backup).usedMax, 14);
  assert.equal(readQuotaSummary(snap.backup).usedSum, 14);
  assert.throws(() => readQuotaSummary(naive), /no such table/);
  writer.close();
});

test("额度按北京时间自然日重置，迁移不清零已有 used", async () => {
  assert.equal(shanghaiDay(Date.parse("2026-11-25T15:59:59.000Z")), "2026-11-25");
  assert.equal(shanghaiDay(Date.parse("2026-11-25T16:00:00.000Z")), "2026-11-26");
  for (const name of ["0002_daily.sql", "0003_exchange.sql"]) {
    const sql = readFileSync(path.join(import.meta.dirname, "../migrations", name), "utf8");
    const executable = sql.split("\n").filter((line) => !line.trim().startsWith("--")).join("\n");
    assert.equal(/\bDROP\b/i.test(executable), false, name);
    assert.equal(/DELETE\s+FROM\s+quota/i.test(executable), false, name);
    assert.equal(/\bused\s*=\s*0\b/i.test(executable), false, name);
  }
  const database = createSqliteQuotaDatabase();
  await database.prepare("INSERT INTO quota (key, used, updated_at, day) VALUES (?1, 20, 1, '')").bind("legacy").run();
  const legacy = await updateQuotaByKey(database, "legacy", Date.parse("2026-11-26T02:00:00.000Z"));
  assert.equal(legacy.reserved, true);
  assert.equal(legacy.used, 1);
  assert.equal(await readDailyRemaining(database, "legacy", Date.parse("2026-11-26T02:00:00.000Z")), 19);
  const day = Date.parse("2026-11-25T10:00:00.000Z");
  const nextDay = Date.parse("2026-11-25T16:00:00.000Z");
  for (let index = 0; index < 20; index += 1) {
    assert.equal((await updateQuotaByKey(database, "daily", day)).reserved, true);
  }
  assert.equal((await updateQuotaByKey(database, "daily", day)).reserved, false);
  assert.equal(await readDailyRemaining(database, "daily", day), 0);
  const reset = await updateQuotaByKey(database, "daily", nextDay);
  assert.equal(reset.reserved, true);
  assert.equal(reset.used, 1);
  assert.equal(await readDailyRemaining(database, "daily", nextDay), 19);
});

test("生产 HMAC 拒绝 local-only 和短密钥", () => {
  assert.equal(isWeakProductionHmac("local-only"), true);
  assert.equal(isWeakProductionHmac("test-hmac"), true);
  assert.equal(isWeakProductionHmac("x".repeat(31)), true);
  assert.equal(isWeakProductionHmac("x".repeat(32)), false);
});
