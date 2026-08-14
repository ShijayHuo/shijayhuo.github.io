---
layout: post
title: "Slate Transform"
date: 2023-04-06 16:48:40 +0800
categories: ["前端","框架"]
tags: ["Slate","富文本编辑器"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/ciYBkK"
---

> 本篇目的：记录和夯实编辑器知识，因为全篇基本都是源码，所以也是为了方便日后直接从文章回顾这些 API。大家查漏补缺，同时文中有哪里理解的不对，望告知！

## 前言

> 这个环节结果问题的过程，有点长，觉得是废话的可以略过此节，建议有一个思考的问题可以看下。

前天解决的一个缺陷  ，比较容易的发现是 Selection 选区异常的问题（但我为了更加确定就是它导致的，后续却走了很多的弯路），所以后续要做的事情就是矫正 selection，仔细观察数据后，发现不仅是 selection 的 path 错了，offset 也不正确，正常 achor 的 offset 和 focus 的 offset 是不一样的，代表选了一块内容，现状是 三击选中了一块选区，但是 offset 都是 0，wtf ???

> 延伸一些更深的问题（杨大佬提出的）：selection 从哪里开始错的，是 Theia 主要改变过 selection 导致错的，还是这种情况底层 slate 就算错了，面对这个问题，此时我只能望洋兴叹，像一个蚂蚁面对一个石头）

最终解决问题的关键一行神秘代码，同时这一行代码背后隐藏了很多的逻辑：

```typescript
Transforms.select(editor, slateSelection.anchor.path);
```

当不知道 Editor.range API 之前的思路是：构造一个正确的 range，通过 setSelection 重写（伪代码）：

```typescript
const windowSelection = window.getSelection();
const focus = { path: selection.anchor.path, offset: windowSelection.achorNode.length }
Transforms.setSelection(editor, {achor: selection.anchor, focus: focus});
```

这种也解决了问题，主要是感觉不优雅，而且必须要说明为什么要取 `windowSelection.achorNode.length`，尽管我知道，但不代表其他人看到这个代码也知道，于是问了焕姐有没有内部现成解决这种的，焕姐说用 end 方法试一下（当然这个 API 我也不知道，照做就是了）：

```typescript
const focus = Editor.end(editor, selection.anchor);
Transforms.setSelection(editor, {achor: selection.anchor, focus: focus});
```

但是发现并不行，我看完源码之后才知道这个差一点儿就对了：

```typescript
const focus = Editor.end(editor, selection.anchor.path);
```

最终用的代码是上面说的 `Transforms.select`。

### 思考

考大家一下：

1. `Editor.end(editor, selection.anchor)` 和 `Editor.end(editor, selection.anchor.path)`有什么区别？
2. `Transforms.select(editor, slateSelection.anchor.path)`和 取 end + setSelection 有什么区别？（声明：这两种都可以解决）

```javascript
const focus = Editor.end(editor, selection.anchor.path); 
Transforms.setSelection(editor, {achor: selection.anchor, focus: focus});
```

OK，啰嗦完了，带着问题看下文吧  😏 

## Transforms.select

> 探索第二个问题，看 select 源码，发现这种情况下两种根本没区别......

该 API 封装在 slate selection 当中，看注释是用来设置 selection 的，再看代码，实际主要目的也是 setSelection 的，需要注意两点：

1. 多加了一步：Editor.range 重新获取 target，脑海的❓继续浮现。
2. 当没有 selection 的情况也可以设置新值，也就是说支持无选区设置 selection 的特性。

![Slate Transform 配图 1](/assets/img/posts/pingcode-ciybkk/image-001.png)

OK，重点就是 Editor.range 干了什么？继下文。

### Editor.range

这个函数的作用是根据 Location 得到一个 Range（得到选区的 *achor开始*和 *focus结束*）。

函数签名：`range(editor: Editor, at: Location, to?: Location): Range`

> Range 类型： Range => { anchor: Point, focus: Point}
> 
> Location 类型：Location => Path | Point | Range

虽然它只有 6 行，但我个人认为它并不“纯粹”，其逻辑如下：

1. 第一种情况：如果 at 是一个 range 并且没有传入 to，那么就直接返回 at
2. 第二种情况：at 不是 range（意味着可能是 Path 或 Point）
   
   1. 通过 `Editor.start(editor, at)` 取出 start
   2. 通过`Editor.end(editor, at)`取出 end
   3. 返回 { anchor: start, focus: end }
3. 第三种情况：传了 to（基本可以确定它是 Path），就通过 to 决定 End。

> `Editor.start`和 `Editor.end`下文会提到。

源码：

![Slate Transform 配图 2](/assets/img/posts/pingcode-ciybkk/image-002.png)

### Editor.start & Editor.end

这两个函数就一行代码，没有什么好讲的，属于是两个过渡函数，至于一行都要写一个函数，个人理解它是为了更纯粹，更加有语义话。

![Slate Transform 配图 3](/assets/img/posts/pingcode-ciybkk/image-003.png)

![Slate Transform 配图 4](/assets/img/posts/pingcode-ciybkk/image-004.png)

### Editor.point

函数签名：`point(editor: Editor, at: Location, options: EditorPointOptions = {}): Point`

主要逻辑：根据 path 或 range 找到第一个或最后一个点（取决于 options 是 start 还是 end）

返回值： `Point => {path: Path; offset: number}`

具体逻辑，分两种情况：

1. 当传入的 at 是 path：通过 `Node.last()` 或 `Node.first()`取到 path，通过 edge 选取返回结果**（edge 是 start，则 offset 是 0，如果 edge 是 end，则 offset 是 node.text.length）。**
2. 当 at 是 Range，则通过 `Range.edgs(at)`取出 start 或 end。

![Slate Transform 配图 5](/assets/img/posts/pingcode-ciybkk/image-005.png)

### Range.edges

函数签名：`edges(range: Range, options: RangeEdgesOptions = {}): \[Point, Point\]`

主要逻辑：根据**选取方向**返回一个带顺序的 Point 元组。

> Point 元组：\[Point, Point\]
> 
> options => { reverse: boolean }

具体逻辑（选取方向有点绕，需要注意）：

1. 一种是通过`Range.isBackward`achor 和 focus 的 offset 判断哪个是真正的 start 哪个是 end，比如倒着选取了 10 个字符，那么 achor offset 是 10，focus 的 offset 是 0，经过比较可判断出这是倒着选的
2. 如果 options 设置了 reverse 为 true（反向），那么基于第一种情况最终返回的是 `\[achor, focus\]`，意思是：它本身就是倒，调用者还想再倒，最终就会负负得正。

![Slate Transform 配图 6](/assets/img/posts/pingcode-ciybkk/image-006.png)

## Transforms.setSelection

这个函数的作用是通过 `edit.apply`的方式给 editor 设置 selection。

> 最底层应该是下图，apply 具体实现我也没看完，不过不是这里的重点，就先不展开解释了。
> 
> ![Slate Transform 配图 7](/assets/img/posts/pingcode-ciybkk/image-007.png)

重要的是`edit.apply`需要设置之前的属性和即将设置的属性传递给它，拼接属性的逻辑：

![Slate Transform 配图 8](/assets/img/posts/pingcode-ciybkk/image-008.png)

图上逻辑意味着 props 参数可以是一个完整的 Range 也可以是部分属性（这个逻辑是在看之前不太清楚的，使用的时候还猜测是要传全量还是部分，反过来讲从类型中也可以看得出来，但经验告诉我类型并不能完全可信）。

## 其他

看完这些源码明白这些 API 的逻辑之外，知道了插件机制的由来，还感受了其他的一些东西（看一种新/陌生东西的触动）。

#### 一些优点

1. 一个细节：slate 工具类是按照 26 个字母顺序排的，这样的好处是容易检索，transform 有一千多行代码
2. 函数编程的特点用的充分：
   
   1. 函数尽可能的短，大多数的函数都保持在 10 行，甚至更少。
   2. 函数的声明式，很多函数中实际只做了一两行的逻辑处理，然后就交给其他函数处理，这跟 lodash 源码极为相似

#### 一些缺点

1. 函数分布的碎，学习成本高，需要了解很多的 API，而且容易用串，常用的也许就几个
2. 有些函数还是不够纯粹，或并不完全遵循单一原则，依旧通过一些可选参数判断很多场景（不光是上面看到的一些）
