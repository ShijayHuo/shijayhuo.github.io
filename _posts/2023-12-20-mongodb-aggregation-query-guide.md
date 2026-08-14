---
layout: post
title: "MongoDB 聚合查询应用场景和使用技巧"
date: 2023-12-20 16:55:52 +0800
categories: ["后端","数据库"]
tags: ["MongoDB"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/mqSnVg"
---

#### 什么时候使用聚合查询？

常见的业务场景是报表、统计分析、大型视图

具有以下特征：

- 需要分页
- 过滤条件或排序条件分散在不同的表中
- 按某些维度分组、统计

个人观点：

- 能用程序计算优先使用程序，程序解决不了或难以解决的再选择聚合查询
- 几次查询 + 程序组合数据 > 使用聚合（查询不多且后续扩展性不强）

#### 学习技巧

难点：

- 不易于理解？写的人容易理解，看的人费神
- 选用操作符（不能很好的把场景和操作符关联起来）

思路：

- 先通过场景确定聚合表达式的分类，其次找具体的操作符
- 借助 SQL 对比 Mongodb

#### 聚合的限制

- 搜索的结果集不允许超过 16MB
- 内存限制 100MB，如果超过可以设置 `allowDisk: true`利用磁盘写入一个临时文件
- 可能造成内存溢出，需要设置`allowDisk`磁盘的`stage`：
   
   - `$bucket`
   - `$bucketAuto`
   - `$group`
   - `$sort` 当索引不支持排序操作
   - `$sortByCount`

#### Stage 优化

- 优先利用索引
- 优先将数据收窄

#### 评估语句的性能
