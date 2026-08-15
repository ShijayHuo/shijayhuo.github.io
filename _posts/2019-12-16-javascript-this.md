---
layout: post
title: "谈谈js中的this"
excerpt: "第一处 10.1.7 对this的解释（译）：存在与每个活动执行上下文关联的this值。 this值取决于调用方和正在执行的代码类型，并由控件进入执行上下文时确定。与执行上下文关联的this值是不可变的。 第二处 11.1.1 译：this关键字计算为执行上下文的这个值。 第三…"
date: 2019-12-16 15:59:02 +0800
categories: ["JavaScript"]
tags: ["JavaScript"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6844904021698805774"
---

{% raw %}
<p>js中的<strong>this</strong>是面试官经常考的问题，相信每一个开发者都对this有或多或少的迷惑，那么什么是this？又如何找到this的指向？<br></p>
<p><span id="ktu6U"></span></p>
<h2 id="this是什么" class="heading">this是什么？</h2>
<p>我们先来看看js规范是如何解释它的</p>
<blockquote>
<p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904021698805774/image-001.png"><figcaption></figcaption></figure><p></p>
<p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904021698805774/image-002.png"><figcaption></figcaption></figure><p></p>
<p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904021698805774/image-003.png"><figcaption></figcaption></figure>
摘自《<a target="_blank" href="https://www.ecma-international.org/publications/files/ECMA-ST-ARCH/ECMA-262,%201st%20edition,%20June%201997.pdf#sec-11.1.1">ECMAScrip (ECMA-262)</a>》<p></p>
</blockquote>
<p>第一处 10.1.7 对this的解释（译）：<strong>存在与每个活动执行上下文关联的this值。</strong>&nbsp;<strong>this值取决于调用方和正在执行的代码类型，并由控件进入执行上下文时确定。与执行上下文关联的this值是不可变的。</strong><br>第二处 11.1.1 译：<strong>this关键字计算为执行上下文的这个值。</strong><br>第三处 12.2.1 描述this 也是正在运行时的上下文环境。</p>
<p><span id="qnaH7"></span></p>
<h2 id="this的指向" class="heading">this的指向</h2>
<p>ok，以上三处，都围绕一个词：**上下文环境。**也就是说要看this的指向就是通过上下文来决定的。<br>下面通过几个场景来观察this。</p>
<p><span id="fTvvk"></span></p>
<h4 id="全局环境下的this" class="heading">全局环境下的this</h4>
<ul>
<li>nodejs环境</li>
</ul>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-built_in">console</span>.log(<span class="hljs-keyword">this</span>) <span class="hljs-comment">// {}</span>
</code></pre><ul>
<li>浏览器环境</li>
</ul>
<p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904021698805774/image-004.png"><figcaption></figcaption></figure><br><strong>全局环境下的this，在nodejs中是{}，实际指向的是module.exports这个模块作用域,，浏览器指向的是Window。</strong><p></p>
<p><span id="fEdo1"></span></p>
<h4 id="函数内function中的this" class="heading">函数内（function）中的this</h4>
<ul>
<li>nodejs 非严格模式下</li>
</ul>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">fn</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>
}
<span class="hljs-keyword">const</span> result = fn()
<span class="hljs-built_in">console</span>.log(result)  <span class="hljs-comment">// Object [global] {...}</span>
<span class="hljs-built_in">console</span>.log(result === global) <span class="hljs-comment">// true</span>
</code></pre><ul>
<li>浏览器环境 非严格模式下</li>
</ul>
<p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904021698805774/image-005.png"><figcaption></figcaption></figure><br><p></p>
<ul>
<li>nodejs 严格模式下</li>
</ul>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">fn</span>(<span class="hljs-params"></span>)</span>{
<span class="hljs-meta">  'use strict'</span>
  <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>
}
<span class="hljs-keyword">const</span> result = fn()
<span class="hljs-built_in">console</span>.log(result) <span class="hljs-comment">// undefined</span>
<span class="hljs-built_in">console</span>.log(result === <span class="hljs-literal">undefined</span>) <span class="hljs-comment">// true</span>
</code></pre><ul>
<li>浏览器环境下</li>
</ul>
<p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904021698805774/image-006.png"><figcaption></figcaption></figure><br><strong>非严格模式下，函数内this的指向</strong><br><strong>nodejs：global</strong><br><strong>浏览器：window</strong><br><strong>严格模式下，函数内this的指向</strong><br><strong>nodejs：undefined</strong><br><strong>浏览器：undefined</strong><p></p>
<p><span id="RwMmJ"></span></p>
<h4 id="构造函数内的this" class="heading">构造函数内的this</h4>
<p>这个也属于函数内的this，因为内容较大，这里单独拿出来讲：</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params">name</span>)</span>{
  <span class="hljs-keyword">this</span>.name = name
}
<span class="hljs-keyword">const</span> p = <span class="hljs-keyword">new</span> Person(<span class="hljs-string">'zhangsan'</span>)
<span class="hljs-built_in">console</span>.log(p.name) <span class="hljs-comment">// zhangsan</span>
</code></pre><p>例子可以看出，<strong>当经过new关键字来声明一个对象时，这里的this实际指向的是他的实例。</strong></p>
<p><span id="dFdbY"></span></p>
<h4 id="改变this的指向callapplybind" class="heading">改变this的指向（call，apply，bind）</h4>
<br>
<ul>
<li><strong>call</strong></li>
</ul>
<p>语法：function.call(thisArgs,arg1,arg2, ...)<br>第一个参数代表function函数内this值，可选。<br>arg1,arg2, ... 指定参数列表</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params"></span>) </span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'ipenman'</span>
  <span class="hljs-keyword">this</span>.sayHi = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>) </span>{
    <span class="hljs-built_in">console</span>.log(<span class="hljs-string">`My name is <span class="hljs-subst">${<span class="hljs-keyword">this</span>.name}</span>`</span>)
  }
}
<span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Man</span>(<span class="hljs-params"></span>) </span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'zhangsan'</span>
}
<span class="hljs-keyword">const</span> man = <span class="hljs-keyword">new</span> Man()
<span class="hljs-keyword">const</span> p = <span class="hljs-keyword">new</span> Person()
p.sayHi.call(man) <span class="hljs-comment">// zhangsan</span>
</code></pre><ul>
<li><strong>apply</strong></li>
</ul>
<p>语法：function.apply(thisArgs,[arg1,arg2, ...])<br>第一个参数代表function函数内的this值，可选。<br>[arg1,arg2, ...] 指定参数列表<br></p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params"></span>) </span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'ipenman'</span>
  <span class="hljs-keyword">this</span>.sayHi = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>) </span>{
    <span class="hljs-built_in">console</span>.log(<span class="hljs-string">`My name is <span class="hljs-subst">${<span class="hljs-keyword">this</span>.name}</span>`</span>)
  }
}
<span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Man</span>(<span class="hljs-params"></span>) </span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'zhangsan'</span>
}
<span class="hljs-keyword">const</span> man = <span class="hljs-keyword">new</span> Man()
<span class="hljs-keyword">const</span> p = <span class="hljs-keyword">new</span> Person()
p.sayHi.apply(man) <span class="hljs-comment">// zhangsan</span>
</code></pre><ul>
<li><strong>bind</strong></li>
</ul>
<p>语法：与apply 语法相同<br>区别：bind函数会创建一个新的函数，不会立即执行<br></p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params"></span>) </span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'ipenman'</span>
  <span class="hljs-keyword">this</span>.sayHi = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{
    <span class="hljs-built_in">console</span>.log(<span class="hljs-string">`My name is <span class="hljs-subst">${<span class="hljs-keyword">this</span>.name}</span>`</span>)
  }
}
<span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Man</span>(<span class="hljs-params"></span>) </span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'zhangsan'</span>
}
<span class="hljs-keyword">const</span> man = <span class="hljs-keyword">new</span> Man()
<span class="hljs-keyword">const</span> p = <span class="hljs-keyword">new</span> Person()
p.sayHi.bind(man)() <span class="hljs-comment">// zhangsan</span>
</code></pre><p><strong>call、apply、bind均以改变this的指向，p的this指向了man。</strong></p>
<p><span id="Lqdq2"></span>
<span id="TcP00"></span></p>
<h4 id="作为对象的方法" class="heading">作为对象的方法</h4>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">const</span> Person = {
  <span class="hljs-attr">name</span>: <span class="hljs-string">'ipenman'</span>,
  <span class="hljs-attr">age</span>: <span class="hljs-number">24</span>,
  <span class="hljs-attr">show</span>: <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>) </span>{
    <span class="hljs-built_in">console</span>.log(<span class="hljs-keyword">this</span>)
  }
}
Person.show() <span class="hljs-comment">// { name: 'ipenman', age: 24, sayHi: [Function: sayHi] }</span>
</code></pre><p><strong>当函数作为对象里的方法被调用时，它们的this指向的是调用该函数的对象。</strong><br>
<span id="6DSk3"></span>
<span id="XRch2"></span></p>
<h4 id="箭头函数" class="heading">箭头函数</h4>
<blockquote>
<p>函数体内的<code>this</code>对象，就是定义时所在的对象，而不是使用时所在的对象
<code>this</code>指向的固定化，并不是因为箭头函数内部有绑定<code>this</code>的机制，实际原因是箭头函数根本没有自己的<code>this</code>，导致内部的<code>this</code>就是外层代码块的<code>this</code>
--《es6标准入门 阮一峰》</p>
</blockquote>
<p>function 函数：</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">const</span> fn = <span class="hljs-function"><span class="hljs-keyword">function</span> (<span class="hljs-params"></span>)</span>{
  <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>
}
<span class="hljs-built_in">console</span>.log(fn()) <span class="hljs-comment">// Object [global] {...}</span>
</code></pre><p>箭头函数：</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">const</span> fn = <span class="hljs-function"><span class="hljs-params">()</span>=&gt;</span>{
  <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>
}
<span class="hljs-built_in">console</span>.log(<span class="hljs-keyword">this</span>) <span class="hljs-comment">// {}</span>
</code></pre><p><strong>箭头函数没有自己的this，它的this就是上层代码块的this。</strong></p>
<p><span id="6jtEG"></span></p>
<h2 id="总结" class="heading">总结：</h2>
<ol>
<li>
<p><strong>全局环境下的this，在nodejs中是{}，实际指向的是module.exports这个模块作用域,，浏览器指向的是Window。</strong></p>
</li>
<li>
<p><strong>函数内的this</strong></p>
<p><strong>非严格模式下，函数内this的指向</strong><br><strong>nodejs：global</strong><br><strong>浏览器：window</strong><br><strong>严格模式下，函数内this的指向</strong><br><strong>nodejs：undefined</strong><br><strong>浏览器：undefined</strong><br></p>
</li>
<li>
<p><strong>构造函数的this，new关键字来声明的对象this指向的是它的实例。</strong></p>
</li>
<li>
<p><strong>call,apply,bind 函数改变的this，指向的是其函数内的指定参数。</strong></p>
</li>
<li>
<p><strong>作为对象的方法，它们的this指向的是调用该函数的对象。</strong></p>
</li>
<li>
<p><strong>箭头函数的this，箭头函数的this指向的是外层代码块的this。</strong></p>
</li>
</ol>
<p><span id="tGZvO"></span></p>
<h2 id="习题" class="heading">习题</h2>
<p>通过几道题，看你是否真的掌握了this。</p>
<ol>
<li>运行 test2.js，说出打印结果。</li>
</ol>
<p>①创建test1.js</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-built_in">module</span>.exports = <span class="hljs-keyword">this</span>
</code></pre><p>②创建test2.js</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">const</span> t1 = <span class="hljs-built_in">require</span>(<span class="hljs-string">'./test1'</span>)
<span class="hljs-built_in">console</span>.log(<span class="hljs-keyword">this</span> === t1)
</code></pre><ol start="2">
<li>运行test2.js，说出打印结果</li>
</ol>
<p><br>①创建test1.js</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-built_in">module</span>.exports = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>
}
</code></pre><p>①创建test2.js</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">const</span> t1 = <span class="hljs-built_in">require</span>(<span class="hljs-string">'./test1'</span>)
<span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">fn</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>
}
<span class="hljs-built_in">console</span>.log(fn() === <span class="hljs-keyword">this</span>)
</code></pre><ol start="3">
<li>运行以下代码,并说出打印结果</li>
</ol>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">const</span> Person = {
  <span class="hljs-attr">name</span>: <span class="hljs-string">'ipenman'</span>,
  <span class="hljs-attr">show</span>: <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>
  },
  <span class="hljs-attr">show1</span>:<span class="hljs-function"><span class="hljs-params">()</span>=&gt;</span>{
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>
  }
}
<span class="hljs-built_in">console</span>.log(Person.show())
<span class="hljs-built_in">console</span>.log(Person.show1())
<span class="hljs-built_in">console</span>.log(Person.show() === Person.show1())
<span class="hljs-built_in">console</span>.log(Person.show1() === <span class="hljs-keyword">this</span>)
<span class="hljs-built_in">console</span>.log(Person.show() === <span class="hljs-keyword">this</span>)

</code></pre><ol start="4">
<li>运行一下代码，说出打印结果</li>
</ol>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params"></span>) </span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'ipenman'</span>
  <span class="hljs-keyword">return</span> <span class="hljs-function"><span class="hljs-params">()</span> =&gt;</span> {
    <span class="hljs-keyword">return</span> <span class="hljs-function"><span class="hljs-params">()</span> =&gt;</span> {
      <span class="hljs-built_in">console</span>.log(<span class="hljs-keyword">this</span>)
      <span class="hljs-keyword">return</span> <span class="hljs-function"><span class="hljs-params">()</span> =&gt;</span> {
        <span class="hljs-built_in">console</span>.log(<span class="hljs-keyword">this</span>)
        <span class="hljs-keyword">return</span> <span class="hljs-function"><span class="hljs-params">()</span> =&gt;</span> {
          <span class="hljs-built_in">console</span>.log(<span class="hljs-keyword">this</span>)
        }
      }
    }
  }
}
<span class="hljs-keyword">const</span> p = <span class="hljs-keyword">new</span> Person()
p()()()()
</code></pre><ol start="5">
<li>说出打印结果。</li>
</ol>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-keyword">this</span>.name = name
  <span class="hljs-keyword">this</span>.age = <span class="hljs-number">23</span>
}
<span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Man</span>(<span class="hljs-params">name</span>)</span>{
  Person.call(<span class="hljs-keyword">this</span>,name)
}
<span class="hljs-keyword">const</span> man = <span class="hljs-keyword">new</span> Man(<span class="hljs-string">'ipenman'</span>)
<span class="hljs-built_in">console</span>.log(man)

</code></pre><p><strong>本文以6种上下文环境来描述this，如有补充，欢迎评论，也可以把答案回复到评论里哟！</strong></p>
{% endraw %}
