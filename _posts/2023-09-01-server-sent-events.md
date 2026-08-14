---
layout: post
title: "了解 SSE"
date: 2023-09-01 19:10:43 +0800
categories: ["网络协议"]
tags: ["SSE"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/8H7EZf"
---

SSE，工作这么多年也没有遇到使用场景，这段时间这个东西频繁进出我的眼睛和耳朵，唤起了星点的记忆，这不，昨天我看了几篇文章呢，于是有感而发，赶一下公司一级热点（AI），整一篇。

以下是进出眼睛和耳朵的场景：

- Wiki 加入 AI 计划会议和演示会议上都谈到的问题，接口是整段文本返回的，前端只能整段显示，有两个问题：
   
   - 响应的时间太久，第一次演示的时候频繁超时，我总觉得用户用起来可能会着急
   - 即使做了限制高度，一下弹出两个窗还是觉得有些突兀

![了解 SSE 配图 1](/assets/img/posts/pingcode-8h7ezf/image-001.png)

- 前一段时间看了一篇相关文章，唤起了一些记忆
- 一个小时前的 Wiki AI 演示会议又提到第一条说的问题，徐大神说开启 stream 模式，一下让这两者结合了起来，应该说的是 Event Source，Content-Type 是 text/event-stream。

曾想，如果像 openAI 那样实时推送，像打字效果那样，是不是可以缓解用户的焦虑呢，也有满满的科技感。

好吧，废话结束。

#### 什么是 SSE？

维基百科：

> Server-Sent Events (SSE) is a server push technology enabling a client to receive automatic updates from a server via an HTTP connection, and describes how servers can initiate data transmission towards clients once an initial client connection has been established. They are commonly used to send message updates or continuous data streams to a browser client and designed to enhance native, cross-browser streaming through a JavaScript API called EventSource, through which a client requests a particular URL in order to receive an event stream. The EventSource API is standardized as part of HTML5\[1\] by the WHATWG. The media type for SSE is text/event-stream.

PingCode AI 翻译的：

> Server-Sent Events（SSE）是一种服务器推送技术，可以通过HTTP连接使客户端自动接收服务器的更新，并描述了服务器在建立初始客户端连接后如何向客户端发起数据传输。它们通常用于将消息更新或连续数据流发送到浏览器客户端，并通过名为EventSource的JavaScript API来增强原生的、跨浏览器的流媒体传输。通过该API，客户端请求特定的URL以接收事件流。EventSource API 已作为 HTML5 的一部分由WHATWG标准化。SSE 的媒体类型是text/event-stream。

PingCode AI 将上一段文字提取为更简短：

> Server-Sent Events（SSE）是一种通过HTTP连接自动接收服务器更新的技术。它用于向浏览器客户端发送消息更新或连续数据流，并使用EventSource API来增强流媒体传输。SSE的媒体类型是text/event-stream。

Ps: 好家伙，有了 AI 就是方便，省了多少口舌。

#### SSE 的特点

推送数据，我们很容易想到的 WebSocket，它可以让前后端互通，从我的角度看 WebSocket 可以覆盖 SSE 所有的场景，那么为啥后来还会有 SSE 呢？

整理的挺费劲，也不觉得比阮一峰写的好，所以以下内容大部分是搬来的  😂

简短的解释：SEE 介于 HTTP 和 WebSocket 之间，**WebSocket 是单独的协议，长链接的一种，SSE 也是长链接，但它是用的是 HTTP 协议，SSE 一般只传输文本，遇到其他类型的要么转成文本，要么处理不了** 

>  SSE 与 WebSocket 作用相似，都是建立浏览器与服务器之间的通信渠道，然后服务器向浏览器推送信息。
> 
> 总体来说，WebSocket 更强大和灵活。因为它是全双工通道，可以双向通信；SSE 是单向通道，只能服务器向浏览器发送，因为流信息本质上就是下载。如果浏览器向服务器发送信息，就变成了另一次 HTTP 请求。

![了解 SSE 配图 2](/assets/img/posts/pingcode-8h7ezf/image-002.png)

但是，SSE 也有自己的优点。

> - SSE 使用 HTTP 协议，现有的服务器软件都支持。WebSocket 是一个独立协议。
> - SSE 属于轻量级，使用简单；WebSocket 协议相对复杂。
> - SSE 默认支持断线重连，WebSocket 需要自己实现。
> - SSE 一般只用来传送文本，二进制数据需要编码后传送，WebSocket 默认支持传送二进制数据。
> - SSE 支持自定义发送的消息类型。

因此，两者各有特点，适合不同的场合。

#### 有哪些使用场景

1. AI 生成，看个例子

![了解 SSE 配图 3](/assets/img/posts/pingcode-8h7ezf/image-003.png)

2. 像 Jenkins 运行 CI/CD 时实时打印日志（即使它不是用的 SSE 方式）、我们的 Pipe、GitHub Action 这类应该都可以用

![了解 SSE 配图 4](/assets/img/posts/pingcode-8h7ezf/image-004.png)

其他的，我暂时也没有想到。

#### 怎么用

> 撸码环节到了

##### 服务器端

需要做的核心是设置 HTTP 协议响应头，设置完发请求显示到控制台就像上面“场景1”的截图一样

```text
"Content-Type":"text/event-stream",
"Cache-Control":"no-cache",
"Connection":"keep-alive",
"Access-Control-Allow-Origin": '*'
```

##### 客户端

采用 HTML5 的 EventSource API，使用如下（来自 MDN，详细点[这里](https://developer.mozilla.org/zh-CN/docs/Web/API/EventSource)。）

![了解 SSE 配图 5](/assets/img/posts/pingcode-8h7ezf/image-005.png)

##### 完整代码（在附件）

> 从阮一峰的示例中粘的，改了一下，模拟 AI 生成的效果

1. 终端运行 node sse.js
2. 浏览器打开 sse.html

[下载 sse.html](/assets/files/posts/pingcode-8h7ezf/sse.html)

[下载 sse.js](/assets/files/posts/pingcode-8h7ezf/sse.js)
