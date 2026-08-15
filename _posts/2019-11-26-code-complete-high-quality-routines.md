---
layout: post
title: "《代码大全2》阅读笔记 第七章 高质量的子程序"
excerpt: "所谓降低复杂度就是通过创建子程序来完成一系列的操作，一旦程序写好，你就可以忘记具体实现的细节，只需知道他是用来干嘛的，简化了代码布局，使代码看起来更加易读。 避免代码重复，比较好理解，就是将多处用到相同代码的实现提取出来，那么多个不同的使用者用到这块相同的逻辑只需调一下函数，那…"
date: 2019-11-26 17:16:26 +0800
categories: ["程序人生"]
tags: ["代码大全","代码质量"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6844904005156487175"
---

{% raw %}
<h1 id="一创建子程序的正当理由" class="heading">一、创建子程序的正当理由</h1>
<ul>
<li><strong>降低复杂度</strong></li>
</ul>
<p>所谓降低复杂度就是通过创建子程序来完成一系列的操作，一旦程序写好，你就可以忘记具体实现的细节，只需知道他是用来干嘛的，简化了代码布局，使代码看起来更加易读。</p>
<ul>
<li><strong>避免代码重复</strong></li>
</ul>
<p>避免代码重复，比较好理解，就是将多处用到相同代码的实现提取出来，那么多个不同的使用者用到这块相同的逻辑只需调一下函数，那么复杂的多行代码就只需要写一遍，维护也更加方便，出了bug也只需要检查一处，修复也只需要修改一处的逻辑，这样代码也更加安全，节约代码空间和时间的成本，简直不要太爽！何乐而不为。</p>
<ul>
<li><strong>改善性能</strong></li>
</ul>
<p>上个特性已经提到，把代码集中到一处可以方便查出代码的运行效率低下，想用更搞笑的算法或更高效的语言重写代码也更加容易。</p>
<ul>
<li><strong>除此之外的理由：隔离复杂度、隐藏实现细节、隐藏全局数据、达到特定的重构目的等等。</strong></li>
</ul>
<h1 id="二在子程序层上设计" class="heading">二、在子程序层上设计</h1>
<ul>
<li><strong>功能的内聚性</strong></li>
</ul>
<p>功能内聚性是最强也是最好的一种内聚性，就是说让<strong>一个子程序仅执行一项操作</strong>。</p>
<h1 id="三好的子程序名字" class="heading">三、好的子程序名字</h1>
<p>命名的最高境界就是函数即注释，好的程序名字能清晰地描述子程序所做的一切，所谓见字如面。下面是有效地给子程序命名的指导原则：</p>
<ul>
<li>
<p><strong>描述子程序所做的所有事情</strong></p>
</li>
<li>
<p><strong>避免使用无意义的、模糊或表述不清的动词</strong></p>
</li>
<li>
<p><strong>最佳长度：9-15个字符</strong></p>
</li>
<li>
<p><strong>给函数命名是要对返回值有所描述</strong></p>
</li>
<li>
<p><strong>准确的对仗词</strong></p>
</li>
</ul>
<p>例如：add/remove open/close begin/end lock/unlock show/hide start/stop get/put get/set min/max first/last</p>
<h1 id="四子程序可以写多长" class="heading">四、子程序可以写多长？</h1>
<p>IBM所做的一项研究发现，最容易出错的是那些超过500行代码的自陈谷。超过500行之后，子程序的出错率就会与其长度成正比。在任何时候，复杂的算法总会导致更长的子程序。在这种情况下，可以允许子程序的长度有序的整张到100-200行。</p>
<h1 id="五如何使用子程序参数" class="heading">五、如何使用子程序参数</h1>
<ul>
<li>
<p><strong>参数顺序保持一致</strong></p>
</li>
<li>
<p><strong>使用所有的参数</strong></p>
</li>
</ul>
<p>如果有没有用到的，请删除</p>
<ul>
<li>
<p><strong>把状态或出错变量放在最后</strong></p>
</li>
<li>
<p><strong>不要把子程序的参数用作工作变量</strong></p>
</li>
</ul>
<p>把传入子程序的参数用作工作变量是很危险的，<strong>应该使用局部变量。</strong>
**</p>
<ul>
<li>
<p><strong>把子程序的参数个数大约限制在7个以内</strong></p>
</li>
<li>
<p><strong>确保实际参数与形式参数类型相匹配(弱类型语言中很可能因为参数类型发生错误)</strong></p>
</li>
</ul>
<h1 class="heading"></h1>
<h1 id="六使用函数是要特别考虑的问题" class="heading">六、使用函数是要特别考虑的问题</h1>
<ul>
<li><strong>什么时候使用函数，什么时候使用过程</strong></li>
</ul>
<p>函数：带有返回值&nbsp; &nbsp; &nbsp; 过程：工作方式、执行逻辑。
这两个你中有我，我中有你，有时候很难区别开来，所以这么来判断：
<strong>如果一个子程序的主要用途就是返回由其名字所指明的返回值，那么就该使用函数，否则就应该使用过程</strong>。
比如：</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">updateStatus</span>(<span class="hljs-params"></span>)</span>{
  <span class="hljs-keyword">return</span> DB.updateStatus()
}
<span class="hljs-keyword">if</span>(updateStatus()===<span class="hljs-string">'success'</span>){
  ...
}
</code></pre><p>修改为：</p>
<pre><code class="hljs javascript" lang="javascript"><span class="hljs-keyword">const</span> status = updateStatus()
<span class="hljs-keyword">if</span>(status === <span class="hljs-string">'success'</span>){
  ...
}
</code></pre><p>status变量就可以理解为函数，下面判断的逻辑像工作方式一样，就称为过程。如果什么情况就执行什么程序，就是过程。单纯的接收返回值就是函数。</p>
<h1 id="总结" class="heading">总结</h1>
<ul>
<li class="task-list-item">
<p><input checked="" disabled="" type="checkbox"> <strong>创建子程序最主要的目的是提高程序的客观理性，其中节省代码空间只是一个次要原因；提高可读性、可靠性和可修改行等原因都更重要一些。</strong></p>
</li>
<li class="task-list-item">
<p><input checked="" disabled="" type="checkbox"> <strong>有时候把一些简单的操作写成独立的子程序也非常有价值。</strong></p>
</li>
<li class="task-list-item">
<p><input checked="" disabled="" type="checkbox"> <strong>子程序可以按照其内聚性分为很多类，最佳的内聚性是功能上的内聚性：每个子程序只完成一个功能。</strong></p>
</li>
<li class="task-list-item">
<p><input checked="" disabled="" type="checkbox"> <strong>子程序的名字是他的质量的指示器。</strong></p>
</li>
<li class="task-list-item">
<p><input checked="" disabled="" type="checkbox"> <strong>只有在某个子程序的主要目的是返回其有起名字所描述的特定结果时，才应该使用函数。</strong></p>
</li>
</ul>
{% endraw %}
