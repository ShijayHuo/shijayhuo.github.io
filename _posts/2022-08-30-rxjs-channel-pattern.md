---
layout: post
title: "RxJS 简易实现频道通讯模式"
date: 2022-08-30 16:19:25 +0800
categories: ["前端","框架"]
tags: ["RxJS"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/vtLCP1"
---

我们知道 Redis 的 pub/sub 支持 channel 通讯模式，而 RxJS 只有单播和广播的模式，并不能指定给一部分消费者推送消息/数据。

### 使用场景

Wiki 恰好有类似需求（刚写完）：全屏和退出全屏时推送状态。

首先解释一下为什么要用服务通讯，因为 Wiki 的设置全屏是在编辑器内部，而退出全屏是在编辑器外，它们的环境不同，如果要同步数据只能通过特殊的通道（这里不多做解释了），所以用服务来做数据通讯是相对简单的方式，第二个我个人希望**状态发生变化时，只通知当前或相关元素**，比如表格和文本绘图都订阅全屏状态，设置文本绘图的全屏，不会给表格发通知，相反，退出全屏也是只给文本绘图发，如果要两者都想收到通知，只需要他们订阅同一个频道。

![RxJS 简易实现频道通讯模式 配图 1](/assets/img/posts/pingcode-vtlcp1/image-001.png)

![RxJS 简易实现频道通讯模式 配图 2](/assets/img/posts/pingcode-vtlcp1/image-002.png)

### 实现

实现思路：

1. Subject 广播给订阅方
2. 封装订阅方法，在 Subject 订阅到数据时再按频道过滤

简单说，就是 Subject + filter。

#### 发送通知

![RxJS 简易实现频道通讯模式 配图 3](/assets/img/posts/pingcode-vtlcp1/image-003.png)

#### 订阅通知

如果指定频道，那么过滤，否则全部广播。

![RxJS 简易实现频道通讯模式 配图 4](/assets/img/posts/pingcode-vtlcp1/image-004.png)

#### 设置全屏

我这里以元素作为唯一频道，可以根据以后的场景多个元素订阅同一个频道。

![RxJS 简易实现频道通讯模式 配图 5](/assets/img/posts/pingcode-vtlcp1/image-005.png)

#### 退出全屏

![RxJS 简易实现频道通讯模式 配图 6](/assets/img/posts/pingcode-vtlcp1/image-006.png)

#### 订阅方

这里举例文本绘图组件。

![RxJS 简易实现频道通讯模式 配图 7](/assets/img/posts/pingcode-vtlcp1/image-007.png)

OK，收，就是这么猝不及防😈
