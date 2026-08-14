---
layout: post
title: "RxJS 的“道”与“术”"
date: 2022-08-24 15:20:28 +0800
categories: ["前端","框架"]
tags: ["RxJS","技术分享"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/qUVAU0"
---

![RxJS 的“道”与“术” 配图 1](/assets/img/posts/pingcode-quvau0/image-001.png)

## 热身环节

我相信很多人都有这样的问题：我们为什么选择 RxJS？

也许很多人在某些时候想用 Promise 或者 async/await 而不是 RxJS，我们看一下 Async/await 进化史：

1. 回调函数时代/高阶函数，弊端：耦合度高，回调嵌套，当时产生一些知名库 async、bulebird 可以解决此类问题，额外还可以优雅地处理流程控制相关场景。
2. Promise，解决了回调嵌套的问题，处理错误也比回调函数方式来的更加优雅，而它的弊端：无法监听和打断 Promise 的状态
3. Generator，语法近似同步更加简洁，弊端：流程管理不方便（迭代器模式实现，主动调 next 执行，流程管理不方便）
4. Async/await，语法简洁👍  ，相比 Generator 没有了执行器，弊端：每个函数声明一个 async 修饰符，ES2022 Top-level await 才出现。

他们的为了解决一个问题，语法越来越趋向简洁化，编写异步代码像同步代码一样流畅。

RxJS 语法更接近于 Promise，它并没有 Async/await 写起来那么顺畅，也不如它那么简洁，那么为什么选择 RxJS，下面我们深入理解一下 RxJS。

## 什么是 RxJS？

RxJS 全称 Reactive Extensions for JavaScript，翻译过来是 Javascript 的响应式扩展，它是一个采用流来处理异步和事件的工具库。

## RxJS 能做什么，给我们来带了什么？

> 思考题：假设 Angular 没有使用 RxJS 会如何？
> 
> 1. 处理网络请求，需要引进 axios 或实现 ajax。
> 2. 处理消息通知，实现一套 EventEmitter 通讯机制。
> 3. 状态管理......
> 
> 额外 Angular 路由、表单响应、组件间的通讯、Http 封装均使用了 RxJS。
{: .prompt-info }

擅长做的事：

- UI 事件：例如鼠标移动、按钮单击......
- 状态管理：例如属性更改、集合更新等事件
- IO 消息事件：服务监听
- 广播/通知：消息总线（Event bus）
- 网络消息/事件：例如 HTTP、WebSockets API 或其他低延迟中间件

最大的优势：异步事件的抽象，这意味着可以把很多事统一起来当作一种方式处理，从而让问题变得更简单，同时也降低了学习成本。

## 背后的“道”

### Reactive Programing

Reactive Programing，简称 RP，一种编程范式，中文翻译过来是**响应式编程或反应式编程。**

> **响应式编程**或**反应式编程**（英语：Reactive programming）是一种面向数据流和变化传播的声明式编程范式。这意味着可以在编程语言中很方便地表达静态或动态的数据流，而相关的计算模型会自动将变化的值通过数据流进行传播。                                                                                                                 —— 维基百科

优势：方便地表达静态或动态的数据流

表现方式：自动将变化的值通过数据流进行传播

从传统的“拉”转变为“推”的思维模式。

#### ReactiveX

ReactiveX 是基于 Reactive Programing 各种语言实现的一个统称，除了我们所知道的 RxJS，还有 RxJava、Rx.NET、RxKotlin、RxPHP.....它最早是由微软提出并引入到 .NET 平台中，随后 ES6 也引入了类似的技术。

它扩展了**观察者模式**，以支持数据序列和/或事件，并添加了**操作符**，允许您以**声明的方式**将序列组合在一起，同时抽象出诸如低级线程、同步、线程安全、并发数据结构和非阻塞I/O等问题。

> 官方解释：
> 
> ReactiveX is a library for composing asynchronous and event-based programs by using observable sequences.
> 
> It extends [the observer pattern](https://en.wikipedia.org/wiki/Observer_pattern) to support sequences of data and/or events and adds operators that allow you to compose sequences together declaratively while abstracting away concerns about things like low-level threading, synchronization, thread-safety, concurrent data structures, and non-blocking I/O.

#### Vue、React 的响应式设计

Vue：

1. Vue 用 JS 原生 API `Object.defineProperty`或`Proxy` 对象实现的数据绑定，原理是通过它们的 getter、setter 劫持对象的读写。
2. 实现观察者模式

React：Redux 底层实现观察者模式，其他待补充......

## 核心概念/对象

### Observable

Observeable 是观察者模式中的被观察者，它维护一段执行函数，提供了惰性执行的能力（subscribe）。

**核心函数：**

- constructor(\_subscribe) : 创建 Observeable
- static create(\_subscribe)：静态函数创建 Observeable
- pipe()：管道
- subscribe()：执行初始化传入的 \_subscribe

> 指南：
> 
> RxJS 中 Observeable 是一等公民，将一切问题都转化为 Observable 去处理。转换的操作符有 `from`、`fromEvent`、`of`、`timer`等等，更多戳[这里。](https://cn.rx.js.org/manual/overview.html#h39)
> 
> 注意的是：只有 [ObservableInput](https://cn.rx.js.org/class/es6/MiscJSDoc.js~ObservableInputDoc.html) 或 [SubscribableOrPromise](https://cn.rx.js.org/class/es6/MiscJSDoc.js~SubscribableOrPromiseDoc.html) 类型的值才可以转化为 Observable。
{: .prompt-info }

#### Observable VS Promise

![RxJS 的“道”与“术” 配图 2](/assets/img/posts/pingcode-quvau0/image-002.png)

### Subscriber/Observer

Subscriber/Observer 是观察者模式中的观察者/消费者，它用来消费/执行 Observable 创建的函数。

**它提供的三种能力：**

1. `next`（传值）
2. `error`（错误处理）
3. `complete`（完成/终止）

至此，这两者就可以完成基本的能力了。

![RxJS 的“道”与“术” 配图 3](/assets/img/posts/pingcode-quvau0/image-003.png)

### Subscription

Subscription 是表示可清理资源的对象，它一般是由 Observable 执行之后产生的。

**它有两个能力：**

1. `unsubcribe`（取消订阅）
2. `add`（分组或在取消订阅之前插入一段逻辑）

注意：调用`unsubcribe`后（包含`add`传入的其它 Subscription）不会再接收到它们的数据。

下面是一个流的执行流程

![RxJS 的“道”与“术” 配图 4](/assets/img/posts/pingcode-quvau0/image-004.png)

### Subject

Subject 是一个特殊的 Observable，更像一个 EventEmitter，它既可以是被观察者/生产者也可以是观察者/消费者，曾经写过类似于 Subject 的实现👉：[这里](https://at.pingcode.com/wiki/spaces/5e6cc7ed23ddd443a851cd05/pages/5f01adb52fb575c0b12ba4ee) 。

优势：**减少开销和提高性能的优势。**

**何时用：消息传递或广播。**

Subject 和 Observable 的区别：

1. Observable 是单向的（生产者），Suject 是双向的（生产者、消费者）
2. Observable 是内部发送/接收数据，Suject 是外部发送/接收数据。
3. Observable 是冷数据流，Suject 热数据流。
   
   1. Observable 可以订阅任意时间的数据流
   2. Suject 不会对订阅之前的消费者发送消息
4. Observable 调用 subscribe 时消费消息，Subject 是调用 next 消费消息。

#### 工作原理

![RxJS 的“道”与“术” 配图 5](/assets/img/posts/pingcode-quvau0/image-005.png)

#### 其他 Subject

| 种类 | 作用 |
| --- | --- |
| `BehaviorSubject` | 回放数据，如果是订阅前推送的数据，只回放最新的值 |
| `ReplaySubject` | 回放数据，初始化设定要缓存多少次的值，然后将这批消息推送 |
| `AsyncSubject` | 只有调用 complete 后才会推送数据 |

## Operator

### 什么是 Operator ？

operator 本质上是一个纯函数 (pure function)，**它接收一个 Observable 作为输入，并生成一个新的 Observable 作为输出。**

```javascript
export interface Operator<T, R> {
  call(subscriber: Subscriber<R>, source: any): TeardownLogic;
}
// 等价于
function Operator(subscriber: Subscriber<R>, source: any){}
```

### 遵循的小道

迭代器模式和集合的函数式编程模式以及管道思想（pipeable）

### 为什么要有操作符？

单向线性的通讯或传输数据，pipe 可以降低耦合度以便于阅读和维护，把复杂的问题分解成多个简单的问题，最后在组合起来。

![RxJS 的“道”与“术” 配图 6](/assets/img/posts/pingcode-quvau0/image-006.png)

### 函数式编程

操作符的实现以及使用均依照函数式的编程范式，如下图示例

![RxJS 的“道”与“术” 配图 7](/assets/img/posts/pingcode-quvau0/image-007.png)

Functional Programing，简称 FP，函数式编程范式，它的思维就是一切用函数表达和解决问题，避免用命令式。

优点：

- 链式调用/组合开发
- 简单易写易读（声明式）
- 可靠性（纯函数不存在依赖）
- 惰性求值（高阶函数）
- 易于测试

更多详细看这篇[不完全指南🧭](https://pingcode.com/pages/taOxc8Afhg#%20%E3%80%8A%E5%87%BD%E6%95%B0%E5%BC%8F%E7%BC%96%E7%A8%8B%E3%80%8B)

### 工作原理

迭代器模式：当多个操作符时，组合成多个可迭代对象的集合，执行时依次调用 next 函数。

### 分类

![RxJS 的“道”与“术” 配图 8](/assets/img/posts/pingcode-quvau0/image-008.png)

### 创建自定义操作符

### 学习参考

- Async.js
- Lodash

## Scheduler

调度器，定时器，`Scheduler` 用来控制数据推送节奏的。

官方定义：

- Scheduler 是一种数据结构
- Scheduler 是一个执行环境
- Scheduler 是一个虚拟时钟

| 种类 | 描述 |
| --- | --- |
| `null` | 不传递或 null 或 undefined，表示同步执行 |
| `queue` | 使用队列的方式执行 |
| `asap` | 全称：as soon as possible ，表示尽快执行 |
| `async` | 使用 `setInterval` 的调度。 |

### 示例

### 工作原理

Scheduler 工作原理可以类比 JS 中的调用栈和事件循环，从实现上 `aspa`和 `async`也的确交给事件循环来处理。`null /undefined`相当于调用栈，`aspa`相当于事件循环中的微任务，`async`相当于宏任务，可以肯定的是微任务执行时机的优先级比宏任务要高，所以从执行时机来看 null > aspa > async。`queue`运行模式根据 delay 的参数来决定，如果是 0，那么就用同步的方式执行，如果大于 0，就以 async 模式执行。

![RxJS 的“道”与“术” 配图 9](/assets/img/posts/pingcode-quvau0/image-009.png)

### 使用原则/策略

RxJS Scheduler 的原则是：尽量减少并发运行。

1. 对于返回有限和少量消息的 observable 的操作符，RxJS 不使用调度器，即 `null` 或 `undefined` 。
2. 对于返回潜在大量的或无限数量的消息的操作符，使用 `queue` 调度器。
3. 对于使用定时器的操作符，使用 `aysnc` 调度器

> 支持 Scheduler 的操作符：of、from、timer、interval、concat、merge、combineLatest，更多戳[这里。](https://cn.rx.js.org/manual/overview.html#h17)
> 
> bufferTime、debounceTime、delay、auditTime、sampleTime、throttleTime、timeInterval、timeout、timeoutWith、windowTime 这样时间相关的操作符全部接收调度器作为最后的参数，并且默认的操作是在 `Scheduler.async` 调度器上。
{: .prompt-info }

## 参考

- 《RxJS 深入浅出》——程墨
- [RxJS 中文文档](https://cn.rx.js.org/)
- [Reactive X 文档](https://reactivex.io/intro.html)
- [RxJS 入门指南](https://robin-front.github.io/RxJS-doc-chinese/)
- [RxJS 给你丝滑般的编程体验](https://juejin.cn/post/6910943445569765384)
- Angular 中的 RxJS
- [Observable vs Subject](https://stackoverflow.com/questions/47537934/what-is-the-difference-between-observable-and-a-subject-in-rxjs)

#### 推荐阅读

- 
- 

## Q&A
