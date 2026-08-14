---
layout: post
title: "深入理解 npm legacy-peer-deps 标识"
date: 2023-02-22 13:39:51 +0800
categories: ["工程化"]
tags: ["NPM","工程化"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/nOlmSn"
---

> 每次更新 node\_modules 都是一件令我头疼的事，网络不稳定，安装时间久，node 版本不对，编译失败，这些穿插的来那么几次，很多时间就过去了，这不昨天就搞了一天的环境。

大家应该都遇到过这样的错误：**unable to resolve dependency tree****。**

![深入理解 npm legacy-peer-deps 标识 配图 1](/assets/img/posts/pingcode-nolmsn/image-001.png)

那么大家是如何解决的？以下有几个问题，都知道的同学可以绕过了。

1. 为什么会出现 unable to resolve dependency tree 这样的错误？
2. --legacy-peer-deps 具体是干什么？推荐什么时候用它。
3. dependencies 和 peerDependencies 有什么区别？
4. unable to resolve dependency tree 其他解决手段。

先说下，我开始怎么解决的：`npm install --legacy-peer-deps`，是根据报错提示给出的解决方案，这个用过很多次了，也解决过大多数场景，但这次就栽到这上面。

#### 为什么会出现 unable to resolve dependency tree ?

简单说，**安装包的依赖出现了不对等**。具体解释看下面：

> 前几天还和俊潇聊这个问题：A 依赖了 C，版本是 1.0，B 也依赖了 C，版本是 2.0，那么最终 npm 安装的 C 是 1.0 还是 2.0，甚至说 C 本身就被项目依赖，版本是 4.0，此时安装的又是什么版本或者以上情况 均不处理报错终止安装，当然这些都是假设自己是 npm 的一些设想，从实际结果来看是终止安装。

所以要处理这个问题就会产生一个用来维护依赖版本的东西，这就是 peerDependencies，peerDependencies 叫对等依赖关系，在 npm 7 才允许显示设置的，再此之前应该是默认始终安装（npm 6 的文档是没有 peerDependencies 相关资料的，也没有 legacy-peer-deps 参数标识），但实际情况我用 node 14.x 却没有此错误（node 14 配套的 npm 是 6.x）......

##### dependencies 和 peerDependencies 有什么区别？

|  | dependencies | peerDependencies |
| --- | --- | --- |
| 描述 | 项目运行时所需的依赖库 | 指定我们的包与特定版本的npm包兼容 |
| 行为 | 如果node\_modules目录中不存在某个包，则会自动添加该包。 | 不会自动安装对等依赖项。需要手动修改package.json文件，添加对等依赖项。 |
| 使用 |  包括在最终代码包中 | 只有在发布自己的包时才能包含 |

#### legacy-peer-deps

**--legacy-peer-deps 参数是代表忽略 peerDependencies 设置的依赖版本并继续安装**，这样产生的结果是，所有依赖会被打乱（具体安装策略还不是很清楚），这有时候没问题有时候就会出错，这取决于项目中是否用到了不同版本库的特性，向这次就栽到这上面了 😪 ，很多库版本不一致，导致某些包已经不支持现有代码引用的一些特性而报错。

所以，综上所述，**不要轻易加上 --legacy-peer-deps**，这也是官方的警告⚠️ **。**

![深入理解 npm legacy-peer-deps 标识 配图 2](/assets/img/posts/pingcode-nolmsn/image-002.png)

![深入理解 npm legacy-peer-deps 标识 配图 3](/assets/img/posts/pingcode-nolmsn/image-003.png)

#### 其他解决办法

- 使用 --force ，代表强制继续安装。
- --omit=peer 这个还没有试过，看到有提到的，感兴趣的同学可以试一下

#### 总结

总结就是没有可以总结的 🤣 ，重点都画出来了。
