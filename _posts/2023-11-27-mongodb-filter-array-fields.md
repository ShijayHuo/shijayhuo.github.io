---
layout: post
title: "Mongodb 过滤字段是数组的元素"
date: 2023-11-27 19:09:01 +0800
categories: ["后端","数据库"]
tags: ["MongoDB"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/OD6KjG"
---

有类似于这样一个场景：

假设有一张表：tasks，有以下数据：

```javascript
[
  { 
  	_id: 1,
  	participants: [
    	{ name: '小张', age: 30 },
    	{ name: '小李', age: 32 }, 
    	{ name: '小张', age: 20 }
    ]
  },
  ...
]
```

预期结果是 : 

```javascript
[
  { 
    _id: 1, 
    participants: [
      { name: '小张', age: 30 },
      { name: '小张', age: 20 }
    ]
  }
]
```

有同学可能会想到，`db.tasks.find({\_id: 1, "participants.name": '小张'});` 这种是不是就解决了呢？有这样的猜测没有什么毛病，不过老道的玩家是知道这样不行的，因为这个只能匹配到数组中符合条件的这一整条数据，但是不能过滤数组中仅满足条件的元素，结果是这样的：

```javascript
  [{ 
  	_id: 1,
  	participants: [
    	{ name: '小张', age: 30 },
    	{ name: '小李', age: 32 }, 
    	{ name: '小张', age: 20 }
    ]
  }]
```

##### 解决办法

使用聚合查询的 $project 加数组的 $filter 操作符过滤，示例如下：

```javascript
db.tasks.aggregate([
  { $match: {_id: 1 } },
  { 
    $project: {
      	_id: 1,
  		participants: {
        	$filter: {
            	input: "$participants",
              	as: "result",
              	cond: {
                	$eq: ["$$result.name", '小张']
                }
            }
        }
  	} 
 }
]);
```
