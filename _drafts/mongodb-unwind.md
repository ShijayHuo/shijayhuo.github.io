---
layout: post
title: "MongoDB $unwind"
date: 2023-12-20 14:32:53 +0800
categories: ["后端","数据库"]
tags: ["MongoDB"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/Xkx2Gn"
---

```typescript
db.users.aggregate([
  {
    "$match": {
      "uid": {
        "$in": [
          "4e0baec588c0436d94da7cadaff244c7",
          "4ff8e3cc61d14d84aff5e2cbb15b1ffd"
        ]
      }
    }
  },
  {
    "$lookup": {
      "from": "wiki_page_operation_histories",
      "localField": "uid",
      "foreignField": "created_by",
      "as": "result"
    }
  },
	{
		$project: {
			uid: 1,
			result: {
				$filter: {
					input: "$result",
					as: "r",
					cond: {
						$and: [
							{$eq: ["$$r.space_id", ObjectId("654c8364198edea0819de479")]},
							{$eq: ["$$r.type", "edit"]},
						]
					}
				}
			}
		}
	},
	{
		$unwind: {
			path: "$result",
			preserveNullAndEmptyArrays: true
		},
	},
	{
		$group: {
			_id: { uid: "$uid", created_by: "$result.created_by" },
			result: { $addToSet: { uid: "$result.created_by", page_id: "$result.page_id" } }
		}
	},
	{
		$project: {
			uid: "$_id.uid",
			_id: 0,
			count: {
				$size: {
					$filter: {
						input: "$result",
						as: "r",
						cond: { $ne: ["$$r", {}]  }
					}
				}
			}
		}
	},
  {
    "$sort": { "count": 1 }
  },
  { "$skip": 1 },
  { "$limit": 1 }
])
```

- 连表 leftJoin、innerJoin -> `$unwind`+ `$group` 优先按左表字段，其次按照右表数组
- 数组去重 `$addToSet`
- 数组过滤空元素 `$exists`
- 数组过滤空 {} `$filter`+`cond: {$ne: \["$$r", {}\]}`
