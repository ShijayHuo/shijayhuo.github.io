---
layout: post
title: "透过 TS 继承语法糖 看 JS 继承"
excerpt: "在开始之前，我想聊一下 JavaScript这门语言，我接触 这门语言也3年之多了，js 这门语言比较古怪，往好的说， 灵活， 支持 多种语言范式（函数式，命令式，面向对象等等）怎么玩都可以，往不好的说 是 四不像，它天生的 弱类型，作用域问题(变量提升、值覆盖)，回调嵌套 等…"
date: 2021-03-30 08:57:54 +0800
categories: ["前端","JavaScript"]
tags: ["JavaScript","TypeScript"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6945244985939722247"
---

{% raw %}
![image.png](/assets/img/posts/juejin-6945244985939722247/image-001.png)
在开始之前，我想聊一下 JavaScript这门语言，我接触 这门语言也3年之多了，js 这门语言比较古怪，往好的说，  **灵活，**  支持 多种语言范式（函数式，命令式，面向对象等等）怎么玩都可以，往不好的说 是 四不像，它天生的 弱类型，作用域问题(变量提升、值覆盖)，回调嵌套 等等 缺陷，有的是历史原因，有的却是 设计缺陷，我喜欢 js 但不得不承认和正视它的问题。随着 各大社区 和 ECMA 组织 的 共同努力，推出 ES2015 规范 ...... js 开始有了翻天覆地的变化，非常的有冲击力，这正是我喜欢的原因，我喜欢的不是 天生和已经的好，而是 喜欢 不是很好 到 后来居上，更喜欢的是 一起成长，一起强大，不管是人还是语言。

说起 js 的继承，它是一个很让人困扰的问题，由于js的一些历史原因，在对象扩展方面是    **基于原型**   的，ES6 是个 好东西，提出了  **class**   概念，加入了   **extends**   这两个语法糖，所以 现在开发来说 非常的简单，一行代码 足以 搞定，但是 面对 面试官的 灵魂拷问 你是否能够应对的了呢？你是否真的 了解和掌握了 它的 实现和原理呢？
以前我写过 关于 js 继承的   [文章](https://juejin.cn/post/6844904025142329357)  ，那是围绕   **里氏替换原则（Liskov Substitution Principle,LSP）**  总结的，本文 从一个 新的 角度：TS class 实现，为啥不是 ES6 class，因为 TS 可以编译成 js 看源码，这样能够更加透彻的理解，编译后的代码 是 有点 琢磨头的，文中如有不懂 可以多看几遍 或 在下方评论。

## 一、Typescript 中的 class 与 继承
这里先举一个比较简单的例子
```
class SuperClass {
    name: string
    constructor() {
        this.name = "张三"
    }
    static main() {
        console.log("我是 main 函数")
    }
}

class SubClass extends SuperClass { }
const instance = new SubClass()
console.log(instance.name)   // 张三
SubClass.main()        // 我是 main 函数
```
![image.png](/assets/img/posts/juejin-6945244985939722247/image-002.png)

## 二、js 继承的 实现

接下来 tsc 编译成 ES5 后的源码（由于编辑器 看起来不舒服 我分成 三段了，实则是 一块代码），  **推荐大家复制到 编辑器中，一边 看文章，一边对照代码。**
```
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (sub, sup) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (sub, sup) { sub.__proto__ = sup; }) ||
            function (sub, sup) { for (var p in sup) if (sup.hasOwnProperty(p)) sub[p] = sup[p]; };
        return extendStatics(sub, sup);
    };
    return function (sub, sup) {
        extendStatics(sub, sup);
        function __() { this.constructor = sub; }
        sub.prototype = sup === null ? Object.create(sup) : (__.prototype = sup.prototype, new __());
    };
})();
```
```
var SuperClass = /** @class */ (function () {
    function SuperClass() {
        this.name = "张三";
    }
    SuperClass.main = function () {
        console.log("我是 main 函数");
    };
    return SuperClass;
}());
```
```
var SubClass = /** @class */ (function (_super) {
    __extends(SubClass, _super);
    function SubClass() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return SubClass;
}(SuperClass));

var instance = new SubClass();
console.log(instance.name); // 张三
SubClass.main();  // 我是 main 函数
```

乍一看，第一块代码 太复杂了，云里雾里的，这是要劝退的节奏啊，不要慌，沉下心来，阿杰带你 慢慢分析！

我的思路是，  **从下往上读，下文中 均 采用闭包的方式是 为了 作用域隔离**  。

### 解析一

1. 首先看到的 SubClass 是一个 由一个立即执行函数，  **参数是它的父类**  ，传入的是 SuperClass，  **返回值是一个 闭包函数 SubClass**  ，还有那见怪不怪的 var 命名 与 覆盖。


1. 接着 看函数内部(从上至下的顺序)，第一行 调用 __extends(SubClass, _super)。

- 参数 SubClass ，是 下面 的 function SubClass 函数
- 参数 _super 是 传入的 父类：SuperClass，  **下面 所有的 _super 都指的是 SuperClass**  。

这里 先跳过 __extends 函数的实现，后面 详细分解。

1. function B 函数内部 就一行代码：  `return _super !== null && _super.apply(this, arguments) || this;`  ​，这行代码 就是   **this 继承，子类就是父类，需要好好理解。**   意思是说   **_super 如果存在 那么就 返回一个 this 是当前函数上下文 this 的 _super 函数，  如果是 null 说明 没有要继承的父类，所以就返回 当前上下文 this，​关于 this 和 apply 函数 有不懂的，说明你的基础比较欠缺，不要慌 有秘籍，点 **  [**这里**](https://juejin.cn/post/6944587375334916126)  ** **  。
1.

到此，  **子类 SubClass 实现了 this 继承，子类就是父类**  。

### 解析二

接下来讲，最后一段代码关联到的 父类   **SuperClass。**

1. 可以看到 SuperClass 也是立即执行函数，返回的是一个闭包函数 SuperClass。


1. 内部函数 SuperClass 是一个 构造函数，并有一个 “私有” 变量  name。


1. SuperClass.main 是 其静态函数，SuperClass 是 一个 由 function 声明的 函数对象，函数本身是对象，所以 SuperClass 是可以直接 挂载属性的，这就是 独特的 js。



### 解析三

最后看第一段代码，是解析一 闭包函数 的 第一行 调用的函数   **__extends，**  也是最最核心的函数。

1. __extends 也是一个立即执行函数，返回的 同样是一个 闭包 ，不过 是一个 匿名函数。


1. 看 return 的 匿名函数，就是 继承的函数，参数有两个，第一个是 子类，第二个是 父类。

- 第一行 执行 extendStatics 函数，可以先跳过。
- 一个名字奇奇怪怪的 __ 新函数，也可能不知道 起什么名字了吧，里面的 一行代码    `this.constructor = sub;`  ​意思是   **子类 作为 当前函数的 构造函数。**


1. 这行是   **图中提到的 原型链的 继承，**  意思是说，  **父类如果不存在，那么就 返回一个 Object.create 创建一个 原型对象是 父类的 对象(有点拗口，多读几遍)，存在的话 就把 父类的 原型链 作为 __ 函数对象的 原型链，并且 返回 上面 __ 函数的 新实例。**


到此时，暂停一下，我们看一下，sub 目前拥有了哪些东西，最开始 的    **this 继承，**  该函数   **原型链继承，并且 原型链上的 构造函数 就是 子类自身。**

### 解析四
extendStatics 函数的实现。
1. 该函数有两个参数，第一个是 子类，第二个是父类。


1. 内部 extendStatics 等于 Object.setPrototypeOf 函数 或 后面 ...... 一堆代码。为啥要写 这么一堆呢？

我猜是因为 Object.setPrototypeOf 是后来 ES6 加入的函数，有的环境可能不支持 ES6，所以 || 后面是它原生的实现，作用等同于 setPrototypeOf ，有兴趣的同学可以把它展开 分成多行，这本文中不占用 内容 讲解了。

1.  返回 extendStatics 函数的 结果，其实 就是 Object.setPrototypeOf(子类，父类)，这里简单讲一下       Object.setPrototypeOf 是什么吧。

**Object.setPrototypeOf() 方法设置一个指定的对象的原型 ( 即, 内部[[Prototype]]属性）到另一个对象或  null，**  两个参数 第一个参数是  ** 要设置其原型的对象，**  第二个参数是   **该对象的新原型(一个对象 或 null)。**
更多的Object.setPrototypeOf 点  [这里](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/setPrototypeOf)
这个 函数 最终的 意义 就是    **把 子类的原型对象 __proto__ 替换成 原型为 父类的原型对象，达到 原型对象的 继承。**

最后 整理出一个 简单 版本，欢迎 食用。
```
function __extends(sub, sup) {

    // 2. 原型对象 继承
    Object.setPrototypeOf(sub, sup)
    function __() {
        // 3.构造函数 指向自身
        this.constructor = sub;
    }
    // 4.原型链继承
    __.prototype = sup.prototype
    sub.prototype = new __();
}
```

![image.png](/assets/img/posts/juejin-6945244985939722247/image-003.png)

## 总结
js 继承 满足四个条件：
- this 继承，通过 call、apply 更改 this 指向
- 原型对象继承
- 原型链继承
- 构造函数 指向 自身

达到最后真正的继承。

## 最后

OK，一切 终于 回归 平静了！有不明白的，或者 文中有错误的 欢迎评论留言！
{% endraw %}
