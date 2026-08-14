---
layout: post
title: "DOM 位置计算的基础知识"
date: 2023-06-20 17:58:18 +0800
categories: ["前端","JavaScript"]
tags: ["JavaScript","HTML"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/ZywK1L"
---

### Element.getBoundingClientRect()

描述：获取当前元素的矩阵区域，返回元素的大小及其相对于视口的位置

返回值是一个 DOMRect 对象，具体属性如下

#### 使用

1. **获取到当前元素到窗口的距离**

```javascript
const rect = document.getElementById("app").getBoundingClientRect();
rect.top 	// 元素起点纵坐标到视口顶部的距离
rect.bottom // 元素底部(起点纵坐标+高度)到视口顶部的距离
rect.left	// 元素起点横坐标到视口左侧的距离
rect.right	// 元素右部(起点横坐标+宽度)到视口左侧的距离
```

![DOM 位置计算的基础知识 配图 1](/assets/img/posts/pingcode-zywk1l/image-001.png)

![DOM 位置计算的基础知识 配图 2](/assets/img/posts/pingcode-zywk1l/image-002.png)

如图，bottom 和 right 是我没有想到的，之前以为是底部/右侧距离窗口底部/右侧的距离，仔细想想计算都是按照起点位置算起的。

2. **获取当前元素的大小**

```javascript
rect.width // 元素的宽度
rect.height // 元素的高度
```

3. **获取当前元素的起始坐标**

```javascript
rect.x // 起始横坐标
rect.y // 起始纵坐标
```

#### 场景

获取一个坐标是否落在了当前元素区域内

```javascript
function checkIntoRectByPoint(element, x, y){
  const rect = element.getBoundingClientRect();  
  if(
    x > rect.x && x < rect.x + rect.width && 
    y > rect.y && y < rect.y + rect.height
  ){
    return true;
  }
  return false;
}
```

### Window.getComputedStyle()

描述：获取当前元素计算后的所有 css 属性值。

#### 使用

```javascript
window.getComputedStyle(element,pseudoElt)
```

注：pseudoElt，指定一个要匹配的伪元素的字符串。必须对普通元素省略（或`null`)

#### 场景

可以用来计算的属性：padding、margin、top、bottom、left、right、width、height、lineHight

### offsetXxx 系列

| 属性 | 描述 |
| --- | --- |
| offsetTop | 当前元素相对于其 `offsetParent` 元素的顶部内边距的距离 |
| offsetLeft | 当前元素的左外边框至offsetParent元素的左内边框之间的像素距离 |
| offsetHeight | 表示元素在水平方向上占用的空间大小，无单位(以像素px计) |
| offsetWidth | 返回当前元素*左上角*相对于`offsetParent` 节点的左边界偏移的像素值 |

![DOM 位置计算的基础知识 配图 3](/assets/img/posts/pingcode-zywk1l/image-003.png)

留两个小问题：为什么没有 offsetBottom 和 offsetRight 😈 

#### offsetParent

HTMLElement.offsetParent 返回指向最近的（指包含层级上的最近）包含该元素的定位元素或者最近的 table, td, th, body 元素。当元素的 style.display 设置为 "none" 时，offsetParent 返回 null。

*ps：这段概念包含了非常多的关键词，用词的精准，由于有些特殊场景我还没有用到，所以需要下面再扣一扣字眼，除概念外还有其他需要思考和注意的点，打算后面单独整理一篇 offsetXxx 系列。*

### **document.elementFromPoint()**

> **关联页面：** 一个可以扩展你思路的API - 前端
>
> API 介绍 document.elementFromPoint(x, y) 方法 elementFromPoint 返回给定坐标点下最上层的 element 元素。  如果指定的坐标点在文档的可视
