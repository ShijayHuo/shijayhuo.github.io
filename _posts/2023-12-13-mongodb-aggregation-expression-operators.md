---
layout: post
title: "Mongodb 聚合表达式操作符"
date: 2023-12-13 12:12:30 +0800
categories: ["后端","数据库"]
tags: ["MongoDB"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/IG99Bd"
---

运算符可以理解为带参数的函数，接受单个参数的形式

```javascript
{ <operator>: <argument> }
```

接受多个参数的形式

```javascript
{ <operator>: [ <argument1>, <argument2> ... ] }
```

例如 $sum 理解起来，如下：

```typescript
$sum: 1 => function sum(value: number) {}
$sum: "$age" => function sum(field: string) {}
$sum: ["$spent_amount", "remaining_amount"] => function sum(...args: string[]) {}
```

#### 操作符分类

| 原标题 |
| --- |
| 算术运算符 |
| 数组运算符 |
| 位运算符 |
| 布尔表达式 |
| 比较表达式 |
| 条件表达式 |
| 自定义聚合表达式 |
| 数据大小运算符 |
| 日期表达式 |
| 文字表达式 |
| 其他操作符 |
| 对象表达式 |
| set 表达式 |
| 字符串表达式 |
| 文本表达式 |
| 时间戳表达式 |
| 三角函数表达式 |
| 类型表达式 |
| 累加器 |
| 变量表达式 |
| window 操作符 |

##### Arithmetic Expression Operators（算术运算符）

##### Array Expression Operators（数组运算符）

##### Bitwise Operators（位运算符）

##### Boolean Expression Operators（布尔表达式运算符）

##### Comparison Expression Operators（比较表达式运算符）

##### Conditional Expression Operators（条件表达式运算符）

##### Custom Aggregation Expression Operators（自定义聚合表达式运算符）

##### Data Size Operators（数据大小运算符）

##### Date Expression Operators（日期表达式运算符）

##### Literal Expression Operator（文字表达式运算符）

##### Miscellaneous Operators（其他操作符）

##### Object Expression Operators（对象表达式运算符）

##### Set Expression Operators（set 表达式运算符）

##### String Expression Operators（字符串表达式运算符）

##### Text Expression Operator（文本表达式运算符）

##### Timestamp Expression Operators（时间戳表达式运算符）

##### Trigonometry Expression Operators（三角表达式运算符）

##### Type Expression Operators（类型表达式运算符）

##### Accumulators (累加器）

##### Variable Expression Operators（变量表达式运算符）

##### Window Operators（window 操作符）
