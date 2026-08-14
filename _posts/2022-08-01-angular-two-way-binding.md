---
layout: post
title: "Angular 两行代码实现自定义双向绑定"
date: 2022-08-01 21:49:03 +0800
categories: ["前端","框架"]
tags: ["Angular"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/37EHpn"
---

> 几个月前我总结了这块内容，觉得这是基础，大家都知道，就暂时放到了我的个人知识库，但最近几个同事相继都对我实现的双向绑定有疑问，这反映出这篇分享很有必要🙃🏻

### 表单式 NgModule

> 大家都是老前端，双向绑定的概念和原理就不再赘述了。

#### 实现

第一种方式组件实现 [ControlValueAccessor ](https://angular.cn/api/forms/ControlValueAccessor)这个接口。

![两行代码实现自定义双向绑定 配图 1](/assets/img/posts/pingcode-37ehpn/image-001.png)

子组件的双向绑定的实现（child.component）

![两行代码实现自定义双向绑定 配图 2](/assets/img/posts/pingcode-37ehpn/image-002.png)

#### 使用（app.component）

![两行代码实现自定义双向绑定 配图 3](/assets/img/posts/pingcode-37ehpn/image-003.png)

效果：我这里拿输入框举例

![两行代码实现自定义双向绑定 配图 4](/assets/img/posts/pingcode-37ehpn/image-004.png)

> 需要注意的点：
> 
> 1. `writeValue``registerOnChange``registerOnTouched`这三个函数是必须实现的。
> 2. provider 必须提供 `NG\_VALUE\_ACCESSOR`这个 InjectionToken。
{: .prompt-warning }

#### ControlValueAccessor 详解

> 这一节不感兴趣的可略过。

**定义一个接口，该接口充当 Angular 表单 API 和 DOM 中的原生元素之间的桥梁**。概念有些模糊，我领会的意思是 JS API 操作 DOM 的几个约定。

这个概念不重要，重要看下它能做些什么，以及各个函数的使用。

#### writeValue

是外部传入的新值，像上面使用方（app.component）用 ngModule 的方式将值（value）传入的 child.component 组件中。

![两行代码实现自定义双向绑定 配图 5](/assets/img/posts/pingcode-37ehpn/image-005.png)

#### registerOnChange

这个函数用于数据变化时驱动视图，很像 emit，这个回调函数的参数是一个函数，一般子组件的值发生变化时调用该函数，例如

![两行代码实现自定义双向绑定 配图 6](/assets/img/posts/pingcode-37ehpn/image-006.png)

![两行代码实现自定义双向绑定 配图 7](/assets/img/posts/pingcode-37ehpn/image-007.png)

#### registerOnTouched

控件聚焦或失焦时触发的函数。

### xChange 命名法

> 这个方法的意思是只要你的名字起的好，你可以什么都不做！

几个众所周知的知识

- 方括号的代表是属性，示例 `\[prop\]`
- 圆括号代表事件，示例 `(click)`
- 方括号套圆括号代表双向绑定

外部 Dom 传递值用属性指令，子组件 Model 返回值驱动外部 Dom UI 这就是双向绑定原理。

示例：

```html
<child-component [(prop)]="prop"></child-component>
```

等同于

```html
<child-component [prop]="prop" (propChange)="propChange()"></child-component>
```

#### 实现

1. 子组件 Input + Output 实现双向绑定（事件名必须是属性名+Change）

```typescript
import { Input } from '@angular/core';
@Component({
    selector: 'app-twoway-bind-example-component',
    template: '<button (click)="toggle()">click me</button>'
})
export class TwowayBindExampleComponent {
    @Input() prop:boolean = '';
  	@Output() propChange = new EventEmitter();
    toggle() {
    	this.prop = !this.prop;
        this.propChange.emit(this.prop);
    }
}
```

2. 使用

```typescript
<app-twoway-bind-example-component [(prop)]="prop"> 
  属性值 {{ porp }}
</app-twoway-bind-example-component>
```

### 两者的比较

在组件场景下两者通用，表单场景下用 ControlValueAccessor，因为没有原生 HTML 元素遵循了`xChange`事件的命名模式，DomxChange 适用于组件值绑定，更重要的是**它可以在一个组件中绑定多个值**。

### 最后

文档自有颜如玉，文档自是黄金屋，文档有乾坤，越说越高深，最后一句话：xChange 命名法，en... 香！

### 参考

- ControlValueAccessor： [https://angular.cn/api/forms/ControlValueAccessor](https://angular.cn/api/forms/ControlValueAccessor)
- two-way-binding： [https://angular.cn/guide/two-way-binding#how-two-way-binding-works](https://angular.cn/guide/two-way-binding#how-two-way-binding-works)
