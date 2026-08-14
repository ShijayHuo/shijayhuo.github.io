---
layout: post
title: "encodeURI 和 encodeURIComponent"
date: 2022-08-10 10:11:20 +0800
categories: ["JavaScript"]
tags: ["JavaScript"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/6rbQd2"
---

昨天在做文本绘图功能时发现了一个缺陷，前端需要发一个带文本内容的 GET 请求获取一张图片，而这个文本意外的缺失了一部分。

![encodeURI 和 encodeURIComponent 配图 1](/assets/img/posts/pingcode-6rbqd2/image-001.png)

最终发出去的请求，如图

![encodeURI 和 encodeURIComponent 配图 2](/assets/img/posts/pingcode-6rbqd2/image-002.png)

发出去之前的内容，如图

![encodeURI 和 encodeURIComponent 配图 3](/assets/img/posts/pingcode-6rbqd2/image-003.png)

仔细的对比了一下请求前后的内容（三张图）发现文本 `#`后面的内容被忽略了，当时能猜测出来是关键字符导致的，但没有和 Hash History、H5 History 关联起来，后来 Google 了才突然回忆起来 `#`是 Hash History 锚点字符，在此之前我已经用了 `encodeURI` 啊，应该会转义吧，从结果来看并没有转义，最终的解决办法是用 `encodeURIComponent`，也顺道看了一下相关知识，比如它们产生的历史等等，就不啰嗦了。

#### 区别

功能上的区别：

- **encodeURI方法不会对下列字符编码** <u>**ASCII字母 数字 ~!@#$&\*()=:/,;?+'**</u>
- **encodeURIComponent方法不会对下列字符编码** <u>**ASCII字母 数字 ~!\*()'**</u>

所以encodeURIComponent 比 encodeURI编码的范围更大。

语法上的区别：

- encodeURI 接收的参数是 uri 字符串
- encodeURIComponent 接收的参数是 uriComponent 字符串、数字或布尔。

![encodeURI 和 encodeURIComponent 配图 4](/assets/img/posts/pingcode-6rbqd2/image-004.png)

最后看下他们的样子和结果图：

![encodeURI 和 encodeURIComponent 配图 5](/assets/img/posts/pingcode-6rbqd2/image-005.png)

`encodeURI`

![encodeURI 和 encodeURIComponent 配图 6](/assets/img/posts/pingcode-6rbqd2/image-006.png)

`encodeURIComponent`

![encodeURI 和 encodeURIComponent 配图 7](/assets/img/posts/pingcode-6rbqd2/image-007.png)
