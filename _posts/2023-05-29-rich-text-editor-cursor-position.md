---
layout: post
title: "光标是如何判断位置的？"
date: 2023-05-29 15:26:51 +0800
categories: ["前端"]
tags: ["富文本编辑器"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/6-khFC"
---

#### Slate Selection

slate 的 selection 是用来表示一个元素或节点的位置，结构如下：

![光标是如何判断位置的？ 配图 1](/assets/img/posts/pingcode-6-khfc/image-001.png)

它是基于原生 [DOM Selection API](https://developer.mozilla.org/zh-CN/docs/Web/API/Selection) 封装的，一些基础概念：

##### anchor

> 锚指的是一个选区的起始点。当我们使用鼠标框选一个区域的时候，锚点就是我们鼠标按下瞬间的那个点。在用户拖动鼠标时，锚点是不会变的**。**——MDN

##### focus

> 选区的焦点是该选区的终点，当您用鼠标框选一个选区的时候，焦点是你的鼠标松开瞬间所记录的那个点。随着用户拖动鼠标，焦点的位置会随着改变。——MDN

注意的一点是：**anchor 和 focus 的概念不能与选区的起始位置和终止位置混淆，因为 anchor 指向的位置可能在 focus 指向的位置的前面，也可能在 focus 指向位置的后面，这取决于你选择文本时鼠标移动的方向（也就是按下鼠标键和松开鼠标键的位置）**

##### path

slate 中 path 的类型：`type Path = number\[\];`，它是一个描述元素的路径。

看一个例子：

![光标是如何判断位置的？ 配图 2](/assets/img/posts/pingcode-6-khfc/image-002.png)

![光标是如何判断位置的？ 配图 3](/assets/img/posts/pingcode-6-khfc/image-003.png)

![光标是如何判断位置的？ 配图 4](/assets/img/posts/pingcode-6-khfc/image-004.png)

- 第一张图，path:\[0,0\]，无论光标在 1、2、3、4、5、6 它的 path 都是 \[0, 0\]
- 第二张图光标落在行内代码上时，发现 path 变了，变成了 \[0, 1, 0\]
- 第三张图光标落在分隔线元素上，path 是 \[1, 0\]

根据以上结果可以推出，**path 第一位是第几行或者独占整行的块级元素，第二位是第几行的第几个元素（不是第几个光标），第三位是指嵌套的元素，**比如表格中的列填充的就是第三位。

##### offset

指元素的偏移位置，从上面第一张图中还可以看到起始 offset 是 3，结束 offset 是 6，可以推出 offset 指元素的第几个位置，path + offset 可以描述出起始或结束的点，achor + focus 表示从第几个元素第几个位置选到第几个元素第几个位置。

#### **Selection 是如何构造出来的？**

通过原生的 Selection API 的数据观察，我们很容易知道 offset，如图中的 anchorOffset 和 focusOffset：

![光标是如何判断位置的？ 配图 5](/assets/img/posts/pingcode-6-khfc/image-005.png)

转换成 Slate Selection：

```javascript
{ 
  anchor: {	offset: 9 },
  focus: { offset: 9 }
}
```

再从上面数据中观察，并没有找到是第几行的信息，为什么？

行的信息也是比较复杂且灵活的，比如：第二行插入了表格元素，该元素本身就是独占整行，它是第二行，那么表格里的第一行该如何表示呢？我个人猜测原生 API 应该也不知道如何表示，所以把这个问题交给开发者定义，也就有了上述的一些规则，下面从代码层面仔细讲解这个行（path）是如何构建出来的。

##### 基于插件结构定规则

selection 的 path 是根据插件数据结构为基础构建的，在另一篇文章讲到的表格数据结构例子：

![光标是如何判断位置的？ 配图 6](/assets/img/posts/pingcode-6-khfc/image-006.png)

那么数组的第一个元素的默认就是第一行（path 为 0），表格元素的第一行是 (0,0)，第二行是 (0,2)。

##### 实现规则

1. 渲染元素时，记录元素和索引。
2. **当前元素开始从缓存的元素和索引中向上找，找到一级就向 path 数组的开头，临界终止条件：找至顶层。**

![光标是如何判断位置的？ 配图 7](/assets/img/posts/pingcode-6-khfc/image-007.png)

![光标是如何判断位置的？ 配图 8](/assets/img/posts/pingcode-6-khfc/image-008.png)
