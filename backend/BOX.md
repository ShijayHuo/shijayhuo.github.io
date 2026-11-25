# Box 验证启动

这不是生产部署。不要创建 D1，不要 `wrangler deploy`，不要合并。密钥只留在 box 进程环境里，不要打印，不要写入仓库、日志或知识包。

对话模型 `deepseek-v4.1-flash` 的账号流式探测还没确认成功。启动日志里的 `probe` 保持 `unconfirmed`，不能写成已通过。

## 应用到 box

基线是后端提交 `556e4f5e0bff58acc7f9126e1043d0497752c6c7` 之后的本分支更新。补丁只含 `backend/`。前端静态目录不要改。

```bash
cd /workspace/ajie-ask-validation/ajie-ask-box
git apply --check /opt/cursor/artifacts/ajie-ask-backend-bailian.patch
git apply /opt/cursor/artifacts/ajie-ask-backend-bailian.patch
cd backend
npm ci
```

若 box 已经拉取同一提交，不必再 apply。

## 进程映射

在 box 里映射，不要 `echo` 密钥：

```bash
cd /workspace/ajie-ask-validation/ajie-ask-box/backend
export EMBEDDING_API_KEY="$BAILIAN_EMBEDDING_API_KEY"
export EMBEDDING_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export EMBEDDING_MODEL="qwen3.7-text-embedding-flash"
export EMBEDDING_DIMENSIONS="1024"
export CHAT_API_KEY="$BAILIAN_CHAT_API_KEY"
export CHAT_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"
export CHAT_MODEL="deepseek-v4.1-flash"
export QUOTA_HMAC_KEY="沿用上一次的本地键"
```

`CHAT_API_KEY` 和 `EMBEDDING_API_KEY` 各自读取。脚本不会把 embedding 密钥抄进对话密钥。若 box 实际只有一把百炼密钥，由启动它的进程分别赋给这两个变量，仍然不要打印。

未设置时，构建和启动器会依次看 `BAILIAN_EMBEDDING_API_KEY`、`BAILIAN_CHAT_API_KEY`，只放进内存。

地址、模型和维度必须与知识包一致。`text-embedding-v4`、512 维、哈希 mock 索引都不能和这次 flash 包混用。适配器仍接受通用 OpenAI 兼容字段，批次保守为最多 10 条、单条 8192、整批 33000，不因为 flash 官方 20 条而放宽。

## 构建

```bash
node --experimental-strip-types scripts/build-knowledge.ts --validation \
  --root /workspace/ajie-ask-validation/ajie-ask-box \
  --out /workspace/ajie-ask-validation/ajie-ask-box/backend/dist/knowledge/bundle.json \
  --cache /workspace/ajie-ask-validation/ajie-ask-box/backend/.cache/embeddings.json
```

失败时不替换已有 `bundle.json`。缓存只在一批成功后原子替换。这些路径已在 `backend/dist` 和 `backend/.cache` 中忽略，不要提交。

## 启动和停止

页面继续用现有静态服务 `127.0.0.1:8765`。本进程只听 `127.0.0.1:8787`。不要动 `8790`、`8791`，也不要占用未配置的 `8788`、`18790`、`18791`。

真实 embedding + 真实对话：

```bash
export ASK_BUNDLE_FILE="/workspace/ajie-ask-validation/ajie-ask-box/backend/dist/knowledge/bundle.json"
export ASK_PID_FILE="/workspace/ajie-ask-validation/ajie-ask-box/backend/dist/validation/api.pid"
export ASK_QUOTA_FILE="/workspace/ajie-ask-validation/ajie-ask-box/backend/dist/validation/quota.sqlite"
node --experimental-strip-types scripts/serve-validation.ts
```

只测检索、显式 mock 对话时，在同一命令后加 `--mock-chat`。没有 `--mock-chat` 又没有对话密钥时直接退出，不会偷偷改成 mock。

停止：

```bash
node --experimental-strip-types scripts/serve-validation.ts --stop
```

`--stop` 读取 pid 文件并发送 `SIGTERM`，然后删除 pid 文件。它不删除 `quota.sqlite`，也不改 `used`。进程自己收到 `SIGTERM` 或 `SIGINT` 时同样只删 pid。

若 pid 仍存活，再次启动会退出，并说明额度文件不会改动。过期 pid 可以重新监听，打开额度库时只用 `CREATE TABLE IF NOT EXISTS`，没有 `DELETE` 或 `DROP`。

额度要保持不变，还必须继续用同一把 `QUOTA_HMAC_KEY`。更换这把键会让旧计数对不上，看起来像被清零。不要为了重启而换键，也不要删 `quota.sqlite`。

## 召回记录

```bash
node --experimental-strip-types scripts/eval-recall.ts \
  --out /workspace/ajie-ask-validation/ajie-ask-box/backend/dist/knowledge/recall-report.json
```

报告始终是 `recallAccepted: false`。`0.25` 不是已校准阈值：四句探针里无关余弦约 `0.308`，相关约 `0.427` 和 `0.391`。脚本拒绝 `--min-score`。没有密钥时退出码 2，不会用哈希向量冒充。

## 对话请求

Chat Completions 只发送 `model`、`messages`、`max_tokens`、`stream`。不发送 `enable_thinking` 或 `reasoning_effort`。若响应仍带 `reasoning_content`，适配器丢弃，不写入 `token`，不拼进最终正文，也不写进日志。流式失败仍是契约里的 `error`，没有 `done`。用户取消只中止上游，不补 `error` 或 `done`。
