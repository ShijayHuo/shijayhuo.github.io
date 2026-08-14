---
layout: post
title: "关于 NG0100 的处理"
date: 2022-08-01 21:49:03 +0800
categories: ["前端","框架"]
tags: ["Angular"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/LBtNNa"
---

```javascript
Error: NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value for 'min-width': 'undefined'. Current value: '120'.. Find more at https://angular.io/errors/NG0100
    at throwErrorIfNoChangesMode (core.mjs:6744:1)
    at bindingUpdated (core.mjs:12747:1)
    at checkStylingProperty (core.mjs:16503:1)
    at ɵɵstyleProp (core.mjs:16392:1)
    at SpaceDetailComponent_ng_container_0_Template (template.html:6:13)
	......
```

Error: NG0100 的错误已经是第二次遇到了，不知道大家是否遇到过。

每当进入空间（以前的知识库）控制台就会有此错误，这个已经放很久了，当昨天解决这个问题时，杨大佬给出的说法是**渲染完视图后更改了值，再次触发了变化监测。**虽然给出了方向，但我不是很深入 Angular 生命周期和变化检测，所以还是需要弄懂其中具体的原因和相关的知识。

根据报错信息和调用栈大致能猜到是哪个组件出的问题，但不能准确定位到哪一行代码出的问题，庆幸的是错误信息中指明了一个参考文档：[https://angular.io/errors/NG0100](https://angular.io/errors/NG0100)（[https://angular.cn/errors/NG0100）](https://angular.cn/errors/NG0100)。

![关于 NG0100 的处理 配图 1](/assets/img/posts/pingcode-lbtnna/image-001.png)

粗略读了一下，原因是：**开发模式下才会出现此错误，Angular 在每次变更检测运行后都会执行一次附加检查，以确保绑定没有更改（**这句话凯哥在分享《Angular 变化检测》也曾说过 🤔️）。

#### 解决手段

> 文档的开头是有一个6分钟视频的，我的习惯是能看文字绝不看视频（因为大部分视频都是废话太多），当时的念头只想快速解决问题，不太想浪费太多的时间。于是跳过视频快速浏览到 “如何排除本错误”的章节。

![关于 NG0100 的处理 配图 2](/assets/img/posts/pingcode-lbtnna/image-002.png)

这一段中提取出最有效的文字：使用构造函数或 `ngOnInit` 来设置初始值，或者使用 `ngAfterContentInit` 做其他值的绑定。

结合上述所有的信息，定位问题出现在知识库详情的组件中的 ngAfterViewInit，这段逻辑中，在渲染完侧边栏后又再次更改了侧边栏的宽度，代码如下：

![关于 NG0100 的处理 配图 3](/assets/img/posts/pingcode-lbtnna/image-003.png)

下面就是一招乾坤大挪移 Ctrl CV 到 ngOnInit，然后盯着控制台，此时我好像在期待些什么，等待了几秒浏览器没有刷新，我以为是 VSCode 卡了，然后手动刷新了一下，依旧报错，于是否定自己觉得是姿势不对！（但其实这种办法是有效的，因为项目中有两段很类似的代码，改错了🤡，很蠢），时长 6 分 23 秒的视频终究没有逃过，看完之后，我的评价是：值得，双手抱拳。

#### 其他场景

视频列举了几个简单的示例介绍了可能遇到的场景，给出解决手段和建议。

###### 报错原因

正如开头说的：视图渲染完后再次触发了绑定，导致视图处于不一致的状态。

三种不推荐做的：

1. - 不要在 ngAfterViewInit 里更新视图，有可能造成检测触发器自身的无限循环。
   
   - 不要在 get 访问器每次都返回不同的值。
   
   - 不要在子组件更新父组件指令上的绑定。

假设违反了以上，有以下解决手段：

1. ngAfterViewInit 更新了视图（像我的代码一样）的代码放到 ngOnInit 中。
2. get 访问器的值尽可能固定，或使用变量的方式去实现。
3. 真的有需要子组件更改父组件的场景，那么推荐做法是主动调用 ChangeDetectorRef 的 detectChanges()，如下：待子组件完成加载后取消 loading 状态。

```javascript
@ViewChild('item') item;

loading = true;

ngAfterViewInit(){
	if(item) {
      this.loading = false;
    }
}
```

> @ViewChild 获取的子元素在调用完 ngAfterViewInit 之前是不可用的。
{: .prompt-info }

又是扣文档的一天😏，最后附一张生命周期图（从 update bingding 到 ngAfterViewInit）

![关于 NG0100 的处理 配图 4](/assets/img/posts/pingcode-lbtnna/image-004.png)

参考：[https://angular.cn/errors/NG0100](https://angular.cn/errors/NG0100)
