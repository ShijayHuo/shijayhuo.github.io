---
layout: post
title: "Mongodb bulkWrite 使用姿势"
excerpt: "话说，某游戏公司部分服务器崩了，造成了玩家不好的游戏体验，为了挽留用户，该公司要给所在崩的服务器玩家给予补偿金币，补偿规则为： 活跃度 >= 20 的，补偿 100w 金币 活跃度 >= 30 的，补"
date: 2023-12-12 18:54:39 +0800
categories: ["后端","数据库"]
tags: ["MongoDB"]
source_platform: Juejin
source_url: "https://juejin.cn/post/7311602485865725962"
---

{% raw %}
> 开发中时常会遇到多条件分支的修改，即根据不同条件执行不同的操作

话说，某游戏公司部分服务器崩了，造成了玩家不好的游戏体验，为了挽留用户，该公司要给所在崩的服务器玩家给予补偿金币，补偿规则为：
1. 活跃度 >= 20 的，补偿 100w 金币
2. 活跃度 >= 30 的，补偿 200w 金币
3. 活跃度 >= 50 的，补偿 600w 金币
4. 活跃度 >= 70 的，补偿 800w 金币
5. 活跃度 = 100 的，补偿 1200w 金币
6. 当天登录的玩家额外补偿传说装备一件
7. 更多......

玩家表：`players` 现有数据：
![image.png](/assets/img/posts/juejin-7311602485865725962/image-001.png)

## bulkWrite
遇到此类场景，想必大部分同学第一时间想到的是在程序里分配多个条件，执行多次修改，如代码：
```javascript
// === 活跃度 >= 20 ===
db.players.updateMany(
    { activity: { $gte: 20, $lt: 30 } }, {$set: {compensation: 1000000 }},
)
// === 活跃度 >= 30 ===
db.players.updateMany(
    { activity: { $gte: 30, $lt: 50 } }, {$set: {compensation: 2000000 }},
)
// === 活跃度 >= 50 ===
db.players.updateMany(
    { activity: { $gte: 50, $lt: 70 } }, {$set: {compensation: 6000000 }},
)
// === 活跃度 >= 70 ===
db.players.updateMany(
    { activity: { $gte: 70, $lt: 100 } }, {$set: {compensation: 8000000 }},
)
// === 活跃度 = 100 ===
db.players.updateMany(
    { activity: { $eq: 100 } }, {$set: {compensation: 12000000 }},
)
// === 当前登录 ===
db.players.updateMany(
    { lastLoginTime: { $lte: 1739132800000, $gte: 1646905200004  } },
    { $set: { advancedEquipment: "传说装备礼盒" }},
)
```
### 更好的做法 bulkWrite
上述做法固然可以，也算是常规操作，不过存在的问题就是执行了多次数据库操作，通常这种场景下是执行脚本，如果数据量特别大的话，那么则需要分批（假设有 100w 用户，一次刷 1000 条，那么需要执行 1000 * 6 = 6000 次修改），耗时会长一些。

还有一种做法使用 Mongodb bulkWrite，数据库本身执行多次操作会有一定的优化，使用如下：
```javascript
db.players.bulkWrite([
  { updateMany: { filter: { activity: { $gte: 20, $lt: 30 } }, update: {$set: {compensation: 1000000 }}} },
  { updateMany: { filter: { activity: { $gte: 30, $lt: 50} }, update: {$set: {compensation: 2000000 }}} },
  { updateMany: { filter: { activity: { $gte: 50, $lt: 70} }, update: {$set: {compensation: 6000000 }}} },
  { updateMany: { filter: { activity: { $gte: 70, $lt: 100} }, update: {$set: {compensation: 8000000 }}} },
  { updateMany: { filter: { activity: { $eq: 100} }, update: {$set: {compensation: 12000000 }}} },
  { updateMany: { filter: { lastLoginTime: { $lte: 1739132800000, $gte: 1646905200004  } }, update: {$set: { advancedEquipment: "传说装备礼盒" }}} },
])
```

### 最后
以上是作者认为好一点的做法，利用了 Mongodb 自带的一些函数，不好的地方就是 Mongodb 的函数和操作符太多了，不是每个小伙伴都熟知的，如果批量修改的操作不是很多的话，用程序执行多次操作也是可以的，毕竟现在利用线程池，执行一次 io 的效率也是可以的。

OK，如果对你有所启发，帮助到你，欢迎点赞、关注、收藏、评论哟
{% endraw %}
