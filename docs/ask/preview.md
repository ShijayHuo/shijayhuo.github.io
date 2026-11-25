# 问答界面本地预览

这是给前端验收用的自包含页面，不是已经部署的站点。GitHub Pages 排除了 `docs/`，打开这个文件不会把问答服务发到线上。

用浏览器直接打开 `docs/ask/preview.html`。同一页里可以看首页、空问候和聊天。回答按 `docs/ask/fixtures/` 回放，不调用模型，也没有密钥。文章链接指向 `https://shijayhuo.github.io` 上已经公开的页面。

页面顶部的「模拟传输」只在问答视图出现。场景包括正常、停止、429、未配置、流式失败、检索失败、来源被拒、依据不足和网络异常。这里出现的「还可问 N 次」来自样例，不是访问限额，也不能当成防刷已经完成。

重新生成：

```bash
node tools/ask/embed-fixtures.js
node tools/ask/build-preview.js
```

真实接口联调不改协议。保持 `ask.demo: false`，把 `_config.yml` 的 `ask.api_url` 设成自有 Worker 的 `http:` 或 `https:` 绝对地址。地址为空时，页面只显示「问答服务尚未配置。」，不会改用预写回答。前端只向该地址 `POST /ask`，不直接请求模型。

已构建的站点里，要单独看模拟传输，可以打开 `/ask/?ask-mock=normal`。首页不带这个参数时不会出现模拟说明。
