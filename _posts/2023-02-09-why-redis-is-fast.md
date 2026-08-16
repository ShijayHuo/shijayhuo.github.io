---
layout: post
title: "Redis 为什么快？"
excerpt: "从内存访问、高效的数据结构、单线程执行模型和 I/O 多路复用四个方面，理解 Redis 高吞吐量的来源。"
date: 2023-02-09 18:30:00 +0800
categories: ["后端", "数据库"]
tags: ["Redis"]
source_platform: PingCode
source_url: "https://coders.pingcode.com/wiki/spaces/ZSJL/pages/pxsfYP"
---

## 大纲

- 基于内存
- 单线程执行，减少 CPU 上下文切换和锁竞争
- 高效、简单的数据结构
- I/O 多路复用与非阻塞 I/O
- 高效的底层实现，以及与客户端之间的通信协议

## 内存访问

内存的访问速度远高于磁盘。Redis 将数据保存在内存中，使大部分读写操作不需要等待磁盘 I/O，这是它保持低延迟的重要基础。

![计算机存储层级结构示意图](/assets/img/posts/pingcode-pxsfyp/image-001.png)

磁盘数据库工作模式：

![磁盘数据库工作模式](/assets/img/posts/pingcode-pxsfyp/image-002.png)

内存数据库工作模式：

![内存数据库工作模式](/assets/img/posts/pingcode-pxsfyp/image-003.png)

## 高效的数据结构

Redis 支持 String、List、Set、Sorted Set 和 Hash 等常用数据类型。具体操作的时间复杂度取决于命令与底层数据结构：许多常用查询和更新操作可以达到 O(1)，Sorted Set 等操作通常为 O(log N)。

Redis 本质上是一个 KV 数据库，键与值之间通过哈希表组织；不同的数据类型则使用各自适合的数据结构实现。

![Redis 数据类型与哈希桶的关系](/assets/img/posts/pingcode-pxsfyp/image-004.png)

## 单线程

Redis 的命令执行主要在单线程中完成，避免了多线程之间频繁切换和锁竞争带来的开销。这里的“单线程”主要指命令执行路径；网络 I/O、持久化等工作并非在所有版本和场景下都只使用一个线程。

## 多路 I/O 复用模型

I/O 多路复用利用 `select`、`poll`、`epoll` 等机制同时监听多个连接的 I/O 事件。空闲时，当前线程会进入阻塞状态；当一个或多个连接产生 I/O 事件时，线程被唤醒，并依次处理已经就绪的连接。其中，`epoll` 只返回真正产生事件的连接，避免了大量无效轮询。

这里的“多路”指多个网络连接，“复用”指这些连接复用同一个线程。

I/O 多路复用让单个线程可以高效地处理多个连接请求，尽量降低网络 I/O 带来的等待成本；同时，Redis 在内存中操作数据的速度很快，内存计算通常不会成为主要瓶颈。这些因素共同造就了 Redis 较高的吞吐量。

## 有多快

![Redis 每秒请求数测试曲线](/assets/img/posts/pingcode-pxsfyp/image-005.png)

Redis 的实际吞吐量会受到命令类型、数据规模、网络延迟、持久化配置和硬件环境等因素影响，性能测试结果需要结合具体场景理解。
