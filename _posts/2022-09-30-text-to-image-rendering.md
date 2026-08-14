---
layout: post
title: "文本绘图实现方案"
date: 2022-09-30 17:40:18 +0800
categories: ["前端","后端","架构"]
tags: ["文本绘图","架构"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/CbLUBl"
---

> 最适合程序员的绘图工具。

#### 前言

简介：以写代码/文本的形式绘制图表。

我本人之前是对文本绘图带有偏见的，因为我认为它相对于拖拽绘图有些逆潮流，拖拽不就是让绘图更简单吗，至少不用学习语法，但是我相信“既存在，即合理”，通过开发和使用过程中密切观察，逐渐地改变了自己的看法，总结它拥有的好处：

- 以逻辑表达图表：针对善于表达逻辑但审美不敏感人群
- 让”强迫症“患者不会再因为没有对齐，连线不够平滑等细节问题调上那么半天
- 表达程序逻辑方面更加的专业
- 建立统一认知，快速理解逻辑

以上文本绘图的优势描述的均是我不擅长的，以上描述可以看出这简直就是程序员量身打造的。

#### 简述

文本绘图支持四种语言，实现用了三种方案：

- PlantUML、Graphviz（服务端）
- Mermaid（前端）
- Flowchart（前端）

> 本着能用现成轮子，绝不自己写轮子的原则，我们最终选用了 3 个主流的库：[plantuml](https://github.com/plantuml/plantuml-server)、[mermaid](https://github.com/mermaid-js/mermaid)、[flowchart](https://github.com/adrai/flowchart.js) 。

![文本绘图实现方案 配图 1](/assets/img/posts/pingcode-cblubl/image-001.png)

#### PlantUML/Graphviz 实现方案（服务端）

实现流程（下图是我用时序图炫出来的😎 ）

```plant-uml
@startuml

autonumber

actor "用户" as User
participant "客户端" as Client
participant "服务端" as Server
participant "图片生成服务" as PictureServer

activate User

User -> Client: 编写语法
activate Client

Client -> Server: 将编码后的文本内容发送
activate Server

Server -> PictureServer: 鉴权，编码并转发至
activate PictureServer
PictureServer -> Server: 根据语法生成图片
deactivate PictureServer

Server -> Client: 将图片流返回
deactivate Server

Client --> User: 渲染图片

@enduml
```

##### 图片生成服务

目前市面上成熟的库是 plantuml-server，是 Java 写的，当然也有 Node 版本，但也只是在其身上包裹了一层，并不算真正意义上的重写，所以我们直接搭建了 Java 写的 plantuml-server 服务。

官方库地址：

- github: [https://github.com/plantuml/plantuml-server](https://github.com/plantuml/plantuml-server)
- 文档：[https://plantuml.com/zh/](https://plantuml.com/zh/)
- 语法手册：[https://plantuml.com/zh/guide](https://plantuml.com/zh/guide)

服务配置：

1. 检查环境：
   
   1. Java 1.8+ [dmg 下载 ](https://www.oracle.com/java/technologies/downloads/#jdk18-mac)或 `brew install openjdk`
   2. mvn 安装 `brew install mvn`
2. 部署服务，官方提供了现成的 Docker 镜像 ([plantuml-server](https://hub.docker.com/r/plantuml/plantuml-server)) `docker pull plantuml/plantuml-server`
3. 由于服务是公开的无法加鉴权，所以在应用内另外添加 API 做鉴权相关事项，然后调用 plantuml-server 服务生成图片（可以指定是 png 还是 svg）
4. 将图片转成流，将 plantuml-server 返回的 headers content-type 赋到 API 服务的 response headers 上返回给前端

搭建好的服务：

![文本绘图实现方案 配图 2](/assets/img/posts/pingcode-cblubl/image-002.png)

##### 前端展示图片

设置 img 的 src 为 API 的 URL。

![文本绘图实现方案 配图 3](/assets/img/posts/pingcode-cblubl/image-003.png)

> 注意：
> 
> 1. URL 必须是完整的（带协议和 IP）
> 2. 传输的 code 一定要转码，并建议用 encodeURIComponent 函数（encodeURI 不会转 # 号）
{: .prompt-warning }

##### 版本的坑

新版本有的字体和颜色系统可能没有，推荐用老版本

`docker pull plantuml/plantuml-server:jetty-v1.2021.16`

#### Mermaid

Mermaid 是我最爱最常用的，下图是我在准备技术分享中画的，这里有更多的示例：[https://at.pingcode.live/wiki/spaces/62e9e25cbf965ec412116b67/pages/6303613a7fc412f27f1a0706](https://at.pingcode.live/wiki/spaces/62e9e25cbf965ec412116b67/pages/6303613a7fc412f27f1a0706)

![文本绘图实现方案 配图 4](/assets/img/posts/pingcode-cblubl/image-004.png)

该功能是前端使用了一个 mermaid 库来实时生成 svg 的，这个库功能非常的丰富，支持甘特图，饼状图等等高级功能，部分功能还引用 D3.js 进行绘图，所以该库体积是较大的，库官方地址：

- github：[https://github.com/mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)
- 文档：[https://mermaid-js.github.io/mermaid](https://mermaid-js.github.io/mermaid)

##### 基本使用

该库提供一个 render API，将文本和回调传入，回调返回一个 svg 字符串。

使用 mermaid 完整流程：

1. 初始化 mermaid
2. 调用 render 函数，返回一个 svg 标签的 html
3. 把 html 编码成 base64,utf8（ASCII 不认中文）格式
4. 设置渲染区的 img 的 src

```typescript
@ViewChild('diagramViewer', { read: ElementRef })
diagramViewImage: ElementRef;

mermaid.render('graphDiv', this.code, (svgCode, bindFunctions) => {
    const encoded = encodeURIComponent(svgCode);
    this.diagramViewImage.nativeElement.src = `data:image/svg+xml;utf8,${encoded}`;
});
```

##### 简易封装

为了使用更简单，也为了可以在其他模块中使用 mermind，所以做了简易封装：

![文本绘图实现方案 配图 5](/assets/img/posts/pingcode-cblubl/image-005.png)

更简单的使用

![文本绘图实现方案 配图 6](/assets/img/posts/pingcode-cblubl/image-006.png)

#### Flowchart

flowchart 也是前端生成图片的，这个库也是调研中 star 最高的，使用最多的，体积相对于 Mermaid 轻量了许多，源码实现也只有 200行左右。

官方地址：

- github：[https://github.com/adrai/flowchart.js](https://github.com/adrai/flowchart.js)
- 文档：[https://flowchart.js.org/](https://flowchart.js.org/)

##### API 简介

**传入文本和容器id，绘制到 dom 中，而不是返回 svg 字符串，调用方主动渲染**。

1. 生成实例：`const instance = Flowchart.parse(text)`
2. 绘制到指定节点：`instance.drawSVG(id,options)`
   
   1. id 是父容器id
   2. options 是设置 SVG 的位置、颜色、大小、形状等样式
3. 擦除 svg`instance.clean()`

> 几个坑：
> 
> 1. id 必须保证唯一，若重复那么会绘制在第一个 id 的 dom 下。
> 2. `drawSVG`渲染是异步操作，但是 API 是同步写法，这就很容易脱离后续逻辑上流程控制。
> 3. `drawSVG` 每次会绘制新的 SVG 且不会自动清除上次绘制的 SVG，需要根据场景确定是否要清除，我们的场景是需要在每次绘制之前主动去清理上次绘制 SVG，不然会一直累加。
{: .prompt-warning }

##### 封装

鉴于以上的两个坑，封装就显得格外有意义了，至少避免了后续的调用者使用时格外的小心。

主要是针对清理和绘制的流程顺序做控制，各个 API 注释描述的很清楚，感兴趣的可以看下，这里不多解释了

![文本绘图实现方案 配图 7](/assets/img/posts/pingcode-cblubl/image-007.png)

重点是使用者应该如何用，灰常的简单

![文本绘图实现方案 配图 8](/assets/img/posts/pingcode-cblubl/image-008.png)

以上就是文本绘图的大体实现方案了，开发中还有很多细节上的坑，就不一一介绍了，最后欢迎使用文本绘图，有缺陷或不好用的地方可以随时反馈沟通 🤜 🤛。
