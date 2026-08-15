---
layout: post
title: "重学js系列——继承"
excerpt: "上篇已经讲述到js是基于原型的语言，所以它实现继承与传统OOP语言有很大差别，实现起来有些复杂。 当然越是复杂，咱们应当要掌握，这样面试官才能考察出学东西是否扎实，要克服，请仔细阅读。（骗阅读量🤑） 本章继上篇《对象》的最后一节给予补充——继承。 不仅传统OOP语言遵循着 里…"
date: 2019-12-20 19:08:25 +0800
categories: ["JavaScript"]
tags: ["JavaScript"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6844904025142329357"
---

{% raw %}
<p><strong>js继承基本上是面试官最喜欢考的一块内容了</strong> 😀<br></p>
<p><a target="_blank" href="https://juejin.cn/post/6844904024227987464">上篇</a>已经讲述到js是基于原型的语言，所以它实现继承与传统OOP语言有很大差别，实现起来有些复杂。<br>
当然越是复杂，咱们应当要掌握，这样面试官才能考察出学东西是否扎实，要克服，请仔细阅读。（骗阅读量🤑）<br>
本章继上篇<a target="_blank" href="https://juejin.cn/post/6844904024227987464">《对象》</a>的最后一节给予补充——<strong>继承。</strong><br></p>
<p>嗯嗯（清嗓）请各位搬好小板凳😎</p>
<p><span id="ehXA4"></span></p>
<h2 id="里氏替换原则liskov-substitution-principlelsp" class="heading">里氏替换原则（Liskov Substitution Principle,LSP）</h2>
<p><br>不仅传统OOP语言遵循着 <strong>里氏替换原则</strong>，js继承也同样遵循<strong>里氏替换原则。</strong></p>
<ul>
<li>
<p><strong>如果对每一个类型为S的对象o1，都有类型为T的对象o2，使得以T定义的所有程序P在所有的对象o1都代换成o2 时，程序P的行为没有发生变化，那么类型 S 是类型 T 的子类型。</strong></p>
</li>
<li>
<p><strong>所有引用基类的地方必须能透明地使用其子类的对象。</strong></p>
</li>
</ul>
<p>通过定义，我们可推出：
<br><strong>子类可以代表父类，再强烈可以说，子类就是父类，但父类不能代表子类。</strong><br><strong>子类的属性和行为继承父类的属性和行为。</strong><br><strong>子类可以有自己独特的属性和行为。</strong><br>
<br>按照里氏替换这一原则，我们来实现分析并实现js的继承。</p>
<p><span id="UOMRw"></span></p>
<h2 id="实现" class="heading">实现</h2>
<p>将继承前，我们先创建一个完整的类。</p>
<ol>
<li>这里我们先创建一个“类”</li>
</ol>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params"></span>)</span>{}
</code></pre><ol start="2">
<li>给类创建自定义属性和行为</li>
</ol>
<p><br>创建属性和行为分为两种：<br>
<br><strong>①构造函数</strong></p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'ipenman'</span>
  <span class="hljs-keyword">this</span>.work = <span class="hljs-string">'程序员'</span>
  <span class="hljs-keyword">this</span>.show = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{
    <span class="hljs-built_in">console</span>.log(<span class="hljs-string">'My name is %s,My work is %s'</span>,<span class="hljs-keyword">this</span>.name,<span class="hljs-keyword">this</span>.work)
  }
}
<span class="hljs-keyword">const</span> p = <span class="hljs-keyword">new</span> Person()
p.show() <span class="hljs-comment">// My name is ipenman,My work is 程序员</span>
</code></pre><p><br><strong>②prototype</strong></p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params"></span>)</span>{}
Person.prototype.name = <span class="hljs-string">'ipenman'</span>
Person.prototype.work = <span class="hljs-string">'程序员'</span>
Person.prototype.show = <span class="hljs-function"><span class="hljs-keyword">function</span> (<span class="hljs-params"></span>)</span>{
  <span class="hljs-built_in">console</span>.log(<span class="hljs-string">'My name is %s,My work is %s'</span>,<span class="hljs-keyword">this</span>.name,<span class="hljs-keyword">this</span>.work)
}
<span class="hljs-keyword">const</span> p = <span class="hljs-keyword">new</span> Person()
p.show() <span class="hljs-comment">// My name is ipenman,My work is 程序员</span>
</code></pre><p><strong>区别：</strong><br>构造函数中的属性为私有属性，跟随实例。<br>prototype为共享属性，跟随函数，多个实例指向同一个prototype。<br>
<br><strong>选用：</strong><br>多个实例需要的共同属性或行为时，选用prototype，当私有属性时选用构造函数属性。</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params">name,work</span>)</span>{
  <span class="hljs-keyword">this</span>.name = name
  <span class="hljs-keyword">this</span>.work = work
}

Person.prototype.show = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-built_in">console</span>.log(<span class="hljs-string">'My name is %s,My work is %s'</span>,<span class="hljs-keyword">this</span>.name,<span class="hljs-keyword">this</span>.work)
}

<span class="hljs-keyword">const</span> p1 = <span class="hljs-keyword">new</span> Person(<span class="hljs-string">'ipenman'</span>,<span class="hljs-string">'程序员'</span>)
p1.show() <span class="hljs-comment">// My name is ipenman,My work is 程序员</span>

<span class="hljs-keyword">const</span> p2 = <span class="hljs-keyword">new</span> Person(<span class="hljs-string">'zhangsan'</span>,<span class="hljs-string">'学生'</span>)
p2.show() <span class="hljs-comment">// My name is zhangsan,My work is 学生</span>
</code></pre><p>ok，到此一个完整的类已经创建，终于到了我们的正题——<strong>继承</strong>。</p>
<p>根据里氏替换原则实现类式继承</p>
<p><span id="luGcc"></span></p>
<h3 id="子类就是父类原型继承" class="heading">子类就是父类（原型继承）</h3>
<p><span id="DZc9z"></span></p>
<h4 id="简单继承" class="heading">简单继承</h4>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params">name,work</span>)</span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'ipenman'</span>
  <span class="hljs-keyword">this</span>.work = <span class="hljs-string">'程序员'</span>
}
Person.prototype.show = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-built_in">console</span>.log(<span class="hljs-string">'My name is %s,My work is %s'</span>,<span class="hljs-keyword">this</span>.name,<span class="hljs-keyword">this</span>.work)
}
<span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Student</span>(<span class="hljs-params"></span>)</span>{
  Person.call(<span class="hljs-keyword">this</span>)
}
<span class="hljs-keyword">const</span> s = <span class="hljs-keyword">new</span> Student()
</code></pre><p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904025142329357/image-001.png"><figcaption></figcaption></figure><p></p>
<p>结果显示：<br>s =&gt; Student {name:"ipenman",work:"程序员"}<br>可以看到已经继承了name和work的属性。<br>但仔细观察，发现Student里面并没有Person的prototype的show函数<br>打印 s.show()会报错TypeError: s.show is not a function<br>显然，这种继承并不是我们想要的，因为它没有继承到原型Person.prototype，不完全符合里氏替换原则。</p>
<p><span id="3lfkE"></span></p>
<h4 id="简单继承--原型继承" class="heading">简单继承 + 原型继承</h4>
<p>好嘛，上面的继承不是没有Person.prototype，那我就继承一下它呗</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params">name,work</span>)</span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'ipenman'</span>
  <span class="hljs-keyword">this</span>.work = <span class="hljs-string">'程序员'</span>
}
Person.prototype.show = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-built_in">console</span>.log(<span class="hljs-string">'My name is %s,My work is %s'</span>,<span class="hljs-keyword">this</span>.name,<span class="hljs-keyword">this</span>.work)
}
<span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Student</span>(<span class="hljs-params"></span>)</span>{
  Person.call(<span class="hljs-keyword">this</span>)
}
Student.prototype = <span class="hljs-built_in">Object</span>.create(Person.prototype) <span class="hljs-comment">// 创建原型是Person.prototype的新对象赋给Student.prototype</span>
<span class="hljs-keyword">const</span> s = <span class="hljs-keyword">new</span> Student()
</code></pre><p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904025142329357/image-002.png"><figcaption></figcaption></figure><p></p>
<p>嘿嘿，这不是把原型属性和构造函数的属性继承过去了吗？<br>到这，本“大家”就要夸赞一句了，很棒！<br>但是，不要飘啊，再仔细观察一下。<br>一顿观察后...<br>我去，Student的构造函数(constructor)也给继承过了。<br>本“大家”上面介绍了，函数的类就是它自身的构造函数，就是说Student.prototype.constructor 指向的是function Student，我们可以拿上面的最基础的Person函数打印下<br></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904025142329357/image-003.png"><figcaption></figcaption></figure><p></p>
<p>所以说，这也不太对！<br>可能又有同学说了，我用同样的方式，把Student.prototype.constructor 显示指定到function Student不行吗？<br>好，满足你！</p>
<p><span id="ajvH9"></span></p>
<h4 id="完全继承" class="heading">完全继承</h4>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params">name,work</span>)</span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'ipenman'</span>
  <span class="hljs-keyword">this</span>.work = <span class="hljs-string">'程序员'</span>
}
Person.prototype.show = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-built_in">console</span>.log(<span class="hljs-string">'My name is %s,My work is %s'</span>,<span class="hljs-keyword">this</span>.name,<span class="hljs-keyword">this</span>.work)
}
<span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Student</span>(<span class="hljs-params"></span>)</span>{
  Person.call(<span class="hljs-keyword">this</span>)
}
Student.prototype = <span class="hljs-built_in">Object</span>.create(Person.prototype)
Student.prototype.constructor = Student
<span class="hljs-keyword">const</span> s = <span class="hljs-keyword">new</span> Student()
</code></pre><p>这时候，我们差最后一道工序，看是否真正的达到了继承</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-built_in">console</span>.log(s <span class="hljs-keyword">instanceof</span> Student,s <span class="hljs-keyword">instanceof</span> Person) <span class="hljs-comment">// true true</span>
</code></pre><p></p><figure><img alt="71432BC1C1BBF831414AEDC71F3946F5.gif" src="/assets/img/posts/juejin-6844904025142329357/image-004.gif"><figcaption></figcaption></figure><p></p>
<p><span id="Si2YE"></span></p>
<h2 id="es6-class-及继承" class="heading">es6 class 及继承</h2>
<p>上面我们费了好大好大的功夫才实现继承，这对初学js的小伙伴太不友好了，Duang！es6 class驾到</p>
<p><span id="nFmtS"></span></p>
<h3 id="创建一个类" class="heading">创建一个类</h3>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-class"><span class="hljs-keyword">class</span> <span class="hljs-title">Person</span></span>{
  <span class="hljs-keyword">constructor</span>(name,work){
     <span class="hljs-keyword">this</span>.name = name
    <span class="hljs-keyword">this</span>.work = work
  }
  show(){
    <span class="hljs-built_in">console</span>.log(<span class="hljs-string">'My name is %s,My work is %s'</span>,<span class="hljs-keyword">this</span>.name,<span class="hljs-keyword">this</span>.work)
  }
}
<span class="hljs-keyword">const</span> p = <span class="hljs-keyword">new</span> Person(<span class="hljs-string">'ipenman'</span>,<span class="hljs-string">'程序员'</span>)
</code></pre><p>这看起来很像传统OOP语言，实则class只是一个语法糖，只是看起来更像面向对象编程而已。当constructor没有参数时，可以省略constructor，class内部会补全！</p>
<p><span id="uIyKy"></span></p>
<h3 id="继承" class="heading">继承</h3>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-class"><span class="hljs-keyword">class</span> <span class="hljs-title">Person</span></span>{
  <span class="hljs-keyword">constructor</span>(name,work){
     <span class="hljs-keyword">this</span>.name = name
    <span class="hljs-keyword">this</span>.work = work
  }
  show(){
    <span class="hljs-built_in">console</span>.log(<span class="hljs-string">'My name is %s,My work is %s'</span>,<span class="hljs-keyword">this</span>.name,<span class="hljs-keyword">this</span>.work)
  }
}

<span class="hljs-class"><span class="hljs-keyword">class</span> <span class="hljs-title">Student</span> <span class="hljs-keyword">extends</span> <span class="hljs-title">Person</span> </span>{
   <span class="hljs-keyword">constructor</span>(name,work){
       <span class="hljs-keyword">super</span>(name,work)
   }
}
<span class="hljs-keyword">const</span> s = <span class="hljs-keyword">new</span> Student(<span class="hljs-string">'zhangsan'</span>,<span class="hljs-string">'学生'</span>)
s.show() <span class="hljs-comment">// My name is zhangsan,My work is 学生</span>
</code></pre><p>es6 应用 extend及super关键字 实现继承。</p>
<p><span id="LPnzS"></span></p>
<h3 id="es5继承-vs-es6继承" class="heading">Es5继承 vs Es6继承</h3>
<p>完整代码</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Person</span>(<span class="hljs-params">name, work</span>) </span>{
  <span class="hljs-keyword">this</span>.name = <span class="hljs-string">'ipenman'</span>
  <span class="hljs-keyword">this</span>.work = <span class="hljs-string">'程序员'</span>
}
Person.prototype.show = <span class="hljs-function"><span class="hljs-keyword">function</span>(<span class="hljs-params"></span>) </span>{
  <span class="hljs-built_in">console</span>.log(<span class="hljs-string">'My name is %s,My work is %s'</span>, <span class="hljs-keyword">this</span>.name, <span class="hljs-keyword">this</span>.work)
}
<span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">Student</span>(<span class="hljs-params"></span>) </span>{
  Person.call(<span class="hljs-keyword">this</span>)
}
Student.prototype = <span class="hljs-built_in">Object</span>.create(Person.prototype)
Student.prototype.constructor = Student
<span class="hljs-class"><span class="hljs-keyword">class</span> <span class="hljs-title">Person1</span></span>{
  <span class="hljs-keyword">constructor</span>(name,work){
     <span class="hljs-keyword">this</span>.name = name
    <span class="hljs-keyword">this</span>.work = work
  }
  show(){
    <span class="hljs-built_in">console</span>.log(<span class="hljs-string">'My name is %s,My work is %s'</span>,<span class="hljs-keyword">this</span>.name,<span class="hljs-keyword">this</span>.work)
  }
}

<span class="hljs-class"><span class="hljs-keyword">class</span> <span class="hljs-title">Student1</span> <span class="hljs-keyword">extends</span> <span class="hljs-title">Person1</span> </span>{
   <span class="hljs-keyword">constructor</span>(name,work){
       <span class="hljs-keyword">super</span>(name,work)
   }
}
<span class="hljs-keyword">const</span> s1 = <span class="hljs-keyword">new</span> Student1(<span class="hljs-string">'zhangsan'</span>,<span class="hljs-string">'学生'</span>)
s.show()
</code></pre><p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904025142329357/image-005.png"><figcaption></figcaption></figure><p></p>
<p>通过上图对比得出，我们实现的es5完美继承和es6 class 继承达到同样的效果！<br></p><figure><img alt="5DC08944.jpg" src="/assets/img/posts/juejin-6844904025142329357/image-006.jpg"><figcaption></figcaption></figure><p></p>
<p><span id="K7jvP"></span></p>
<h2 id="最后" class="heading">最后</h2>
<p>到这终于完成了，噫吁嚱，到这是否给各位小伙伴解惑了呢？点赞加关注哦！</p>
<p><span id="u6Ydw"></span></p>
<h2 id="参考" class="heading">参考</h2>
<p><a target="_blank" href="https://es6.ruanyifeng.com/#docs/class">《ES6标准入门》</a><br><a target="_blank" href="https://book.douban.com/subject/10549733/">《JavaScript权威指南》</a></p>
{% endraw %}
