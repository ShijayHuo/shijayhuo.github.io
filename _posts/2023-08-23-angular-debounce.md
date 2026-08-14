---
layout: post
title: "Angular 防抖处理姿势"
date: 2023-08-23 14:43:15 +0800
categories: ["前端","框架"]
tags: ["Angular"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/0Q4nI3"
---

**防抖处理是前端工程师的必备技能**，在业务场景中，我们经常会遇到一些需要频繁触发的操作，比如输入框搜索、按钮点击、鼠标滑动等。由于这些事件在短时间内被频繁触发（尤其是在事件函数处理其他耗时任务，比如处理 http 请求），会导致性能下降，影响用户体验。所以需要制定一些策略来减少它们执行的频次，常见姿势是：**防抖和节流，**本篇先说一下防抖，写出几种方式，直接能复制粘贴到项目，1 分钟即可复用的那种。

以下拿搜索 + 请求 API 的场景为例，以 Angular 为前端框架，在输入停止 500 毫秒后触发 API。

![Angular 防抖处理姿势 配图 1](/assets/img/posts/pingcode-0q4ni3/image-001.png)

#### RxJS debounce

RxJS 是一个响应式库，有丰富的操作符，其中就包含防抖，有两种：`debounce`和`debounceTime`，两种几乎可以互相代替，只是`debounce`属于高阶操作符，可以写表达式，再返回一个 Obeservable，如果不需要写表达式计算条件那么直接用 `debounceTime`。

1. HTML 中 input 绑定 value 改变的事件

![Angular 防抖处理姿势 配图 2](/assets/img/posts/pingcode-0q4ni3/image-002.png)

2. 组件内声明 Subject，在组件初始化时订阅，等待 onSearch 事件去触发，订阅时加防抖操作符来控制节奏（复制代码即可）

```typescript
private search$ = new Subject<string>();

ngOnInit(): void {
   this.search$.pipe(debounceTime(500)).subscribe(value => {
		// 执行 API 请求
   })
}

onSearch(value: string) {
   this.search$.next(value);
}
```

#### Lodash debounce

Lodash 这么丰富的工具库，当然也提供了防抖函数，使用方式：

`onSearch = \_.debounce(value => // 执行 API 请求, 500);`

> 怎么看起来这种方式更简单呢。

#### 原生实现（简单版）

写一个原生防抖函数，必须得知道它的原理：连续触发，之间必须间隔 500ms（示例），所以步骤为：

1. 定时 500ms 执行一段逻辑
2. 当下次事件触发，清除上一次的定时（无论是上次有没有结束）
3. 重新设置定时

简单代码：

```typescript
timer;
onSearch(value: string) {
   this.timer && clearTimeout(this.timer);
   this.timer = setTimeout(()=> {
      // 执行 API 请求，最后并把 timer 置空
      this.timer = null;     
   }, 500)
}
```

#### 最后

我们可以根据具体的业务需求来选择合适的方式。首推 RxJS，次推 Lodash，原生不推荐，了解原理即可，希望本文能够对你有所帮助，如果有任何问题或建议，欢迎在评论区留言，感谢！
