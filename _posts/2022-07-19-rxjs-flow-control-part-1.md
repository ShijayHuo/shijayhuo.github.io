---
layout: post
title: "玩转 RxJS 操作符 ——流程控制篇（一）"
date: 2022-07-19 14:33:27 +0800
categories: ["前端","框架"]
tags: ["RxJS"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/9yE4p-"
---

> 把 RxJS 当做是用来处理事件的 [Lodash](https://lodash.com/) 。

都说 RxJS 入门难，因为它涉及响应式、函数式等编程范式，也涉及了观察者、迭代器等设计模式，本文抛开这些晦涩难懂的概念，从流的角度看 RxJS，简单直观的看它如何解决实际问题。

### RxJS 数据流

流，可以想像成现实中的水流，河流，在 RxJS 的世界解决问题的方式是抽象为数据流，比如：Dom 事件、Websocket、Ajax 请求、动画等等，在代码中我们常用的流对象是 **Subject** 或 **Observable**（建议抛开名字本身的意思），操作数据的对象就是 **Subcriber** 或 **Observer**（建议抛开名字本身的意思），它们两组的关系是：Subject 继承自 Observable，创建数据流后，会产生一个操作数据的对象 Subcriber（是 Observer 的实现），该对象有 next（发送数据通道），error（错误通道），complete（完成）等方法，以及一个 closed 关闭状态的属性。

**关系模型图**

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 1](/assets/img/posts/pingcode-9ye4p/image-001.png)

###### **工作流程图**

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 2](/assets/img/posts/pingcode-9ye4p/image-002.png)

#### 流的生命周期

上面的东西可能有点“花”，下面的示例也许更容易明白：

```javascript
// 创建流 
const stream = new Observable(observer => {
  observer.next(1);
  observer.complete();
}); 

// 启动流，返回一个 Subscription
const subscription = stream.subscribe();

// 在 subscription 追加逻辑,注意的是，只有当流结束（error 或 complete）才会进入 add
subscription.add(()=>{
   console.log(2);
});

// 销毁流
stream.unsubscribe();			 			
```

### 操作符

> 学习 RxJS 就是学习如何组合操作符来解决复杂问题                                    ——程墨《RxJS 深入浅出》

Rxjs 的特点之一就是**把复杂的问题分解成简单问题的组合，然后分解成多个小任务，每个小任务只需要关注问题的一个方面，小任务间的耦合度很低便于阅读和维护**，而分解的过程必不可少的就是操作符，《RxJS 深入浅出》的作者在书中说：精通 RxJS就是精通这些操作符，虽然有些片面，但不无道理，不可否认的是掌握的操作符越多越熟练解决问题的方式更多，效率更快。

每个大家请看下图，这是一段初始化左侧树数据的代码，可以看到逻辑比较的多，可读性很低，而且不留意就会忽略掉一些细节，简直是一坨 shit（很棒，我写的），下面我将介绍一下如何利用操作符提升可读性，让它重新做“人”。

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 3](/assets/img/posts/pingcode-9ye4p/image-003.png)

#### 分类

官方根据不同用途将操作符分为：创建型、转换型、过滤型、组合型、错误处理、工具型，我在学习的过程中总结了一个新分类：流程控制。

#### 流程控制

##### pipe

> 为了讲后面的操作符，这里暂且把 pipe 放到这里，但他们并不是一个维度。

见名之意：管道，这个名词在熟悉不过，脑海里浮现 Mongodb 中的 pipeline，Angular 的 pipe，Lodash 的chain，async/bluebird 的 waterfall，甚至原生 js 数组，它们都属于管道思想，它最直观的好处是链式调用，另一个是可以用来划分逻辑，在异步的场景中还可以做流程控制（串行、并行、竞速等等）。

一个例子：

```javascript
const stream = new Observable(observer => {
      observer.next({ id: 1, name: "章三", age: 18 });
      observer.complete();
});
stream
      .pipe(filter(x => x.age >= 18))
      .pipe(map(x => x.name))
      .subscribe(result => console.log(result))

// 等同于
stream.subscribe(x=> {
	if(x.age < 18) {
    	return;
    }
    const result = x.name;
    console.log(result);
})
```

###### 实战

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 4](/assets/img/posts/pingcode-9ye4p/image-004.png)

用 3 个 pipe 划分每段逻辑，一下就清爽了很多。

##### map & mapTo

map 和 mapTo 不属于流程控制类的操作符，类似于 JS 数组的 map 函数， **它把每个源值传递给转化函数以获得相应的输出值**，mapTo 和 map 的工作流程也基本一致，**不同的是 map 接收参数是函数且函数的第一个参数是源值，而 mapTo 会忽略源值可直接返回一个指定的值**，如

```javascript
const clicks = fromEvent(document, 'click');
const greetings = clicks.mapTo('Hi');
greetings.subscribe(x => console.log(x)); // Hi
```

最后还是放一张工作原理图吧

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 5](/assets/img/posts/pingcode-9ye4p/image-005.png)

###### 实战

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 6](/assets/img/posts/pingcode-9ye4p/image-006.png)

##### concat

concat 类似于 JS 数组的 concat，**连接多个输入流，顺序的发出它们的值**。它用于合并流，是串行操作的一种。 

```javascript
const series1$ = of('a', 'b');	// 可以假设它是任何的异步操作
const series2$ = of('x', 'y');
const result$ = concat(series1$, series2$);
result$.subscribe(console.log);	// a b x y
```

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 7](/assets/img/posts/pingcode-9ye4p/image-007.png)

看起来比较的简单，但是需要注意以下的两点：

> 1. 只有启动并完成上一个流，才会执行下一个流，否则会阻塞。
> 2. concat 无法拦截指定的流。
{: .prompt-warning }

##### concatMap

工作流程跟基本 concat 一样，该操作符正是为了解决 concat 无法拦截指定流的问题，**它将源值投射为一个合并到输出流的结果，以串行的方式等待前一个完成再合并下一个流**。

如下代码，需要在获取到第一个API的数据做过滤，然后与第二个API返回的数据做组合。

```javascript
fetchPages$
 .pipe(map(pages => pages.filter(x => x.visibility))))
 .pipe(concatMap(pages =>  this.fetchRecentlyOperatedPages(pages))
```

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 8](/assets/img/posts/pingcode-9ye4p/image-008.png)

###### 实战

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 9](/assets/img/posts/pingcode-9ye4p/image-009.png)

##### combineLatest

> 尝试用了，没有用到实际代码里

它也是串行操作符的一个，从名字上看意为`组合最新的`，实际的作用就是这样：**组合多个流来合并为一个流 ，该流的值根据每个输入流的最新值计算得出的**（名字起的杠杠的）。

```javascript
const weight = of(70, 72, 76, 79, 75);
const height = of(1.76, 1.77, 1.78);
const bmi = combineLatest(weight, height, (w, h) => w / (h * h));
bmi.subscribe(x => console.log('BMI is ' + x));

// 控制台输出:
// BMI is 24.212293388429753
// BMI is 23.93948099205209
// BMI is 23.671253629592222
```

原理图

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 10](/assets/img/posts/pingcode-9ye4p/image-010.png)

##### 优化完的代码

重点是划分了逻辑，每个 pipe 执行的逻辑更加的单一，其次解决了回调嵌套的问题，改变了流程有些不必要在多处调的代码放到指定的地方执行一次。

![玩转 RxJS 操作符 ——流程控制篇（一） 配图 11](/assets/img/posts/pingcode-9ye4p/image-011.png)

### 最后

本文只讲了流程控制串行的一些操作符，实属抛砖引玉，但 RxJS 操作符绝不止于此，欢迎提出更多的姿势！

### 参考

官网：[https://cn.rx.js.org/class/es6/Observable.js~Observable.html](https://cn.rx.js.org/class/es6/Observable.js~Observable.html)

RxJS 高阶操作符综合指南：[https://blog.angular-university.io/rxjs-higher-order-mapping/](https://blog.angular-university.io/rxjs-higher-order-mapping/)

RxJS 深入浅出 —— 程墨
