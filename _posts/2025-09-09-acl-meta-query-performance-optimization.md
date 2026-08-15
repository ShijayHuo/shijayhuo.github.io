---
layout: post
title: "ACL Meta 查询性能优化：减少无效关联"
excerpt: "排查 ACL Meta 接口因大量关系表关联而变慢的问题，通过只保留权限条件真正需要的关联，将查询耗时从数分钟降低到约 100～300 毫秒。"
date: 2025-09-09 11:24:55 +0800
categories: ["后端","数据库","架构"]
tags: ["权限设计","ACL","架构"]
source_platform: Yuque
source_url: "https://www.yuque.com/ipenmanship/hik9hl/dsv4qm2bz0klfssk"
---

{% raw %}
## 背景

一个 List API 在请求头中加入 `x-with-acl-meta: true` 后，请求会变得非常慢。这个请求头会启用 `with-acl-meta` 中间件，在响应的 `meta` 中附加 `allowedActions`。

`allowedActions` 用来告诉前端：哪些数据行拥有查看、编辑等权限。前端可以据此决定操作按钮是否显示或是否可用。例如 `view` 和 `update` 的值分别是一组主键，主键出现在数组中，就代表对应数据行拥有该操作权限。

相关实现可以参考 NocoBase 的 [`with-acl-meta.ts`](https://github.com/nocobase/nocobase/blob/develop/packages/plugins/%40nocobase/plugin-acl/src/server/middlewares/with-acl-meta.ts)。

## 问题现象

调试后发现，请求会卡在一条由 ORM 生成的复杂 SQL 上。这条查询有两个明显特点：

1. 查询字段非常多，几乎把各个 Action 涉及的字段全部放进了 `SELECT`。
2. 关联关系非常多，共涉及 23 张关系表，其中还有 2 个嵌套关系。

ACL Meta 的目标只是计算若干权限条件，但原来的实现将每个条件携带的 `include` 全部合并，导致许多与当前条件无关的关系也参与查询。

## 为什么大量关联会拖垮查询

字段过多会增加数据库 I/O、网络传输量和 ORM 对结果的处理成本，但更严重的问题来自一对多和多对多关系产生的数据膨胀。

单独关联关系表 A 时，结果约 1268 条；单独关联关系表 B 时，结果约 3153 条。两张表同时关联后，中间结果迅速增长到约 70 万条，查询耗时约 5 秒。

当 5 张关系表同时参与查询时，执行 170 秒后已经产生 240 万条以上的中间数据，而且查询仍未完成。

这不是简单的“多 Join 一张表就慢一点”。多个一对多关系同时展开时，中间结果可能近似相乘，最终形成数量级上的放大。

## 根因

原来的查询把所有 Action 的关系依赖直接铺平：

![ACL Meta 原始关联查询代码](/assets/img/posts/yuque-dsv4qm2bz0klfssk/image-001.png)

但实际权限条件通常只会使用其中少数几个关系。也就是说，数据库为了计算一两个条件，被迫加载了大量无关关系和字段。

## 优化方案

解决方案是根据最终权限条件，筛选出真正用到的关系字段，再构造 ORM 的 `include`。

可以把整体过程拆成三步：

1. 分析每个权限 Action 的条件表达式。
2. 从条件中提取实际引用的关系路径。
3. 去重后生成最小关系集合，只把这些关系传给 ORM。

伪代码如下：

```ts
const requiredIncludes = conditions
  .flatMap((condition) => collectRelations(condition.where))
  .filter(uniqueRelation);

const results = await collection.model.findAll({
  where: {
    [primaryKeyField]: ids,
  },
  attributes: [
    primaryKeyField,
    ...conditions.map((condition) => buildActionCase(condition)),
  ],
  include: requiredIncludes,
  raw: true,
});
```

优化后，实际查询只保留权限判断需要的少数关系，耗时降低到约 100～300 ms。

## 还可以继续优化的地方

### 减少查询字段

这条复杂 SQL 的目标是计算权限交集，理论上只需要返回主表主键和各 Action 的判断结果，不需要返回关系表的完整字段。

理想状态下，`SELECT` 可以收缩为：

```sql
SELECT
  main_table.id,
  CASE WHEN ... THEN 1 ELSE 0 END AS view,
  CASE WHEN ... THEN 1 ELSE 0 END AS update
FROM main_table
LEFT JOIN required_relation ON ...;
```

相对于关系数量爆炸，这项优化的收益较小，但它能继续减少 I/O 和结果解析成本。

### 拆分不同 Action

如果最终只需要计算 3 个 Action，也可以考虑分成 3 次查询。这样每次查询只携带当前 Action 需要的关系，避免无关条件互相放大。

代价是数据库往返次数增加，所以需要通过真实数据判断：一次复杂查询更快，还是多次简单查询更稳定。

## 总结

这次问题的关键，不是单张表缺少索引，而是 ORM 把多个权限条件的关系依赖全部合并，生成了远超实际需要的 Join。

排查这类问题时，不要只盯着最终 SQL 的执行时间，还要观察：

- 实际权限条件用了哪些关系？
- ORM 又额外加载了哪些关系？
- 多个一对多关系组合后，中间结果增长了多少？
- 查询是否真的需要返回所有字段？

只让数据库查询“计算结果真正需要的数据”，通常比盲目增加索引更直接。
{% endraw %}
