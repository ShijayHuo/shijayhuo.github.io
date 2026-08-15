---
layout: post
title: "koa核心扩展-中间件机制"
excerpt: "写这篇文章的初衷来源于跟一个搞 java 的老弟讨论静态服务的话题。 老弟： node 是如何实现一个静态服务的。 我：node 只读过 koa-static 的源码(其他中间件的做法应该也差不多)。 然后我巴拉巴拉...加上给他截图的源码。 重点来了... 一连串的问题，既然…"
date: 2020-07-06 22:06:23 +0800
categories: ["后端","框架","架构"]
tags: ["Node.js","Koa","架构"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6847902218994221070"
---

{% raw %}
<p>写这篇文章的初衷来源于跟一个搞 java 的老弟讨论静态服务的话题。</p>
<p>老弟： node 是如何实现一个静态服务的。</p>
<p>我：node 只读过 koa-static 的源码(其他中间件的做法应该也差不多)。</p>
<p>然后我巴拉巴拉...加上给他截图的源码。</p>
<p>重点来了...</p>
<p>老弟： <strong>await next() 这行代码什么意思，next 对象是什么，他怎么知道 next 下一个要执行的是什么？</strong></p>
<p>一连串的问题，既然要刨根问底，那么我也只能整理思路从源码出发进行讲解，随后也就有了本篇文章，记录一下。</p>
<h2 id="源码分析" class="heading">源码分析</h2>
<p>废话环节结束，进入正题，直接上源码：</p>
<p></p><figure><img alt="koa核心扩展-中间件机制 配图" src="/assets/img/posts/juejin-6847902218994221070/image-001.jpg"><figcaption></figcaption></figure><p></p>
<p>可以看到这段代码非常简短，也比较简单。这段源码是 koa-compose 这个中间件，处理所有通过 use 注册的中间件，接下来分析他做了什么。</p>
<p>图上可以看出他 return 出的是一个函数，也是核心代码，按照逐行。</p>
<ul>
<li>第一行，这句话的意思是检查参数是否是数组，如果不是，抛错（保证传进来的必须是一个中间件数组）。</li>
<li>2，3，4 遍历检查该参数的元素是否是 function，若有，抛错。</li>
</ul>
<p>剩下的是关键代码：</p>
<p><strong>function (context, next)</strong> context 就是我们日常用的 context 对象，在 http 监听到相应路由的时候会传入(koa 里面有，这里不介绍了)，<strong>next</strong> 等下解释，往下看。
这个函数 return 的是 dispatch 函数执行返回的对象， dispatch 后面会发现是一个递归函数，根据 i 动态执行，return 的值有三种情况：</p>
<ul>
<li>Promise.reject(err)</li>
<li>Promise.resolve()</li>
<li>Promise.resolve(fn())</li>
</ul>
<h3 id="dispatch" class="heading">dispatch</h3>
<p>第一行: i &lt;= index, 符合条件，抛错。这里的错误有两种情况：</p>
<ol>
<li>i 为 初始值 -1 时，小于或等于 -1 都属于下标越界。</li>
<li>当前中间件和上次或上次以前的中间件是同一值，表示已经调用过了(这里是组装，最后面会讲到)，通常出现这种情况是因为注册了多次或传进来的中间件数组有重复。</li>
</ol>
<p>第二行：index = i，更改 index，备下一次迭代做检查，是为上一行服务的。</p>
<p>第三行：取出索引为 i 的中间件，下面的 fn 均是。</p>
<p>第四行：检查是否是最后一个中间件的下一个元素，是，把 fn 替换 为 next。</p>
<p>第五行：实际上这行是检查第四行，如果没有传 next，说明没有要初始化的中间件了，返回 Promise.resolve()。</p>
<p>第六行：跳过。</p>
<h4 id="第七行精华在这里品你细品" class="heading">第七行：精华在这里！品，你细品...</h4>
<ul>
<li>context，把 context 传递到 fn 中。</li>
<li>dispatch.bind：<strong>bind</strong>，返回的是一个懒加载函数，第一个是引用指向，第二个就是把 下一个索引传进去，作用实际上就是把下一个中间件传递。</li>
</ul>
<p>ok，完整代码就分析完了，然后全部串起来，仔细想，这块代码最后干了啥！！！
如果一次一次执行，就会发现 最初的是 [fn1,fn2,fn3,fn4,fn5]，最后变为...这里还是写伪代码比较直观</p>
<pre><code class="hljs js" lang="js"><span class="hljs-function"><span class="hljs-keyword">function</span> <span class="hljs-title">finalFn</span>(<span class="hljs-params">ctx</span>) </span>{
  <span class="hljs-keyword">return</span> <span class="hljs-built_in">Promise</span>.resolve(f1(ctx,
    <span class="hljs-built_in">Promise</span>.resolve(f2(ctx,
        <span class="hljs-built_in">Promise</span>.resolve(f3(ctx,
            <span class="hljs-built_in">Promise</span>.resolve(f4(ctx,
                <span class="hljs-built_in">Promise</span>.resolve(f5(ctx,
                    <span class="hljs-built_in">Promise</span>.resolve()
                    ))
                ))
            ))
        ))
    ))
}
</code></pre><p>更简化来表示 f1(fn2(f3(f4(f5()))))，到这里就很清楚了这个中间件做了什么事情了吧！
上面整理的结果，也就是大家常说的 <strong>洋葱模型</strong> ，因为他真的很像洋葱，一层一层拨开（心里的BGM有点刹不住了…）
下面上两张图：<br>
</p><figure><img alt="koa核心扩展-中间件机制 配图" src="/assets/img/posts/juejin-6847902218994221070/image-002.jpg"><figcaption></figcaption></figure><p></p>
<p></p><figure><img alt="koa核心扩展-中间件机制 配图" src="/assets/img/posts/juejin-6847902218994221070/image-003.jpg"><figcaption></figcaption></figure><p></p>
<p>觉得很有意思的同时，咱们再想一下为什么要这么做呢？其实，这个中间件处理机制跟着常用设计模式的<strong>责任链模式</strong>极为相像，责任链模式就是采用引用传递的模式来执行下个操作，好处也是面向对象中老生常谈的<strong>解耦</strong>，还有一个好处是<strong>灵活性</strong>，允许动态的新增，修改或删除等操作。</p>
<h2 id="示例" class="heading">示例</h2>
<p>下面通过写一个中间件来体验一下。</p>
<pre><code class="hljs js" lang="js"><span class="hljs-keyword">const</span> koa = <span class="hljs-built_in">require</span>(<span class="hljs-string">"koa"</span>);
<span class="hljs-keyword">const</span> parseBody = <span class="hljs-built_in">require</span>(<span class="hljs-string">"koa-body"</span>);
<span class="hljs-keyword">const</span> app = <span class="hljs-keyword">new</span> koa();
app.use(parseBody());
<span class="hljs-keyword">const</span> mergeParams = <span class="hljs-keyword">async</span> (ctx, next) =&gt; {
    ctx.params = {};
    <span class="hljs-built_in">Object</span>.assign(ctx.params, ctx.query, ctx.request.query);
    <span class="hljs-keyword">await</span> next();
}
app.use(mergeParams);
app.use(<span class="hljs-function"><span class="hljs-params">ctx</span> =&gt;</span> {
    <span class="hljs-built_in">console</span>.log(ctx.params);
    ctx.body = <span class="hljs-string">"success"</span>;
});
app.listen(<span class="hljs-number">3000</span>);
</code></pre><p>上边这段代码做的事情是给ctx对象创建一个params对象，将ctx.query和ctx.request.body 的参数都放到params里。</p>
<p>测试：
node serve.js
在浏览器，访问 <a target="_blank" href="http://127.0.0.1:3000/user?id=1">http://127.0.0.1:3000/user?id=1</a></p>
<h2 id="结语" class="heading">结语</h2>
<p>到这里本篇文章就结束了，篇幅挺小的代码，实现的功能却很强大，壮哉！追其源，观其质，乐哉！</p>
{% endraw %}
