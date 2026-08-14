---
layout: post
title: "什么是插件"
date: 2023-05-12 17:22:36 +0800
categories: ["前端","架构"]
tags: ["富文本编辑器","架构"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/IdsxlQ"
---

> 插件（Plugin）是指一种可以增强或扩展已有软件功能的组件或模块。它们通常是以独立的方式编写，可以被动态地添加到主应用程序中，从而提供额外的功能和特性。
> 
>                                                             —— ChatGPT

个人理解：插件是一个相对的名词，它必须有一个主体容器/应用，其他独立的组件以插入的形式扩展主体容器/应用。

在 Slate 中，Editor 对象扮演着主体容器/应用的角色，提供核心功能，Plugins 是一个个插件，每个插件可以基于 Editor 提供的核心能力去扩展自己的功能/逻辑。

编辑器主体和插件的关系：

- 插件依赖于编辑器，无法单独使用
- 编辑器可以在没有插件的情况下运行，但功能将受到限制

![什么是插件 配图 1](/assets/img/posts/pingcode-idsxlq/image-001.png)
