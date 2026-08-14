---
layout: post
title: "Wiki 揭秘编辑器"
date: 2023-05-18 17:21:20 +0800
categories: ["前端","架构"]
tags: ["富文本编辑器","架构"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/-UAYck"
---

## 编辑器简介

### 编辑器演进关系

Wiki 编辑器 <- Theia 编辑器 <- Slate-angular <- Slate

#### Wiki 编辑器

成熟的富文本编辑器：功能丰富（大而全），包含：

1. 富文本编辑能力（加粗、斜体、下划线、删除线等）
2. 格式化工具（格式刷、水平对齐、垂直对齐等）
3. 高级插件（思维导图、折叠列表、公式、表格、文本绘图等）
4. 各子产品的联动插件：（关联工作项/列表、关联页面/树、关联测试用例/列表等）

#### Theia 编辑器

轻量富文本编辑器：目前应用于业务组件库富文本组件和部分子产品，提供了基础插件：

1. 基本编辑能力（文本、列表、格式对齐、引用等）
2. 高级的工具栏触发配置（全局工具栏、行内工具栏、‘/’ 唤起）
3. 多插件装载机制

#### Slate-angular

基于 Slate 扩展 Angular 视图层框架，提供的能力：

1. 提供插件的组件渲染机制
2. 重写和扩展编辑器核心编辑能力
3. 提供更丰富的事件监听
4. 提供更丰富工具函数

#### Slate

提供核心编辑器和插件扩展机制，可定制的富文本编辑框架，提供的能力：

1. 制定文档结构规范：支持嵌套文档模型
2. 灵活的插件机制：可定制可移植的独立插件，编辑器的核心都是以插件的方式创建的
3. 协同编辑基础方案：数据模型、交互方案
4. 丰富的工具函数：基于原生 DOM API 的封装的函数、操作文档数据的函数

## 插件机制

### 什么是插件

> 插件（Plugin）是指一种可以增强或扩展已有软件功能的组件或模块。它们通常是以独立的方式编写，可以被动态地添加到主应用程序中，从而提供额外的功能和特性。
> 
>                                                             —— ChatGPT

个人理解：插件是一个相对的名词，它必须有一个主体容器/应用，其他独立的组件以插入的形式扩展主体容器/应用。

在 Slate 中，**插件是一等公民**，连编辑器都是以插件的形式创建的，其中编辑器对象扮演着主体容器/应用的角色，提供核心功能，**每个插件可以基于 Editor 提供的核心能力去拦截改写或扩展自己的功能/逻辑**。

编辑器主体和插件的关系：

- 插件依赖于编辑器，无法单独使用
- 编辑器可以在没有插件的情况下运行，但功能将受到限制

![揭秘编辑器 配图 1](/assets/img/posts/pingcode-uayck/image-001.png)

### 插件生命周期

![揭秘编辑器 配图 2](/assets/img/posts/pingcode-uayck/image-002.png)

### 注册插件流程

![揭秘编辑器 配图 3](/assets/img/posts/pingcode-uayck/image-003.png)

### 创建编辑器

#### Slate createEditor

createEditor 是 Slate 提供的创建编辑器对象的函数，编辑器对象的重要性相当于一个系统的核心，后面所有的插件注册/声明部分也都必须返回该对象，插件在运行过程中执行完当前插件的逻辑，最终也需要流转到该对象提供的核心函数上。

##### 核心能力

1. 数据操作：
   
   1. 插入节点/文本（insertNode、insertText）
   2. 删除（delete）
   3. 文本数据操作（apply）
   4. 插入或替换文本、节点（insertFragment）
   5. 装饰文本（addMark）
2. 数据变化：onChange
3. 检查元素类型：空元素（isVoid）、行内元素（isInline）
4. 属性：选区（selection）、动作/操作（operations）、子数据（children）

##### 源码预览

![揭秘编辑器 配图 4](/assets/img/posts/pingcode-uayck/image-004.png)

##### 使用

```javascript
import { createEditor } from 'slate';
const editor = createEditor();
editor.insertText('哈哈哈');
```

#### Slate-angular withAngular

> 1. 以 withXxx 命名的一般为插件
> 2. withAngular 本身也是一个插件

withAngular 是 Slate-angular 内置插件，介于框架的限制，该插件大致上做了两件事：

1. 对于 Slate 部分函数进行了重写（比如 onChange）
2. 扩展额外的一些能力

##### 核心能力

1. 重写数据操作函数：插入、删除、复制/粘贴板（insertFragment、setFragment）
2. 数据变化通知（onChange）
3. 基础 DOM 事件：onkeydown、onclick
4. 检查元素类型（isBlockCard）
5. 错误处理（onError）

##### 源码预览

![揭秘编辑器 配图 5](/assets/img/posts/pingcode-uayck/image-005.png)

##### 使用

```javascript
import { createEditor } from 'slate';
import { withAngular } from 'slate-angular';

const editor = withAngular(createEditor());
```

#### Theia withTheia

基于 Slate-angular 进行扩展和复写 editor 对象，提供了更多的特性，同时基于 Worktile 和 PingCode 业务封装了一些更复杂的逻辑。

##### 核心能力

1. 多插件自动组合注册（combinePlugins）
2. 支持插件的渲染自定义组件（renderElement）
3. 更多的事件：globalMousedown

##### 源码预览

![揭秘编辑器 配图 6](/assets/img/posts/pingcode-uayck/image-006.png)

### 构建/声明插件

上面 withTheia 和 withAngular 已经展示了一个插件的声明流程，那么插件需要到底做了什么事：

1. 重写和拦截编辑器对象（editor）提供的能力
2. 返回编辑器对象，供下一个插件使用继续流转

#### 示例

![揭秘编辑器 配图 7](/assets/img/posts/pingcode-uayck/image-007.png)

### 组合/装载插件

如：`withInlines(withHistory(withAngular(createEditor())))`，最终的 editor 是所有插件的并集。

theia 中组合插件

![揭秘编辑器 配图 8](/assets/img/posts/pingcode-uayck/image-008.png)

#### 示例

```javascript
this.editor = withTheia(
  withHistory(
    withAngular(
      createEditor(),
      CLIPBOARD_FORMAT_KEY)
  ), plugins
);
```
