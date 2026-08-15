---
layout: post
title: "第五章 软件构建中的设计"
excerpt: "松散耦合意味着在设计时让程序的各个组成部分之间关联最小，合理抽象、封装及信息隐藏等原则。 让大量的类使用某个给定的类。意味着设计出的系统很好的利用了在较低层次上的工具类。 让一个类少量或适中地使用其他的类。高扇出（超过7个）可能变得过于复杂，无论考虑某个子程序调用其他子 程序的…"
date: 2019-11-29 14:57:08 +0800
categories: ["程序人生","架构"]
tags: ["代码大全","代码质量","架构"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6844904007371063309"
---

{% raw %}
<p><span id="0oyky"></span></p>
<h2 id="一理想的设计特征" class="heading">一、理想的设计特征</h2>
<ul>
<li><strong>最小的复杂度</strong></li>
</ul>
<p>**</p>
<ul>
<li>
<p><strong>易于维护</strong></p>
</li>
<li>
<p><strong>松散耦合</strong></p>
</li>
</ul>
<p>松散耦合意味着在设计时让程序的各个组成部分之间关联最小，合理抽象、封装及信息隐藏等原则。</p>
<ul>
<li>
<p><strong>可扩展性</strong></p>
</li>
<li>
<p><strong>可重用性</strong></p>
</li>
<li>
<p><strong>高扇入</strong></p>
</li>
</ul>
<p>让大量的类使用某个给定的类。意味着设计出的系统很好的利用了在较低层次上的工具类。</p>
<ul>
<li><strong>低扇出</strong></li>
</ul>
<p>让一个类少量或适中地使用其他的类。高扇出（超过7个）可能变得过于复杂，无论考虑某个子程序调用其他子&nbsp; &nbsp; &nbsp; 程序的量，还是考虑某个类使用其他类的量，低扇出的原则都是有益的。</p>
<ul>
<li>
<p><strong>可移植性</strong></p>
</li>
<li>
<p><strong>精简性</strong></p>
</li>
<li>
<p><strong>层次性</strong></p>
</li>
<li>
<p><strong>标准技术</strong></p>
</li>
</ul>
<p>要尽量使用标准化、常用的方法，让整个系统给人一种熟悉的感觉。<br></p>
<p><span id="Zugkg"></span></p>
<h2 id="二设计构造块启发式方法" class="heading">二、设计构造块：启发式方法</h2>
<p><span id="0Pt3a"></span></p>
<h2 class="heading"></h2>
<p><span id="PRPJr"></span></p>
<h3 id="1使用对象进行设计的步骤" class="heading">1.使用对象进行设计的步骤</h3>
<ul>
<li>便是对象及其属性（方法（method）和数据（data））</li>
<li>确定可以对各个对象进行的操作</li>
<li>确定各个对象能对其他对象进行的操作（包含和继承）</li>
<li>确定对象的哪些不分对其他对象可见——哪些部分可以公用的，哪些是私用的</li>
<li>定义每个对象的公开接口</li>
</ul>
<p><span id="XKnpU"></span></p>
<h3 id="2抽象" class="heading">2.抽象</h3>
<p>抽象是一种能让你在关注某一概念的同事可以放心地忽略其中一些细节的能力。基类就是一种抽象，他使你能集中精力关注一组派生类所具有的共同特征，并在基类层次上忽略各个具体派生类的细节。<br></p>
<p><span id="2T1QZ"></span></p>
<h3 id="3封装" class="heading">3.封装</h3>
<p>封装是说，不只是让你能用简化的视图来看复杂的概念，同时还不能让你看到复杂概念的任何细节。你能看的到的就是你能——全部——得到的。<br></p>
<p><span id="iBzaQ"></span></p>
<h3 id="4继承" class="heading">4.继承</h3>
<p>当多个对象有相同的和不同的属性和方法时：抽象封装出相同的，然后继承基类，再写不同的。</p>
<p><span id="AQSmG"></span></p>
<h4 id="继承的好处" class="heading">继承的好处</h4>
<ul>
<li><strong>在于它能很好地辅佐抽象的概念</strong>。抽象是从不同的细节层次来看对象的。</li>
<li><strong>继承能简化编程的工作。</strong></li>
</ul>
<p><span id="O8aCA"></span></p>
<h3 id="5信息隐藏" class="heading">5.信息隐藏</h3>
<p>信息隐藏是软件的首要技术使命中格外重要的一种启发式方法，因为它强调的就是隐藏复杂度。<br></p>
<p><span id="jNM6Y"></span></p>
<h4 id="秘密和隐私权" class="heading">秘密和隐私权</h4>
<p>在设计一个类的时候，一项关键性的决策就是确定类的哪些特征应该对外可见，哪些特性隐藏起来，仅仅是内部使用。<strong>类的接口应该尽可能少的暴露内部工作机制</strong>。<br></p>
<p><span id="g540c"></span></p>
<h3 id="6保持松散耦合" class="heading">6.保持松散耦合</h3>
<p>耦合度表示类与类之间或者子程序与子程序之间的紧密程度。耦合度设计的目标是创建出小的、直接的、清晰的类或子程序，是它们与其他类或子程序之间关系尽可能的灵活，这就被称作“松散耦合”。
<span id="yBfSc"></span></p>
<h4 class="heading"></h4>
<p><span id="MzRDQ"></span></p>
<h4 id="耦合标准" class="heading">耦合标准</h4>
<p>衡量模块之间的耦合度标准：</p>
<ul>
<li><strong>规模</strong>：这里的规模指的是模块之间的连接数。对于耦合度来说，小就是美，因为只要做很少的事情，就可以把其它模块与一个有着很小的接口模块连接起来。</li>
<li><strong>可见性</strong>：两个模块之间的连接的显著程度。</li>
<li><strong>灵活性</strong></li>
</ul>
<p><span id="RLAVy"></span></p>
<h4 id="耦合的种类" class="heading">耦合的种类</h4>
<ul>
<li><strong>简单数据参数耦合</strong>：两个模块之间通过参数传递数据。</li>
<li><strong>简单对象耦合</strong>：一个模块实例化另一个模块</li>
<li><strong>对象参数耦合</strong>：obj1要求obj2传给一个对象obj3，那么这两个模块就是对象参数耦合的。
<span id="DqtsH"></span></li>
</ul>
<h3 id="7查阅常用的设计模式" class="heading">7.查阅常用的设计模式</h3>
<p><span id="15mtO"></span></p>
<h4 id="常见的设计模式" class="heading">常见的设计模式：</h4>
<table>
<thead>
<tr>
<th>模式</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr>
<td>Abstract Factory(抽象工厂)</td>
<td>通过指定对象组的种类而非单个对象的类型来支持创建一组相关的对象</td>
</tr>
<tr>
<td>Adapter(适配器)</td>
<td>把一个类的接口转变成另一个接口</td>
</tr>
<tr>
<td>Bridge(桥接)</td>
<td>把接口和实现分离开来，使它们可以独立地变化</td>
</tr>
<tr>
<td>Composite(组合)</td>
<td>创建一个包含其他同类对象的对象，使得客户代码可以与最上层对象交互而无需考虑所有的细节对象</td>
</tr>
<tr>
<td>Decrorator(装饰器)</td>
<td>给一个对象动态地添加职责，而无须为了每一种可能的职责配置情况去创建特定的子类（派生类）</td>
</tr>
<tr>
<td>Facade(外观)</td>
<td>为没有提供一致接口的代码提供一个一致的接口</td>
</tr>
<tr>
<td>Iterator(迭代器)</td>
<td>提供一个服务对象来顺序地访问一组元素中的各个元素</td>
</tr>
<tr>
<td>Observer(观察者)</td>
<td>是一组相关对象相互同步，方法是让另一个对象负责：在这组对象中的任何一个发生改变时，由它把这种变化通知给这个组里的所有对象</td>
</tr>
<tr>
<td>Singleton(单例)</td>
<td>为有且仅有一个实例的类提供一种全局访问功能</td>
</tr>
<tr>
<td>Strategy(策略)</td>
<td>定义一组算法或者行为，使得它们可以动态地相互替换</td>
</tr>
<tr>
<td>Template Method(模板方法)</td>
<td>定义一个操作的算法结构，但是把部分实现的细节留个子类（派生类）</td>
</tr>
</tbody>
</table>
<p><span id="12txN"></span></p>
<h4 id="设计模式的好处" class="heading">设计模式的好处：</h4>
<ul>
<li>通过提供现成的抽象来减少复杂度</li>
<li>通过把常见解决方案的细节予以制度化来减少出错：找现成的模式解决方案</li>
<li>通过提供多种设计方案而带来启发性的价值</li>
<li>通过把设计对话提升到一个更高的层次上来建华交流</li>
</ul>
<p>关于模式的学习，详细寻找相关书籍。
<span id="z8ZFt"></span></p>
<h3 id="8其他的启发方法" class="heading">8.其他的启发方法</h3>
<p><span id="uhfTC"></span></p>
<h4 id="高内聚性" class="heading">高内聚性</h4>
<p>内聚性源于结构化设计，并且经常与耦合度结合在一起讨论。内聚性指的是类内部的子程序或者子程序内的所有代码在支持一个中心目标上的紧密程度。
<span id="cZgC7"></span></p>
<h4 id="构造分层结构" class="heading">构造分层结构</h4>
<p>分层结构指的是一种分层的信息结构。就是分层，类似于MVC（个人理解）
<span id="z7nXD"></span></p>
<h4 id="分配职责" class="heading">分配职责</h4>
<p>问每一个对象该对什么负责。
<span id="a4LKj"></span></p>
<h4 id="保持设计的模块化" class="heading">保持设计的模块化</h4>
{% endraw %}
