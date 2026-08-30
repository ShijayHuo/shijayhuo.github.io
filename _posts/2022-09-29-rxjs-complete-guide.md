---
layout: post
title: "RxJS 全面解析"
pin: true
image:
#   path: /assets/img/posts/pingcode-yydc38/cover.png
date: 2022-09-29 09:52:42 +0800
categories: ["框架"]
tags: ["RxJS"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/YYdc38"
---

> 最初发布于 [RxJS 全面解析](https://zhuanlan.zhihu.com/p/583539989)

## 前言

打开此文的小伙伴想必对 RxJS 已经有了或多或少的了解，如果没有倒也无妨，因为下面会从零开始讲起；如果你带着几个问题来翻阅，本人也希望此文可以带你找到答案。

温馨提示：文章内容较长，建议收藏反复观看。

## 概览

从我个人的学习 RxJS 的历程来看，我最开始是“照猫画虎”能够基本使用，随后是研究部分操作符和使用场景，最后了解产生背景、设计思想以及实现原理。在这期间有过很多疑问，也曾从不同角度理解 RxJS，最终总结了认为比较系统学习了知识图谱（下图）。

![RxJS 全面解析 配图 1](/assets/img/posts/pingcode-yydc38/image-001.png)

## 深入理解 RxJS

### 大“道”——响应式编程

全面理解一个事物，追溯其历史是一种好的方式，RxJS 的起源需要追溯到**响应式编程（RP）**，在后续的发展中产生了一系列基于响应式编程范式的语言扩展（Rx，RxJS 就是其中之一），请看历史简谱（左向右延续）。

![RxJS 全面解析 配图 2](/assets/img/posts/pingcode-yydc38/image-002.png)

#### 何为响应式

> 响应式是学习 RxJS 必须要理解的概念，本人用了大量的文字来解释，如果您已经深刻理解，可直接跳过。如果您是第一次接触这个名词，也不要先给自己心里暗示它有多么的高深和难以理解，也许你天天在使用。

##### 一个例子

为了避免上来就接触晦涩的概念，先来举个例子：话说你偶然浏览到阿杰的文章，觉得写的很赞，于是你**关注**了他的博客账号，以便不会错过之后的干货，在以后的日子里阿杰**每发布一篇文章博客平台都会给你推送一条消息**，提醒你来给他点点赞，假设博客平台没有关注的功能，那么你需要想知道他的最新动态就只能打开他的个人主页查看文章列表来确认，也许稍不留意就会错过他的文章。这个例子出现了**粉丝关注博主、博主发布博客、平台自动推送给粉丝消息、给文章点赞**，中构成了，平台在观察到博主粉丝只需要关注一下就能收到博主以后的动态，这就是响应式带来的好处。

##### 另一个例子

在举一个贴近我们开发的例子：假设有一个更新某用户密码的需求，A 同事负责调用更新逻辑并在更新后执行其他任务（比如提醒用户更新成功或失败），B 同事负责具体更新密码的逻辑，下图描述了完成整个任务的流程：

![RxJS 全面解析 配图 3](/assets/img/posts/pingcode-yydc38/image-003.png)

实际情况更新逻辑比较复杂，有以下逻辑：

1. 验证一下用户信息的真实性
2. 验证密码是否合法
3. 最终把新的密码入库

上述的每个环节都有可能是异步耗时任务，比如用户的真实性是第三方平台验证的，入库的过程中网络非常慢，再比如......等等，诸如此类的各种不确定性，这对于 B 同事做后续任务就有了一个关键性条件，**确定更新结果**，这种情况有一种做法是：定期轮询重试，B 每隔一段时间执行一次，直到确定 A 已经修改成功，再去执行后续操作。逻辑中定时 A 逻辑结束这种做法这种做法明显有一个弊端是执行多次，对于 B 显然不是好的做法，好的做法是：**B 的更新逻辑执行完后通知 A，**甚至 B 可以先把更新后的事准备好，让 A 决定后续逻辑的执行时机。

![RxJS 全面解析 配图 4](/assets/img/posts/pingcode-yydc38/image-004.png)

流程如图示：**订阅/执行更新逻辑、更新逻辑结束、将结果通知调用者、执行后续逻辑**。这就是响应式的做法，它带来的好处是**：当更新结果发生变化时自动通知调用者，而不用轮询重试**。

#### 了解响应式宣言

相信你已经明白了响应式，并能发现生活/工作中到处可见，下面了解一下设计响应式模块/系统遵循的原则：

- 即时响应性：只要有可能，就要及时地做出响应。
- 回弹性**：**执行过程中在出现失败时依然保持即时响应性。
- 弹性**：** 在不断变化的工作负载之下依然保持即时响应性。
- 消息驱动**：**反应式依赖异步的消息传递，从而确保了松耦合、隔离、位置透明的组件之间有着明确边界。

![RxJS 全面解析 配图 5](/assets/img/posts/pingcode-yydc38/image-005.png)

#### 响应式编程

下面我们正式的介绍响应式编程：

**响应式编程，**Reactive Programing，又称反应式编程**，**简称 RP，是一种以传播数据流（数据流概念戳[这里](https://baike.baidu.com/item/%E6%95%B0%E6%8D%AE%E6%B5%81/3002243) ）的编程范式。

> **响应式编程**或**反应式编程**（英语：Reactive programming）是一种面向数据流和变化传播的声明式编程范式。这意味着可以在编程语言中很方便地表达静态或动态的数据流，而相关的计算模型会自动将变化的值通过数据流进行传播。                                                                                                                 —— 维基百科

优势：

1. **声明式**，方便地表达静态或动态的数据流
2. **自动化**，自动将变化的值通过数据流进行传播

**核心思想：**从传统的调用方“拉”数据的思维模式转变为被调用方“推”数据的思维模式。

#### JS 异步编程史

> 众所周知，JS 执行环境是单线程的，在事件监听，异步的处理，响应式编程就成为了一大主力。

##### Callback 时代

回调函数延续至今，JS 的运用高阶函数巧妙地将异步后的逻辑进行托管，以**事件驱动**的方式来解决异步编程，但它有一个“臭名昭著”的问题：**回调嵌套**，耦合度高。本来很简单的逻辑但为了控制执行流程却不得不写大量的代码，当时产生了一些知名的库：async、bluebrid，它们封装和处理了嵌套问题，暴露出更为简单好用的 API，额外还可以优雅地处理流程控制相关场景。

##### Promise 时代

ES6 纳入 Promise 之后可谓一大喜讯，因为它解决了回调嵌套的问题，虽然它只是回调的语法糖，但在处理流程和捕获错误（外层处理）已经非常的优雅了，但它的弊端是：**无法监听和打断 Promise 的状态**。这意味着一旦声明它会立即执行并修改它的执行状态，这源于它的实现。

##### Generator

Generator 是处于 Promise 和 Async/await 之间的产物，它给我们带来了写异步语法像写同步一般，只需在函数前加`\*`修饰，这样就可以在函数内部使用一个 `yield`关键字返回结果，类似于 `await`，但它也并非完美，不然也不会有后面的 Async/await 了，它的主要问题是**流程管理不方便（迭代器模式实现，主动调 next 执行器流转游标）。**

##### Async/await

Async/await 是 Generator 语法糖，既保留了语法上的优势，也解决了 Generator 每步要调一下 next 执行器的弊端，是现阶段的最佳方案，就是得吐槽一下 Top-level await 到 ES2022  才出现。

**其中 Generator 和 Async/await 在异步编程是以等待的方式处理。**

#### ReactiveX

> 业界一致认为正统的响应式实现/扩展是 ReactiveX 系列。

ReactiveX，简称 Rx，是基于响应式的扩展，是各种语言实现的一个统称，除了我们所知道的 RxJS，还有 RxJava、Rx.NET、RxKotlin、RxPHP.....它最早是由微软提出并引入到 .NET 平台中，随后 ES6 也引入了类似的技术。

它扩展了观察者模式，以支持数据序列和/或事件，并添加了操作符，允许您以声明的方式将序列组合在一起，同时**抽象出诸如低级线程、同步、线程安全、并发数据结构和非阻塞I/O等问题。**

#### RxJS

RxJS 全称 Reactive Extensions for JavaScript，翻译过来是 Javascript 的响应式扩展，它是一个采用流来处理异步和事件的工具库，简单来说 **Rx(JS) = Observables + Operator + Scheduler**。

##### 擅长做的事

- UI 事件：例如鼠标移动、按钮单击......
- 状态管理：例如属性更改、集合更新等事件
- IO 消息事件：服务监听
- 广播/通知：消息总线（Event bus）
- 网络消息/事件：例如 HTTP、WebSockets API 或其他低延迟中间件

最大的优势：异步事件的抽象，这意味着可以把很多事统一起来当作一种方式处理，从而让问题变得更简单，同时也降低了学习成本。

注意：RxJS 擅长做异步的事，不代表不可以做同步或不擅长同步的事。

#### RxJS 在 Angular 中的应用

RxJS 在 Angular 中及其重要，很多核心模块都是由 RxJS 实现的，比如：

- 响应式表单
- 路由
- HttpClient（封装的 ajax，类似于 axios）
- async 管道符
- 状态管理

更多：[https://angular.io/guide/observables-in-angular](https://angular.io/guide/observables-in-angular)

## RxJS 核心概念—— Observables

![RxJS 全面解析 配图 6](/assets/img/posts/pingcode-yydc38/image-006.png)

RxJS 中的 Observables 系列是围绕观察者模式来实现的，基本角色：

1. Observable：被观察者，用来产生消息/数据。
2. Observer：观察者，用来消费消息/数据。

### Observable

Observeable 是观察者模式中的被观察者，它维护一段执行函数，提供了**惰性执行的能力**（subscribe）。

#### **核心函数**

- constructor(\_subscribe) : 创建 Observeable
- static create(\_subscribe)：静态函数创建 Observeable
- pipe()：管道
- subscribe()：执行初始化传入的 \_subscribe

> RxJS 中 Observeable 是一等公民，将一切问题都转化为 Observable 去处理。转换的操作符有 `from`、`fromEvent`、`of`、`timer`等等，更多戳[这里。](https://cn.rx.js.org/manual/overview.html#h39)
> 
> 注意的是：只有 [ObservableInput](https://cn.rx.js.org/class/es6/MiscJSDoc.js~ObservableInputDoc.html) 或 [SubscribableOrPromise](https://cn.rx.js.org/class/es6/MiscJSDoc.js~SubscribableOrPromiseDoc.html) 类型的值才可以转化为 Observable。

#### 基本使用

![RxJS 全面解析 配图 7](/assets/img/posts/pingcode-yydc38/image-007.png)

#### 源码实现

本人写（抽取）了一套 RxJS Observable 源码中的核心实现

![RxJS 全面解析 配图 8](/assets/img/posts/pingcode-yydc38/image-008.png)

### Observable 与 Promise

> 用过两者的同学可能会有疑问为什么采用 Observable 而不直接用 Promise 或 Async/await，这两者在业界也常常用来做对比。

它们关键性的不同点：

|  | Observable | Promise |
| --- | --- | --- |
| 使用场景 | 同步、异步均可使用 | 用 Promise 包裹的一定是异步场景 |
| 执行时机 | 声明式惰性执行，只有在订阅后才会执行 | 创建时就立即执行 |
| 执行次数 | 多次调用 subscribe 函数会执行多次 | 只有第一次执行，后续都是取值 |
| 流程控制 | 相较于 Promise 有更为全面的操作符 | 提供串行、并行的函数 |
| 错误处理 | subscribe 函数捕获错误 | .catch 捕获 |

总的来说，**Promise 可读性更优，Observable 从使用场景更为全面**。

#### 两者的相互转换

在既使用了 RxJS 又引用了用 Promise 封装的库时，两者相互转换是容易碰到的问题，RxJS 提供了两者转换的函数。

##### **Promise 转 Observable**

from 或 fromPromise（弃用） 操作符

```javascript
const observable$ = from(fetch('http://xxx.com/'));
```

##### **Observable 转 Promise**

```javascript
const promise = of(42).toPromise();
const errorPromise = throw(new Error('woops')).toPromise();
errorPromise.catch(err=> console.error);
```

### Subscriber/Observer

Subscriber/Observer 是观察者模式中的观察者/消费者，它用来消费/执行 Observable 创建的函数。

#### **核心能力**

1. `next`（传值）
2. `error`（错误处理）
3. `complete`（完成/终止）
   
   ![RxJS 全面解析 配图 9](/assets/img/posts/pingcode-yydc38/image-009.png)

#### 实现

![RxJS 全面解析 配图 10](/assets/img/posts/pingcode-yydc38/image-010.png)

![RxJS 全面解析 配图 11](/assets/img/posts/pingcode-yydc38/image-011.png)

白话描述：

1. 将 subscribe 传进去一个 next 函数赋给 Observer 的 next 函数。
2. 将 Observer 传给 Observable 初始化的预加载函数 \_subscribe。
3. 执行 Observable 初始化的预加载函数

#### 工作流程

![RxJS 全面解析 配图 12](/assets/img/posts/pingcode-yydc38/image-012.png)

### Subscription

上面的 Observable 和 Observer 已经完成了观察者模式的核心能力，但是引发的一个问题是，每次执行一个流创建一个 Observable，这可能会创建多个对象（尤其是大量使用操作符时，会创建多个 Observable 对象，这个我们后面再说），此时需要外部去销毁此对象，不然会造成内存泄露。

为了解决这个问题，所以产生了一个 **Subscription** 的对象，Subscription 是表示可清理资源的对象，它是由 Observable 执行之后产生的。

#### 核心能力

1. `unsubcribe`（取消订阅）
2. `add`（分组或在取消订阅之前插入一段逻辑）

![RxJS 全面解析 配图 13](/assets/img/posts/pingcode-yydc38/image-013.png)

注意：调用`unsubcribe`后（包含`add`传入的其它 Subscription）不会再接收到它们的数据。

#### 使用

![RxJS 全面解析 配图 14](/assets/img/posts/pingcode-yydc38/image-014.png)

#### 实现

![RxJS 全面解析 配图 15](/assets/img/posts/pingcode-yydc38/image-015.png)

![RxJS 全面解析 配图 16](/assets/img/posts/pingcode-yydc38/image-016.png)

白话描述：

1. 调用 Observable 的 subscribe 后会添加（add 方法）到 Subscription（这里有个关系 Subscriber 继承了 Subscription） 中，并把 Subscriber（也是 Subscription）返出去。
2. 调用 Subscription 的 unsubscribe 方法。
3. unsubscribe 把该对象置空回收。

#### 完整工作流程

![RxJS 全面解析 配图 17](/assets/img/posts/pingcode-yydc38/image-017.png)

### Subject

上述的 Observable 归根到底就是一个惰性执行的过程，当遇到以下两种情况就显得偏弱：

1. **推送多条数据时，需要就要创建多个对象。**
2. **做状态管理或消息通讯，监听数据变化并实时推送。**

基于这两个方面，所以产生了 Subject，Subject 是一个特殊的 Observable，更像一个 EventEmitter，它既可以是被观察者/生产者也可以是观察者/消费者。

#### **优势**

1. 减少开销和提高性能
2. 数据实时推送

#### **场景**

消息传递或广播。

#### 与 Observable 的区别

|  | Observable | Subject |
| --- | --- | --- |
| 角色 | 生产者（单向） | 生产者、消费者（双向） |
| 消费策略 | 单播 | 多播 |
| 流转方式 | 内部发送/接收数据 | 外部发送/接收数据 |
| 数据特性 | 冷数据流 | 热数据流 |
| 消费时机 | 调用 subscribe | 调用 next  |

重点解释一下消费策略和消费时机两块：

**冷数据流：**可以订阅任意时间的数据流。

**热数据流**：只给已订阅的消费者发送消息，定阅之前的消费者，不会收到消息。

用一个示例来演示：

![RxJS 全面解析 配图 18](/assets/img/posts/pingcode-yydc38/image-018.png)

#### 工作原理

![RxJS 全面解析 配图 19](/assets/img/posts/pingcode-yydc38/image-019.png)

PS：忘记了该图出自哪篇文章，画的挺不错的，这里直接引用了，如有侵权，还望联系作者。

#### 源码实现

- observers 订阅者集合
- \_subscribe 添加订阅者
- next 函数将所有订阅者推送相同的数据

![RxJS 全面解析 配图 20](/assets/img/posts/pingcode-yydc38/image-020.png)

#### 其他 Subject

| 种类 | 作用 |
| --- | --- |
| `BehaviorSubject` | 回放数据，如果是订阅前推送的数据，只回放最新的值 |
| `ReplaySubject` | 回放数据，初始化设定要缓存多少次的值，然后将这批消息推送 |
| `AsyncSubject` | 只有调用 complete 后才会推送数据 |

## 操作符（Operator）

> 由于篇幅问题，本节并不会细化到讲每个操作符

### 理解操作符

Operator 本质上是一个纯函数 (pure function)，**它接收一个 Observable 作为输入，并生成一个新的 Observable 作为输出。**

```javascript
export interface Operator<T, R> {
  call(subscriber: Subscriber<R>, source: any): TeardownLogic;
}
// 等价于
function Operator(subscriber: Subscriber<R>, source: any){}
```

### 遵循的小道

迭代器模式和集合的函数式编程模式以及管道思想（pipeable）

#### 函数式编程

操作符的实现以及使用均依照函数式的编程范式，Functional Programing，简称 FP，函数式编程范式，它的思维就是一切用函数表达和解决问题，避免用命令式。

优点：

- 链式调用/组合开发
- 简单易写易读（声明式）
- 可靠性（纯函数不存在依赖）
- 惰性求值（高阶函数）
- 易于测试

更多详细看这篇[不完全指南🧭](https://pingcode.com/pages/taOxc8Afhg#%20%E3%80%8A%E5%87%BD%E6%95%B0%E5%BC%8F%E7%BC%96%E7%A8%8B%E3%80%8B)

#### pipe

管道，用来承载数据流的容器，相信大家一定用过 Lodash 的chain，原生 js 数组，NodeJS 开发者 也许还知道 async/bluebird 的 waterfall，Mongodb 的 pipe，它们都遵循管道思想，最直接的好处是链式调用，还可以用来划分逻辑，在异步的场景中还可以做流程控制（串行、并行、竞速等等）。

### 为什么要有操作符？

遵循符合响应式宣言，单向线性的通讯或传输数据，pipe 可以降低耦合度以便于阅读和维护，把复杂的问题分解成多个简单的问题，最后在组合起来。

### 操作符与数据流

在 RxJS 的世界解决问题的方式是抽象为数据流，整个闭环是围绕数据流进行的，所以我们再来理解一下数据流：流，可以把数据可以想像成现实中的水流，河流，流有上游、下游每个阶段处理不同的事情，在这过程避免不了要操作流，比如合并、流程控制、频率控制等等，所以操作符就扮演了此角色。

生命周期：创建流（create、new、创建类操作符）——> 执行流（subscribe） ——> 销毁流（unsubscribe）

### 分类

![RxJS 全面解析 配图 21](/assets/img/posts/pingcode-yydc38/image-021.png)

### 工作原理

迭代器模式：当多个操作符时，组合成多个可迭代对象的集合，执行时依次调用 next 函数。

![RxJS 全面解析 配图 22](/assets/img/posts/pingcode-yydc38/image-022.png)

### 源码实现

1. 操作符传入 pipe
2. pipe 将操作符转换成可迭代的 Array
3. subscribe（执行流）时消费操作符逻辑

如图

![RxJS 全面解析 配图 23](/assets/img/posts/pingcode-yydc38/image-023.png)

操作符转换 Array 源码

```javascript
export function pipeFromArray(fns: Array<Function>): Function {
    if (fns.length === 0) {
        return (x: any) => x;
    }

    if (fns.length === 1) {
        return fns[0];
    }

    return (input: any) => {
        return fns.reduce((prev: any, fn: Function) => fn(prev), input);
    };
}
```

### 创建自定义操作符

#### 方式一

```javascript
const isEven = () => {
    return (source: Observable<any>) => {
        return new Observable<any>(observer => {
            const subscription = source.subscribe((x) => {
                observer.next(x % 2 === 0);
                observer.complete();
            })
            return () => subscription.unsubscribe();
        })
    }
}
new Observable(observer => {
    observer.next(7);
})
    .pipe(isEven())
    .subscribe(console.log);
// 执行结果：false
```

#### 方式二：基于 lift

```javascript
const odd = () => {
    const operator: Operator<any, any> = {
        call(subscriber: Subscriber<any>, source: any) {
            const subscription = source.subscribe((x: any) => subscriber.next(x % 2 !== 0));
            return () => {
                subscription.unsubscribe();
            };
        },
    }
    return operator;
}

new Observable(observer => {
    observer.next(7);
})
    .lift(odd())
    .subscribe(console.log)
// 执行结果 true
```

##### lift 源码

![RxJS 全面解析 配图 24](/assets/img/posts/pingcode-yydc38/image-024.png)

### 阅读弹珠/大理石图

学会阅读弹珠图是快速理解 Rx 操作符的手段之一，有些操作符需要描述时间流逝以及序列，所以弹珠图有很多的标识和符号，如下图。

![RxJS 全面解析 配图 25](/assets/img/posts/pingcode-yydc38/image-025.png)

这里有几个用来理解大理石图的网站：

- [https://rxviz.com/](https://rxviz.com/)
- [https://rxmarbles.com/](https://rxmarbles.com/)

### 学习参考

- Async.js
- Lodash

## 调度器（Scheduler）

### 何为调度器

> 也许你在使用操作符的过程中从未在意过它，但它在 Rx 起着至关重要的作用，在异步中如何调度异步任务是很复杂的事情（尤其是以线程为核心处理异步任务的语言），很庆幸的是我们用使用的 JS ，所以不需要过多的关注线程问题，更友好的是大多数操作符默认帮开发者选中了合适的调度模式（下文会讲到），以至于我们从忽略了它，但无论如何我们都应该对调度器有基本的了解。

调度器，`**Scheduler**` **用来控制数据推送节奏的**，RxJS 有自己的基准时钟和一套的执行规则，来安排多个任务/数据该如何执行。也许你在使用操作符的过程中从未在意过它，但它在 Rx 起着至关重要的作用，在异步中如何调度异步任务是很复杂的事情（尤其是以线程为核心处理异步任务的语言），很庆幸的是我们用使用的 JS ，所以不需要过多的关注线程问题，更友好的是大多数操作符默认帮开发者选中了合适的调度模式（下文会讲到），以至于我们从忽略了它，但无论如何我们都应该对调度器有基本的了解。

官方定义：

- Scheduler 是一种数据结构
- Scheduler 是一个执行环境
- Scheduler 是一个虚拟时钟

### 种类/模式

| 种类 | 描述 |
| --- | --- |
| `null` | 不传递或 null 或 undefined，表示同步执行 |
| `queue` | 使用队列的方式执行 |
| `asap` | 全称：as soon as possible ，表示尽快执行 |
| `async` | 使用 `setInterval` 的调度。 |

### 示例

下面我们举例略窥一下各个模式的表现。

#### null/undefined/sync

```javascript
import { asapScheduler, asyncScheduler, from } from 'rxjs';
function syncSchedulerMain() {
    console.log('before');
    from([1, 2, 3]).subscribe(console.log)
    console.log('after');
}
syncSchedulerMain();
// 执行结果：
// before
// 1
// 2
// 3
// after
```

#### asap

```javascript
function asyncSchedulerMain() {
    console.log('asyncScheduler: before');
    from([1, 2], asyncScheduler).subscribe(console.log)
    Promise.resolve('asyncScheduler: promise').then(console.log);
    console.log('asyncScheduler: after');
}
// 执行结果：
// asapScheduler: before
// asapScheduler: after
// 1
// 2
// asapScheduler: promise
```

从结果示，from 的数据的输出顺序是**在 console.log（同步代码）之后，promise.then 之前的**。

#### async

```javascript
function asapSchedulerMain() {
    console.log('asapScheduler: before');
    from([1, 2, 3], asapScheduler).subscribe(console.log)
    Promise.resolve('asapScheduler: promise').then(console.log);
    console.log('asapScheduler: after');
}
// 执行结果：
// asyncScheduler: before
// asyncScheduler: after
// asyncScheduler: promise
// 1
// 2
```

结果示，**from 数据输出顺序是在 console.log（同步代码）和 Promise.then 之后的**。

### 工作原理

Scheduler 工作原理可以类比 JS 中的调用栈和事件循环，从实现上 `aspa`和 `async`也的确交给事件循环来处理。`null /undefined`相当于调用栈，`aspa`相当于事件循环中的微任务，`async`相当于宏任务，可以肯定的是微任务执行时机的优先级比宏任务要高，所以从执行时机来看 null > aspa > async。`queue`运行模式根据 delay 的参数来决定，如果是 0，那么就用同步的方式执行，如果大于 0，就以 async 模式执行。

![RxJS 全面解析 配图 26](/assets/img/posts/pingcode-yydc38/image-026.png)

### 使用原则/策略

RxJS Scheduler 的原则是：尽量减少并发运行。

1. 对于返回有限和少量消息的 observable 的操作符，RxJS 不使用调度器，即 `null` 或 `undefined` 。
2. 对于返回潜在大量的或无限数量的消息的操作符，使用 `queue` 调度器。
3. 对于使用定时器的操作符，使用 `aysnc` 调度器

### 支持调度器的操作符

`of`、`from`、`timer`、`interval`、`concat`、`merge`、`combineLatest`，更多戳[这里。](https://cn.rx.js.org/manual/overview.html#h17)

`bufferTime`、`debounceTime`、`delay`、`auditTime`、`sampleTime`、`throttleTime`、`timeInterval`、`timeout`、`timeoutWith`、`windowTime` 这样时间相关的操作符全部接收调度器作为最后的参数，并且默认的操作是在 `Scheduler.async` 调度器上。

OK，关于调度器我们先了解到这里。

## 最后

至此，RxJS 内容已经讲解完毕，文中概念较多，若大家都能够理解，就可以对 RxJS 的认知拉到同一个维度，后续需要做的就是玩转各种操作符，解决实际问题，学以致用才可达到真正的精通。

最后如果觉得文章不错，点个赞再走吧！

## 推荐阅读

- [玩转 RxJS 操作符 ——流程控制篇](https://zhuanlan.zhihu.com/p/543483225)
- [玩转 RxJS 操作符——回压控制篇](https://zhuanlan.zhihu.com/p/553188292)

## 参考

- [反应式宣言](https://www.reactivemanifesto.org/zh-CN)
- [RxJS 中文文档](https://cn.rx.js.org/)
- [Reactive X 文档](https://reactivex.io/intro.html)
- [RxJS 入门指南](https://robin-front.github.io/RxJS-doc-chinese/)
- [RxJS 给你丝滑般的编程体验](https://juejin.cn/post/6910943445569765384)
- [Observable vs Subject](https://stackoverflow.com/questions/47537934/what-is-the-difference-between-observable-and-a-subject-in-rxjs)
- 《RxJS 深入浅出》——程墨

### [附文中完整代码与示例](https://github.com/aaaaaajie/simple-rxjs)
