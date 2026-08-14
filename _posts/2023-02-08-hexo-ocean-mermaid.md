---
layout: post
title: "hexo ocean 主题集成 mermaid"
excerpt: "mermaid 是一款可以使用文本来绘图的工具，支持流程图、时序图、类图、饼状图等等，更多看这里。它可以支持在 markdown 中使用，这对于我这种程序员非常的好用，可以代替一些插图，hexo 对插图是一大痛点（上传图片，然后在 markdown 中插入链接，重要的是要考虑储存位置、空间和后期的维护），本人习惯..."
date: 2023-02-08 16:14:18 +0800
categories: ["前端","框架"]
tags: ["hexo","Mermaid"]
source_platform: GitHub Pages
source_url: "https://aaaaaajie.github.io/2023/02/08/mermaid/"
source_repository: "https://github.com/ShijayHuo/aaaaaajie.github.io"
mermaid: true
---

{% raw %}
<p>mermaid 是一款可以使用文本来绘图的工具，支持流程图、时序图、类图、饼状图等等，更多看<a target="_blank" rel="noopener" href="https://mermaid.js.org/intro/">这里</a>。它可以支持在 markdown 中使用，这对于我这种程序员非常的好用，可以代替一些插图，hexo 对插图是一大痛点（上传图片，然后在 markdown 中插入链接，重要的是要考虑储存位置、空间和后期的维护），本人习惯使用代码块或文字的方式代替，所以这是一篇 hexo ocean 集成 mermaid 的文档。</p>
<p>先做个展示如下</p>
<pre><code class="language-mermaid">flowchart LR
    A[Start] --> B{Is it?}
    B -->|Yes| C[OK]
    C --> D[Rethink]
    D --> B
    B ---->|No| E[End]</code></pre>
<h2 id="安装插件">安装插件</h2>
<p><code>npm install --save hexo-filter-mermaid-diagrams</code></p>
<h2 id="添加配置">添加配置</h2>
<h3 id="方式一：远程加载-mermaid">方式一：远程加载 mermaid</h3>
<ol>
<li>添加配置<br>
到 themes/ocean 的 _config.yml 文件中添加以下配置</li>
</ol>
<figure class="highlight shell"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br></pre></td><td class="code"><pre><span class="line">mermaid: </span><br><span class="line">  enable: true</span><br><span class="line">  version: &quot;9.0.0&quot; # 远程加载</span><br></pre></td></tr></table></figure>
<ol start="2">
<li>进入 themes/ocean/layout/_partial 目录找到 after-footer.ejs 加入以下代码：</li>
</ol>
<figure class="highlight js"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br></pre></td><td class="code"><pre><span class="line">&lt;% <span class="keyword">if</span> (theme.<span class="property">mermaid</span>.<span class="property">enable</span>) &#123; %&gt;</span><br><span class="line">  <span class="language-xml"><span class="tag">&lt;<span class="name">script</span> <span class="attr">src</span>=<span class="string">&#x27;https://unpkg.com/mermaid@&lt;%= theme.mermaid.version %&gt;/dist/mermaid.min.js&#x27;</span>&gt;</span><span class="tag">&lt;/<span class="name">script</span>&gt;</span></span></span><br><span class="line">  <span class="language-xml"><span class="tag">&lt;<span class="name">script</span>&gt;</span><span class="language-javascript"></span></span></span><br><span class="line"><span class="language-javascript"><span class="language-xml">    <span class="keyword">if</span> (<span class="variable language_">window</span>.<span class="property">mermaid</span>) &#123;</span></span></span><br><span class="line"><span class="language-javascript"><span class="language-xml">      mermaid.<span class="title function_">initialize</span>(&#123;<span class="attr">theme</span>: <span class="string">&#x27;forest&#x27;</span>&#125;);</span></span></span><br><span class="line"><span class="language-javascript"><span class="language-xml">    &#125;</span></span></span><br><span class="line"><span class="language-javascript"><span class="language-xml">  </span><span class="tag">&lt;/<span class="name">script</span>&gt;</span></span></span><br><span class="line">&lt;% &#125; %&gt;</span><br></pre></td></tr></table></figure>
<h3 id="方式二：本地加载-marmaid（推荐）">方式二：本地加载 marmaid（推荐）</h3>
<p>本地加载 js 比远程访问速度快，所以推荐。配置跟第一种差不多，只是源码文件下载到本地。</p>
<ol>
<li>添加配置<br>
到 themes/ocean 的 _config.yml 文件中添加以下配置</li>
</ol>
<figure class="highlight shell"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br></pre></td><td class="code"><pre><span class="line">mermaid: </span><br><span class="line">  enable: true</span><br></pre></td></tr></table></figure>
<ol start="3">
<li>
<p>下载 mermaid 源码，@后面的是版本，可以挑选自己想要的版本，版本信息看<a target="_blank" rel="noopener" href="https://github.com/mermaid-js/mermaid">这里</a><br>
地址：<a target="_blank" rel="noopener" href="https://unpkg.com/mermaid@9.0.0/dist/mermaid.min.js">https://unpkg.com/mermaid@9.0.0/dist/mermaid.min.js</a><br>
下载后放到 themes/ocean/source/js 目录下，文件名可以叫做 mermaid.min.js，名字可以自定义。</p>
</li>
<li>
<p>进入 themes/ocean/layout/_partial 目录找到 after-footer.ejs 加入以下代码：</p>
</li>
</ol>
<figure class="highlight js"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br></pre></td><td class="code"><pre><span class="line">&lt;% <span class="keyword">if</span> (theme.<span class="property">mermaid</span>.<span class="property">enable</span>) &#123; %&gt;</span><br><span class="line">  <span class="language-xml"><span class="tag">&lt;<span class="name">script</span> <span class="attr">src</span>=<span class="string">&#x27;/js/mermaid.min.js&#x27;</span>&gt;</span><span class="tag">&lt;/<span class="name">script</span>&gt;</span></span></span><br><span class="line">  <span class="language-xml"><span class="tag">&lt;<span class="name">script</span>&gt;</span><span class="language-javascript"></span></span></span><br><span class="line"><span class="language-javascript"><span class="language-xml">    <span class="keyword">if</span> (<span class="variable language_">window</span>.<span class="property">mermaid</span>) &#123;</span></span></span><br><span class="line"><span class="language-javascript"><span class="language-xml">      mermaid.<span class="title function_">initialize</span>(&#123;<span class="attr">theme</span>: <span class="string">&#x27;forest&#x27;</span>&#125;);</span></span></span><br><span class="line"><span class="language-javascript"><span class="language-xml">    &#125;</span></span></span><br><span class="line"><span class="language-javascript"><span class="language-xml">  </span><span class="tag">&lt;/<span class="name">script</span>&gt;</span></span></span><br><span class="line">&lt;% &#125; %&gt;</span><br></pre></td></tr></table></figure>
<p>OK，到此配置结束。</p>
<p>参考：<a target="_blank" rel="noopener" href="https://github.com/webappdevelp/hexo-filter-mermaid-diagrams">https://github.com/webappdevelp/hexo-filter-mermaid-diagrams</a></p>
{% endraw %}
