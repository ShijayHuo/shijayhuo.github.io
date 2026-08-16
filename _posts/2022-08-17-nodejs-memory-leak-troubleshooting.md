---
layout: post
title: "一次 Node.js 内存泄漏排查经历"
date: 2022-08-17 21:36:20 +0800
categories: ["后端","性能优化"]
tags: ["Node.js","内存泄漏"]
---

前段时间负责的一个 Node.js 服务出现了一个比较诡异的问题：服务刚发布时一切正常，接口耗时、CPU、负载都很平稳，但运行十几个小时以后内存就会慢慢涨上去，最后被容器 OOM Kill。Pod 重启以后内存立即恢复，然后隔一天左右再来一遍。

这类问题最难受的地方是它不直接报错，也很难在本地撞到。业务看起来还能正常跑，日志里最后留下的甚至只是一句平平无奇的 `Killed`。

第一次看到告警时我的想法很简单：是不是最近流量变大了，容器的内存给少了？于是先把内存上限调大了一些，同时给 Node 加了 `--max-old-space-size`。发布以后确实安静了更久，我一度以为问题解决了，结果第二天晚上它又挂了，只是把“十几个小时”延长成了“一天多” 🤡。

这时基本可以确定，提高内存只是给问题续命，真正占住内存的东西并没有消失。

## 先确定是不是内存泄漏

内存上涨不一定就是泄漏。Node.js 处理一批大请求、拼装大对象或者读写 Buffer 时，RSS 都可能突然升高；V8 也不会在对象刚失去引用时就立刻回收，更不会保证把回收后的内存马上还给操作系统。

所以只看容器里的 RSS 曲线还不够，我先在服务里临时加了一段内存日志：

```javascript
const MB = 1024 * 1024;

setInterval(() => {
  const memory = process.memoryUsage();

  console.log('[memory]', {
    rss: `${(memory.rss / MB).toFixed(2)} MB`,
    heapTotal: `${(memory.heapTotal / MB).toFixed(2)} MB`,
    heapUsed: `${(memory.heapUsed / MB).toFixed(2)} MB`,
    external: `${(memory.external / MB).toFixed(2)} MB`
  });
}, 60 * 1000);
```

几个值大致可以这样理解：

- `rss` 是进程实际占用的物理内存，除了 V8 堆，还包含代码、栈、Buffer 等内容。
- `heapTotal` 是 V8 当前申请到的堆空间。
- `heapUsed` 是 JavaScript 对象实际使用的堆空间。
- `external` 主要是 Buffer 等由 V8 管理、但放在堆外的内存。

日志跑了一段时间后，发现涨得最明显的是 `heapUsed`。它不是一次突然冲高，而是像楼梯一样一点点往上爬：GC 之前上涨，GC 之后会下来一截，但每次下来的位置都比上一次高。

正常情况下内存曲线更像锯齿，分配对象时上涨，GC 后回到一个相对稳定的水位；而这个服务的“锯齿底部”一直在抬高。到这里，泄漏的嫌疑已经非常大了。

为了再确认一下，我在测试环境使用 `--expose-gc` 启动服务，压测一轮以后手动执行 `global.gc()`。连续执行几次，内存依然回不到压测前的水平，说明这批对象不是 V8 暂时没来得及收，而是还有引用不让它收。

> `global.gc()` 只是这次定位问题时用来验证猜测的，不建议把定时强制 GC 当成解决方案。对象还被引用时，GC 再勤快也回收不了。
{: .prompt-warning }

## 找到让内存上涨的请求

知道有对象没被释放以后，下一个问题是：哪个功能留下来的？

服务里的接口不少，直接对整个系统压测，Heap 里会混进大量无关对象，不太好看。于是我先把最近一周的改动过了一遍，又按路由统计请求次数和内存变化，最后把怀疑范围缩到了空间目录接口。

这个接口会读取空间、成员、目录树以及当前用户的权限。单次请求返回的数据不算特别大，但访问频率高，而且不同用户、不同空间会产生不同结果。

我用 `autocannon` 分别对几个接口做了几轮压测，下面是简化后的命令，真正复现时又套了一层脚本轮换 Token 和 `spaceId`：

```bash
autocannon -c 20 -d 300 \
  'http://127.0.0.1:3000/api/spaces/space-id/tree'
```

为了模拟线上的情况，请求里不能一直使用同一个用户和空间。最开始我就踩了这个坑：固定参数压了十分钟，内存很稳定，我差点把这个接口排除掉。后来把测试数据改成轮换用户和空间，`heapUsed` 很快又开始阶梯式上涨。

这也解释了为什么开发环境一直没发现。我们平时就那几个账号、几个测试空间，数据的种类是有限的；到了线上，请求参数的基数放大，问题才真正暴露出来。

## 用 GC 日志看个大概

接下来用 `--trace-gc` 启动服务观察 GC：

```bash
node --trace-gc app.js
```

日志里能看到 Minor GC 越来越频繁，老生代占用也在不断增加，后面开始出现耗时更长的 Major GC。这里暂时不需要把每一行 GC 日志都研究透，至少它告诉我两件事：

1. 对象不是用完就消失，很多对象活过了几轮 Minor GC，进入了老生代。
2. V8 已经在努力回收了，但可回收的空间越来越少。

当时也怀疑过 Buffer、文件流没有关闭、数据库连接没有释放。不过 `external` 没有跟着明显增长，连接池数量也稳定，所以先把重点放回 JavaScript 堆里的长生命周期对象。

## Heap Snapshot 终于看到是谁占着不走

只知道堆在涨还不够，得看到底是什么对象被谁引用着。我在测试环境接入了 `heapdump`，分别在下面三个时间点生成快照：

1. 服务启动并完成预热后。
2. 压测中途。
3. 压测结束并等待 GC 后。

```javascript
const heapdump = require('heapdump');

heapdump.writeSnapshot((error, filename) => {
  if (error) {
    console.error(error);
    return;
  }

  console.log(`Heap snapshot written to ${filename}`);
});
```

Heap Snapshot 会暂停主线程，生成时还可能额外占用不少内存，所以我没有直接拿线上进程冒险。把测试环境的三个文件依次放进 Chrome DevTools 的 **Memory** 面板，使用 Comparison 对比，按 **Retained Size** 排序。排在前面的不是字符串，也不是我一开始怀疑的 Buffer，而是一批 `Map`、权限对象和目录节点数组。

这里的 **Shallow Size** 是对象自身占用的大小，**Retained Size** 是这个对象被释放后，连带可以一起释放的内存。排查泄漏时后者通常更值得关注：一个 `Map` 自己可能没有多大，但它可以拉住后面一大串对象不让 GC 回收。

沿着 Retainers 一层层往上找，最后看到了一条非常清楚的引用链：

```text
(GC roots)
  -> system / Context
    -> permissionCache
      -> Map
        -> PermissionContext
          -> members / roles / pageTree
```

到这里，嫌疑人已经坐到审讯室了：`permissionCache` 是一个模块级变量，只要模块还在缓存里，它就一直是 GC Root 可以到达的对象。

## 最后是一个很不起眼的 Key

这个缓存是为了减少权限计算加的。因为同一用户短时间内会反复读取同一个空间，所以缓存 10 分钟，看起来非常合理：

```javascript
const permissionCache = new Map();

async function getPermissionContext(spaceId, userId) {
  const key = `${spaceId}:${userId}`;

  if (permissionCache.has(key)) {
    return permissionCache.get(key);
  }

  const context = await loadPermissionContext(spaceId, userId);
  permissionCache.set(key, context);

  setTimeout(() => {
    permissionCache.delete(spaceId);
  }, 10 * 60 * 1000);

  return context;
}
```

问题就藏在 `delete` 那一行。存进去时用的是 `${spaceId}:${userId}`，删除时传的却是 `spaceId`，两个 Key 根本不是一回事，所以定时器虽然按时执行了，但什么也没有删掉。

最迷惑的是，这段代码表面上有过期时间，也确实能看到定时器执行，没有任何报错；`Map.prototype.delete` 找不到 Key 时只会返回 `false`。只要不检查返回值，它就安静得像清理成功了一样。

而缓存值里不只有一条权限结果，还引用着成员列表、角色和经过处理的目录树。单个对象不大，但每来一种新的“空间 + 用户”组合就多留一份，线上跑久以后自然会把堆撑满。

## 修复不只是把变量名改对

最直接的修复当然是：

```javascript
setTimeout(() => {
  permissionCache.delete(key);
}, 10 * 60 * 1000);
```

但回头想一下，即使这里没有写错，这个缓存依然没有容量上限。如果十分钟内突然涌入大量不同用户，它还是可能制造一次很高的内存尖峰；而且每个缓存项都创建一个 Timer，也不是特别舒服。

最后我把它换成了有最大容量和过期时间的 LRU 缓存：

```javascript
const LRU = require('lru-cache');

const permissionCache = new LRU({
  max: 500,
  ttl: 10 * 60 * 1000,
  updateAgeOnGet: false
});
```

这样做了两层限制：数据最多保留 10 分钟，同时最多保留 500 份。TTL 防止旧数据长期驻留，`max` 则给最坏情况兜底。容量不是拍脑袋越大越好，需要结合单个缓存项的 Retained Size、访问命中率和容器内存来定。

另外补了几个监控：缓存项数量、命中率、淘汰次数和进程的 `heapUsed`。以前只盯着接口耗时和错误率，缓存明明在无限增长，却没有任何业务报错，监控自然也发现不了。

## 验证修复

修完以后我没有马上下结论，而是用同一批数据、同样的并发重新跑了一遍：

- 修复前，压测过程中 `heapUsed` 从 120 MB 一路涨到 600 MB 以上，停止请求并 GC 后也降不回来。
- 修复后，内存会随着请求上涨，但缓存达到上限后开始稳定；GC 后基本能回到 160～200 MB 的区间。
- 再拍一份 Heap Snapshot，对比后 `PermissionContext` 和目录节点不再持续累积。

上线后继续观察了几天，内存曲线恢复成正常的锯齿状，容器也没有再因为 OOM 重启，这个问题才算真正结束。

## 最后

这次排查花时间最多的并不是改那一行代码，而是证明“它真的是泄漏”，再把范围从整个进程缩小到一个接口、一个对象，最后落到一条引用链上。

回头总结一下当时比较有用的思路：

1. 不要看到 RSS 高就直接认定是 JavaScript 内存泄漏，先区分堆内、堆外和正常的 GC 波动。
2. 判断是否泄漏，重点看 GC 后的内存基线是否持续抬高。
3. 本地复现时要还原线上的数据基数，只压同一个参数很可能命不中问题。
4. Heap Snapshot 不只看“谁最大”，还要看 Retained Size 和 Retainers，找到是谁一直拉着对象。
5. 缓存必须同时考虑过期和容量上限。只有 TTL，没有 `max`，仍然扛不住短时间的高基数数据。
6. 调大内存可以临时止血，但如果基线一直上涨，它只会让故障晚一点发生。

以前觉得内存泄漏是那种需要研究 V8 源码才能解决的问题，真正排查一次后发现，它更像一场沿着证据不断缩小范围的侦探游戏。工具负责告诉我们“谁还活着”，代码里的引用关系才会告诉我们“为什么它死不了”。
