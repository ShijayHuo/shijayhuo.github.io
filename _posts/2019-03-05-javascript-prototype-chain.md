---
layout: post
title: "__proto__和prototype的区别延伸到原型链"
excerpt: "先不说__proto__和prototype是个什么东西，只知道跟对象有关系就可以了。首先，我们先看一个例子： 从调试的控制台可以看出： 所以，要想比较这两者的区别，潜在的条件是必须 是在函数中。 那么，函数跟对象有什么关系呢？ 在这里需要声明：除了字符串、数字、true、fa…"
date: 2019-03-05 15:16:08 +0800
categories: ["JavaScript"]
tags: ["JavaScript"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6844903790345191437"
---

{% raw %}
<article>
        <h2 id="__proto__和prototype的区别延伸到原型链"><a id="user-content-__proto__和prototype的区别延伸到原型链" href="#__proto__和prototype的区别延伸到原型链"></a>__proto__和prototype的区别延伸到原型链</h2>
        <p>先不说__proto__和prototype是个什么东西，只知道跟对象有关系就可以了。首先，我们先看一个例子：</p>
        <pre><code>const o = { name: 'zhangsan', age: 24 };
const oFun = function(){
    this.name = "lisi";
    this.age = 23;
}
</code></pre>
        <p><a href="https://github.com/iPenManShip/blog/blob/master/public/image/__proto__&amp;prototype(1).png"><img src="/assets/img/posts/juejin-6844903790345191437/image-001.png" alt="__proto__和prototype的区别"></a></p>
        <p>从调试的控制台可以看出：</p>
        <pre><code><code>普通对象：\__proto__;
函数：\__proto__、prototype。
</code></code></pre>
        <p><strong>所以，要想比较这两者的区别，潜在的条件是必须 是在函数中。</strong></p>
        <p>那么，函数跟对象有什么关系呢？</p>
        <p>在这里需要声明：<strong>除了字符串、数字、true、false、null和undefined之外，JavaScript的值都是对象</strong>(摘自大犀牛的《javascript 权威指南》)，所以函数(function)也是对象的一种。</p>
        <p>好，确定了这两点，那么接下来我们的主体就是函数对象了，主题是__proto__、prototype。</p>
        <p>介绍一下prototype： <a href="https://github.com/iPenManShip/blog/blob/master/public/image/__proto__&amp;prototype(2).png"><img src="/assets/img/posts/juejin-6844903790345191437/image-002.png" alt="__proto__和prototype的区别"></a></p>
        <p>大概意思就是说，prototype是为其他对象提供共享属性的对象。当构造函数创建对象时，这个对象引用构造函数的prototype属性，添加对象的prototype的属性继承共享原型的所有对象共享。(摘自ECM <a href="https://www.ecma-international.org/ecma-262/5.1/#sec-4.3.5">https://www.ecma-international.org/ecma-262/5.1/#sec-4.3.5</a>)</p>
        <p>所以，prototype可以共享对象的属性，那么图一的oFun的prototype是Object的构造函数。</p>
        <p>再来看__proto__：</p>
        <p>__proto__属性（前后各两个下划线），<strong>用来读取或设置当前对象的prototype对象</strong>，他本质是一个<strong>内部属性</strong>，不是一个正式对外的api，由于浏览器的广泛支持，才加入了es6，__proto__调用的是Object.prototype.<strong>proto</strong>。(摘自阮一峰的《ES6标准入门》<a href="https://es6.ruanyifeng.com/#docs/object-methods)%E3%80%82">https://es6.ruanyifeng.com/#docs/object-methods)。</a></p>
        <p>从这里得出另一个区别：<strong>__proto__是es6加入的内部属性，不是正式对外的api</strong>。</p>
        <p>细致的看下图：</p>
        <p><a href="https://github.com/iPenManShip/blog/blob/master/public/image/__proto__&amp;prototype(3).png"><img src="/assets/img/posts/juejin-6844903790345191437/image-003.png" alt="__proto__和prototype的区别"></a> oFun的prototype指向的是Object的constructor，属性都是外部可以访问到的，共享的;oFunction的__proto__指向的是函数本身的一些属性和函数是隐式的，外部访问不到的。</p>
        <p>最后，我们在上述的例子中加一段代码：</p>
        <pre><code>const oFun = function(){
    this.name = "lisi";
    this.age = 23;
}

const f1 = new oFun();
const f2 = new oFun();
f1.name = 'fff';</code></pre>
        <p>new 函数创建的对象的示例用两张的图来阐述：</p>
        <p><a href="https://github.com/iPenManShip/blog/blob/master/public/image/__proto__&amp;prototype(4).png"><img src="/assets/img/posts/juejin-6844903790345191437/image-004.jpg" alt="__proto__和prototype的区别"></a></p>
        <p><a href="https://github.com/iPenManShip/blog/blob/master/public/image/__proto__&amp;prototype(5).png"><img src="/assets/img/posts/juejin-6844903790345191437/image-005.png" alt="__proto__和prototype的区别"></a></p>
        <p>这样结论就很明确了，可以总结为以下几点：</p>
        <p><strong>1.所有对象都有__proto__属性。</strong></p>
        <p><strong>2.只有函数对象才有prototype属性。</strong></p>
        <p><strong>3.protoype对象默认有两个属性：constructor 和 <strong>proto</strong>。</strong>
        </p>
        <p><strong>4.实例对象的__proto__指向的是函数的protoype</strong></p>
        <p><strong>5.函数对象的prototype属性是外部共享的，而__proto__是隐式的。</strong></p>
        <p><strong>6.函数和Object的__proto__的顶端是null</strong></p>
        <h2 id="参考"><a id="user-content-参考" href="#参考"></a>参考：</h2>
        <ul>
            <li>《ES6 标准入门》阮一峰 <a href="https://es6.ruanyifeng.com/#docs/object-methods">https://es6.ruanyifeng.com/#docs/object-methods</a></li>
            <li>《ECMA语言规范》 <a href="https://www.ecma-international.org/ecma-262/5.1/#sec-4.3.5">https://www.ecma-international.org/ecma-262/5.1/#sec-4.3.5</a></li>
            <li>《JavaScript深入之从原型到原型链》<a href="https://github.com/mqyqingfeng/Blog/issues/2">https://github.com/mqyqingfeng/Blog/issues/2</a></li>
            <li>《一张图理解prototype、proto和constructor的三角关系》<a href="https://www.cnblogs.com/xiaohuochai/p/5721552.html">https://www.cnblogs.com/xiaohuochai/p/5721552.html</a></li>
        </ul>
    </article>
{% endraw %}
