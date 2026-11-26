-- 当天问答。key 是 IP 的 HMAC，不存明文 IP。day 是北京时间自然日。
-- 可以按 day 删除这张表里的过期行。不要对 quota 表做同样的删除或清零。
CREATE TABLE IF NOT EXISTS ask_exchange (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  day TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS ask_exchange_lookup ON ask_exchange (key, day, id);
