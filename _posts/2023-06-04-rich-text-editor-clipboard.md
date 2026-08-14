---
layout: post
title: "编辑器系列-剪贴板"
excerpt: "剪贴板概述 在编辑器中复制/剪切的方式有两种： 系统剪贴板：快捷键触发 Ctrl/⌘ + C/X/V 浏览器剪贴板：工具栏或拦截快捷键触发 两种方式的区别：数据储存的位置不同，前者的数据是储存在系统的剪贴板中，后者存在浏览器中。 两者都可以基本满足复制/剪切，但是往往在线编辑器常用浏览器剪贴板，为什么呢？ 为什么..."
date: 2023-06-04 15:01:42 +0800
categories: ["前端"]
tags: ["富文本编辑器","JavaScript"]
source_platform: GitHub Pages
source_url: "https://aaaaaajie.github.io/2023/06/04/%E7%BC%96%E8%BE%91%E5%99%A8%E7%B3%BB%E5%88%97-%E5%89%AA%E8%B4%B4%E6%9D%BF/"
source_repository: "https://github.com/ShijayHuo/aaaaaajie.github.io"
---

{% raw %}
<h2 id="剪贴板概述">剪贴板概述</h2>
<p>在编辑器中复制/剪切的方式有两种：</p>
<ul>
<li>系统剪贴板：快捷键触发  <code>Ctrl/⌘ + C/X/V</code></li>
<li>浏览器剪贴板：工具栏或拦截快捷键触发</li>
</ul>
<p>两种方式的区别：数据储存的位置不同，前者的数据是储存在系统的剪贴板中，后者存在浏览器中。</p>
<p>两者都可以基本满足复制/剪切，但是往往在线编辑器常用浏览器剪贴板，为什么呢？</p>
<h3 id="为什么用浏览器剪贴板？">为什么用浏览器剪贴板？</h3>
<ol>
<li>触发动作的条件不确定，像最开始说的，用户可能使用快捷键也可能是用编辑器提供的工具栏，当用工具栏时，则需要发一个复制的命令，在客户端肯定是操作浏览器。</li>
<li>对于复杂元素系统剪贴板不识别，比如复制一个文本绘图插件元素粘贴到编辑器内，复制时需要对该元素进行识别，并且做更多灵活的动作，比如拦截特定情况。</li>
<li>安全性问题，比较难把控涉及到权限，数据保密等安全问题。</li>
</ol>
<h3 id="流程">流程</h3>
<p><img src="/assets/img/posts/aaaaaajie-b1950497/image-001.png" alt="image.png"></p>
<h3 id="事件">事件</h3>
<table>
<thead>
<tr>
<th></th>
<th>事件名称</th>
<th>系统快捷键</th>
<th>主动触发</th>
</tr>
</thead>
<tbody>
<tr>
<td>复制</td>
<td>oncopy</td>
<td><code>Ctrl/⌘ + C</code></td>
<td><code>document.execCommand('copy')</code></td>
</tr>
<tr>
<td>剪切</td>
<td>oncut</td>
<td><code>Ctrl/⌘ + X</code></td>
<td><code>document.execCommand('cut')</code></td>
</tr>
<tr>
<td>粘贴</td>
<td>onpaste</td>
<td><code>Ctrl/⌘ + V</code></td>
<td><code>document.execCommand('paste')</code></td>
</tr>
</tbody>
</table>
<p>示例：</p>
<p><img src="/assets/img/posts/aaaaaajie-b1950497/image-002.png" alt="image.png"></p>
<p><img src="/assets/img/posts/aaaaaajie-b1950497/image-003.png" alt="image.png"></p>
<h2 id="实现方式一：强大的-document-execCommand">实现方式一：强大的 document.execCommand</h2>
<p>这个 API 的木器主要用来操纵编辑器元素的，正如我给的标题，它非常“强大”，强大之处在于它支持的场景/命令非常全，除了上面复制/粘贴/剪切，还有一些以下命令：</p>
<table>
<thead>
<tr>
<th>命令名称</th>
<th>描述</th>
</tr>
</thead>
<tbody>
<tr>
<td>backColor</td>
<td>容器元素添加背景颜色</td>
</tr>
<tr>
<td>bold</td>
<td>切换文字粗体效果</td>
</tr>
<tr>
<td>createLink</td>
<td>创建锚链接</td>
</tr>
<tr>
<td>fontName</td>
<td>修改字体</td>
</tr>
<tr>
<td>fontSize</td>
<td>修改字体大小</td>
</tr>
<tr>
<td>heading</td>
<td>设置标题</td>
</tr>
<tr>
<td>insertImage</td>
<td>插入图片</td>
</tr>
<tr>
<td>insertOrderedList</td>
<td>插入有序列表</td>
</tr>
<tr>
<td>justifyLeft/Right/Center</td>
<td>所选内容文本对齐：左对齐、右对齐、居中对齐</td>
</tr>
<tr>
<td>outdent</td>
<td>缩进</td>
</tr>
<tr>
<td>undo/redo</td>
<td>撤销/重做</td>
</tr>
<tr>
<td>underline</td>
<td>切换下划线</td>
</tr>
</tbody>
</table>
<p>示例点  <a target="_blank" rel="noopener" href="https://execcommand-api.stackblitz.io/">这里</a>  。</p>
<p><img src="/assets/img/posts/aaaaaajie-b1950497/image-004.png" alt="image.png"></p>
<p>Wiki 插件工具栏的复制：</p>
<p><img src="/assets/img/posts/aaaaaajie-b1950497/image-005.png" alt="image.png"></p>
<h3 id="已被废弃"><strong>已被废弃</strong></h3>
<p>这个 API 非常方便地操作文本内容，但是它被废弃了，废弃的原因：</p>
<ol>
<li><strong>存在安全问题：可以修改浏览器设置、运行脚本</strong>  ，容易被恶意攻击。</li>
<li><strong>浏览器兼容问题：很多特性在不同浏览器操作不一致。</strong>  上面的示例中，工具栏的按钮置灰就是浏览器不支持的。</li>
</ol>
<p>取而代之的是 Clipboard API，见下节。</p>
<h2 id="实现方式二：Clipboard-API">实现方式二：Clipboard API</h2>
<p>该 API 一般用于剪贴板（复制/剪切/粘贴），相较于 execCommand 可以避免安全问题，同时也更加可靠和跨浏览器兼容。</p>
<p>提供的 API 也都是异步的，返回结构都是 Promise，方法如下：</p>
<ul>
<li><code>navigator.clipboard.writeText()</code>  ：将文本内容写入剪贴板。</li>
<li><code>navigator.clipboard.readText()</code>  ：从剪贴板中读取文本内容。</li>
<li><code>navigator.clipboard.write()</code>  ：将数据写入剪贴板。</li>
<li><code>navigator.clipboard.read()</code>  ：从剪贴板中读取数据。</li>
</ul>
<h3 id="clipboardData-和-DataTransfer">clipboardData 和 DataTransfer</h3>
<p>clipboardData 绑定于 Clipboard Event（copy、cut、paste），是其属性，数据结构 DataTransfer 对象的一种。</p>
<p>主要作用：</p>
<ul>
<li>访问全局剪贴板数据：  <code>event.clipboardData.setData(format, data)</code></li>
<li>设置全局剪贴板数据：  <code>event.clipboardData.getData(format)</code></li>
<li>清除全局剪贴板数据：  <code>event.clipboardData.clearData()</code></li>
</ul>
<p>DataTransfer 其他作用：</p>
<ul>
<li>可以存储文件类型</li>
<li>可操作的类型有：  <code>none</code>  ,   <code>copy</code>  ,   <code>copyLink</code>  ,   <code>copyMove</code>  ,   <code>link</code>  ,   <code>linkMove</code>  ,   <code>move</code>  ,   <code>all</code>   or   <code>uninitialized</code>  。</li>
<li>设置拖动的图像：  <code>DataTransfer.setDragImage()</code></li>
</ul>
<p>Ps：Wiki 中采用这种方式进行数据存取的。</p>
<p>一个操作 clipboard API 的示例片段：</p>
<p><img src="/assets/img/posts/aaaaaajie-b1950497/image-006.png" alt="image.png"></p>
<h3 id="navigator-clipboard-write-和-clipboardData-setData-有何区别？">navigator.clipboard.write 和 clipboardData.setData 有何区别？</h3>
<style>
table th:nth-of-type(2) {
    width: 30%;
}
table th:nth-of-type(3) {
    width: 25%;
}
table th:last-of-type {
    width: 40%;
}
</style>
<table>
<thead>
<tr>
<th></th>
<th>相同点</th>
<th>不同点</th>
<th></th>
<th></th>
</tr>
</thead>
<tbody>
<tr>
<td></td>
<td></td>
<td>触发方式</td>
<td>触发时机/来源</td>
<td>其他</td>
</tr>
<tr>
<td>navigator.clipboard.write</td>
<td>都可以向剪贴板写入数据</td>
<td>异步</td>
<td>任何时机,任何 JS 程序</td>
<td>第一次需要用户主动授权（浏览器弹框询问用户，如果拒绝则中断操作）</td>
</tr>
<tr>
<td>event.clipboardData.setData</td>
<td></td>
<td>同步</td>
<td>必须是 ClipboardEvent 来源之一（copy、cut、paste）</td>
<td>无</td>
</tr>
</tbody>
</table>
<h2 id="完整-Demo">完整 Demo</h2>
<p>预览：  <a target="_blank" rel="noopener" href="https://slate-demo.stackblitz.io/">https://slate-demo.stackblitz.io/</a></p>
<p>源码：  <a target="_blank" rel="noopener" href="https://stackblitz.com/edit/slate-demo?file=src%2Fclipboard.component.ts">https://stackblitz.com/edit/slate-demo?file=src%2Fclipboard.component.ts</a></p>
<h2 id="最后">最后</h2>
<p>本人最近计划写一个《揭秘富文本编辑器》系列（又名：编辑器那些事），记录曾经对编辑器好奇的一些知识，如果你也感兴趣，可以关注我，有好奇的点，也可以在下方留言评论告诉我，我会在后续更新。<br>
文中有不正确的观点和内容，还望告知，感谢 🌹</p>
<h2 id="参考">参考</h2>
<ul>
<li><a target="_blank" rel="noopener" href="https://developer.mozilla.org/zh-CN/docs/Web/API/Clipboard_API">https://developer.mozilla.org/zh-CN/docs/Web/API/Clipboard_API</a></li>
<li><a target="_blank" rel="noopener" href="https://developer.mozilla.org/zh-CN/docs/Web/API/DataTransfer">https://developer.mozilla.org/zh-CN/docs/Web/API/DataTransfer</a></li>
<li><a target="_blank" rel="noopener" href="https://developer.mozilla.org/zh-CN/docs/Web/API/Document/execCommand">https://developer.mozilla.org/zh-CN/docs/Web/API/Document/execCommand</a></li>
</ul>
{% endraw %}
