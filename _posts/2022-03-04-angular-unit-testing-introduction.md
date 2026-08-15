---
layout: post
title: "Angular 单元测试入门"
excerpt: "单元测试是产品保驾护航不可或缺的环节，在探究的过程中发现 Angular 单元测试是一块很大的内容，本次将介绍了Angular单元测试的入门的知识，带你手把手的写测试"
date: 2022-03-04 10:50:57 +0800
categories: ["前端","框架","工程化"]
tags: ["Angular","单元测试","工程化"]
source_platform: Juejin
source_url: "https://juejin.cn/post/7071071954278547487"
---

{% raw %}
> 以前，我对前端测试的认识是片面的，以为前端只是端对端的数据测试，最多再加上一些简单的逻辑测试，工具类测试等，然而我以为的以为，只是我以为......写过测试后才深知能模拟和测试的场景远比我想到的要更加丰富！

## 介绍

想要弄明白测试的第一件事是先把测试能够跑起来，下面以组件库为例。

首先找到 package.json -> scripts 找到了 test 节点

```
"test": "npm run test-tethys && npm run test-schematics",
"test-tethys": "ng test ngx-tethys"
```

运行测试  `npm run test`   或   `npm test`  ，运行的过程中会打开一个新的 chorm 浏览器，如图(来自组件库的测试结果图)


![image.png](/assets/img/posts/juejin-7071071954278547487/image-001.png)

ok，测试能够跑起来，说明思路是对的，现在从运行测试的命令中可以获取的信息是  `ng test ngx-tethys`  ，下一步就可以从 angular.json 中找到项目   `ngx-tethys`  的配置了。

ps：都清楚的同学的可以跳至  **编写测试环节**  。

### angular.json


![image.png](/assets/img/posts/juejin-7071071954278547487/image-002.png)

从 angular.json 中读出了配置测试的几个关键节点   **builder **  和  ** options **  的   **main、karmaConfig**  ，测试入口文件是 src/test.ts，另一个就是 karma 和 karmaConfig。

接下来两个任务：

1. 查看 src/test.ts
1. 简单知道 karma 是什么 和 karma的配置（karmaConfig）


### 入口文件 src/test.ts


![image.png](/assets/img/posts/juejin-7071071954278547487/image-003.png)

平常使用 ng 创建的指令、组件和服务都会包含一个后缀为 .spec.ts 的文件，而测试的检索规则正是运行这些文件，这也解答了我当初的疑惑 🤔

### karma

> Karma是一个基于Node.js的JavaScript测试执行过程管理工具（Test Runner）。测试覆盖率、可视化 chrome 窗口都是它提供的。

对着文档大致的看了一下 karma.conf.js

文档：  [https://karma-runner.github.io/6.3/config/configuration-file.html](https://karma-runner.github.io/6.3/config/configuration-file.html)


![image.png](/assets/img/posts/juejin-7071071954278547487/image-004.png)

从这段配置中可以知道使用的测试框架是   **jasmine**  ，该框架类似于 mocha，但比他多一些断言函数，关于框架的更多用法没有什么可赘述的，想要了解更多的戳  [这里👇](https://jasmine.github.io/pages/docs_home.html)  。

## 编写测试

上面的探索过程，已经可以知道 angular cli、karma、 jasmine 是如何互相集成了，下面终于可以开始动手写测试了。

大纲分为以下内容

- 如何创建dom/组件
- 如何模拟事件
- 如何测试指令
- 如何测试服务


### 测试组件

先写一个组件

```
@Component({
    selector: 'app-button',
    template: `<button>{{ text }}</button>`
})
export class ButtonComponent {
  text = 'hello world'
}
```

接下来我们需要编写测试用例之前做一些事情，比如在 NgModule 中声明该组件，这与开发时是一样的，不同的是它用一个叫   **TestBed**   的东西代替了 NgModule，如下

```
beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ButtonComponent ]
    })
    .compileComponents();
});
```

> 关于 TestBed 更多 API 在  [这里](https://angular.cn/api/core/testing/TestBed#testbed)  。

下面我们要模拟创建出该组件

```
let component: ButtonComponent;
let fixture: ComponentFixture<ButtonComponent>;
beforeEach(()=>{
  fixture = TestBed.createComponent(ButtonComponent); // 创建组件
    component = fixture.componentInstance; // 拿到组件实例
})
```

OK，到这里我们可以开始真正写测试逻辑了，比如断言一下  text 的初始值。

```
it(`should text is 'hello world'`, () => {
    expect(component.text).toEqual('hello world');
})
```

运行测试   `npm run test`  ，可以从浏览器中看到结果


![image.png](/assets/img/posts/juejin-7071071954278547487/image-005.png)

### 模拟事件

下面我们模拟用户点击按钮的场景。

首先在原先的 template 中定义 click 事件，并在组件中声明

```
@Component({
    selector: 'app-button',
    template: `<button  (click)="click()">{{ text }}</button>`
})
export class ButtonComponent {
  text = 'hello world'
    click(){
      this.text = 'clicked';
    }
}
```

引入 dispatchMouseEvent 模拟鼠标事件函数

```
import { dispatchMouseEvent } from 'ngx-tethys/testing';
```

添加触发点击事件的逻辑

```
it(`should text is 'clicked' when click button`, () => {
    const el: HTMLElement = fixture.nativeElement;
    dispatchMouseEvent(el.querySelector('button') as any, 'click');
    fixture.detectChanges();
    expect(component.text).toEqual('clicked')
})
```

可以看到测试结果是正确的


![image.png](/assets/img/posts/juejin-7071071954278547487/image-006.png)

### 测试组件中指令

假设想通过一个属性指令 size 来控制按钮的大小，像这样  `<button size='mini'>小按钮</button>`

断言按钮的 size 属性是否生效

**首先在上面代码的基础上创建一个指令**

```
import { Directive, ElementRef, Input, OnInit } from '@angular/core';

@Directive({selector: '[size]'})
export class ButtonSizeDirective {
  height?: string;
  constructor(private el: ElementRef) {}
  @Input()
  set size(value: 'default' | 'small' | 'mini') {
    if (!value) {
      value = 'default';
    }
    this.height = "60px;";
    if (value === 'small') {
      this.height = "50px;";
    } else if (value === 'mini') {
      this.height = "40px;";
    }
    this.el.nativeElement.style = `height:${this.height}`;
  }
}

```

**其次，在 Module 中声明指令，**  修改上面的代码

```
beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ButtonComponent, ButtonSizeDirective]
    }).compileComponents();
  });
```

添加测试代码

```
import { By } from '@angular/platform-browser';

it(`should height=40px when button size is mini`, () => {
    const directive = fixture.debugElement.query(
       By.directive(ButtonSizeDirective) // 通过 By.directive 方式创建
    );
    expect(directive.styles.height).toEqual('40px')
    expect(el.querySelector('button')?.style.height).toEqual('40px')
})
```

By 类是 通过 @angular/platform-browser 导入的，与   `DebugElement`   的查询功能一起使用的谓词，  是从浏览器平台导入的。
-   [https://angular.cn/guide/testing-components-basics#bycss](https://angular.cn/guide/testing-components-basics#bycss)
-   [https://angular.cn/api/platform-browser/By](https://angular.cn/api/platform-browser/By)


### 测试服务

举例，创建一个可以校验字符串的UtilService，如下

```
import { Injectable } from '@angular/core';

@Injectable({providedIn: 'root'})
export class UtilService {
  checkText(text: string) {
    return /[a-z]/.test(text)
  }
}
```

在组件中使用/注入服务

```
import { Component, ElementRef, OnInit } from '@angular/core';
import { UtilService } from '../util.service';

@Component({
  selector: 'app-button',
  template: `
  <div>
    <button class="btn" size='mini' (click)="click()"> {{text}}</button>
  </div>`,
})
export class ButtonComponent implements OnInit {
  ngOnInit(): void {
    this.isValid = this.util.checkText(this.text);
    console.log(this.isValid)
  }
  constructor(private util: UtilService) {}
  text = '点击我'
  isValid?: boolean;
  click() {
    this.text = 'clicked';
  }
}
```

测试服务前还需要在 Module 中配置 providers 属性

```
beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ButtonComponent, ButtonSizeDirective],
      providers: [UtilService]
    }).compileComponents();
  });
```

最后，测试服务可用以及在组件中预期的结果

```
it(`should return false when input param is "哈哈"`, () => {
    const util = TestBed.inject(UtilService); // 使用 TestBed.inject 注入服务
    expect(util.checkText('哈哈')).toEqual(false);
})

it(`should isValid=false when init button component`, () => {
    fixture.detectChanges();
    expect(component.isValid).toEqual(false)
})
```



## 调试测试代码

由于我本身对Angular的测试很多知识不熟，所以很多时候需要调试，比如组件库测试很多，我只想修复跑不过的测试，这时可以在浏览器右上角勾选 Debug -> options 的一些选项


![image.png](/assets/img/posts/juejin-7071071954278547487/image-007.png)

- [ ] stop execution on spec failure， 停留到报错的测试

- [ ] stop spec on expectation failure ，在不符合预期的测试停止

- [ ] 随机运行测试

- [ ] 隐藏禁用的测试

如果要调试具体代码，按下已经掉漆的 F12 键，打断点到代码中 😂

## 结尾

单元测试是产品保驾护航的必不缺少环节，在探究的过程中发现 Angular 单元测试是一块很大的内容，本次只介绍了入门的部分知识，若要全方位的掌握 Angular 测试，我们还需要深究更多相关的概念，其中不可缺少的资料：Angular 文档。
{% endraw %}
