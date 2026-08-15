---
layout: post
title: "重学js系列——数字"
excerpt: "本文的“导火索”由搞java的老弟“炸”出来的。 他问我有没有出现这样的情况：后端接口返回的数字过大，前端接收到的与后端的不一致。 随后的反应是js的取值范围，本“大家”知道js 的数字（Number）采用的是64位双精度浮点型，根据8位最大可表示 256（2^8）个数，取值范…"
date: 2019-12-24 17:13:39 +0800
categories: ["JavaScript"]
tags: ["JavaScript"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6844904030603313160"
---

{% raw %}
<p>本文的“导火索”由搞java的老弟“炸”出来的。<br></p>
<h2 id="火车上的发问" class="heading">火车上的发问</h2>
<p>他问我有没有出现这样的情况：后端接口返回的数字过大，前端接收到的与后端的不一致。<br>开始听并不是很理解他的意思，细问后，原来做分布式用到19位雪花ID，传递到前端，会导致精度丢失！<br>听明白之后，我只知道js小数的精度丢失，难道数大也会出现？<br>
<br></p><figure><img alt="70B077B3.png" src="/assets/img/posts/juejin-6844904030603313160/image-001.png"><figcaption></figcaption></figure><br>
<br>随后的反应是js的取值范围，本“大家”知道js 的数字（Number）采用的是64位双精度浮点型，根据8位最大可表示 256（2^8）个数，取值范围为 -128 ~ 127，所以按照这个算法，2^64具体多少也没算，寻思怎么着也超过19位了，不应该存在他说的这种情况啊。<br>
<br>带着这个疑问，写了个接口测试了一下确实！当我输入到18位的时候，就已经不准确了。<br>
<br><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904030603313160/image-002.png"><figcaption></figcaption></figure><p></p>
<p>于是，本“大家”决定要探个究竟 🤔
<span id="zGjnB"></span>
<span id="CxPD0"></span></p>
<h2 id="number" class="heading">Number</h2>
<p>第一步，凭借上次学习位运算的印象，打开了MDN，找到<a target="_blank" href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Number">Number</a>这一章节</p>
<p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904030603313160/image-003.png"><figcaption></figcaption></figure><p></p>
<p>文中说明，js 能够准确表示的整数范围在 <strong>-2^53~2^53</strong>之间，打开计算器换成具体数值为 -9007199254740992~9007199254740992。</p>
<p><span id="6UBRe"></span></p>
<h3 id="属性和方法" class="heading">属性和方法</h3>
<p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904030603313160/image-004.png"><figcaption></figcaption></figure><br><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904030603313160/image-005.png"><figcaption></figcaption></figure><p></p>
<p>接着打开ECMAScript 标准，详情如下（看着实在费劲😵）</p>
<p></p><figure><img alt="image.png" src="/assets/img/posts/juejin-6844904030603313160/image-006.png"><figcaption></figcaption></figure><p></p>
<p></p><figure><img alt="20191224114825.gif" src="/assets/img/posts/juejin-6844904030603313160/image-007.gif"><figcaption></figcaption></figure><br>看到这样的专业术语英文，再考虑一下我的英文水平，却步，只能翻译+猜，大概读了一下，但是结果还是一知半解😵<br>接着又搬出我的宝典大犀牛《JavaScript权威指南》，找到Number这一章节有相关介绍，暗自高兴。<p></p>
<p>文中介绍：</p>
<blockquote>
<p>JavaScript不区分整数值和浮点数值，所有数字均用浮点数值表示。JavaScript采用IEEE 754标准定义的64位浮点格式表示数字，这意味着它能表示最大值是 ±1.7976931348623157x10^308，最小值是±5x10^-324。
按照JavaScript中的数字格式，能够表示的整数范围是-9007199254740992~9007199254740992（即-2^53~2^53），包含边界值。如果使用了超过此范围的整数，则无法保证低位数字的精度。</p>
</blockquote>
<p>看完这三份文献，都有表明js的数字的类型，整数取值范围这些定义、结论。<br>此时，我有几个问题：<br>
<br><strong>1.为什么整数范围是 2的53次方，而不是其他次方？</strong><br><strong>2.超过的数应该如何表示？</strong><br>
<br>上面除此之外也都提到<strong>了IEEE 754标准定义的浮点格式</strong>并且其他语言的浮点型格式也遵循这一标准。<br>根据上面2个问题，又是一顿找资料！<br>
<br></p><figure><img alt="E79DD0117A25BDEF3EF602B390C30E9B.jpg" src="/assets/img/posts/juejin-6844904030603313160/image-008.jpg"><figcaption></figcaption></figure><p></p>
<p><span id="NoMQK"></span></p>
<h2 id="ieee-754-标准" class="heading">IEEE 754 标准</h2>
<p>由于我这里本地打不开<a target="_blank" href="https://en.wikipedia.org/wiki/IEEE_754"><strong>IEEE 754标准文档</strong></a>，但是我找别人保存下来了，<a target="_blank" href="https://www.yuque.com/attachments/yuque/0/2019/html/596392/1577177493209-01d0244d-dd14-4a21-8216-4abf41af1ab7.html?_lake_card=%7B%22uid%22%3A%221577177493136-0%22%2C%22src%22%3A%22https%3A%2F%2Fwww.yuque.com%2Fattachments%2Fyuque%2F0%2F2019%2Fhtml%2F596392%2F1577177493209-01d0244d-dd14-4a21-8216-4abf41af1ab7.html%22%2C%22name%22%3A%22IEEE+754+-+Wikipedia.htm%22%2C%22size%22%3A268085%2C%22type%22%3A%22text%2Fhtml%22%2C%22ext%22%3A%22htm%22%2C%22progress%22%3A%7B%22percent%22%3A99%7D%2C%22status%22%3A%22done%22%2C%22percent%22%3A0%2C%22id%22%3A%22xOu1C%22%2C%22card%22%3A%22file%22%7D">IEEE 754 - Wikipedia.htm</a>需要的小伙伴保存下来在查看。<br>下面内容转载于<a target="_blank" href="https://blog.csdn.net/wallc/article/details/72674712">https://blog.csdn.net/wallc/article/details/72674712</a></p>
<p><span id="NK6xG"></span></p>
<h3 id="组成" class="heading">组成</h3>
<p><strong>浮点格式可分为符号位s，指数位e以及尾数位f三部分。</strong><br>其中真实的指数E相对于实际的指数有一个偏移量，所以E的值应该为e-Bias，Bias即为指数偏移量。这样做的好处是便于使用无符号数来代替有符号的真实指数。尾数f字段代表纯粹的小数，它的左侧即为小数点的位置。规格化数的隐藏位默认值为1，不在格式中表达。<br>
<br>在IEEE-754 标准下，浮点数一共分为：</p>
<ul>
<li>NaN：即Not a Number。非数的指数位全部为1 同时尾数位不全为0。在此前提下，根据尾数位首位是否为1，NaN 还可以分为SNaN 和QNaN 两类。前者参与运算时将会发生异常。</li>
<li>无穷数：指数位全部为1 同时尾数位全为0。大。</li>
<li>规格化数：指数位不全为1 同时尾不全为0。此时浮点数的隐含位有效，其值为1。</li>
<li>非规格化数：指数位全为0 且尾数位不全为0。此时隐含位有效，值为0。另外需要注意，以单精度时为例，真实指数E 并非0-127=-127，而是-126，这样一来就与规格化下最小真实指数E=1-127=-126 达成统一，形成过度。</li>
<li>0 ：指数位与尾数位都全为0，根据符号位决定正负。</li>
</ul>
<p><span id="INdKP"></span></p>
<h3 id="浮点的舍入模式" class="heading">浮点的舍入模式</h3>
<p>在存储单元的物理限制下，无限精度的浮点数需要根据需求进行舍入操作，一般<br>可分为四类：</p>
<p>1．最近舍入，即向距离最近的浮点数舍入，若存在两个同样接近的数，则选择偶数作为舍入值。<br>2．向零舍入，又称截断舍入，将多余的精度位截掉，即取舍入后绝对值较小的值。<br>3．正向舍入，也称正无穷舍入，即舍入后结果大于原值。<br>4．负向舍入：也称负无穷舍入，即舍入后结果小于原值。</p>
<p>所以，对于js来说，浮点格式分为 符号位s（最高位），指数为e（符号位后11位），尾数f（指数位后52位）。这也就是上面为什么说，是2的52次方了，而超过范围的值，用Infinity:无穷数，分为正负无穷数。</p>
<p><span id="ZNC4E"></span></p>
<h2 id="为什么010203number的计算" class="heading">为什么0.1+0.2≠0.3？（Number的计算）</h2>
<p>这其中的原因是二进制小数的储存和计算问题</p>
<p><span id="i7GzC"></span></p>
<h3 id="十进制换算二进制" class="heading">十进制换算二进制</h3>
<p>二进制满二进一。十进制2就是10。</p>
<ul>
<li>整数</li>
</ul>
<p>除二取余法：除以2，直到商为0结束，把余数从后到前排列。<br>
<br><strong>举例</strong><br>
十进制：15</p>
<table>
<thead>
<tr>
<th>十进制被除数</th>
<th>运算符</th>
<th>除数</th>
<th>商</th>
<th>余数</th>
</tr>
</thead>
<tbody>
<tr>
<td>15</td>
<td>÷</td>
<td>2</td>
<td>7</td>
<td>1</td>
</tr>
<tr>
<td>7</td>
<td>÷</td>
<td>2</td>
<td>3</td>
<td>1</td>
</tr>
<tr>
<td>3</td>
<td>÷</td>
<td>2</td>
<td>1</td>
<td>1</td>
</tr>
<tr>
<td>1</td>
<td>÷</td>
<td>2</td>
<td>0</td>
<td>1</td>
</tr>
</tbody>
</table>
<p>把余数从下到上排列就是二进制的值 1111</p>
<ul>
<li>小数</li>
</ul>
<p>乘二取整法：小数部分乘以2，进位到整数位取出，继续乘以2，直到位数限制，最后将整数位从先到后排列。<br>
<br> <strong>举例</strong></p>
<ul>
<li>可除尽的十进制小数：0.125</li>
</ul>
<p>0.125 x 2 = 0</p>
<table>
<thead>
<tr>
<th>乘数（整数部分）</th>
<th>乘数（小数部分）</th>
<th>运算符</th>
<th>乘数</th>
<th>积（整数部分）</th>
<th>积（小数部分）</th>
</tr>
</thead>
<tbody>
<tr>
<td>0</td>
<td>125</td>
<td>x</td>
<td>2</td>
<td>0</td>
<td>25</td>
</tr>
<tr>
<td>0</td>
<td>25</td>
<td>x</td>
<td>2</td>
<td>0</td>
<td>5</td>
</tr>
<tr>
<td>0</td>
<td>5</td>
<td>x</td>
<td>2</td>
<td>1</td>
<td>0</td>
</tr>
</tbody>
</table>
<p><br>把整数部分的积从上到下排列0.001<br></p>
<ul>
<li>除不尽的小数：0.1</li>
</ul>
<table>
<thead>
<tr>
<th>乘数（整数部分）</th>
<th>乘数（小数部分）</th>
<th>运算符</th>
<th>乘数</th>
<th>积（整数部分）</th>
<th>积（小数部分）</th>
</tr>
</thead>
<tbody>
<tr>
<td>0</td>
<td>1</td>
<td>x</td>
<td>2</td>
<td>0</td>
<td>2</td>
</tr>
<tr>
<td>0</td>
<td>2</td>
<td>x</td>
<td>2</td>
<td>0</td>
<td>4</td>
</tr>
<tr>
<td>0</td>
<td>4</td>
<td>x</td>
<td>2</td>
<td>0</td>
<td>8</td>
</tr>
<tr>
<td>0</td>
<td>8</td>
<td>x</td>
<td>2</td>
<td>1</td>
<td>6</td>
</tr>
<tr>
<td>0</td>
<td>6</td>
<td>x</td>
<td>2</td>
<td>1</td>
<td>2</td>
</tr>
<tr>
<td>0</td>
<td>4</td>
<td>x</td>
<td>2</td>
<td>0</td>
<td>8</td>
</tr>
<tr>
<td>0</td>
<td>8</td>
<td>x</td>
<td>2</td>
<td>1</td>
<td>6</td>
</tr>
<tr>
<td>0</td>
<td>6</td>
<td>x</td>
<td>2</td>
<td>1</td>
<td>2</td>
</tr>
<tr>
<td>0</td>
<td>2</td>
<td>x</td>
<td>2</td>
<td>0</td>
<td>4</td>
</tr>
<tr>
<td>0</td>
<td>4</td>
<td>x</td>
<td>2</td>
<td>0</td>
<td>8</td>
</tr>
<tr>
<td>0</td>
<td>8</td>
<td>x</td>
<td>2</td>
<td>1</td>
<td>6</td>
</tr>
<tr>
<td>.......无限循环</td>
<td></td>
<td></td>
<td></td>
<td></td>
<td></td>
</tr>
</tbody>
</table>
<p><br>整数部分从上到下排列是0.000 1100 1100 .......<br>所以只能存到最大限度64位，剩下的就省略。</p>
<p><span id="gGoBo"></span></p>
<h3 id="计算" class="heading">计算</h3>
<p>js数值计算是化成二进制然后在进行计算，由于篇幅较长，也有大片的百科资料，本文只讲一下原理原因，不做<br>赘述了，详细可自行百科。<br>
<br>计算出现精度问题就是 由于这些<strong>除不尽的小数化成二进制只保留到可计算的位数然后进行计算</strong>，可想而知，<strong>两个无限小数相加也是无限小数，这一存一取就出现了精度问题</strong>，所以像这类 0.1+0.2≠0.3 就是这个原因<br>
<br></p>
<p><span id="nmchR"></span></p>
<h2 id="超过最大整数的取值范围前后端交互的解决办法" class="heading">超过最大整数的取值范围，前后端交互的解决办法</h2>
<p>百度了一顿，看了下各种解决方案，大部分都是让后端把Long类型的大数字转换成字符串String，进行传递，有少部分的是在前端进行解决，详细看了一下代码，太麻烦了，说实话，对于这方面挺失望的，js，感觉是真low，这里推荐用中间件<a target="_blank" href="https://mikemcl.github.io/bignumber.js/">bigNumber.js</a>&nbsp;来解决</p>
<p><span id="5AJV6"></span></p>
<h2 id="需要了解的知识点与总结" class="heading">需要了解的知识点与总结</h2>
<p>1.JavaScript采用IEEE 754标准定义的64位浮点格式表示数字<br>2.浮点格式分为 符号位s（最高位），指数为e（符号位后11位），尾数f（指数位后52位）<br>3.最大值是 ±1.7976931348623157x10^308，最小值是±5x10^-324<br>4.整数范围是-9007199254740992~9007199254740992（即-2^53~2^53），属于安全整数，超过安全整数的会出现低位丢失精度<br>5.小数计算推荐bigNumber.js，或将小数化整数进行计算，在化小数</p>
<p><span id="cBuvb"></span></p>
<h2 id="参考" class="heading">参考</h2>
<p><a target="_blank" href="https://book.douban.com/subject/10549733/">《JavaScript权威指南》</a><br><a target="_blank" href="https://en.wikipedia.org/wiki/IEEE_754">《IEEE 754标准》</a><br><a target="_blank" href="https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Number">《JavaScript Number MDN》</a><br><a target="_blank" href="https://blog.hooperui.com/js%e9%ad%94%e6%b3%95%e5%a0%82%ef%bc%9a%e5%bd%bb%e5%ba%95%e7%90%86%e8%a7%a30-1-0-2-0-30000000000000004%e7%9a%84%e8%83%8c%e5%90%8e/">《赵昊鹏的博客》</a><br><a target="_blank" href="https://demon.tw/copy-paste/javascript-precision.html">《Demon's Blog》</a><br><a target="_blank" href="https://blog.csdn.net/wallc/article/details/72674712">《QAWRA》</a></p>
<p><span id="D1FhM"></span></p>
<h2 id="最后" class="heading">最后</h2>
<p>如果有疑问或不同意见，评论区见，帮助到你，记得关注，加点赞，感谢！</p>
{% endraw %}
