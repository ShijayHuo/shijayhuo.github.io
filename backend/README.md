# 问答后端

Cloudflare Workers 上的 `POST /ask`。博客页面仍由 GitHub Pages 构建。这里没有在跑生产资源，仓库里的知识模块也是空的。

协议以 `docs/ask/contract.md` 版本 1 为准。本目录不修改契约和 `docs/ask/fixtures/`。样例里的 `remaining`（除 429 固定为 0）和成功回答的句子是前端回放剧本。后端保证锁定的错误文案、SSE 事件顺序、来源只来自检索结果。

## 本地安装和测试

需要 Node.js 22。

```bash
cd backend
npm ci
npm test
npm run typecheck
npm run build:worker
npm run size
```

`npm test` 使用 Node 内置测试和 `node:sqlite`，不连接 Cloudflare，也不调用付费模型。sqlite 只验证额度 SQL。云端 D1 没有创建。

没有密钥时：

```bash
node --experimental-strip-types scripts/build-knowledge.ts
```

命令以非 0 退出，并且不写知识包。

只想检查控制流时：

```bash
node --experimental-strip-types scripts/build-knowledge.ts --mock --root .. --out dist/mock-bundle.json
```

`--mock` 使用确定性哈希向量。它不是语义模型，不能当作召回验收。mock 结果禁止写入 `src/generated/knowledge.ts`。

## 真实构建

当前验证用的 embedding 是百炼北京兼容接口上的 `qwen3.7-text-embedding-flash`，1024 维 float。这不是 rerank，也不是 `text-embedding-v4`。适配器仍走通用 OpenAI 字段：`model`、`input`、`dimensions`、`encoding_format=float`。批次保守为最多 10 条、单条 8192 tokens、整批 33000 tokens，不因为 flash 官方可以 20 条而放宽，这样同一套构建器也不会把 v4 打超限。

在 shell 里提供密钥，不要写进仓库，也不要出现在日志里：

- `EMBEDDING_API_KEY`。box 上可以由进程映射 `BAILIAN_EMBEDDING_API_KEY`，脚本不会打印它。
- `EMBEDDING_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1`
- `EMBEDDING_MODEL=qwen3.7-text-embedding-flash`
- `EMBEDDING_DIMENSIONS=1024`

```bash
node --experimental-strip-types scripts/build-knowledge.ts --validation \
  --out dist/knowledge/bundle.json
```

`--validation` 在地址、模型或维度未设置时才填上面的默认值，并拒绝 v4、512 维、rerank 和 mock。真实向量默认进 `backend/dist/knowledge/bundle.json`，不进 Git。写入 `src/generated/knowledge.ts` 必须再加 `--write-worker-module`。失败不替换已有知识包。

构建和查询必须是同一套地址、模型、维度和版本。哈希索引、v4 索引和 flash 索引不能混用。缓存键包含这些字段，写在已忽略的 `backend/.cache/embeddings.json`。可重试的是 408、429 和 5xx，最多 3 次；400 和取消不重试。成功的一批才会写入缓存。

对话验证模型是 `deepseek-v4.1-flash`，同一北京 base URL。短句探测已经是 HTTP 200：模型名一致，正文是「你好」，结束为 stop 和 `[DONE]`，`reasoning_content` 单独出现并被丢弃，共 81 tokens。这只说明流式字段可用，不是博客问答验收。请求只带 `model`、`messages`、`max_tokens`、`stream`，不开启 `enable_thinking` 或 `reasoning_effort`。响应里的 `reasoning_content` 会被丢弃，不进入 `token`，也不拼进最终正文。生成流不做重试，避免把已经发出的增量再拼一遍。

`0.25` 仍是代码里的起步门限，不是已校准阈值。四句探针里无关余弦约 0.308，相关约 0.427 和 0.391。全库冒烟是 102 篇、669 片：6 个正例 Top1 分数 0.5836 到 0.7509；无税号负例 `/about/` 0.4486，未公开履历负例 `/about/` 0.4507。0.25 会把这两个负例送进生成。不能用这 8 题选一个中间值然后宣称通过。评测规则在 `backend/eval/calibration.md`。`scripts/eval-recall.ts` 拒绝 `--min-score`，报告里的 `recallAccepted` 固定为 false。

box 的映射、端口、pid 和额度文件见 `backend/BOX.md`。

## D1

迁移文件是 `migrations/0001_quota.sql`。表里只有 HMAC 摘要、次数和更新时间。

手工第一次：

```bash
npx wrangler d1 create ajie-ask-quota
```

把返回的 id 替换 `wrangler.toml` 里的占位符 `00000000-0000-4000-8000-000000000000`，然后：

```bash
npx wrangler d1 migrations apply ajie-ask-quota --remote
```

本仓库没有执行这两步。以后的迁移不能 `DROP`、`DELETE` 或把 `used` 清零。Worker 回滚不碰这张表。

每个可信 IP 累计 20 次。占用发生在 query embedding 之前，用 `used < 20` 的条件更新。第 21 次返回 429，不调用模型。刷新和新会话不重置。

占用之后，embedding 失败、证据不足、生成中断、用户取消或超时都不退还次数。数据库若在写入成功后抛错，同样不调用模型，也不把次数改回去。

## Worker 密钥和本地联调

`wrangler.toml` 里 `ASK_ALLOW_MOCK` 和 `ASK_ALLOW_DEV_IP` 都是 `"0"`。不要把密钥写进 toml。

用 `npx wrangler secret put` 设置：

- `QUOTA_HMAC_KEY`：上线后不要因为普通重新部署而轮换，否则所有额度计数会换成新键。
- `EMBEDDING_API_KEY`、`EMBEDDING_BASE_URL`、`EMBEDDING_MODEL`、`EMBEDDING_DIMENSIONS`
- `CHAT_API_KEY`、`CHAT_BASE_URL`、`CHAT_MODEL`

任一为空，或知识包缺失、版本对不上、mock 包未显式允许，接口返回 `503` 和 `问答服务尚未配置。`，此时不占用额度。

页面要带 `Origin`。未设置 `ASK_ALLOWED_ORIGINS` 时只允许 `https://shijayhuo.github.io`。空字符串和 `*` 不允许任何来源。CORS 不是认证。

可信 IP 只读 `CF-Connecting-IP`。本地包装器会替浏览器写这个头，前端不要发送 `x-ask-dev-ip`。

只看协议时仍可用 mock 包和 `scripts/serve-local.ts`。那不是语义召回。真实向量和真实对话用 `scripts/serve-validation.ts`，见 `backend/BOX.md`。它默认同时要求 flash embedding 和 `deepseek-v4.1-flash`。只测检索时要显式加 `--mock-chat`，并且 `ASK_ALLOW_MOCK` 仍是 `0`，哈希知识包不能冒充真包。

验证进程只听 `127.0.0.1:8787`。额度在 `backend/dist/validation/quota.sqlite`。启动不会删除或清零这张表；停止只发 `SIGTERM` 并删除 pid 文件。更换 `QUOTA_HMAC_KEY` 会让旧计数对不上，不要在重启时轮换。

## 发布顺序

`.github/workflows/ask-test.yml` 在 `pull_request` 和主干 push 上运行，权限只有 `contents: read`，不引用密钥，也不使用 `pull_request_target`。

`.github/workflows/ask-deploy.yml` 等现有「Build and Deploy」在 `main` 成功之后才可能运行。还要仓库变量 `ASK_DEPLOY_ENABLED=true`。知识构建失败就不会 `wrangler deploy`，线上保留上一版 Worker。这个文件在进入默认分支之前不会生效。本次没有部署。

部署前还要手工完成：创建 D1、替换 database id、应用迁移、放入全部密钥、确认 `src/generated/knowledge.ts` 会在部署任务里被真实构建覆盖。Git 里的这个文件必须保持 `null`。

## 还没有验收的部分

- 没有在这台机器上调用百炼。全库 flash 索引和 deepseek 短句探测是 box 上已经做成的事。短句探测通过不等于博客问答验收。
- `0.25` 不是有效阈值。全库 8 题冒烟说明它会放进无依据负例，但门限还没按 `backend/eval/calibration.md` 校准。
- 没有创建 D1，没有部署 Worker。
- Worker 的 CPU 和内存只在 Cloudflare 上才测得到。`npm test` 会打印脚本字节数、gzip 字节数，以及 mock 知识包的切片数和 JSON 体积。那不是 1024 维真实向量的体积。
