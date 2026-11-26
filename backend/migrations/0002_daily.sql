-- 给已有额度行补上北京时间自然日。默认空字符串。
-- 不修改 used，不删除行。日期对不上时由应用把 used 改成当天的新计数。
-- 回滚旧 Worker 时这一列留着即可，不要 DROP。
ALTER TABLE quota ADD COLUMN day TEXT NOT NULL DEFAULT '';
