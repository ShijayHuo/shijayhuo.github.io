---
layout: post
title: "函数式编程"
excerpt: "前言 函数式编程近几年炒的火热，其实函数式编程其实很早就有了，支持该范式的语言有大名鼎鼎的C、JavaScript、PHP等，那为什么又进行了一波高潮呢，我们来探究一下。"
date: 2021-08-01 13:04:33 +0800
categories: ["JavaScript"]
tags: ["JavaScript","函数式编程"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6991322029005733918"
---

{% raw %}
# 前言
函数式编程近几年炒的火热，其实函数式编程其实很早就有了，支持该范式的语言有大名鼎鼎的C、JavaScript、PHP等，那为什么又进行了一波高潮呢，我们来探究一下。
# 一、什么是函数式编程
首先了解一下什么是函数式编程：
> 函数式编程（英语：functional programming）或称函数程序设计、泛函编程，是一种编程范式，它将电脑运算视为函数运算，并且避免使用程序状态以及易变对象。其中，λ演算为该语言最重要的基础。而且，λ演算的函数可以接受函数作为输入参数和输出返回值。
>                                                                                                                                                         ——维基百科

​

![](/assets/img/posts/juejin-6991322029005733918/image-001.png)
​

函数式是一种**编程范式**，同时函数式也是一种以函数为核心的**编程思维方式**。
## 函数是一等公民
函数赋值给变量，可以作为参数传递，可以作为返回值。
```javascript
// 函数可以赋值给变量
const foo = function() { return "foo" }
// 函数可以作为参数传递，可以作为返回值
function bar(foo,callback){
  const result = foo()
  return callback(result)
}
bar(result=>{
  console.log(result)
})
```
# 二、纯函数 & 高阶函数
## 1. 纯函数
> 纯函数是函数式编程中非常重要的一个概念，简单来说，就是一个函数的返回结果只依赖于它的参数，并且在执行过程中没有副作用，我们就把这个函数叫做纯函数。

- 避免副作用
- 可重复利用
## 2. 高阶函数
以函数输入或以函数输出的函数叫做高阶函数。
​

 函数输入参数是函数
![](/assets/img/posts/juejin-6991322029005733918/image-002.png)
​

 函数输出值为函数
​

![](/assets/img/posts/juejin-6991322029005733918/image-003.png)
​

 闭包
```javascript
function foo(name){
  return function(){
    return "hello," + name
  }
}
```
# 三、函数式的正确姿势
## 1. 避免做迭代
​

![](/assets/img/posts/juejin-6991322029005733918/image-004.png)
​

能用函数解决的，避免用for、while、do...while来做，上图展示的就是以函数式的思维来做一个三明治，第一道工序是把原材料切片剁碎，第二步是累加组合，这样一个三明治就做出来了。那么转换成命令式的做法就是在一个迭代中做所有工序。
## 2. 避免数据变异
​

![](/assets/img/posts/juejin-6991322029005733918/image-005.png)
​

![](/assets/img/posts/juejin-6991322029005733918/image-006.png)
​

# 四、优缺点 & 使用场景
## 1. 优缺点

- 优点
   - 简单易写易读
   - 可靠性(纯函数)
   - 惰性求值(高阶函数)
   - 易于测试
   - 组合开发
   - 易于” 并发编程” ？
- 缺点
   - 部分适合牺牲性能
   - 消耗内存？
## 2. 使用场景

- 日常代码中的实践：处理对数据进行复杂、多次的链式操作。
​![](/assets/img/posts/juejin-6991322029005733918/image-007.png)
​
- Mocha：单元测试库
​![](/assets/img/posts/juejin-6991322029005733918/image-008.png)
​
- Redux：基于React的工具库
- Lodash
- Mirror
# 五、Q & A
## 1. FP vs OOP

- 核心
   - FP：以函数为核心解决问题
   - OOP： 以类和对象解决问题，特性：抽象、封装、继承、多态
- 动态、扩展机制
   - FP：组合+高阶函数
   - OOP：继承+多态
## 2. FP vs IP
> 比起指令式编程(Imperative programming)，函数式编程更加强调程序执行的结果而非执行的过程，倡导利用若干简单的执行单元让计算结果不断渐进，逐层推导复杂的运算，而不是设计一个复杂的执行过程。
>                                                                                                                                                         ——维基百科

 命令式
```javascript
const arr = ["zhangsan","lisi","wangwu"]
for(let i = 0; i < arr.length; i++){
    if(arr[i]==="lisi"){
       arr.splice(i,1)
    }
}
console.log(arr)
```
​

 函数式
```javascript
const arr = ["zhangsan","lisi","wangwu"]
const result = arr.filter(x=>x!=="lisi")
console.log(result)
```
# 参考 & 推荐

- 函数式入门视频：[https://www.youtube.com/watch?v=e-5obm1G_FY](https://www.youtube.com/watch?v=e-5obm1G_FY)
- 函数式优缺点：[https://blog.csdn.net/HXCURTAIN/article/details/77619252](https://blog.csdn.net/HXCURTAIN/article/details/77619252)
- 函数式编程：[https://www.cnblogs.com/fs0196/p/12686107.html](https://www.cnblogs.com/fs0196/p/12686107.html)
- 高阶函数：[https://zhuanlan.zhihu.com/p/49579052](https://zhuanlan.zhihu.com/p/49579052)
- JavaScript 以函数式为主导的工具库
   - lodash
   - ramda
   - mirror
{% endraw %}
