---
layout: post
title: "IO 多路复用"
excerpt: "什么是 IO 多路复用 IO 多路复用指的是一个线程去监听和管理多个文件句柄的同步 IO 模型。一旦有其中一个文件句柄完成就绪，就会通知应用程序进行相应的读写操作，如果没有任何文件句柄就会阻塞应用程序，交出 CPU。 文件句柄：在文件I/O中，要从一个文件读取数据，应用程序首先要调用操作系统函数并传送文件名，并选..."
date: 2023-02-10 15:23:55 +0800
categories: ["网络协议"]
tags: ["IO 多路复用","Linux"]
source_platform: GitHub Pages
source_url: "https://aaaaaajie.github.io/2023/02/10/io%E5%A4%9A%E8%B7%AF%E5%A4%8D%E7%94%A8/"
source_repository: "https://github.com/ShijayHuo/aaaaaajie.github.io"
---

{% raw %}
<h2 id="什么是-IO-多路复用">什么是 IO 多路复用</h2>
<p>IO 多路复用指的是<strong>一个线程去监听和管理多个文件句柄</strong>的同步 IO 模型。一旦有其中一个文件句柄完成就绪，就会通知应用程序进行相应的读写操作，如果没有任何文件句柄就会阻塞应用程序，交出 CPU。</p>
<blockquote>
<p>文件句柄：在文件I/O中，要从一个文件读取数据，应用程序首先要调用操作系统函数并传送文件名，并选一个到该文件的路径来打开文件。该函数取回一个顺序号，即文件句柄（file handle），该文件句柄对于打开的文件是唯一的识别依据。<a target="_blank" rel="noopener" href="https://baike.baidu.com/item/%E6%96%87%E4%BB%B6%E5%8F%A5%E6%9F%84/3978023">更多点这里</a></p>
</blockquote>
<h2 id="IO-多路复用的三种实现">IO 多路复用的三种实现</h2>
<ul>
<li>select</li>
<li>poll</li>
<li>epoll</li>
</ul>
<!-- flag of hidden posts -->
{% endraw %}
