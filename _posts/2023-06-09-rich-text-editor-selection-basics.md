---
layout: post
title: "富文本编辑器那些事儿——选区"
excerpt: "本文是编辑器底层 Web JS API 的第二篇，主题是继上篇那些好奇点中的选区那些事儿，选区是编辑器核心中的核心。"
date: 2023-06-09 15:41:18 +0800
categories: ["前端","JavaScript"]
tags: ["富文本编辑器","JavaScript"]
source_platform: Juejin
source_url: "https://juejin.cn/post/7242539077849432123"
---

{% raw %}
本文是编辑器底层 Web JS API 的第二篇，主题是继上篇那些好奇点中的选区那些事儿，**选区是编辑器核心中的核心**。

### HTML contenteditable 属性

> 一个与主题无关的开胃小菜

这个属性非常的简单，却非常的神奇，枚举值只有 true 和 false，该属性表示当前宿主 DOM 是否可被编辑。

![image.png](/assets/img/posts/juejin-7242539077849432123/image-001.png)

### Selection API

> 重中之重，编辑器的基石之一，温馨提示：不想过多关注的可以只看加粗的特性。

#### Selection 对象

该对象代表页面中的文本选区，可能横跨多个元素 —— MDN。

![image.png](/assets/img/posts/juejin-7242539077849432123/image-002.png)

该对象通过  `window.getSelection()`  或  `document.getSelection()`  获得。

该对象提供的能力可以解决编辑器中的大部分问题（我们日常很多操作就是在操作选区，但用的都是上层封装好的函数）：

*   定位光标位置
*   给选中的文字/元素加样式
*   添加、修改、删除选中元素
*   ......

#### 两个重要概念

1.  **anchor（锚点）**  ：锚指的是一个选区的起始点。当我们使用鼠标框选一个区域的时候，锚点就是我们鼠标按下瞬间的那个点。在用户拖动鼠标时，锚点是不会变的  \*\*。                                                                                                                        \*\*  —— MDN
2.  **foucs（焦/终点）**  ：选区的焦点是该选区的终点，当您用鼠标框选一个选区的时候，焦点是你的鼠标松开瞬间所记录的那个点。随着用户拖动鼠标，焦点的位置会随着改变。                                                                                                  —— MDN
3.  **offset（偏移位置）**  ：描述选区起/终在节点的偏移位置。
4.  type：描述当前选区的类型，只读属性，可枚举的值：
    1.  None：没有选择。
    2.  Caret：选区已折叠（光标和字符之间，但没有选中任何字符）。
    3.  Range：选中了一个范围。

其他的属性和方法都是围绕这几个概念：

*   anchorNode： 选区起点所在节点。
*   anchorOffset：选区起点所在节点的位置偏移量。
*   focusNode：选区终点所在节点。
*   focusOffset：选区终点所在节点的位置偏移量。

一个有意思的点：  **offset 会随鼠标选中顺序改变，比如从右到左选中，那么 anchorOffset 和 focusOffset 的位置是置换的**  ，下图例：

![image.png](/assets/img/posts/juejin-7242539077849432123/image-003.png)

*   isCollapsed：判断选区起始点和终点是否在同一个位置。  **实际开发中用它来判断是否选中元素**  。

一些实用的方法：

*   extend：将选区焦点移动到特定位置。
*   modify：修改当前选区。
*   containsNode：判断某一个节点是否为当前选区的一部分。
*   range 系列（下节详细讲到）：
    *   getRangeAt：获取选区包含指定区域的引用。
    *   removeRange：从选区移除区域。
    *   addRange：将一个区域加入选区。

**事件：onselectionchange，当选区发生变化时触发。**

### Range API

range 表示一个包含节点与文本节点的文档片段。

一些属性：

*   collapsed：选中范围的起始位置和终止位置是否相同。
*   startContainer：包含 range 起点的节点。
*   startOffset：包含 range 起点节点的位置。
*   endContainer：包含 range 终点的节点。
*   endOffset：包含 range 终点节点的位置。

获取 range：

*   `document.createRange()`
*   `selection.getRangeAt()`
*   `document.caretRangeFromPoint()`
*   `new Range()`

实用方法：

*   insertNode：在 range 其实位置插入节点。
*   selectNode：将 range 设置为包含整个 Node。
*   setStart：设置 range 开始位置。
*   setEnd：设置 range 结束位置。
*   deleteContents：移除 range。

一个例子：

    // 获取段落元素
    const paragraph = document.querySelector('p');

    // 创建一个 Range 对象，插入指定位置
    const range = document.createRange();
    range.setStart(paragraph.firstChild, 5);
    range.setEnd(paragraph.firstChild, 10);

### Selection 和 Range 有何区别？

Selection 对象和 Range 对象都是用于表示文档中的文本范围，但它们的用途不同。

**总的来说，Selection 对象和 Range 对象都是用于表示文本范围的对象，但 Selection 对象更关注用户选择的文本，而 Range 对象更关注文本范围的操作和获取信息**  。

具体的：

*   Selection 对象通常用于处理用户选择的文本，比如获取选中文本的内容、修改选中文本的样式或内容等，而且 Selection 对象包含一个或多个 Range 对象，就是说选中了多个文档片段。
*   Range 对象可以用于对文本进行操作，比如删除、替换、插入文本等，还可以用于获取文本范围的信息，比如获取范围内的文本、获取范围的开始和结束节点等。
*

所以，我们在修改选区和操作文档片段的流程是：

![image.png](/assets/img/posts/juejin-7242539077849432123/image-004.png)

### 结束

好吧，当时啃这块确实犯困过几次，底层就是这么索然无味，还很烧脑。下一篇，准备写实战中如何构建选区的，敬请期待。

文章中如果有勘误，还希望大家指正 🤝
如果觉得写的不错的话，可以点个赞哦 🌹

原文同步于 [github 这里](https://github.com/aaaaaajie/richtext-editor-posts/issues/4)

### 参考

*   <https://developer.mozilla.org/zh-CN/docs/Web/API/Window/getSelection>
*   <https://developer.mozilla.org/zh-CN/docs/Web/API/Range>
{% endraw %}
