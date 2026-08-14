---
layout: post
title: "Angular 路由加载子组件数据变化"
date: 2023-09-16 16:55:05 +0800
categories: ["前端","框架"]
tags: ["Angular"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/emfvXV"
---

该篇是介绍**父组件接收子组件的数据变化**的一种方式，解决的场景比较特殊是**子组件是通过路由填充加载的**，就是`<router-outlet> </router-outlet>`+ 路由加载，这种情况下正常思路使用双向绑定、 xChange 向上传递是行不通的，试过`@ViewChild()`方式也取不到子组件。

另一个点是`router-outlet`是根据路由变化加载不同加载组件的，简单举个例子：

![路由加载子组件数据变化 配图 1](/assets/img/posts/pingcode-emfvxv/image-001.png)

假设左侧菜单空间成员需要显示成员数，那么右侧成员列表增删数据如何通知左侧菜单这个数字变化呢？大家别往下滑，可以停下来想一下。

![路由加载子组件数据变化 配图 2](/assets/img/posts/pingcode-emfvxv/image-002.png)

#### 解决方式

##### RouterOutlet activate 属性

> 这种方式是该篇介绍的主题，RouterOutlet activate 这个方式很少见，很少用，算是冷门吧

activate 挂载在 router-outlet 上的事件，当 router-outlet 占位的组件被激活时就会触发，事件返回的参数是子组件，使用如下：

```html
<router-outlet (activate)='onActivate($event)' (deactive)='onDeactivate($event)'></router-outlet>
```

```typescript
count: number;

count$: Subscription;

// 激活
onActivate(component: Component<any>) {
   // 根据组件类型做相应逻辑
   if (component instanceof MembersComponent) {
     this.count$ = component.membersCountChange.subscribe(count=> (this.count = count));
   }
}

// 取消激活
onDeactivate(component: ComponentType<any>) {
    if (component instanceof MembersComponent) {
		this.count$.unsubscribe();
    }
  }
```

子组件 MembersComponent

```typescript
membersCountChange = new EventEmitter<number>();

membersCount = 5;

addMember() {
  this.membersCount += 1;
  this.membersCountChange.emit(this.membersCount);
}
```

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
