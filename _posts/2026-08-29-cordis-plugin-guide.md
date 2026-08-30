---
layout: post
title: Cordis 插件入门与源码解析
date: 2026-08-29 16:41:44 +0800
categories: [后端, 架构]
tags: [Cordis, DeepSeek Harness, 插件系统, 源码分析]
---

## 什么是 Cordis？
### 来自作者的解释
Cordis 是一个**元框架 (Meta Framework)**，即一个用于构建框架的框架。

Cordis 的名字来源于拉丁语的心。我希望它能成为未来软件 (至少是我开发的软件) 的核心。

作为一个元框架，Cordis 并不耦合任何具体的领域或场景。它所提供的能力是大多数框架都不足为奇的——插件系统，但在这个系统背后却是大多数框架都没有达成的目标：可逆性。

见[原文](https://koishi.chat/zh-CN/cookbook/design/disposable.html#%E5%8F%AF%E9%80%86%E7%9A%84%E6%8F%92%E4%BB%B6%E7%B3%BB%E7%BB%9F)

### DeepSeek Harness 官方的解释
> Cordis 是 DeepSeek Harness 底层的插件框架：它是一个小型运行时，其中的每项能力，包括工具、LLM（大语言模型）适配器、文件访问乃至 agent loop（智能体循环）本身，都是挂载到共享上下文中的插件。										   		——[DeepSeek 官方 Cordis 总览](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/)
>

### 什么是插件？
它来自一种[设计哲学](https://github.com/cordiverse/paper)，有很多熟悉的插件系统也类似，比如，Koa2 的  [koa-compose](https://github.com/koajs/compose/blob/master/index.js)、[slate.js](https://github.com/ianstormtaylor/slate/blob/main/packages/slate/src/create-editor.ts)等。

插件的特点就是极强灵活性和扩展性。

## 尝试写一个插件
> 插件就是普通的 TypeScript 模块
>

### 插件基础约定
1. 插件支持的形式：函数式、对象形式和类形式。
2. 注册：必须声明 cordis.yml。

下面用一个极小的示例演示。

#### 插件支持的形式
> 有一个前置条件是必须把源码拉下来，见[前置配置](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/#setup)。
>
> 另外，在 deepseek-harness 目录下执行：`mkdir -p tmp/cordis-tutorial & cd tmp/cordis-tutorial`
>

在当前目录下创建一个 hello 插件：`hello.ts`，以下几个片段选择其一即可。

函数式（Function）

```typescript
import type { Context } from '@deepseek-ai/cordis'

export const name = 'hello'

// 函数式
export function apply(ctx: Context) {
  console.log('hello from my first plugin')
}

```

这样也可以

```typescript
import type { Context } from '@deepseek-ai/cordis'

export default function apply(ctx: Context) {
  console.log('hello from my first plugin')
}
```

[源码](https://github.com/cordiverse/cordis/blob/main/packages/loader/src/index.ts#L156)中可以推出。

对象式（Object）

```typescript
import type { Context } from '@deepseek-ai/cordis'
export default {
  name: 'my-plugin',
  apply(ctx: Context) {
    console.log('hello from my first plugin')
  },
}
```

类式（Class）

```typescript
export default class MyService extends Service {
  constructor(ctx: Context) {
    super(ctx, 'myTutorialService')
    console.log('hello from my class plugin')
  }
}
```

官方的意见是：**大多数情况下，函数形式足够了。当插件需要向其他插件提供服务时，可使用类形式。**

源码部分：[这里](https://github.com/cordiverse/cordis/blob/main/packages/core/src/fiber.ts#L150)

#### 注册方式：cordis.yml
在当前目录创建 `cordis.yml`

```typescript
- name: './hello.ts'
```

源码部分：[这里](https://github.com/cordiverse/cordis/blob/main/packages/include/src/index.ts#L18)，看到它其实还支持 json 和 yaml。

### 运行插件
执行：

```bash
node --import tsx ../../vendor/cordis/bin.js
```

期望结果：

```bash
hello from my first plugin
```

## 扩展/源码篇：插件注册与执行
### 注册
链路：

1. [loader.create](https://github.com/cordiverse/cordis/blob/main/packages/core/bin.js#L11)
2. [EntryGroup.create](https://github.com/cordiverse/cordis/blob/main/packages/loader/src/config/tree.ts#L80)
3. [Entry.update](https://github.com/cordiverse/cordis/blob/main/packages/loader/src/config/group.ts#L26)
4. [Entry.init](https://github.com/cordiverse/cordis/blob/main/packages/loader/src/config/entry.ts#L132)
5. [Entry._init](https://github.com/cordiverse/cordis/blob/main/packages/loader/src/config/entry.ts#L148)
6. [Loader.unwrapExports](https://github.com/cordiverse/cordis/blob/main/packages/loader/src/config/entry.ts#L168)
7. 如下代码：

```typescript
class Loader {

  unwrapExports(exports: any) {
    if (isNullable(exports)) return exports
    exports = exports.default ?? exports
    // https://github.com/evanw/esbuild/issues/2623
    // https://esbuild.github.io/content-types/#default-interop
    if (!exports.__esModule) return exports
    return exports.default ?? exports
  }
}
```

8. 如下代码

```typescript
class RegistryService {

  plugin(plugin: Plugin, config?: any, getOuterStack = buildOuterStack()) {
    // check if it's a valid plugin
    const callback = this.resolve(plugin)
    // 其他代码...
  }

  resolve(plugin: Plugin): Function | undefined {
    // plugin.apply may throw
    try {
      if (typeof plugin === 'function') return plugin
      if (isApplicable(plugin)) return plugin.apply
    } catch {}
  }
  
}
```

+ 加载 yml 代码在 
+ 加载插件的代码在 7 和 8 的部分。

注册之后[发送事件](https://github.com/cordiverse/cordis/blob/main/packages/core/src/fiber.ts#L164)，后面 Loader 监听了事件开始执行。

### 执行
源码部分：[Fiber](https://github.com/cordiverse/cordis/blob/main/packages/core/src/fiber.ts#L150)。

```typescript
class Fiber {
  constrctor() {
    // 其他代码...
    this._runner = {
        epoch: INACTIVE,
        getOuterStack,
        execute: function () {
          if (isConstructor(runtime.callback)) {
            // eslint-disable-next-line new-cap
            const instance = new runtime.callback(this.ctx, this.config)
            for (const hook of instance?.[symbols.initHooks] ?? []) {
              hook()
            }
            return instance?.[symbols.init]?.()
          } else {
            return runtime.callback(this.ctx, this.config)
          }
        },
        collect,
      }
  }
}
```

## 总结
+ Cordis 是一个插件框架，它并不是和 deepseek-harness 强绑定，只是 deepseek-harness 使用插件的思维去组合了关于 Agent 的部分。
+ Cordis 的插件支持的插件：函数式、对象式、类式。
+ Cordis 的插件必须声明：yaml、yml 或 json 其中之一，常见是 yml。

## 参考

- [Koishi：可逆的插件系统](https://koishi.chat/zh-CN/cookbook/design/disposable)
- [Cordis 设计哲学：A Programming Paradigm for Spatiotemporal Composability](https://github.com/cordiverse/paper)
- [DeepSeek Harness：Cordis 教程](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/)
- [DeepSeek Harness：编写第一个插件](https://deepseek-harness.github.io/deepseek-harness/develop/cordis-tutorial/01-first-plugin)
- [Cordis 源码仓库](https://github.com/cordiverse/cordis)
- [Cordis Loader 源码](https://github.com/cordiverse/cordis/blob/main/packages/loader/src/index.ts)
- [Cordis Registry 源码](https://github.com/cordiverse/cordis/blob/main/packages/core/src/registry.ts)
- [Cordis Fiber 源码](https://github.com/cordiverse/cordis/blob/main/packages/core/src/fiber.ts)
- [Cordis Include 源码](https://github.com/cordiverse/cordis/blob/main/packages/include/src/index.ts)
- [Koa Compose 源码](https://github.com/koajs/compose/blob/master/index.js)
- [Slate `createEditor` 源码](https://github.com/ianstormtaylor/slate/blob/main/packages/slate/src/create-editor.ts)


