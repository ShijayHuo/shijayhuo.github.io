---
layout: post
title: "angular使用配置环境变量"
excerpt: "为了更清晰，更快速的了解 Angular 环境配置的架构，请看此图： 下面具体内容也会按照图上所示来介绍。 添加环境配置文件 创建文件，不过这个步骤在使用 Angular cli 构建的项目的时候已经默认配置好了（如果没有，在项目终端执行 ng generate environments ），在 src -> e..."
date: 2023-07-26 18:41:20 +0800
categories: ["前端","工程化"]
tags: ["Angular","工程化"]
source_platform: GitHub Pages
source_url: "https://aaaaaajie.github.io/2023/07/26/angular%E4%BD%BF%E7%94%A8%E9%85%8D%E7%BD%AE%E7%8E%AF%E5%A2%83%E5%8F%98%E9%87%8F/"
source_repository: "https://github.com/ShijayHuo/aaaaaajie.github.io"
---

{% raw %}
<p>为了更清晰，更快速的了解 Angular 环境配置的架构，请看此图：</p>
<p><img src="/assets/img/posts/aaaaaajie-b480664e/image-001.png" alt="image.png"></p>
<p>下面具体内容也会按照图上所示来介绍。</p>
<h3 id="添加环境配置文件">添加环境配置文件</h3>
<ol>
<li>创建文件，不过这个步骤在使用 Angular cli 构建的项目的时候已经默认配置好了（如果没有，在项目终端执行   <code>ng generate environments</code>  ），在 src -&gt; environments 目录，并且目录下会有几个不同的文件，如下：<br>
<img src="/assets/img/posts/aaaaaajie-b480664e/image-002.png" alt="image.png"></li>
</ol>
<p>名字可以随便取，默认是 Angular 的命名规范，  <code>目录+环境.ts</code>  ，一般用默认提供的这两到三个文件就够了，当然如果环境多的情况，就复制出来几份，比如图上：  <code>environment.alpha.ts</code></p>
<ol start="2">
<li>配置文件内容</li>
</ol>
<p>默认需要导出一个对象，默认名字为 environment，如果  <strong>想要添加变量，直接在 environment 里添加键值对，比如添加一个baseURL</strong>   ，下图所示：</p>
<p><img src="/assets/img/posts/aaaaaajie-b480664e/image-003.png" alt="image.png"></p>
<p><strong>两点需要注意：</strong></p>
<ol>
<li><strong>多个环境配置文件，默认使用 environment.ts 作为默认/基础文件配置，就是说在项目中使用的地方导入的是该文件</strong>  ，可能有同学会问：我想以其他文件作为默认配置行吗，我的回答是：行，但是一定要保证在 angular.json 中映射正确，为了避免配置失误，建议还是不要改。</li>
<li>environment 这个名字也可以修改，但是一定要注意其他引用的地方也要同步修改，比如 main.ts 启动项目时，其他的环境配置文件  <strong>一定要和默认/基础文件导出的对象命名保持一致</strong>  。</li>
</ol>
<h3 id="映射环境配置文件">映射环境配置文件</h3>
<blockquote>
<p>angular.json 是项目的基础，它配置了打包、服务启动、代理…等，环境配置也是其中的一项</p>
</blockquote>
<ol>
<li>打开 angular.json 文件，找到节点：“architect” -&gt; “build” -&gt; “configurations”，然后添加环境替换规则，如图：<br>
<img src="/assets/img/posts/aaaaaajie-b480664e/image-004.png" alt="image.png"></li>
<li>找到节点：“serve” -&gt; “configurations” 添加 “alpha” 节点（内容复制其他环境的就行），如图：<br>
<img src="/assets/img/posts/aaaaaajie-b480664e/image-005.png" alt="image.png"></li>
<li>为了后面测试配置的环境是否生效，这里配置默认按照 alpha 运行。</li>
</ol>
<h3 id="使用环境配置文件">使用环境配置文件</h3>
<p>配置结束，使用起来就非常简单了，只需要注意一点，导入的环境文件是基础环境（上面 replace 的文件，通常是 environment.ts），如图：</p>
<p><img src="/assets/img/posts/aaaaaajie-b480664e/image-006.png" alt="image.png"></p>
<p><img src="/assets/img/posts/aaaaaajie-b480664e/image-007.png" alt="image.png"></p>
<p>从页面看下内容：</p>
<p><img src="/assets/img/posts/aaaaaajie-b480664e/image-008.png" alt="image.png"></p>
<p>OK，大功告成！</p>
<h3 id="番外篇：合并通用环境变量">番外篇：合并通用环境变量</h3>
<p>angular 中只提到了配置文件替换规则，可实际开发中有很大部分情况下需要的是合并规则，更详细说：很多环境变量是相同的，我们期望是只写一遍，关于合并规则，angular.json 并没有提供（至少本人没有发现），但是我们可以利用 js 特性手动合并一下，借助一个默认配置文件，配置通用的环境变量，然后在其他文件中做解构合并操作，如图示：</p>
<p><img src="/assets/img/posts/aaaaaajie-b480664e/image-009.png" alt="image.png"></p>
<p><img src="/assets/img/posts/aaaaaajie-b480664e/image-010.png" alt="image.png"></p>
<h3 id="参考">参考</h3>
<ul>
<li><a target="_blank" rel="noopener" href="https://angular.cn/guide/build#configuring-application-environments">Angular 官网环境配置</a></li>
</ul>
{% endraw %}
