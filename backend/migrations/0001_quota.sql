-- 额度表。只保存 IP 的 HMAC 摘要，不保存明文 IP。
-- 后续迁移不得 DROP、DELETE 或把 used 清零。Worker 回滚不碰这张表。
CREATE TABLE IF NOT EXISTS quota (
  key TEXT PRIMARY KEY,
  used INTEGER NOT NULL CHECK (used >= 0),
  updated_at INTEGER NOT NULL
);
