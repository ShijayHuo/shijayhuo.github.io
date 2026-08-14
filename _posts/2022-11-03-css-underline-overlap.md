---
layout: post
title: "解决文字和下划线的重叠问题"
date: 2022-11-03 10:00:59 +0800
categories: ["前端"]
tags: ["CSS"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/bLDGfV"
---

昨天做功能有个功能是这样的（设计图）：

![解决文字和下划线的重叠问题 配图 1](/assets/img/posts/pingcode-bldgfv/image-001.png)

实际最终是这样的：

![解决文字和下划线的重叠问题 配图 2](/assets/img/posts/pingcode-bldgfv/image-002.png)

可以看到二图的文字与下划线重叠了，这是最终产品要的效果，产品的理由是我们其他地方包括链接都是紧贴文字的，保证统一（当然这也没问题）如后台管理的链接：

![解决文字和下划线的重叠问题 配图 3](/assets/img/posts/pingcode-bldgfv/image-003.png)

如筛选组件：

![解决文字和下划线的重叠问题 配图 4](/assets/img/posts/pingcode-bldgfv/image-004.png)

如 Wiki 编辑器的下划线插件赋予文字的效果：

![解决文字和下划线的重叠问题 配图 5](/assets/img/posts/pingcode-bldgfv/image-005.png)

但个人感觉下图也许更为美观：

![解决文字和下划线的重叠问题 配图 6](/assets/img/posts/pingcode-bldgfv/image-006.png)

OK，无论怎样，我们都应该掌握一种实现上图效果的方法，经测试以下方案都实现了上图效果，见下节。

### 方案一（个人推荐）：text-underline-offset

#### 语法

```text
text-underline-offset: value;
```

#### Value 可选值

> 百分比和全局值本人还未使用过。

| 可选值 | 描述 |
| --- | --- |
| auto | 默认值，浏览器为下划线选择适当的偏移量 |
| 像素值（px 或 rem） | 指定下划线的偏移量为 `length`，覆盖字体文件建议的和浏览器默认的值。建议使用 `em` 单位，以便偏移量随字体大小缩放。 |
| percentage | 指定下划线的偏移量为元素的字体中 **1 em** 的百分比。百分比作为相对值继承，因此会随着字体的变化而缩放。在应用了此属性后，即使存在具有不同的字体大小或垂直对齐方式的子元素，偏移量在应用下划线的整个盒子内都是恒定的 |

> 同时也支持全局值：inherit、initial、revert、revert-layer、unset。
{: .prompt-tip }

#### 示例

> 代码还未提交，见[这里吧](https://developer.mozilla.org/zh-CN/docs/Web/CSS/text-underline-offset)

#### 浏览器支持情况

![解决文字和下划线的重叠问题 配图 7](/assets/img/posts/pingcode-bldgfv/image-007.png)

### 方案二：设置 border-bottom

这种方式是使用 padding + border-bottom，取巧间接实现使文本和下划线加上了间距，代码如下：

```javascript
.text {
	padding-bottom: 3px;
  	border-bottom: 1px;
}
```

#### 示例与效果

![解决文字和下划线的重叠问题 配图 8](/assets/img/posts/pingcode-bldgfv/image-008.png)

我们的导航组件用的这种方式

![解决文字和下划线的重叠问题 配图 9](/assets/img/posts/pingcode-bldgfv/image-009.png)

### 方案三：设置 box-shadow

原理跟 border-bottom 差不多，这种是在元素框架上加 1px 的阴影，间接实现了文本和下划线之间的间距。

#### 示例与效果

![解决文字和下划线的重叠问题 配图 10](/assets/img/posts/pingcode-bldgfv/image-010.png)

我在想，如果后续有这样的需求，是不是可以写成全局的 class。
