---
layout: post
title: "插件注册流程"
date: 2023-05-18 14:15:59 +0800
categories: ["前端","架构"]
tags: ["富文本编辑器","架构"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/mMq_tX"
---

### 概览

![插件注册流程 配图 1](/assets/img/posts/pingcode-mmq-tx/image-001.png)

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

![插件注册流程 配图 2](/assets/img/posts/pingcode-mmq-tx/image-002.png)

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

![插件注册流程 配图 3](/assets/img/posts/pingcode-mmq-tx/image-003.png)

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

![插件注册流程 配图 4](/assets/img/posts/pingcode-mmq-tx/image-004.png)

### 构建/声明插件

上面 withTheia 和 withAngular 已经展示了一个插件的声明流程，那么插件需要到底做了什么事：

1. 重写和拦截编辑器对象（editor）提供的能力
2. 返回编辑器对象，供下一个插件使用继续流转

#### 示例

![插件注册流程 配图 5](/assets/img/posts/pingcode-mmq-tx/image-005.png)

### 组合/装载插件

如：`withInlines(withHistory(withAngular(createEditor())))`，最终的 editor 是所有插件的并集。

theia 中组合插件

![插件注册流程 配图 6](/assets/img/posts/pingcode-mmq-tx/image-006.png)

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
