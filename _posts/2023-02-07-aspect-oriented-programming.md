---
layout: post
title: "谈面向切面编程—AOP"
excerpt: "第一次听说 AOP 这个概念大概还是在 5 年前，那时还是一个 Java 小白，只赚了个耳熟，这些年倒比较理解了，但并没有好好总结一篇，最近又看到相关话题，大家存在分歧有些争论，都多少有些片面，这里个人也大言不惭，谈一下 AOP。 什么是 AOP AOP 为 Aspect Oriented Programming..."
date: 2023-02-07 11:43:30 +0800
categories: ["后端","架构"]
tags: ["AOP","架构"]
source_platform: GitHub Pages
source_url: "https://aaaaaajie.github.io/2023/02/07/%E5%88%87%E9%9D%A2%E7%BC%96%E7%A8%8B/"
source_repository: "https://github.com/ShijayHuo/aaaaaajie.github.io"
mermaid: true
---

{% raw %}
<p>第一次听说 AOP 这个概念大概还是在 5 年前，那时还是一个 Java 小白，只赚了个耳熟，这些年倒比较理解了，但并没有好好总结一篇，最近又看到相关话题，大家存在分歧有些争论，都多少有些片面，这里个人也大言不惭，谈一下 AOP。</p>
<h2 id="什么是-AOP">什么是 AOP</h2>
<p>AOP 为 Aspect Oriented Programming 的缩写，意为：面向切面编程，是一种把系统分为多个关注点（切面）解决问题的思维。</p>
<p>有很多资料说 AOP 是 OOP 的补充，而个人认为此观点有些局限，对面向对象语言工作者来说，OOP 是把系统当作多个对象之间的交互，AOP 把这些分解成不同关注点，帮助解决了问题，然而 AOP 不光只针对 OOP 来讲的，同样面向过程编程有些短板也可以用 AOP 来补充的，所以我们应该明确的观点是 AOP 是独立于其他编程模式之外的，不只是某一种编程模式的补充。</p>
<blockquote>
<p>AOP 产生于 1997 年的欧洲面向对象编程大会（ECO0P97）上，施乐公司 PaloAlto 研究中心首席科学家、大不列颠哥伦比亚大学教授 GregorKiczales 等人首次提出了 AOP 的概念，此后每年的 ECOOP 上都有AOP相关的专题研讨会，各大公司、大学、研究机构纷纷投入人员进行研究。2001 年 3 月 15 日，PaloAlto 研究中心发布了首种支持 AOP 的语言，AspectJ。</p>
</blockquote>
<h2 id="AOP-核心思想">AOP 核心思想</h2>
<h3 id="什么是切面（Aspect）">什么是切面（Aspect）</h3>
<p>AOP 最重要的关键词是 Aspect（切面），所谓的 Aspect，从设计上讲，是横切系统的关注点，这里又产生了一个新名词“横切”，为什么不是竖切？<strong>从历史来讲，传统的面向过程和面向对象中的继承都是自顶向下的编程范式</strong>，例如：</p>
<pre><code class="language-mermaid">graph TD;
    出门-->看电影;
    看电影-->回家;
    接收请求-->业务逻辑;
    业务逻辑-->响应;
    爷-->父;
    父-->子;
    人--> 黄种人;
    黄种人--> 中国人;</code></pre>
<p>拿服务端处理请求的逻辑来讲，有 n 个请求，都要走<strong>接收请求-&gt;处理业务逻辑-&gt;响应</strong>这样的逻辑，这里面必然有很多的其他环节，比如<strong>每个请求验证登录状态，在业务逻辑前后加日志显示耗时</strong>…</p>
<pre><code class="language-mermaid">flowchart TB
    req1(接收请求)-->state1(验证登录状态)-->logic1(业务逻辑)-->log1(日志显示耗时)-->res1(响应);
    req2(接收请求)-->state2(验证登录状态)-->logic2(业务逻辑)-->log2(日志显示耗时)-->res2(响应);
    req3(接收请求)-->state3(验证登录状态)-->logic3(业务逻辑)-->log3(日志显示耗时)-->res3(响应);
    reqn(接收请求)-->staten(验证登录状态)-->logicn(业务逻辑)-->logn(日志显示耗时)-->resn(响应);

    state1-.-state2-.-state3-.-staten;

    log1-.-log2-.-log3-.-logn;

    style state1 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    style state2 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    style state3 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    style staten fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    
    style log1 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    style log2 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    style log3 fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;
    style logn fill:#bbf,stroke:#f66,stroke-width:2px,color:#fff,stroke-dasharray: 5 5;</code></pre>
<p>遇到这种情况时，一种是比较简单，在每个过程前后都写一遍上述逻辑，或者复制粘贴，但这依旧显得有些“蠢笨”，而且后期维护也是个大问题，所以<strong>正确的思路是提取出来此逻辑</strong>，然后在需要的地方动态注入此逻辑，这个做法在如今已经是很常见的了，大家也在大多数场景下形成了这种意识，而这个切点就是“验证登录状态”、“写日志”，多个切点（虚线）连接的面独立于纵向程序之外形成横切面。</p>
<h3 id="代码联结">代码联结</h3>
<blockquote>
<p>代码联结是指对输入的组件语言和 aspect ，根据联结点的语法定义，生成相应的中间文件或目标代码。这个过程可以分成三个阶段进行。首先，为组件语言和 Aspect 语言构造相应的语法树；然后依据 aspect 中的联结点定义对语法树进行联结；最后在联结的语法树上生成中间文件或目标代码。</p>
</blockquote>
<p>这段资料比较官方，个人的理解就是独立于模块外的中间目录/文件/代码。</p>
<h3 id="特性">特性</h3>
<p>衡量软件质量高低的要素主要包括可靠性、可扩展性、可重用性、兼容性以及易用性和易维护性等。其中 <strong>AOP 体现了可扩展性、可重用性和易理解性、易维护性等方面的能力</strong>，拿上面的例子对应这些特性体现之处：</p>
<ol>
<li>可扩展性：面向系统级的扩展，在任何需要打日志的地方注入此逻辑，如果是面向对象那么只能是类级别的继承使用此逻辑。</li>
<li>可重用性：这点最直观，减去写多遍具体的实现逻辑，提取到全局通用，只需要在不同的地方去<strong>注入</strong>。</li>
<li>易理解性：减少代码缠结的问题，抽象于程序之外，专注于程序逻辑。</li>
<li>易维护性：当验证登录状态的逻辑发生变化时，通过联结器影响到系统相关的各个部分，只需要改动一处，避免漏掉。<br>
基于以上特性达到松耦合、易于维护和扩展的目的。</li>
</ol>
<h2 id="实现手段">实现手段</h2>
<ul>
<li>代理</li>
<li>反射注入（DI）</li>
</ul>
<h2 id="常用场景">常用场景</h2>
<ul>
<li>拦截器：服务端路由中间件、前端路由守卫</li>
<li>依赖注入</li>
<li>日志</li>
<li>错误处理</li>
<li>前端管道</li>
<li>消息队列</li>
</ul>
<p>如果有人浏览到此文章有不同意见，欢迎留言！</p>
{% endraw %}
