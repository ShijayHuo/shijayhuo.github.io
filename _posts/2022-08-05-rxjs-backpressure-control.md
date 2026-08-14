---
layout: post
title: "玩转 RxJS 操作符 —— 回压控制篇"
date: 2022-08-05 18:01:10 +0800
categories: ["前端","框架"]
tags: ["RxJS"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/YSx3A_"
---

### 背景

> 温馨提示：这节可以快速扫过，把脑细胞用在下面硬核部分。

前段时间 Wiki 有这样一个问题：页面共享列表初始化会发多次请求页面列表的 API（下图示）：

![玩转 RxJS 操作符 —— 回压控制篇 配图 1](/assets/img/posts/pingcode-ysx3a/image-001.png)

原因是每次条件（搜索、Label、分页）变动都会发一次 change 来拉取最新数据，虽然发了三次，但每次携带的参数是不一样的，像这样：

1. api/wiki/pages
2. api/wiki/pages?keywords=
3. api/wiki/pages?keywords=&type=

按场景来说最后一次是最完整的，也是我们所需要的，我的第一想法是：加防抖处理，同一时间内请求多次 API 只取最后/新的那条，但是这不是最终的方案，不过这并不重要，重要的是在这过程中仔细的读了一下文档并且在项目中玩了一下 RxJS 防抖和节流的操作符，才促使我系统地学习了这块知识，分享给大家。

### 理解回压/背压

> 若要深入 RxJS ，回压/背压绕不过去的概念，emm，确实如此。

回压/背压是管道思想中一个核心概念，为了更容易理解，先来举个的例子：有一条河流，分上游和下游，水流速度是固定的，上下游的河宽也是相等的，有一天下游旁的山出现了滑坡，滑下来的土使河道变窄了，这时水流就会在河道中淤积，最后都流出了河道，在淤积时会产生一个跟水流动方向相反的压力（有点儿相互作用力的意思 🤓 ），这种现象我们可以称为“回压”。

看完这个例子会发现在我们的生活和工作中接触过很多这样的场景了，OK，下面正式介绍一下它：回压，也称为“背压”，源于传统工程中的概念，描述系统排出的流体在出口处或二次侧受到的与流动方向相反的压力，**RxJS 中的回压是指数据管道中某一个环节处理数据的速度跟不上数据涌入的速度，缓冲区会积压上游的数据，造成上游压力**。

### 回压控制

> 回压控制分两种：有损回压控制、无损回压控制，由于篇幅较长，就不放在本文讲解了。

#### 有损回压控制

回压的根源是下游处理不过来导致的堆积，既然处理不过来我们是不是可以舍弃掉一部分，减少负载，从而让数据流入与处理速度平衡，而这种过滤手段我们称“有损回压控制”。

#### 操作符

> 这是看文档，查资料都不一定能明白的一节

回压操作符有以下：

1. debounce & debounceTime
2. throttle & throttleTime
3. audit & auditTime
4. sample & sampleTime

它们的作用就是通过降低执行频率来做回压控制。

上面的操作符可以又分为两类：

- 基于时间控制：debounceTime、throttleTime、auditTime、sampleTime。
- 基于流控制：debounce、throttle、audit、sample。

##### 1. 基于时间控制

###### 1.1 debounceTime

> 防抖：一个时间段内之运行一次，若在这一时间内重复触发，**只执行最后一次，并重新计时**

debounceTime：**在特定的一段时间后而且另一个源值也没有发出，则会从源 Observable 中发出一个值。**如果在源任务发出值之前出现了新值，那么前一个值被丢弃，并且不会发出，如果源 Observable 已经发出了新值的话，它会丢弃前一个等待中的任务。

![玩转 RxJS 操作符 —— 回压控制篇 配图 2](/assets/img/posts/pingcode-ysx3a/image-002.png)

如图所示，a 在 20ms 内没有其他任务，所以输出 a；b 在 20ms 内跟进了 c，所以执行最新的 c；d 同样在 20ms 后没有其他任务，所以输出 c。

实战示例：

![玩转 RxJS 操作符 —— 回压控制篇 配图 3](/assets/img/posts/pingcode-ysx3a/image-003.png)

效果图：下面是我输入的跟实际的效果图

![玩转 RxJS 操作符 —— 回压控制篇 配图 4](/assets/img/posts/pingcode-ysx3a/image-004.png)

###### 1.2 throttleTime

> 节流：一个时间段内只运行一次，若在这一时间内重复触发，只取一次。

throttleTime：**从源 Observable 中发出一个值，然后在** `**duration**` **毫秒内忽略随后发出的源值， 然后重复此过程。**

它存在两种模式：

1. leading：取第一个值
2. trailing:   取最新值

![玩转 RxJS 操作符 —— 回压控制篇 配图 5](/assets/img/posts/pingcode-ysx3a/image-005.png)

如图所示（leading 模式）：

1. 依次接收到 a、x、y，但只会取第一个值 a
2. b、c 阶段的后 50ms 取第一个值 b
3. c、x 取第一个值 c。

实战示例（trailing 模式）：

![玩转 RxJS 操作符 —— 回压控制篇 配图 6](/assets/img/posts/pingcode-ysx3a/image-006.png)

效果图：不停的输入，最终结果是非常平均的在每 2s 间取一个值，并且是第一个。

![玩转 RxJS 操作符 —— 回压控制篇 配图 7](/assets/img/posts/pingcode-ysx3a/image-007.png)

###### 1.3 auditTime

auditTime: **duration 毫秒内忽略源值，然后发出源 Observable 的最新值， 并且重复此过程。**

该操作符跟 throttleTime `trailing`很像，区别是**如果最后一个值在间隔内出现过，这时就不会取最后的一个新值了，而是会取第一次出现的值（最后一个值相同的值）**。

该操作符跟 `debounceTime` 也很像，区别是：**auditTime 发现最新的值时不会重新计时，所以间隔是均匀的**。

原理图：

![玩转 RxJS 操作符 —— 回压控制篇 配图 8](/assets/img/posts/pingcode-ysx3a/image-008.png)

如图所示：

1. a、x、y 取最新的值 y
2. y 和 b 之间超过了 50ms 不会输出任何值
3. b 和 x 间输出 x
4. **x、c、x ，正常如果三个值不同会取最后一个，但是最后一个出现过，所以忽略重复的值，所以最后只取的第一个 x**。

实战示例：

![玩转 RxJS 操作符 —— 回压控制篇 配图 9](/assets/img/posts/pingcode-ysx3a/image-009.png)

效果图：不停的输入，间隔 2s 输出很平均，跟 throttleTime 非常的相似。

![玩转 RxJS 操作符 —— 回压控制篇 配图 10](/assets/img/posts/pingcode-ysx3a/image-010.png)

###### 1.4 sampleTime

sampleTime：**在周期时间间隔内发出源 Observable 发出的最新值。**

所以它主要用于采样，采的是最新的样本，该操作符需要注意的是它**计时的时机是不依赖 Observable 的值**，而上面三个都是发出**源 Observable** 第一个值时才开始计时，所以非采样这种场景可以优先用其他操作符。

实战示例：

![玩转 RxJS 操作符 —— 回压控制篇 配图 11](/assets/img/posts/pingcode-ysx3a/image-011.png)

效果图：throttleTime 和 auditTime 最多执行 9 个任务（总时间 20s，间隔 2s）

![玩转 RxJS 操作符 —— 回压控制篇 配图 12](/assets/img/posts/pingcode-ysx3a/image-012.png)

##### 2. 基于流控制

x 与 xTime 作用几乎一样，下面只讲解不同点：

1. 用法不同 xTime 参数是时间（数字类型），x 接收的参数是一个函数，而这个函数必须返回一个 Observable 或 Promise（一般用来计算出一个时间）
2. **它是从收到 x 里参数的 Observable 发出值之后开始计时的**

原理图：

![玩转 RxJS 操作符 —— 回压控制篇 配图 13](/assets/img/posts/pingcode-ysx3a/image-013.png)

仔细观察图第二行多出的箭头代表另一个流，竖线标识停止。**当确认收到另一个流发出的值后**开始执行 a；然后 b，c 取最新的 c；d 后面没有任务执行 d。

实战示例：

![玩转 RxJS 操作符 —— 回压控制篇 配图 14](/assets/img/posts/pingcode-ysx3a/image-014.png)

我们也可以通过函数的值做条件计算：

![玩转 RxJS 操作符 —— 回压控制篇 配图 15](/assets/img/posts/pingcode-ysx3a/image-015.png)

##### 3. 总结

- `debounceTime`在其它三个中更适合的场景是**输入框搜索。**
- `throttleTime`支持两种模式：
   
   - 间隔中取最开始的值
   - 间隔中取最新的值
- 控制速率尽量优先用 `auditTime`，在性能上影响最小（因为它会舍去重复的值，减少发送次数）。
- `sampleTime`不会依赖源 Observable 的发出值，按照自己的时间间隔执行，所以不是采样的场景其他操作符比它更适合。

### 参考

- 《RxJS 深入浅出》—— 程墨
- [https://indepth.dev/reference/rxjs/operators/audit-time](https://indepth.dev/reference/rxjs/operators/audit-time)
- [https://cn.rx.js.org/class/es6/Observable.js~Observable.html#instance-method-throttleTime](https://cn.rx.js.org/class/es6/Observable.js~Observable.html#instance-method-throttleTime)
- [https://stackoverflow.com/questions/61567579/rxjs-difference-between-audittime-and-sampletime](https://stackoverflow.com/questions/61567579/rxjs-difference-between-audittime-and-sampletime)
- [https://thinkrx.io/rxjs/debounceTime-vs-throttleTime-vs-auditTime-vs-sampleTime/](https://thinkrx.io/rxjs/debounceTime-vs-throttleTime-vs-auditTime-vs-sampleTime/)

### 最后

通过此篇大家应该已经了解回压控制以及解决手段了，但要真的理解这几个“孪生”操作符的区别并不是一件易事，如果你认为自己真的理解它们的工作原理，不妨从下图检验一下：

![玩转 RxJS 操作符 —— 回压控制篇 配图 16](/assets/img/posts/pingcode-ysx3a/image-016.png)
