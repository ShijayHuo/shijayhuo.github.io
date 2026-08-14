---
layout: post
title: "玩转 RxJS 操作符——流程控制篇（二）"
date: 2023-07-18 18:36:23 +0800
categories: ["前端","框架"]
tags: ["RxJS"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/1jXsQA"
---

> 是学会再用，还是需要用到的时候再学？

从去年迷恋上了 RxJS，想起第一篇写的是《玩转 RxJS 操作符——流程控制篇（一）》，那时就已经规划了《篇二》大概要写什么，奈何我写文章全靠感觉和内心想表达的欲望，如果特别想写，马上就搞上一篇，冲动劲不够，能搁置个一年半载，这不，这篇从去年到今年（一整年）才完成 🎃

废话不多说了，上篇介绍的**串行操作符，**该篇就介绍几个**并行操作符。**

PS：各位哪里不熟看哪里，都会的当我没说😐 

#### forkJoin

功能上基本可以与 `Promise.all` 划等号的操作符。
