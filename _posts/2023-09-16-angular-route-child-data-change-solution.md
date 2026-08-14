---
layout: post
title: "Angular路由加载子组件数据变化的解决方案"
date: 2023-09-16 19:54:34 +0800
categories: ["前端","框架"]
tags: ["Angular"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/HjyN1p"
---

该篇是介绍**父组件接收子组件的数据变化**的一种方式，解决的场景比较特殊是**子组件是通过路由填充加载的**，就是`<router-outlet> </router-outlet>`+ 路由加载，这种情况下正常思路使用双向绑定、 xChange 向上传递是行不通的，试过`@ViewChild()`方式也取不到子组件。

另一个点是`router-outlet`是根据路由变化加载不同加载组件的，举个例子：

![Angular路由加载子组件数据变化的解决方案 配图 1](/assets/img/posts/pingcode-hjyn1p/image-001.png)

1. 当导航位于“表单设计”时，展示右侧保存按钮，并且内容区展示表单设计器，当点击公开发布时保存按钮会隐藏，会切换至公开表单的选项内容
2. 当表单内容新增/修改/删除时，保证父组件保存的控件信息和设计器里的一致

路由配置是：

![Angular路由加载子组件数据变化的解决方案 配图 2](/assets/img/posts/pingcode-hjyn1p/image-002.png)

遇到这种情况，是有点费脑筋的，怎么解决呢？

#### 解决方式

##### RouterOutlet activate 属性

> 这种方式是该篇介绍的主题，RouterOutlet activate 这个方式算是冷门

activate 挂载在 router-outlet 上的事件，当 router-outlet 占位的组件被激活时就会触发，事件返回的参数是子组件，使用如下：

```html
<router-outlet (activate)="loadComponent($event)" (deactivate)="disconnectComponent($event)"></router-outlet>
```

```typescript
loadComponent(component: ComponentType<any>) {
  	console.log('激活的组件：', component);
    if (component instanceof AppFormDesignerComponent) {
      this.plugins$ = component.pluginsChange.subscribe(result => {
      });
    }
  }
  disconnectComponent(component: ComponentType<any>) {
    console.log('取消激活的组件：', component);
    if (component instanceof AppFormDesignerComponent) {
      this.plugins$.unsubscribe();
    }
  }
```

子组件 AppFormDesignerComponent

```typescript
pluginsChange = new EventEmitter<FormPluginInfo[]>();

onPluginsChange(plugins: FormPluginInfo[]) {
   this.pluginsChange.emit(plugins);
}
```

效果：

![Angular路由加载子组件数据变化的解决方案 配图 3](/assets/img/posts/pingcode-hjyn1p/image-003.png)

##### 万能大法：中间层介入（RxJS）

> 哪里流传的那么一句话：**任何解决不了的问题都可以引入一个第三方去解决。**

使用 Service 或 Store，声明 RxJS Subject，父组件去订阅 Subject，子组件发送数据变化。如果只是为了解决这一种场景，比起第一种，这种引入一个 Service 显然有点大材小用。

##### 路由传递变化函数

可以在路由跳转的时候传递变化的函数，该函数绑定父组件的上下文并将写好逻辑委托给子组件，当子组件发生变化时执行一下，可以达到更新数据的效果。

##### 路由守卫

第二种方式并不完美，一般来说**访问父组件的路由会自动跳转重定向到第一个菜单，这种情况还需要初始数据，在路由守卫里获取父/子的组件信息**，没有去实践，越往深想好像越复杂，所以还是推荐用前两种方式吧。

#### 最后

就以上场景而言，个人更倾向 RouterOutlet activate 这种解决方式，简单且全面。

#### 参考

- [https://angular.cn/api/router/RouterOutlet](https://angular.cn/api/router/RouterOutlet)
- [https://stackoverflow.com/questions/39255311/can-you-use-viewchild-or-similar-with-a-router-outlet-how-if-so](https://stackoverflow.com/questions/39255311/can-you-use-viewchild-or-similar-with-a-router-outlet-how-if-so)
- [https://angular.cn/guide/router-reference](https://angular.cn/guide/router-reference)
