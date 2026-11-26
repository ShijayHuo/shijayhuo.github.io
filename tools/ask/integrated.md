# 本地前后端联调

这是本机验收，不是部署。页面仍是现有 Jekyll 站点。问答走真实 Worker 的 `POST /ask`，额度走 Miniflare 本地 D1。生成和 embedding 打到本机的测试上游，不使用密钥，也不调用付费模型。

生产配置是 `ask.demo: false` 和已验通的 Worker 地址，只有 `JEKYLL_ENV=production` 会写进页面。本地构建仍是空地址。启动脚本把空地址或该生产地址改成 `http://127.0.0.1:8787`，不改仓库配置。

## 启动

需要 Node.js 22。第一次 `npm ci` 要能下载依赖；进程起来之后只监听本机，问答不再访问模型或公网。在仓库根目录：

```bash
cd backend
npm ci
cd ..
node --experimental-strip-types backend/scripts/serve-integrated.ts
```

看到一行 `{"ready":true,...}` 后打开 http://127.0.0.1:8765/ 。全部监听 `127.0.0.1`，不需要公网。

| 地址 | 作用 |
| --- | --- |
| http://127.0.0.1:8765/ | 站点。首页发送和侧栏都进 `/ask/` |
| http://127.0.0.1:8787/ask | 已配置的 Worker，Miniflare + 本地 D1 |
| http://127.0.0.1:8788/ask | 同一套 `createAnswer`，没有知识包和密钥，返回 503 |
| http://127.0.0.1:8790 | 测试用 embedding / chat 上游 |
| http://127.0.0.1:8791 | 只给本机的控制口 |

主题的字体、图标和统计脚本仍指向 CDN。没有公网时图标会缺，问答本身不依赖它们。交给主助手的压缩包省去了源码里的 `assets/img`，预构建 `_site` 里的图片还在，页面可以直接看。

## 重置测试额度

额度按本机 `CF-Connecting-IP`（`127.0.0.1`）累计，存在本地 D1，刷新页面不会清零。

```bash
curl -s -X POST http://127.0.0.1:8791/reset-quota
```

或在服务已启动时：

```bash
ASK_CONTROL_PORT=8791 node --experimental-strip-types backend/scripts/reset-local-quota.ts
```

这只删本地测试表。它不是迁移，也不会动云端。

重新生成知识包：`node --experimental-strip-types backend/scripts/serve-integrated.ts --rebuild`。

## 能打出引用的问法

字符哈希只认摘录重合，不认意思。下面这些字符串和已发布原文的字符片段重合，本地最低分 0.55 下会命中，并返回「本地测试生成，不是文章结论。」加一条站内链接。问句要整句一致，不要加标点或空格。当前已经跑着的服务可以直接问，不用重启，也不用换知识包。

| 问句 | 引用 |
| --- | --- |
| `函数式编程` | `/posts/functional-programming/` |
| `Angular 单元测试入门` | `/posts/angular-unit-testing-introduction/` |
| `使用nodejs实现redis的pub/sub` | `/posts/nodejs-redis-pubsub/` |
| `西蒙学习法和一万小时定律` | `/posts/simon-learning-method-and-10000-hour-rule/` |
| `encodeURI 和 encodeURIComponent` | `/posts/encodeuri-vs-encodeuricomponent/` |

关于页要用正文开头的连续摘录，不能改写。`backend/dist/local/probe.json` 里的 `question` 会引用 `/about/`，链接文字是 `about`。

`阿杰有哪些技术经历？`、`Stripe 接入指南`、`MongoDB 聚合管道限制` 会得到「公开文章里没有足够依据回答这个问题。」，并且没有引用。这是哈希没有重合，不是接口把来源弄丢了。`阿杰有哪些技术经历？` 的最高分大约 0.22，低于生产默认 0.25，最近的切片也不是经历文章。经历长文 `_posts/2026-07-29-career.md` 本身是 `published: false`，构建时就没有进知识包。

`DeepSeek Harness 的底层基石——Cordis（一）` 会引用另一篇 Cordis 文章。那是哈希撞车，不要拿它验收引用是否指回原题。

## 主题

侧栏「首页」、站点标题和浏览器后退都会离开问答页。主题记在 `localStorage` 的 `theme`。实测切到深色后再走这三条，首页仍是 `data-bs-theme=dark`，背景 `rgb(27, 27, 30)`。这里没有改主题代码。

## 模拟边界

- 向量是 512 维字符哈希，不是语义模型。本地最低分设为 `0.55`，只让摘录明显重合的切片显示成来源。随便问一句通常得到「公开文章里没有足够依据」。
- 回答正文固定写明「本地测试生成，不是文章结论」。
- 问题里带 `[[upstream-fail]]` 时，当前这次 embedding 返回 500，Worker 回 502，不调用生成。
- 问题里带 `[[stream-fail]]` 且这次确实会生成时，chat 返回 500，页面显示「生成中断，这次次数已计入上限。」
- 问题里带 `[[fast]]` 时不放慢输出，方便把额度打满。`[[hang]]` 会一直不响应，直到请求被取消。
- 这些标记只作用于当前问题，不会因为历史里出现过就再次触发。
- 浏览器里看到的剩余次数来自 Worker 的本地 D1，不是前端自己数的，也不是线上防刷。

workerd 直接访问 `127.0.0.1` 会失败。本地进程把 Worker 的出站 `fetch` 转到 Node，再由 Node 访问测试上游。业务处理仍是 `createAnswer`，额度 SQL 仍是 `migrations/0001_quota.sql` 里的语句。
