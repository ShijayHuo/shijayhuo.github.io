---
layout: post
title: "Slate Selection"
date: 2023-03-30 09:37:48 +0800
categories: ["前端","框架"]
tags: ["Slate","富文本编辑器"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/ByFAzO"
---

### Selection/Range

selection 代表一个概念：选区，Range 在 slate 中代表 selection 的类型，表示选区连续的范围。

在 slate 中的定义：`Range`objects are a set of points that refer to a specific span of a Slate document.  They can define a span inside a single node or a can span across multiple nodes.

译：Range 对象是一组指向 Slate 文档特定范围的点。它们可以在单个节点内定义跨度，也可以跨多个节点定义跨度。

根据以上的定义很模糊，并不能够完全理解它，但是从代码的类型定义总结出它由以下元素构成：

![Slate Selection 配图 1](/assets/img/posts/pingcode-byfazo/image-001.png)

### anchor/focus

#### anchor

> 锚指的是一个选区的起始点。当我们使用鼠标框选一个区域的时候，锚点就是我们鼠标按下瞬间的那个点。在用户拖动鼠标时，锚点是不会变的**。**——来自 MDN

#### focus

> 选区的焦点是该选区的终点，当您用鼠标框选一个选区的时候，焦点是你的鼠标松开瞬间所记录的那个点。随着用户拖动鼠标，焦点的位置会随着改变。——来自 MDN

在 slate 中，anchor 或 focus 由 path 和 offset 联合确定出一个点的位置。

### path

slate 中 path 的类型：`type Path = number\[\];`，它是一个描述元素的路径。

注释中的介绍：

> `Path` arrays are a list of indexes that describe a node's exact position in a Slate node tree. Although they are usually relative to the root `Editor`object, they can be relative to any `Node` object.

译：路径数组是描述节点在 Slate 节点树中的确切位置的索引列表。尽管它们通常相对于根 Editor 对象，但它们也可以相对于任何Node对象。

从实际例子中更容易理解：

![Slate Selection 配图 2](/assets/img/posts/pingcode-byfazo/image-002.png)

![Slate Selection 配图 3](/assets/img/posts/pingcode-byfazo/image-003.png)

![Slate Selection 配图 4](/assets/img/posts/pingcode-byfazo/image-004.png)

- 第一张图，path:\[0,0\]，无论光标在 1、2、3、4、5、6 它的 path 都是 \[0, 0\]
- 第二张图光标落在行内代码上时，发现 path 变了，变成了 \[0, 1, 0\]
- 第三张图光标落在分隔线元素上，path 是 \[1, 0\]

根据以上结果可以推出，**path 第一位是第几行或者独占整行的块级元素，第二位是第几行的第几个元素（不是第几个光标），第三位是指嵌套的元素，**比如表格中的列填充的就是第三位，再往后可能是更复杂的元素吧，还没有探究......

### offset

指元素的偏移位置，从上面第一张图中还可以看到起始 offset 是 3，结束 offset 是 6，可以推出 offset 指元素的第几个位置，path + offset 可以描述出起始或结束的点，achor + focus 表示从第几个元素第几个位置选到第几个元素第几个位置。

### 其他

- 获取光标位置：`editor.selection.achor`
- 获取下个位置：`Path.next(当前 path)`
- 获取父元素位置：`Path.parent(当前 path)`
- 通过 path 确定当前节点：`Node.get(path)`
- 根据 path 在指定容器获取 Node 祖先元素：`Node.ancestors(container, path)`

更多操作待考察。

更多概念：

- [https://doodlewind.github.io/slate-doc-cn/reference/slate/selection.html](https://doodlewind.github.io/slate-doc-cn/reference/slate/selection.html)
- [https://developer.mozilla.org/zh-CN/docs/Web/API/Selection](https://developer.mozilla.org/zh-CN/docs/Web/API/Selection)
