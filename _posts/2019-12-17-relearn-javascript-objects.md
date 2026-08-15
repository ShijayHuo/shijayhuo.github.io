---
layout: post
title: "重学js系列——对象"
excerpt: "本“大家”上周坐火车回老家，同行的是搞java的老弟，两个程序猴在一起能干嘛？（😀 别多想，本文讲的虽是对象，但我俩不搞对象，虽是基友，但我俩不搞基😅，哈哈），路上不自觉的讨论交流日常遇到的问题，在交流过程中发现java和js数据结构的不同之处，本文将对数据结构中的对象进行…"
date: 2019-12-17 17:11:45 +0800
categories: ["JavaScript"]
tags: ["JavaScript"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6844904024227987464"
---

{% raw %}
<h1 id="对象" class="heading">对象</h1>
<p>本“大家”上周坐火车回老家，同行的是搞java的老弟，两个程序猴在一起能干嘛？（😀 别多想，本文讲的虽是对象，但我俩不搞对象，虽是基友，但我俩不搞基😅，哈哈），路上不自觉的讨论交流日常遇到的问题，在交流过程中发现java和js数据结构的不同之处，本文将对数据结构中的<strong>对象</strong>进行细节的探讨和总结。ok，接下请听我来一波讲解（装逼🙃）<br></p>
<p><span id="KPjpL"></span></p>
<h2 id="js对象" class="heading">js对象</h2>
<p>javascript是基于<strong>原型</strong>的语言，对象是JavaScript的基本数据类型。对象是一种复合值，key/value(键值对)的形式，属性名是字符串，这种基本数据结构还有很多叫法：“散列表”（hashtable）、“字典”（dictionary）、“关联数组”（associative array）。<br>对象不仅仅是字符串到值的映射，除了可以保持自有的属性，还可以从一个称为原型的对象继承属性。<br></p>
<p><span id="k4qdZ"></span></p>
<h2 id="js创建对象" class="heading">js创建对象</h2>
<p><span id="vV2oR"></span></p>
<h3 id="1对象直接量" class="heading">1.对象直接量</h3>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">var</span> obj = {} <span class="hljs-comment">// 无属性对象</span>
<span class="hljs-keyword">var</span> obj1 = { <span class="hljs-attr">name</span>: <span class="hljs-string">'ipenman'</span> } <span class="hljs-comment">// 属性name 值 ipenman</span>
</code></pre><p>我们来看下，对象直接量创建的对象</p>
<p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904024227987464/image-001.png"><figcaption></figcaption></figure><p></p>
<p>上图可以看到：字面量创建的对象包含属性和是原型（<strong>proto</strong>），它的原型是Object的原型。</p>
<p><span id="DHWSD"></span></p>
<h3 id="2通过new--构造函数创建" class="heading">2.通过new + 构造函数创建</h3>
<p><span id="tHeKE"></span></p>
<h4 id="new-object" class="heading">new Object()</h4>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">var</span> obj = <span class="hljs-keyword">new</span> <span class="hljs-built_in">Object</span>()
</code></pre><p><br></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904024227987464/image-002.png"><figcaption></figcaption></figure><br>
<br>可以看出，new Object() 与 {} 效果一致，其原型就是Object的原型。<br><p></p>
<p><span id="fVwnr"></span></p>
<h4 id="new-函数" class="heading">new 函数</h4>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Obj</span>(<span class="hljs-params"></span>)</span>{}
<span class="hljs-keyword">var</span> obj = <span class="hljs-keyword">new</span> Obj()
</code></pre><p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904024227987464/image-003.png"><figcaption></figcaption></figure><p></p>
<p>new Obj() 创建的原型是由Obj构造函数和Object原型组成。<br></p>
<p><span id="M4HRD"></span></p>
<h3 id="3objectcreate" class="heading">3.Object.create()</h3>
<p>es5 定义了名为Object.create()的方法，它创建新对象，其中第一个参数是这个对象的原型(<strong>proto</strong>)，必填。可选。如果没有指定为&nbsp;<a target="_blank" href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/undefined"><code>undefined</code></a>，则是要添加到新创建对象的不可枚举（默认）属性（即其自身定义的属性，而不是其原型链上的枚举属性）对象的属性描述符以及相应的属性名称。这些属性对应<a target="_blank" href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties"><code>Object.defineProperties()</code></a>的第二个参数。</p>
<p><strong>eg1：Object.create(null)</strong></p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">var</span> obj = <span class="hljs-built_in">Object</span>.create(<span class="hljs-literal">null</span>)
</code></pre><p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904024227987464/image-004.png"><figcaption></figcaption></figure><p></p>
<p><strong>eg2：Object.create({})</strong></p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">var</span> obj = <span class="hljs-built_in">Object</span>.create({})
</code></pre><p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904024227987464/image-005.png"><figcaption></figcaption></figure><p></p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">var</span> obj = <span class="hljs-built_in">Object</span>.create({<span class="hljs-attr">name</span>:<span class="hljs-string">'ipenman'</span>})
</code></pre><p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904024227987464/image-006.png"><figcaption></figcaption></figure><p></p>
<p><strong>eg3：Object.create(prototype)</strong><br>**</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">var</span> obj = <span class="hljs-built_in">Object</span>.create(<span class="hljs-built_in">Object</span>.prototype)
</code></pre><p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904024227987464/image-007.png"><figcaption></figcaption></figure><p></p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'ipenman'</span>
}
<span class="hljs-keyword">var</span> obj = <span class="hljs-built_in">Object</span>.create(Person.prototype)
</code></pre><p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904024227987464/image-008.png"><figcaption></figcaption></figure><p></p>
<p><strong>{} 等价于&nbsp; new Object() 等价于 Object.create(Object.prototype)</strong><br>**</p>
<p><span id="B9Vgn"></span></p>
<h2 id="原型-vs-原型属性" class="heading">原型 vs 原型属性</h2>
<p>原型与原型链请看本“大家”的<a target="_blank" href="https://github.com/iPenManShip/blog/blob/master/javascript/__proto__%E5%92%8Cprototype%E7%9A%84%E5%8C%BA%E5%88%AB%E5%BB%B6%E4%BC%B8%E5%88%B0%E5%8E%9F%E5%9E%8B%E9%93%BE.md">github</a>，文章是过去好久了，接下来的文章会重新更新，最后：<strong>求<a target="_blank" href="https://github.com/iPenManShip/blog">star</a></strong>！</p>
<p><span id="t6q4n"></span></p>
<h3 id="访问原型" class="heading">访问原型</h3>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">var</span> obj = {}
<span class="hljs-built_in">console</span>.log(<span class="hljs-built_in">Object</span>.getPrototypeOf(obj))
</code></pre><p><span id="KcDTg"></span></p>
<h3 id="访问原型属性" class="heading">访问原型属性</h3>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">obj</span>(<span class="hljs-params"></span>)</span>{}
obj.prototype.name = <span class="hljs-string">'ipenman'</span>
<span class="hljs-built_in">console</span>.log(<span class="hljs-built_in">Object</span>.prototype) <span class="hljs-comment">// ipenman</span>
</code></pre><p><span id="H279R"></span></p>
<h2 id="继承" class="heading">继承</h2>
<p><s><strong>此部分，会单独拎出来一篇来讲，待更新补充链接。</strong></s><a target="_blank" href="https://www.yuque.com/ipenmanship/xrosy8/vl472q"><strong>点这里</strong></a><br>**
<span id="1LHZx"></span></p>
<h2 id="访问与设置" class="heading">访问与设置</h2>
<p><span id="F3nZr"></span></p>
<h3 id="访问" class="heading">访问</h3>
<p>访问js对象属性有两种方式：1.打**点(.) **2.<strong>方括号字符串 ([])。</strong></p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">var</span> obj = {<span class="hljs-attr">name</span>:<span class="hljs-string">'ipenman'</span>}
<span class="hljs-built_in">console</span>.log(obj.name) <span class="hljs-comment">// ipenman</span>
<span class="hljs-built_in">console</span>.log(obj[<span class="hljs-string">"name"</span>]) <span class="hljs-comment">// ipenman</span>
</code></pre><p><span id="jbqM8"></span></p>
<h3 id="设置" class="heading">设置</h3>
<p>设置与访问对应，<strong>打点或[]</strong>
<span id="8I1n8"></span></p>
<h4 class="heading"></h4>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">var</span> obj = {}
obj.name = <span class="hljs-string">'ipenman'</span>
obj[<span class="hljs-string">"age"</span>] = <span class="hljs-number">24</span>
<span class="hljs-built_in">console</span>.log(obj) <span class="hljs-comment">// obj { name:"ipenman", age:24 }</span>
</code></pre><p>**
<span id="xlx4r"></span></p>
<h2 id="js对象-vs-java对象" class="heading">js对象 vs java对象</h2>
<p><br>JavaScript：基于<strong>原型</strong>的语言。<br>java：基于<strong>OOP类面向对象</strong>的语言。<br>这么说来，js对象和java对象的区别实际是基于原型语言和基于类语言的区别。<br></p>
<p><span id="rdZ1S"></span></p>
<h3 id="基于类java和基于原型javascript的对象系统的比较" class="heading">基于类（Java）和基于原型（JavaScript）的对象系统的比较</h3>
<table>
<thead>
<tr>
<th style="text-align:left">基于类的（Java）</th>
<th style="text-align:left">基于原型的（JavaScript）</th>
</tr>
</thead>
<tbody>
<tr>
<td style="text-align:left">类和实例是不同的事物。</td>
<td style="text-align:left">所有对象均为实例。</td>
</tr>
<tr>
<td style="text-align:left">通过类定义来定义类；通过构造器方法来实例化类。</td>
<td style="text-align:left">通过构造器函数来定义和创建一组对象。</td>
</tr>
<tr>
<td style="text-align:left">通过 <code>new</code> 操作符创建单个对象。</td>
<td style="text-align:left">相同。</td>
</tr>
<tr>
<td style="text-align:left">通过类定义来定义现存类的子类，从而构建对象的层级结构。</td>
<td style="text-align:left">指定一个对象作为原型并且与构造函数一起构建对象的层级结构</td>
</tr>
<tr>
<td style="text-align:left">遵循类链继承属性。</td>
<td style="text-align:left">遵循原型链继承属性。</td>
</tr>
<tr>
<td style="text-align:left">类定义指定类的所有实例的<strong>所有</strong>属性。无法在运行时动态添加属性。</td>
<td style="text-align:left">构造器函数或原型指定初始的属性集。允许动态地向单个的对象或者整个对象集中添加或移除属性。</td>
</tr>
</tbody>
</table>
<br>
<p><span id="sIN8G"></span></p>
<h2 id="参考资源" class="heading">参考资源</h2>
<p><a target="_blank" href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Details_of_the_Object_Model">《MDN-对象模型的细节》</a><br><a target="_blank" href="https://book.douban.com/subject/10549733/">《JavaScript权威指南》</a></p>
<p><span id="4HWXY"></span></p>
<h2 id="最后" class="heading">最后</h2>
<p>点赞加关注！😁</p>
{% endraw %}
