---
layout: post
title: "基于 Angular CDK 实现拖拽复制元素"
excerpt: "背景 有这样一个需求： 使用的是原生 CDK 拖拽组件，找了很久也没有找到拖拽复制的，基础示例是从一个容器拖拽进另一个元素之后，该元素会从原容器中删除，如下图 找了很久的资料，最终发现了官方有这样一个 issue: https://github.com/angular/components/issues/1310..."
date: 2023-04-05 10:01:19 +0800
categories: ["前端","框架"]
tags: ["Angular"]
source_platform: GitHub Pages
source_url: "https://aaaaaajie.github.io/2023/04/05/%E5%9F%BA%E4%BA%8EAngularCDK%E5%AE%9E%E7%8E%B0%E6%8B%96%E6%8B%BD%E5%A4%8D%E5%88%B6%E5%85%83%E7%B4%A0/"
source_repository: "https://github.com/ShijayHuo/aaaaaajie.github.io"
---

{% raw %}
<h2 id="背景">背景</h2>
<p>有这样一个需求：<br>
<img src="/assets/img/posts/aaaaaajie-12bec007/image-001.gif" alt=""></p>
<p>使用的是原生 CDK 拖拽组件，找了很久也没有找到拖拽复制的，基础示例是从一个容器拖拽进另一个元素之后，该元素会从原容器中删除，如下图<br>
<img src="/assets/img/posts/aaaaaajie-12bec007/image-002.gif" alt=""></p>
<p>找了很久的资料，最终发现了官方有这样一个 issue:  <a target="_blank" rel="noopener" href="https://github.com/angular/components/issues/13100">https://github.com/angular/components/issues/13100</a> ，里面就充分阐述了这个问题，可惜的是官方并没有给出解决方案，通过关联的 pull request 看到官方提供了一个工具函数：copyArrayItem，它只是在原有的交互上又给原容器加了一遍拖拽的元素，当元素从一个容器到另一个容器（不要松鼠标），它还是会删除原容器的元素，会给用户造成一些错觉，如图：</p>
<p><img src="/assets/img/posts/aaaaaajie-12bec007/image-003.gif" alt=""><br>
<img src="/assets/img/posts/aaaaaajie-12bec007/image-004.png" alt=""></p>
<h2 id="解决方案">解决方案</h2>
<p>这也是一个骚操作，思路是：拖拽的过程中用一个跟原容器一模一样的容器替代它，等拖拽结束后在恢复原视图，用一个状态来控制两个容器的隐藏/显示，这样的话在从一个容器移入新容器的整个过程中原容器会隐藏掉，也就是说这个容器的元素在被删除的一瞬间，用户的视觉下是看不到的，用户只能看到跟原容器一模一样的容器，而这个容器是静态的，元素从开始到最后都不会减少。</p>
<h3 id="代码">代码</h3>
<p><img src="/assets/img/posts/aaaaaajie-12bec007/image-005.png" alt=""><br>
效果图如文章第一节所示</p>
<h3 id="拓展">拓展</h3>
<h4 id="为什么不是只复制出这个元素而是复制整个容器呢？">为什么不是只复制出这个元素而是复制整个容器呢？</h4>
<p>因为删除这个动作是 dropList 控制的，数据也是容器控制的，进入新容器的一瞬间依旧会删除（cdk 内部控制的，不支持外部重写）。</p>
<h4 id="把-style-display-换成-ngIf-是否可行？">把 style.display 换成 ngIf 是否可行？</h4>
<p>不行，因为使用 ngIf 整个 dom 就都不会渲染了，那么拖拽组件就找不到宿主导致无法拖拽，使用 display，外层 dom 存在只是样式隐藏了，但是真实 dom 依旧存在。</p>
<h2 id="源码及示例">源码及示例</h2>
<p><a target="_blank" rel="noopener" href="https://stackblitz.com/edit/cdk-drag-drop-copy?file=src/app/cdk-drag-drop-connected-sorting-example.html">https://stackblitz.com/edit/cdk-drag-drop-copy?file=src/app/cdk-drag-drop-connected-sorting-example.html</a></p>
{% endraw %}
