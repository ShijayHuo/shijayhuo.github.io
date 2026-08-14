---
layout: post
title: "如何动态截断过长的文字并添加 tooltip"
date: 2023-09-06 16:17:28 +0800
categories: ["前端"]
tags: ["CSS"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/cHCn1G"
---

开发中经常会遇到文字很长的场景，如果全部展示就会占很大的空间（宽度），视觉上会很丑，甚至在某些固定宽度下会默认换行，举个前几天开发的示例：

![如何动态截断过长的文字并添加 tooltip 配图 1](/assets/img/posts/pingcode-chcn1g/image-001.png)

我们常见的解决方式是：

1. 添加 css 截断文字，这很简单，**但是要注意，块级元素（inline-block、block）才会生效。**

```css
.text-truncate {
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}
```

2. 添加上 tooltip，悬浮上可以看到全部（本人用的是 angular + ng-zorro 组件库）

```html
<div 
	nz-tooltip 
    [nzTooltipTitle]="tooltipTitle" 
    [nzTooltipPlacement]="nfTooltipPlacement"
>
{{ text }}
</div>
```

看效果：

![如何动态截断过长的文字并添加 tooltip 配图 2](/assets/img/posts/pingcode-chcn1g/image-002.png)

OK，已解决，结束。

当然，开个玩笑，抖个机灵，别走，后面才是正文。

#### 问题

前面看似已经解决了文本长，既满足美观，又可以看到完整信息的目的了，但我并不满足于此，我想更友好一些（如下图）

![如何动态截断过长的文字并添加 tooltip 配图 3](/assets/img/posts/pingcode-chcn1g/image-003.gif)

1. **当文本过长时才有悬浮显示 tooltip，如果默认宽度足够展示文字了，那么就不触发 tooltip 逻辑**
2. **在可拖拽容器宽度场景下（表格拖拽列宽），实时的更新为“第一条”的效果**
3. 当文字内容发生变化时（通常正常逻辑不会出现，从控制台修改文本可以触发），实时更新为“第一条”的效果

满足以上动态变化的场景就需要费点脑筋了。

#### 解决

核心有两点：

1. **截断的临界点：判断文本宽度超过了容器宽度**
2. **触发时机：当容器宽度或文本长度发生变化时去触发第一条**

所以，完整的流程如下图：

![如何动态截断过长的文字并添加 tooltip 配图 4](/assets/img/posts/pingcode-chcn1g/image-004.png)

##### 比对文本内容宽度与容器宽度

这里需要回顾几个 API：

1. 获取文本内容宽度 element.scrollWidth

> `Element.scrollWidth` 这个只读属性是元素内容宽度的一种度量，包括由于 **overflow 溢出而在屏幕上不可见的内容**。——MDN[链接](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/scrollWidth)

2. 获取容器宽度
   
   1. [element.offsetWidth](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/offsetWidth)（四舍五入，取整）
   2. [element.getBoundingClientRect](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/getBoundingClientRect)（保留小数）

有两这几个值，很简单的就可以计算出**是否需要展示 tooltip 了**，见代码：

```html
<div
    #textBox
	nz-tooltip 
    [nzTooltipTitle]="tooltipTitle" 
    [nzTooltipPlacement]="nfTooltipPlacement"
>
{{ text }}
</div>
```

```typescript
@ViewChild('textBox') textBox: ElementRef;

private isTextOverflow(): boolean {
   const containerWidth = this.textBox.nativeElement.offsetWidth;
   const textWidth = this.textBox.nativeElement.scrollWidth;
   return textWidth > containerWidth;
}
```

##### 监听容器宽度或文本内容变化

这里还得介绍两个 API：

1. ResizeObserver

> `ResizeObserver` 接口监视 `Element` 内容盒或边框盒或者 `SVGElement` 边界尺寸的变化。——MDN 更多看[链接](https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver)
> 
> `ResizeObserver.disconnect()`
> 
> 取消特定观察者目标上所有对 `Element` 的监听。
> 
> `ResizeObserver.observe()`
> 
> 开始对指定 `Element` 的监听。
> 
> `ResizeObserver.unobserve()`
> 
> 结束对指定 `Element` 的监听。

2. [ContentObserver](https://material.angular.cn/cdk/observers/api)，这个是 Angular Cdk 的 API，是基于原生 Web API [MutationObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/MutationObserver) 封装的，**它会在指定的 DOM 发生变化时被调用**。

结合这两者，使用 RxJS 的统一封装为：

```typescript
import { ContentObserver } from '@angular/cdk/observers';
import { Observable, merge } from 'rxjs';

const observer$ = merge(
  this.contentObserver.observe(this.textBox.nativeElement),
  this.createResizeObserver(this.textContainer?.nativeElement)
).subscribe(() => {
  	const isTextOverflow = this.isTextOverflow();
    this.tooltipTitle = this.isTextOverflow ? this.text : '';
  }
);
```

**注意：防止内存泄漏，销毁组件时记得取消订阅**

##### Demo 和完整代码

> 声明：Demo 简易版的，很多细节没有

- 效果：[https://stackblitz-starters-vsfwcr.stackblitz.io/](https://stackblitz-starters-vsfwcr.stackblitz.io/)
- 源码：[https://stackblitz.com/edit/text-truncate-source](https://stackblitz.com/edit/stackblitz-starters-vsfwcr?file=src%2Ftext-truncate.component.ts,src%2Ftext-truncate.component.html)

#### 番外篇：封装为组件

> 以下是以 Angular 框架为例封装的

```typescript
import { ContentObserver } from '@angular/cdk/observers';
import { AfterViewInit, Component, ElementRef, Input, ViewChild, ViewEncapsulation } from '@angular/core';
import { Observable, Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'nf-text-truncate',
    encapsulation: ViewEncapsulation.None,
    template: `
        <div #textBox *ngIf="nfShowTooltip" class="text-truncate" nz-tooltip [nzTooltipTitle]="tooltipTitle" [nzTooltipPlacement]="nfTooltipPlacement">{{ nfText }}</div>
        <span *ngIf="!nfShowTooltip" class="text-truncate">{{ nfText }}</span>
    `,
    host: {
        'class': 'nf-text-truncate'
    },
    styles: [
        ".nf-text-truncate { width: 100% }"
    ]
})
export class NFTextTruncateComponent implements AfterViewInit {

    @Input() nfText: string;

    @Input() nfShowTooltip = true;

    @Input() nfTooltipPlacement: 'top' | 'left' | 'right' | 'bottom' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom';

    public tooltipTitle: string;

    private destroy$ = new Subject();

    @ViewChild('textBox') textBox: ElementRef;

    constructor(private contentObserver: ContentObserver) { }

    ngAfterViewInit(): void {
        this.tooltipTitle = this.nfText;
        if (this.nfShowTooltip) {
            this.contentObserver
                .observe(this.textBox)
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => {
                    this.updated();
                });
            this.createResizeObserver(this.textBox.nativeElement)
                .pipe(takeUntil(this.destroy$))
                .subscribe(() => {
                    this.updated();
                });
        }
    }

    private createResizeObserver(element: HTMLElement) {
        return new Observable((observer) => {
            const resize = new ResizeObserver((entries) => {
                observer.next(entries);
            });
            resize.observe(element);
            return () => {
                resize.disconnect();
            };
        });
    }

    private updated() {
        const showTooltip = this.isTextOverflow();
        if (!showTooltip) {
            this.tooltipTitle = '';
            return;
        }
        if (showTooltip && !this.tooltipTitle) {
            this.tooltipTitle = this.nfText;
        }
    }

    private isTextOverflow(): boolean {
        const containerWidth = this.textBox.nativeElement.offsetWidth;
        const textWidth = this.textBox.nativeElement.scrollWidth;
        return textWidth > containerWidth;
    }

    ngOnDestroy() {
        this.destroy$.complete();
    }
}
```

使用：

```javascript
<nf-text-truncate
	[nfText]="这是一段特别长特别长特别长特别长特别长特别长的文本"
></nf-text-truncate>
```
