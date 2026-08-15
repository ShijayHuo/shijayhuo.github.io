---
layout: post
title: "JavaScript中令人困扰的 this"
excerpt: "JavaScript this 属于 作用域下的一部分，指的是当前调用的上下文，其他繁杂的概念就不赘述了。 温馨提示：下面的示例，可以作为题型，可先不看答案，尝试 答出，如果全能答出 说明 这块基础 夯实了，最下面有 总结的 万能大法，建议收藏食用。 this 指向 上层 对象…"
date: 2021-03-28 14:29:53 +0800
categories: ["JavaScript"]
tags: ["JavaScript"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6944587375334916126"
---

{% raw %}
JavaScript this 属于 作用域下的一部分，指的是当前调用的上下文，其他繁杂的概念就不赘述了。

this 是 JavaScript 老掉牙的问题了，同时也是 面试官比较爱考的，但是自己是否真的掌握了呢？

温馨提示：下面的示例，可以作为题型，可先不看答案，尝试 答出，如果全能答出 说明 这块基础 夯实了，最下面有 **总结的 万能大法，建议收藏食用**。

![image.png](/assets/img/posts/juejin-6944587375334916126/image-001.png)

## 一、普通作用域下的 this

### 1.函数内this
**this 指向 上层 对象。**

##### 1.1 函数在 最外层
- web 浏览器下 指向的是 window
- node 环境下 指向的是 global

例如：
```
function foo(){
  console.log(this)
}
foo() // window 或 global
```

##### 1.2 函数在 内层
示例1：
```
const obj = {
  a: 12,
    foo: function(){
      console.log(this.a)
    }
}
obj.foo() // 12
```

示例2：
```
function foo(){
  this.a = 12
    function fn (){
      console.log(this.a)
    }
    return fn
}
foo()() // 12
```

### 2.字面变量声明的对象下的 this

**指向 全局 **
- web 浏览器下 指向的是 window
- node 环境下 指向的是 global


例如：
```
const obj = {
  a: 12,
    b: this.a + 1
}
console.log(obj.b) // NaN 因为 this.a 是 undefined，this 指向的是 全局
```

### 3.构造函数内this

**指向实例，注意只有 new 的 function 才叫做 构造函数，只有new 之后的对象才是 实例。**

例如：
```
function Person() {
  this.name = "张三"
}
const p = new Person()
console.log(p.name)  // 张三
```

### 4.原型链上内的this

**指向实例，等同于构造函数内this**

例如：
```
function Person(){
  this.name = "张三"
}
Person.prototype.say = function (){
  console.log(this.name)
}

const p = new Person()
p.say() // 张三
```

## 二、改变 this 指向

**call、apply、bind **  是函数对象的 方法，  **call、apply、bind 绑定的 this，均指向 第一个参数**

### 1.call
***function.call(thisArg, arg1, arg2, ...)***
第一个参数是 this，后面是 函数对象 本身的参数。
作用有两个：① 执行当前函数  ② 绑定 一个 对象 作为 当前 this。
  [更多详情](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/call)

示例1：
```
function foo(age){
    console.log(this.name, age) // 正常调用， this.name 和 age 肯定是不存在的
}
const p = { name: "张三" }
foo.call(p,12) // "张三" 12
```

示例2:
```
const p = {
  name："张三",
  say: function(){
    console.log(this.name)
  }
}
p.say() // "张三"
const p1 = { name: "李四" }
p.say.call(p1) // 李四
```

### 2.apply
***function.apply(thisArg, [argsArray])***

call() 方法的作用 和 apply() 方法类似，区别就是call()方法接受的是参数列表，而apply()方法接受的是一个参数数组。
  [更多详情](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)

示例：
```
function foo(age,hobby){
    console.log(this.name,age,hobby) // age=12 hobby=象棋
}
const p = { name: "张三" }
const args = [12,"象棋"]
foo.apply(p,args) // "张三" 12 象棋
```

### 3.bind
***function.bind(thisArg[, arg1[, arg2[, ...]]])***

**bind() 方法创建并返回一个新的函数，**  ，在 bind() 被调用时，这个新函数的 this 被指定为 bind() 的第一个参数，而其余参数将作为新函数的参数。
  [更多详情](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)

示例：
```
function foo(age,hobby){
    console.log(this.name,age,hobby)
}
const p = { name: "张三" }
const fn = foo.bind(p,12,"象棋") // 返回一个函数
fn() // "张三" 12 象棋
```

## 三、箭头函数
箭头函数是 ES6 加入的，作用几乎等同于 普通 函数，其中一点重要不同的是   **箭头函数内没有 this，也可以说指向的是外层的 this。**  箭头函数  [ 更多用法详情](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
**所以在箭头函数内，要小心的使用 this。**

### 1.箭头函数没有this
示例2：
```
const person = {
    name: "张三",
  say: ()=>{
      console.log(this.name)
    }
}
person.say(); // undefined
```
say 函数的 this 指的是 全局下的 window 或 global

### 2.箭头函数不可作为 构造函数，不存在 this 问题

示例1：
```
const Person = (name)=>{
  this.name = name
}
console.log(new Person("张三")) // 报错  TypeError: Person is not a constructor
```


## 四、总结：万能大法
- 非箭头函数：谁调用 this 就指向谁，没有对象调用 默认指向 全局 window 或 gobal。
- 构造函数或原型链的函数： 永远指向 实例。
- call、apply、bind 情况下 this 永远指向 第一个 参数。
- 箭头函数：没有this，或指向 外层作用域下的 this。
{% endraw %}
