---
layout: post
title: "CSS3 你需要了解的颜色特性"
date: 2022-11-28 10:11:36 +0800
categories: ["前端"]
tags: ["CSS"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/eQYdD-"
---

## 一、基础知识

> 这部分不读也不会妨碍撸代码，但是很有趣！

### Web 页面安全色

有时候我们发现同一种颜色在不同平台、不同浏览器下看到效果不一定相同（每种环境都有自己的调色板），产生的效果没有达到用户的预期，体验必然有所影响，为了解决这个问题，Netscape 根据人们意愿设计出了 216 种颜色为 Web 页面安全色。

> Mac 和 Windows 各有 256 种颜色，其中有 40 种显示的效果不一样，所以能安全使用的只有216色。
{: .prompt-tip }

### RGB 三原色

RGB 是红（Red）、绿（Green）、蓝（Blue）英文单词首字母的组合，三原色是工业界的一种颜色标准，其他的各种颜色是通过这三种颜色叠加得到的，这些颜色几乎包括人类实力所能感知的所有颜色，是目前运用最广的颜色系统之一，而上面所说到的 Web 页面安全色也是基于三原色之上设计的。

### 颜色的表现形式

颜色的表现形式有 16 进制表示法和颜色关键字表示法。

#### 16 进制表示法

16 进制 00 表示 0 状态，没有颜色，也是黑色，同理绿色 00、蓝色 00，这三种颜色色组合起来就是 6 位：00 00 00，表示黑色，相反 FFFFFF 就表示白色。16 进制表示的颜色最大为 0～255，也就是 256 种颜色。

#### 关键字表示法

关键字只是 16 进制颜色的别称，为了更有语义化的表示，到目前为止 color 属性支持 148 个关键字（详细看[这里](https://demo.cssworld.cn/new/3/9-1.php)）。

![CSS3 你需要了解的颜色特性 配图 1](/assets/img/posts/pingcode-eqydd/image-001.png)

### HSL 颜色模式

HSL 是色调（Hue）、饱和度（Saturation）、亮度（Lightness）英文单词首字母的组合，其他颜色是通过这三个元素叠加混合而成的，HSL 与 RGB 一样几乎包括人类视力所能感知的所有颜色，目前运用最广的颜色系统之一，其中色调 0 度是红色，120 度是绿色，240 度为蓝色，饱和度（S）可以取值（0 ～ 100%），0 表示灰度（没有改颜色），100% 表示最鲜艳，亮度（L），可以取值（0 ～ 100%），其中 0 最暗（黑色），100% 最亮（白色）。

![CSS3 你需要了解的颜色特性 配图 2](/assets/img/posts/pingcode-eqydd/image-002.png)

## 二、CSS3 透明属性与颜色模式

### opacity 透明属性

opacity 是用来设置透明度的，但它本身的名字却是不透明度的意思，所以值越大代表越不透明，可选值是 0 ～ 1.0（可以小数点一位的浮点数），还有一个 `inherit`。

### RGBA 和 HSLA 颜色模式

RGBA 和 HSLA 是在 RGB 和 HSL 的基础上增加了可以控制透明度的`alpha`参数，取值范围是 0 ～ 1 或 0 ～ 100% 之间，值越大，越不透明。

> alpha 通道和 opacity 属性的区别：
> 
> - opacity 只能给整个元素设置一个透明度，并且透明度会继承给其后代元素。
> - alpha 通道可以使用 `transparent` 属性给元素设置完全透明色，相当于 alpha 通道的 0 值。
{: .prompt-tip }

#### 语法

基本语法：`rgba(r, g, b, a)`、`hsla(h, s, l, a)`。

极致自由的新语法（以下语法不考虑 IE）：

- `rgb`和 `rgba` 函数语法互通，均支持 3 到 4 个参数：
   
   - `rgb(0, 0, 0, 1)`
   - `rgba(0, 0, 0)`
- `hsl` 和 `hsla` 函数语法互通，同上：
   
   - `hsl(0, 0%, 0%, 1)`
   - `hsla(0, 0%, 0%)`
- `rgb`函数中的数值可以是小数：
   
   - `rgb(11.11, 22.2, 0)`
   - `rgb(1e2, .5e1, .5e0, +.25e2%)`
- `hsl` 函数色调可以任意角度单位：
   
   - `hsl(270deg, 60%, 70%)`
   - `hsl(3.1415926rad, 60%, 70%)`、`hsl(.75turn, 60%, 70%)`。
- `rgb` 和`hsl`函数语法中的逗号可以省略：
   
   - `rgb(255 0 0)`
   - `hsl(270 60% 70%)`
- 斜杠语法： 
   
   - `rgb(255 0 153 / 1)`
   - `hsl(270 60% 50% / .15)`

语法虽多且有效，个人建议还是用**全逗号或空格语法，**不为别的**，建立共识，提高可读性，杜绝花里胡哨**。

### 颜色选择器（color-picker）相关设计

> 作者应该是陈孟孟同学，呱唧呱唧 👏

![CSS3 你需要了解的颜色特性 配图 3](/assets/img/posts/pingcode-eqydd/image-003.png)

- Rgba 对象
   
   ![CSS3 你需要了解的颜色特性 配图 4](/assets/img/posts/pingcode-eqydd/image-004.png)
- color 配色表，关键字 => rgba，定义了 148 种

![CSS3 你需要了解的颜色特性 配图 5](/assets/img/posts/pingcode-eqydd/image-005.png)

![CSS3 你需要了解的颜色特性 配图 6](/assets/img/posts/pingcode-eqydd/image-006.png)

![CSS3 你需要了解的颜色特性 配图 7](/assets/img/posts/pingcode-eqydd/image-007.png)

- hsla 与 rgba 相互间的换算函数（每种转换规则都不一样，涉及较多，个人从各种资料中大概过了一遍，要讲的话篇幅较长，大家自行查看组件库代码或搜索相关资料吧）
   
   ![CSS3 你需要了解的颜色特性 配图 8](/assets/img/posts/pingcode-eqydd/image-008.png)
- color-picker，有了以上三块核心内容的支撑，剩下的交互与平常组件无异，不再多说了。

## 最后

希望这是一篇有意思的文章，也希望予大家有所帮助，至此，over！

## 参考

- 《CSS 新世界》—— 张鑫旭
- 《图解 CSS3》—— 大漠
- [颜色关键字列表](https://demo.cssworld.cn/new/3/9-1.php)
- [216 中 Web 安全色](https://www.shejidaren.com/examples/tools/websafecolors/)
