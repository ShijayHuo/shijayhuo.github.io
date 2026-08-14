---
layout: post
title: "Slate 插件渲染机制"
date: 2023-05-18 18:29:03 +0800
categories: ["前端","框架"]
tags: ["Slate","富文本编辑器","架构"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/pYccNM"
---

#### 单个插件渲染流程

![插件渲染机制 配图 1](/assets/img/posts/pingcode-pyccnm/image-001.png)

#### 多插件

插件机制有一个关键的问题是：当注册了多个插件，如何正确的找出要渲染的哪个插件。

**插件的冒泡机制：先注册的插件会后执行，这很像数据结构中的“栈”，先入后出。比如，注册了三个插件 \[A, B, C\]，那么渲染时会优先取出 C，运行预渲染函数（renderElement），然后是 B，最后是 A，每个渲染函数中可以通过插件的类型与当前插件预定义的类型相比较，如果匹配则返回当前预定义插件对应的视图组件，否则流转到下一个插件，继续重复此逻辑**，如下图：

![插件渲染机制 配图 2](/assets/img/posts/pingcode-pyccnm/image-002.png)

##### 源码

![插件渲染机制 配图 3](/assets/img/posts/pingcode-pyccnm/image-003.png)
