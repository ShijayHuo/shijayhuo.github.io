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

在 shell 里提供下面四项，不要写进仓库：

- `EMBEDDING_API_KEY`
- `EMBEDDING_BASE_URL`，例如兼容端点的 `https://host/v1`。官方 OpenAI 也要显式写成 `https://api.openai.com/v1`，代码不会代填。
- `EMBEDDING_MODEL`
- `EMBEDDING_DIMENSIONS`

然后：

```bash
node --experimental-strip-types scripts/build-knowledge.ts --out src/generated/knowledge.ts
```

生成和 embedding 各用各的地址、模型和密钥。请求是 Chat Completions 流式和 Embeddings，`max_tokens` 800，不自动重试。适配器在 `src/openai-adapter.ts`，可以换成官方 SDK，只要保留 `createEmbedding` 和 `createChatStream`。

缓存写在 `backend/.cache/embeddings.json`，已忽略。相同模型、维度和切片规则下，未改动的段落会复用向量。模型、维度或切片规则变化会整库重嵌。删除或撤稿的文章不会留在新包里。写入前会做版本校验；校验失败不替换旧文件。

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

可信 IP 只读 `CF-Connecting-IP`。本地 `scripts/serve-local.ts` 会替浏览器写这个头，前端不要发送 `x-ask-dev-ip`。

```bash
ASK_ALLOW_MOCK=1 QUOTA_HMAC_KEY=local-only ASK_BUNDLE_FILE=dist/mock-bundle.json \
  node --experimental-strip-types scripts/serve-local.ts
```

然后把页面的接口地址指到 `http://127.0.0.1:8787`。这个进程不是生产部署。mock 包只能看协议，不能看召回质量。真实联调改用真实知识包，并设置生成和 embedding 变量，同时不要打开 `ASK_ALLOW_MOCK`。

## 发布顺序

`.github/workflows/ask-test.yml` 在 `pull_request` 和主干 push 上运行，权限只有 `contents: read`，不引用密钥，也不使用 `pull_request_target`。

`.github/workflows/ask-deploy.yml` 等现有「Build and Deploy」在 `main` 成功之后才可能运行。还要仓库变量 `ASK_DEPLOY_ENABLED=true`。知识构建失败就不会 `wrangler deploy`，线上保留上一版 Worker。这个文件在进入默认分支之前不会生效。本次没有部署。

部署前还要手工完成：创建 D1、替换 database id、应用迁移、放入全部密钥、确认 `src/generated/knowledge.ts` 会在部署任务里被真实构建覆盖。Git 里的这个文件必须保持 `null`。

## 还没有验收的部分

- 没有真实模型，也没有对 `backend/eval/questions.json` 做语义召回打分。
- 没有创建 D1，没有部署 Worker。
- Worker 的 CPU 和内存只在 Cloudflare 上才测得到。`npm test` 会打印脚本字节数、gzip 字节数，以及 mock 知识包的切片数和 JSON 体积。那不是生产向量的体积。真实维度未配置时，不能把 `切片数 × 维度 × 4` 说成已测容量。
