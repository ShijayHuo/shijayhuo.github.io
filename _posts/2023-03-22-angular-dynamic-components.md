---
layout: post
title: "Angular 动态创建组件"
excerpt: "有两种方式：视图动态渲染和组件动态创建（笔者拟自己拟的概念）， 区别是前者的重心是使用 NgComponentOutlet 指令在视图模板中，后者的重心是使用 createComponent API 在组件内创建的 。 方式一：视图渲染 声明一个组件 app-dynamic 12345@Component({ s..."
date: 2023-03-22 21:52:23 +0800
categories: ["前端","框架"]
tags: ["Angular"]
source_platform: GitHub Pages
source_url: "https://aaaaaajie.github.io/2023/03/22/angular%E5%8A%A8%E6%80%81%E5%88%9B%E5%BB%BA%E7%BB%84%E4%BB%B6/"
source_repository: "https://github.com/ShijayHuo/aaaaaajie.github.io"
---

{% raw %}
<p>有两种方式：视图动态渲染和组件动态创建（笔者拟自己拟的概念），  <strong>区别是前者的重心是使用 NgComponentOutlet 指令在视图模板中，后者的重心是使用 createComponent API 在组件内创建的</strong>  。</p>
<h3 id="方式一：视图渲染">方式一：视图渲染</h3>
<p>声明一个组件 app-dynamic</p>
<figure class="highlight plaintext"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br></pre></td><td class="code"><pre><span class="line">@Component(&#123;</span><br><span class="line">  selector: &#x27;app-dynamic&#x27;,</span><br><span class="line">  template: &#x27;&lt;div&gt; 123 &lt;div&gt;&#x27;,</span><br><span class="line">&#125;)</span><br><span class="line">export class DynamicComponent implements OnInit &#123;&#125;</span><br></pre></td></tr></table></figure>
<p>在其他组件的视图渲染该组件</p>
<figure class="highlight plaintext"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br><span class="line">9</span><br></pre></td><td class="code"><pre><span class="line">@Component(&#123;</span><br><span class="line">  selector: &#x27;my-app&#x27;,</span><br><span class="line">  template: `</span><br><span class="line">    &lt;ng-container *ngComponentOutlet=&quot;dynamicComponent&quot;&gt;&lt;/ng-container&gt;</span><br><span class="line">  `,</span><br><span class="line">&#125;)</span><br><span class="line">export class App &#123;</span><br><span class="line">  dynamicComponent = DynamicComponent;</span><br><span class="line">&#125;</span><br></pre></td></tr></table></figure>
<p>效果如下</p>
<p><img src="/assets/img/posts/aaaaaajie-d651f379/image-001.png" alt="image.png"></p>
<h4 id="传递参数">传递参数</h4>
<p>这种方式不能直接像 @Input() 一样去传值，但是 ngComponentOutlet 指令  **支持 injector 注入 token **  的方式传值。</p>
<p>修改上述代码：</p>
<p><img src="/assets/img/posts/aaaaaajie-d651f379/image-002.png" alt="image.png"></p>
<p>组件接收值</p>
<p><img src="/assets/img/posts/aaaaaajie-d651f379/image-003.png" alt="image.png"></p>
<p>完整代码戳  <a target="_blank" rel="noopener" href="https://stackblitz.com/edit/angular-m1uvoc?file=src/main.ts">这里</a></p>
<h3 id="方式二：组件创建">方式二：组件创建</h3>
<p>声明一个组件</p>
<figure class="highlight plaintext"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br></pre></td><td class="code"><pre><span class="line">@Component(&#123;</span><br><span class="line">  selector: &#x27;app-two&#x27;,</span><br><span class="line">  template: &#x27;&lt;div&gt; &#123;&#123; name &#125;&#125; &lt;/div&gt;&#x27;,</span><br><span class="line">&#125;)</span><br><span class="line">export class TwoComponent &#123;</span><br><span class="line">  @Input() name: string;</span><br><span class="line">&#125;</span><br></pre></td></tr></table></figure>
<figure class="highlight plaintext"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br><span class="line">9</span><br><span class="line">10</span><br><span class="line">11</span><br><span class="line">12</span><br><span class="line">13</span><br><span class="line">14</span><br><span class="line">15</span><br><span class="line">16</span><br><span class="line">17</span><br><span class="line">18</span><br><span class="line">19</span><br><span class="line">20</span><br><span class="line">21</span><br><span class="line">22</span><br></pre></td><td class="code"><pre><span class="line">@Component(&#123;</span><br><span class="line">  selector: &#x27;my-app&#x27;,</span><br><span class="line">  template: `</span><br><span class="line">    &lt;ng-template #container&gt;&lt;/ng-template&gt;</span><br><span class="line">  `,</span><br><span class="line">&#125;)</span><br><span class="line">export class App &#123;</span><br><span class="line">  </span><br><span class="line">  constructor(</span><br><span class="line">    private environmentInjector: EnvironmentInjector,</span><br><span class="line">    private cdr: ChangeDetectorRef</span><br><span class="line">  ) &#123; &#125;</span><br><span class="line">  </span><br><span class="line">  ngAfterViewInit() &#123;</span><br><span class="line">    const component = this.container.createComponent(TwoComponent, &#123;</span><br><span class="line">      environmentInjector: this.environmentInjector,</span><br><span class="line">    &#125;);</span><br><span class="line">    // 传参</span><br><span class="line">    component.setInput(&#x27;name&#x27;, &#x27;组件动态创建&#x27;);</span><br><span class="line">    this.cdr.detectChanges();</span><br><span class="line">  &#125;</span><br><span class="line">&#125;</span><br></pre></td></tr></table></figure>
<p>效果</p>
<p><img src="/assets/img/posts/aaaaaajie-d651f379/image-004.png" alt="image.png"></p>
<h2 id="参考资料">参考资料</h2>
<ul>
<li><a target="_blank" rel="noopener" href="https://angular.cn/api/common/NgComponentOutlet#ngcomponentoutlet">ngcomponentoutlet</a></li>
<li><a target="_blank" rel="noopener" href="https://angular.cn/api/core/ViewContainerRef#createcomponent">createcomponent</a></li>
</ul>
{% endraw %}
