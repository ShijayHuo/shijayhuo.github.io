---
layout: post
title: "nodejs面试总结"
excerpt: "本篇记录一下，最近面试的几家公司的一下面试题(一些本人的项目中的内容可能就不介绍了)。 ① 如何在原型添加属性或方法。 ③ 在创建lisi的对象。 ④ 如何让李四继承张三的say函数。(如何改变this的指向，让zhangsan的this指向lisi) 说明：调用 lisi.s…"
date: 2019-03-15 14:51:12 +0800
categories: ["后端"]
tags: ["Node.js"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6844903797420998664"
---

{% raw %}
<p>本篇记录一下，最近面试的几家公司的一下面试题(一些本人的项目中的内容可能就不介绍了)。</p>
<h3 id="一一个http请求从客户端到服务端需要经过哪些步骤" class="heading">一、一个http请求，从客户端到服务端需要经过哪些步骤？</h3>
<p>简单描述为：</p>
<p>1.域名解析(DNS服务器)</p>
<p>2.Tcp连接</p>
<p>3.发送http请求(请求行，请求头，请求信息)</p>
<p>4.服务器响应请求</p>
<p>5.Tcp断开连接
具体看：
<a target="_blank" href="https://github.com/ljianshu/Blog/issues/24">传送门</a></p>
<h3 id="二谈谈你对js堆和栈的理解原始问法是透过-引用类型和值类型的题引申过来的" class="heading">二、谈谈你对js堆和栈的理解？（原始问法是透过 引用类型和值类型的题引申过来的）</h3>
<h3 id="三" class="heading">三、</h3>
<p><strong>① 如何在原型添加属性或方法。</strong></p>
<pre><code class="hljs js" lang="js"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">person</span>(<span class="hljs-params"></span>)</span>{}
person.prototype.say = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{}
</code></pre><p><strong>② 通过形参的方式给person添加属性name，并创建一个叫 zhangsan的对象继承person的属性</strong></p>
<pre><code class="hljs js" lang="js"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params">name</span>)</span>{
       <span class="hljs-keyword">this</span>.name = name;
}
Person.prototype.say(){
<span class="hljs-built_in">console</span>.log(<span class="hljs-keyword">this</span>.name);
}

<span class="hljs-keyword">const</span> zhangsan = <span class="hljs-keyword">new</span> Person(‘zhangsan’);
</code></pre><p><strong>③ 在创建lisi的对象。</strong></p>
<pre><code class="hljs js" lang="js">  <span class="hljs-keyword">const</span> lisi = <span class="hljs-keyword">new</span> Person(‘lisi’);
</code></pre><p><strong>④ 如何让李四继承张三的say函数。(如何改变this的指向，让zhangsan的this指向lisi)  说明：调用 lisi.say(); 打印 zhangsan。</strong></p>
<pre><code> 用es5新加入的 bind() 来解决。 详细看：
</code></pre>
<p><a target="_blank" href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind">传送门</a></p>
<h3 id="四如果有一个逻辑运算很复杂的程序块中比如亿运行时会发生什么遇到这种情况通常会如何解决processnexttick了解吗谈谈你的理解" class="heading">四、如果有一个逻辑运算很复杂的程序块中（比如亿），运行时会发生什么？遇到这种情况通常会如何解决？process.nextTick()了解吗？谈谈你的理解？</h3>
<h3 id="五" class="heading">五、</h3>
<p><strong>① 声明一个promise，五秒后输出helloworld</strong></p>
<p><strong>② promise里面运行的内容是在 调用.then() 之前执行的还是 调用.then才执行？</strong></p>
<h3 id="六" class="heading">六、</h3>
<pre><code class="hljs js" lang="js"><span class="hljs-keyword">const</span> p1 = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{
<span class="hljs-keyword">return</span> <span class="hljs-keyword">new</span> promise(<span class="hljs-function"><span class="hljs-params">resolve</span>=&gt;</span>{});
};
<span class="hljs-keyword">const</span> p2 = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{
<span class="hljs-keyword">return</span> <span class="hljs-keyword">new</span> promise(<span class="hljs-function"><span class="hljs-params">resolve</span>=&gt;</span>{});
};

<span class="hljs-keyword">async</span> <span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">f1</span>(<span class="hljs-params"></span>)</span>{
   <span class="hljs-comment">// 如果要用 p1和p2 的值来作为参数如何接收?如何不用等待 其中p1(或p2)执行完毕之后再去执行p2(或p1)。</span>
}
</code></pre><h3 id="七谈谈你对面向对象是如何理解的" class="heading">七、谈谈你对面向对象是如何理解的？</h3>
<h3 id="八你们项目中的api通常是如何定的简单描述一下rest-api" class="heading">八、你们项目中的api通常是如何定的？简单描述一下rest api。</h3>
<h3 id="九node-所熟悉的框架谈谈-express是如何从一个中间件执行到下一个中间件的express的路由机制" class="heading">九、Node 所熟悉的框架，谈谈 express是如何从一个中间件执行到下一个中间件的(express的路由机制)？</h3>
<h3 id="十express和koa-或者egg的区别" class="heading">十、Express和koa 或者egg的区别？</h3>
<h3 id="十一举出几个-你做过的分库分表的实例" class="heading">十一、举出几个 你做过的分库分表的实例。</h3>
<h3 id="十二你通常是如何优化mysql的查询" class="heading">十二、你通常是如何优化mysql的查询？</h3>
<h3 id="十三你们项目中用到了redis的那些方法set-和-mset的区别" class="heading">十三、你们项目中用到了redis的那些方法，set 和 mset的区别？</h3>
<h3 id="十四mysql的索引是如何实现的" class="heading">十四、Mysql的索引是如何实现的。</h3>
<h3 id="十五举例写出一个mysql储存过程和一个事务" class="heading">十五、举例写出一个Mysql储存过程和一个事务。</h3>
<h3 id="十六es5中的普通函数和es6中的箭头函数有什么区别还有this的指向" class="heading">十六、Es5中的普通函数和es6中的箭头函数有什么区别？还有this的指向。</h3>
<h3 id="十七你在开发过程中遇到了哪些难以解决的问题是如何解决的几乎每一家公司都问" class="heading">十七、你在开发过程中，遇到了哪些难以解决的问题，是如何解决的？(几乎每一家公司都问)</h3>
<h3 id="十八你常用的系统有哪些简述docker-是如何部署的" class="heading">十八、你常用的系统有哪些？简述Docker 是如何部署的？</h3>
<h3 id="event-looplibuv事件循环-了解吗谈谈你的理解" class="heading">event loop、libuv、事件循环 了解吗？谈谈你的理解。</h3>
<p>最后上一张，面试的笔试题</p>
<p></p><figure><img alt="nodejs面试总结 配图" src="/assets/img/posts/juejin-6844903797420998664/image-001.jpg"><figcaption></figcaption></figure><p></p>
{% endraw %}
