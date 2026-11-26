# 问答接口契约

版本：1  
日期：2026-11-25  
状态：前后端共同遵守的检查点。实现还没接到页面上。

当前站点仍走已提交的预写演示。本文件不改变那个行为。前端分支按这里改页面和 mock，后端分支按这里做 Worker。两边都不要把 mock 样例说成真实语义召回。

样例目录：`docs/ask/fixtures/`。索引：`docs/ask/fixtures/manifest.json`。

## 目录边界

前端分支可以改：

- `assets/js/ask-demo.js`
- `assets/js/ask-sse.js`（解析器若拆出）
- `assets/css/jekyll-theme-chirpy.scss` 中 `ASK_DEMO_CSS_START` 到 `ASK_DEMO_CSS_END`
- `_includes/ask-hero.html`、`_includes/ask-chat.html`、`_includes/sidebar.html`
- `ask.html`、`_layouts/home.html` 里的提问区
- `_config.yml` 的 `ask.demo`、`ask.api_url`
- 离线原型生成脚本和它的产物说明

前端分支不要改：`backend/**`、`_posts/**`、`_drafts/**`、`_tabs/**` 正文、本文件、`docs/ask/fixtures/**`。

后端分支可以改：`backend/**`、`.github/workflows/ask-*.yml`、`.gitignore` 里 backend 相关行、`_config.yml` 的 `exclude`。本提交已把 `backend` 加入 Jekyll `exclude`。

后端分支不要改已确认的提问区样式。剩余额度和错误只使用下面规定的 DOM。

`docs/` 已被 Jekyll 排除，契约和样例不会进 GitHub Pages。

## 页面模式

`_config.yml`：

```yaml
ask:
  demo: false
  api_url: "https://ajie-ask.aaaaaajie666.workers.dev/ask"
```

侧栏脚本把它们写到 `<html>`：

```liquid
document.documentElement.dataset.askDemo = {{ site.ask.demo | default: false | jsonify }};
document.documentElement.dataset.askApi = {{ site.ask.api_url | default: "" | jsonify }};
```

读取规则：

- 演示：`dataset.askDemo === "true"`。只走现有预写回答，不发请求。
- 未配置：演示不为真，且 `dataset.askApi` 去掉空白后为空。不发请求。助手正文固定为 `问答服务尚未配置。`，没有来源。
- 接口：演示不为真，且 `askApi` 是 `http:` 或 `https:` 绝对地址。只发下面的 `POST`。

`ask.demo: true` 时忽略 `api_url`。生产站点（`JEKYLL_ENV=production`）演示关闭，并把上面的地址写进页面。其他构建仍写出空的 `askApi`，本地验收不会打到生产。缺配置时显示未配置，不用演示文案顶上。

`「交互演示」` 标记只在演示模式渲染。接口模式和未配置模式都不渲染。

接口地址解析：

- 路径已经以 `/ask` 结尾：原样作为端点。
- 否则在路径后追加 `/ask`（先去掉末尾斜杠）。
- 其他协议丢弃，按未配置处理。

客户端请求不带 Cookie、`Authorization`、密钥，也不发送 `x-ask-dev-ip`。`credentials` 为 `omit`。

## 已确认的界面挂钩

这些 id 保持不变：`#ask-hero`、`#ask-input`、`#ask-send`、`#ask-app`、`#ask-empty`、`#ask-greet`、`#ask-empty-input`、`#ask-messages`、`#ask-chat-input`、`#ask-stop`、`#ask-status`。

聊天底部新增 `#ask-remaining`。还没有额度数字时隐藏。有数字时：

- `remaining > 0`：`还可问 N 次`
- `remaining === 0`：`已达到 20 次上限`

用户正文和模型正文只用 `textContent`。不把模型输出当 HTML，也不自动把正文里的网址变成链接。

来源只渲染 `sources` 事件里通过校验的项。链接文字是 `title`。`href` 只用通过校验的站内路径。

首页发送仍进入 `/ask/`，问题不进网址。菜单点入仍是空问候。聊天页仍没有文章流和右侧更新标签。

## 请求

`POST /ask`。`/ask/` 与 `/ask` 相同。`Content-Type: application/json`。`Accept: text/event-stream`。正文 UTF-8，最大 32768 字节。

```json
{
  "question": "当前问题",
  "history": [
    {
      "role": "user",
      "content": "更早的用户问题",
      "sourceIds": []
    },
    {
      "role": "assistant",
      "content": "更早的助手正文",
      "sourceIds": ["cordis-uninstall-01"]
    }
  ]
}
```

对应样例：`request-first.json`、`request-followup.json`。

约束：

- `question` 去掉首尾空白后 1 到 2000 个字符。
- `history` 省略时当作 `[]`。最多 6 条。每条 `content` 最多 4000 个字符，客户端先截断。
- `role` 只能是 `user` 或 `assistant`。
- `sourceIds` 可省略。若出现，必须是最多 8 个字符串；每个 1 到 64 字符，匹配 `^[A-Za-z0-9][A-Za-z0-9._-]*$`。
- 当前问题不要放进 `history`。未完成的助手消息不要发送。
- 客户端只回传自己接受过的来源 id。

服务端用这些材料组织检索，而不是只拿最后一条孤立提问：

- 检索文本 = 最近两条用户 `content` 各取前 200 字，加上当前问题，用换行连接，总长最多 2400 字。
- 新检索命中里，分数达到阈值的块作为证据。默认阈值 `0.25`。分数不是事实置信度，低分的 Top-K 不能硬答。
- 若没有达标命中，且当前问题是追问，则把 `history` 里的 `sourceIds` 按当前知识版本重新解析。仍存在的块最多取 5 个作为证据。
- 追问指：去掉空白后不超过 24 个字符，或以 `那`、`这个`、`继续`、`它`、`上面`、`前面`、`刚才` 开头。
- 证据仍不足时不调用生成模型。回答全文固定为 `公开文章里没有足够依据回答这个问题。`，`sources` 为 `[]`。额度已经占用，不退还。
- 历史文章里的「我现在」只代表写作当时。

## 成功时的 SSE

`Content-Type: text/event-stream; charset=utf-8`。`Cache-Control: no-store`。HTTP 200。事件之间空一行。`data` 是一个 JSON 对象。

顺序：

1. `meta` 恰好一次，并且是第一条。
2. 零次或多次 `token`。
3. `sources` 恰好一次，可以是空数组。
4. `done` 恰好一次。

```text
event: meta
data: {"remaining":19,"knowledgeVersion":"kv-fixture-1"}

event: token
data: {"text":"关于页写的是霍世杰。"}

event: sources
data: {"sources":[{"id":"about-intro","title":"关于","url":"/about/","heading":""}]}

event: done
data: {}
```

样例：`sse-success.txt`、`sse-followup.txt`、`sse-refusal.txt`。

字段：

- `remaining`：整数 `0` 到 `19`。表示这次占用之后还剩几次。第 20 次成功时为 `0`，回答仍正常返回。
- `knowledgeVersion`：1 到 64 字符，匹配 `^[A-Za-z0-9][A-Za-z0-9._-]*$`。页面 v1 不展示它。
- `token.text`：增量正文，客户端按到达顺序拼接。
- 来源对象：`id`、`title`、`url`、`heading`。`title` 最多 120 字符，`heading` 最多 160 字符，可为空字符串。
- `url` 必须匹配 `^/(about/|posts/[A-Za-z0-9][A-Za-z0-9._-]*/)$`。
- 同一 `url` 只保留第一条。
- 来源只来自这次检索或重新解析到的知识块。模型正文里的网址不能变成来源。

解析：按空行分块；块内空行忽略；`event:` 取事件名，缺省为 `message`；多行 `data:` 用换行拼起来；以 `:` 开头的注释忽略；JSON 不合法则跳过该块，不抛到界面；未知事件忽略。连接结束后若缓冲区还有未完成块，再尝试解析一次。文件末尾可以只有一个换行。

拒绝回答走同一条 SSE，不单独发明事件。见 `sse-refusal.txt`。

## 非流式错误

响应是 JSON，`Content-Type: application/json; charset=utf-8`。还没开始 SSE。除下面标明「已占用」的情况外，不增加额度。

| HTTP | `error` | 固定 `message` | 额度 | 样例 |
| --- | --- | --- | --- | --- |
| 400 | `invalid` | `请输入问题。` | 不占用 | `http-400-empty.json` |
| 400 | `invalid` | `请求不是 JSON。` | 不占用 | 条文锁定，无正文样例 |
| 400 | `invalid` | `历史格式不正确。` | 不占用 | `http-400-role.json` |
| 400 | `invalid` | `问题太长。` | 不占用 | 条文锁定 |
| 403 | `forbidden` | `来源不在允许列表里。` | 不占用 | `http-403-origin.json` |
| 403 | `forbidden` | `无法确认来源，已拒绝。` | 不占用 | `http-403-ip.json` |
| 404 | `invalid` | `没有这个接口。` | 不占用 | 条文锁定 |
| 405 | `invalid` | `只接受 POST /ask。` | 不占用 | 条文锁定 |
| 413 | `invalid` | `请求太大。` | 不占用 | 条文锁定 |
| 429 | `quota` | `已达到 20 次上限。` | 不占用 | `http-429.json` |
| 502 | `upstream` | `检索向量没有生成，次数已计入上限。` | 已占用 | `http-502.json` |
| 503 | `unavailable` | `问答服务尚未配置。` | 不占用 | `http-503.json` |

`429` 和 `502` 带整数 `remaining`。其他非流式错误不带 `remaining`。

客户端展示：

- `429`：助手正文用该 `message`，`#ask-remaining` 显示已达上限。
- `503`：助手正文用 `问答服务尚未配置。`
- `502`：助手正文用该 `message`，并显示返回的剩余次数。
- 其他非流式错误：助手正文用返回的 `message`。没有合法 JSON 时用 `网络异常，这次没有收到完整回答。`
- 这些正文都不是来源列表，也不链接到模型写下的网址。

CORS 不是认证。`OPTIONS` 不占用额度，成功时 204 且没有正文。允许的源返回具体 `Access-Control-Allow-Origin`，另加 `Vary: Origin`。允许方法 `POST, OPTIONS`，允许头 `Content-Type`。不回 `*`，不带凭据。

源名单：环境变量未设置时只允许 `https://shijayhuo.github.io`。变量为空字符串、`*` 或含通配符时不允许任何源。本地联调把页面源写进变量，例如 `http://127.0.0.1:8765`。

可信 IP 只读 `CF-Connecting-IP`。没有这个头，且 `ASK_ALLOW_DEV_IP` 不为 `"1"` 时返回 403，不调用模型。开发头 `x-ask-dev-ip` 只在该开关为 `"1"` 且没有 `CF-Connecting-IP` 时有效。不读 `X-Forwarded-For`。

## 流里的失败和取消

生成已经开始后若上游失败，发送 `error` 然后结束。不再发送 `done`。已收到的 `token` 保留。

```text
event: error
data: {"message":"生成中断，这次次数已计入上限。"}
```

样例：`sse-upstream-error.txt`。这种失败发生在占用额度之后，不退还。

用户停止或离开页面：客户端中止 `fetch`。服务端把同一个取消信号传给 embedding 和生成，不再继续读上游。已占用的额度不退还。

客户端区分两种中止：

- 用户停止：助手标记停止。已有拼接正文保留；一个字都没有时正文为空。界面沿用 `已停止`。不要改写成网络错误。
- 满 25000 毫秒：同样中止，助手正文改为 `回答超时，已停止等待。`，并标记停止。

`sse-cancelled.txt` 是中止前已经到达的事件：有 `meta` 和一个 `token`，没有 `done`，也没有 `error`。

刷新、新会话、前进后退都不重置额度。第 21 次在调用 embedding 之前就返回 429。同 IP 并发用条件更新保证最多 20 次占用。无效请求和已经满额的请求不增加计数。配置不完整返回 503，发生在占用之前。

## Mock 样例怎么用

`manifest.json` 的 `contractVersion` 必须是 `1`。前端 mock 按其中的 `status`、`contentType` 和文件回放。样例里的 `remaining` 和 `knowledgeVersion` 是固定剧本，用来验收解析和文案。

这些样例不包含向量，也不证明某篇文章能被语义召回。`sse-success.txt` 里的句子只是协议正文。真实知识源、过滤规则和检索质量由后端分支验收。

## 本提交没有做的后端范围

留给后续后端分支，不在本提交里实现：

- `backend/` 下的 Cloudflare Workers `POST /ask`
- 生成与 embedding 各自的 baseURL、model、key，Chat Completions 流式适配器
- 构建期分段、embedding、版本清单，以及运行时内存余弦检索
- 只对已发布 `_posts` 与关于页建库；排除草稿、`published: false`、未来文章，以及 tags、categories、archives 三个版面
- D1 只存额度；占用发生在 query embedding 之前；失败默认不退还
- IP 的 HMAC 摘要，以及 PR 不能部署、不能读密钥的 Actions
- Worker 包体、内存、CPU 的实测；未测的不能写成结果
- 真实模型的召回评测。mock 只能验收控制流
