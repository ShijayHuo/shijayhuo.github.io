# Box 验证启动

这不是生产部署。不要创建 D1，不要 `wrangler deploy`，不要合并。密钥只留在 box 进程环境里，不要打印，不要写入仓库、日志或知识包。

对话模型 `deepseek-v4.1-flash` 的短句探测已经确认：HTTP 200，模型名一致，正文是「你好」，结束为 stop 和 `[DONE]`，`reasoning_content` 单独出现并被丢弃，81 tokens。启动日志里的 `probe` 是 `stream-ok`。这不是博客问答验收，也不能据此改召回门限。

## 应用到 box

box 若已经在后端提交 `f519712fbd5e32f12b8b00fafa87b6d11ea7f2f3`，只应用增量补丁，不要重传全库，也不要覆盖前端 `b1565b7` 的页面文件。

```bash
cd /workspace/ajie-ask-validation/ajie-ask-box
git apply --check /opt/cursor/artifacts/ajie-ask-backend-switch.patch
git apply /opt/cursor/artifacts/ajie-ask-backend-switch.patch
cd backend
npm test
```

补丁只含 `backend/`。不要手改 `_includes`、`assets/js/ask-demo.js`、`assets/css` 或文章源码。静态站直接读现成的 `_site`。

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

`CHAT_API_KEY` 和 `EMBEDDING_API_KEY` 各自读取。脚本不会把 embedding 密钥抄进对话密钥。box 的启动 wrapper 已经从同一把 `BAILIAN_EMBEDDING_API_KEY` 在进程内分别赋给这两个变量，这里不要打印，也不要改那层映射。

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

## 先拆掉旧的整合进程

现在 8787 上的还是旧整合服务拉起的哈希 mock，不是这次 flash 包。旧父进程同时听 8765、18790、18791，并在 workerd 被杀掉后把它重新拉起来。只杀 8787 上的 workerd 不会结束。不要动系统占用的 8790 和 8791。

在 box 上先看计划，这一步不发信号：

```bash
cd /workspace/ajie-ask-validation/ajie-ask-box/backend
node --experimental-strip-types scripts/switch-local.ts --plan --parent 1613691
```

计划里的动作是 `stop` 且 pid 仍是那个 `serve-integrated` 父进程时，再执行。`--expect-used 8` 对不上就不会听端口，原 `quota.sqlite` 不会被清空；脚本会先复制一份带时间戳的备份。额度键仍用原来的那一把。旧整合服务写进 D1 的键是代码里的 `local-only`，只有环境变量还是这把键，sqlite 里 used 8 才对得上 `127.0.0.1`。脚本不打印密钥，也不改这把键。

```bash
export ASK_SITE_ROOT="/workspace/ajie-ask-validation/ajie-ask-box/_site"
export ASK_QUOTA_FILE="/workspace/ajie-ask-validation/ajie-ask-box/backend/dist/validation/quota.sqlite"
export QUOTA_HMAC_KEY="沿用上一次的本地键"
node --experimental-strip-types scripts/switch-local.ts --detach-and-serve --expect-used 8 --parent 1613691
```

若 `--plan` 显示 8765 的 pid 已经不是 1613691，去掉 `--parent` 再看一次。命令行里没有 `serve-integrated` 就不会发信号。8787 上的 workerd 只有在父进程已经退出、并且它变成孤儿之后，才会被单独 `SIGTERM`。8790 和 8791 上的 pid 不会收到信号。

这条命令随后只在 `127.0.0.1:8765` 提供现成 `_site`。HTML 响应里仅把 `document.documentElement.dataset.askApi = ""` 改成 `http://127.0.0.1:8787`，不写回磁盘。文章、图片、样式和 `b1565b7` 的脚本都按 `_site` 里的文件原样送出。不要为此重跑 Jekyll，也不要手改页面。

它不占用 8787、8788、8790、8791、18790、18791。静态服务的 pid 写在 `backend/dist/validation/site.pid`。停静态服务只对这个 pid 发 `SIGTERM`，不碰额度文件。

## 启动和停止真实接口

页面改由上面的静态服务提供。真实接口只听 `127.0.0.1:8787`。8787 仍被占用时，启动器在打开额度库之前退出。不要动 `8790`、`8791`，也不要占用 `8788`、`18790`、`18791`。

真实 embedding + 真实对话：

```bash
export ASK_BUNDLE_FILE="/workspace/ajie-ask-validation/ajie-ask-box/backend/dist/knowledge/bundle.json"
export ASK_PID_FILE="/workspace/ajie-ask-validation/ajie-ask-box/backend/dist/validation/api.pid"
export ASK_QUOTA_FILE="/workspace/ajie-ask-validation/ajie-ask-box/backend/dist/validation/quota.sqlite"
export ASK_QUOTA_EXPECT_USED=8
node --experimental-strip-types scripts/serve-validation.ts
```

启动会再复制一份额度备份，并核对最大 `used` 仍是 8。对不上就在写入前退出。知识包必须是已经建好的 flash 1024 包，不能是哈希 mock。日志里 `probe` 应为 `stream-ok`。

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

报告始终是 `recallAccepted: false`。`0.25` 不是已校准阈值。全库冒烟的正例 Top1 在 0.5836 到 0.7509，两个无依据负例是 `/about/` 的 0.4486 和 0.4507。不要按这 8 题改门限。下一步见 `eval/calibration.md`。脚本拒绝 `--min-score`。没有密钥时退出码 2，不会用哈希向量冒充。

## 对话请求

Chat Completions 只发送 `model`、`messages`、`max_tokens`、`stream`。不发送 `enable_thinking` 或 `reasoning_effort`。若响应仍带 `reasoning_content`，适配器丢弃，不写入 `token`，不拼进最终正文，也不写进日志。流式失败仍是契约里的 `error`，没有 `done`。用户取消只中止上游，不补 `error` 或 `done`。
