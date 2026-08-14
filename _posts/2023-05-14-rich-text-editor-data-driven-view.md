---
layout: post
title: "数据驱动视图"
date: 2023-05-14 21:54:41 +0800
categories: ["前端","架构"]
tags: ["富文本编辑器","架构"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/5Jgk-Y"
---

#### 数据结构

最核心字段：key、type、children。

例如一个段落

![数据驱动视图 配图 1](/assets/img/posts/pingcode-5jgk-y/image-001.png)

复杂一点的，如表格

![数据驱动视图 配图 2](/assets/img/posts/pingcode-5jgk-y/image-002.png)

#### 建立关系

暴露到上层的组件

![数据驱动视图 配图 3](/assets/img/posts/pingcode-5jgk-y/image-003.png)

> editor.children 是上面的数据
> 
> ![数据驱动视图 配图 4](/assets/img/posts/pingcode-5jgk-y/image-004.png)

slate-children 根据数据渲染多个插件。

![数据驱动视图 配图 5](/assets/img/posts/pingcode-5jgk-y/image-005.png)

如果插件是复杂结构的如表格，那么就需要在表格的插件中添加 slate-children 组件，否则不会如期渲染。

#### 渲染视图

##### 注册时机

每个插件去重写 editor.renderElement，逻辑是根据 type 是它自身，指定渲染当前组件。

![数据驱动视图 配图 6](/assets/img/posts/pingcode-5jgk-y/image-006.png)

##### 渲染时机

渲染在 `slate-descendant` 开始

![数据驱动视图 配图 7](/assets/img/posts/pingcode-5jgk-y/image-007.png)

![数据驱动视图 配图 8](/assets/img/posts/pingcode-5jgk-y/image-008.png)

![数据驱动视图 配图 9](/assets/img/posts/pingcode-5jgk-y/image-009.png)

##### 渲染子视图

![数据驱动视图 配图 10](/assets/img/posts/pingcode-5jgk-y/image-010.png)

数据（children、childrenContext）从哪里来？答案在 slate-angular 的 **BaseElementComponent**。

![数据驱动视图 配图 11](/assets/img/posts/pingcode-5jgk-y/image-011.png)
