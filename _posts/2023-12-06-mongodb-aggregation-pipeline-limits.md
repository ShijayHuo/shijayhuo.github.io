---
layout: post
title: "MongoDB 聚合管道限制"
date: 2023-12-06 14:01:07 +0800
categories: ["后端","数据库"]
tags: ["MongoDB"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/TN1QKh"
---

1. 搜索的结果集不允许超过 16MB
2. 内存限制 100MB，如果超过可以设置 `allowDisk: true`利用磁盘写入一个临时文件
3. 可能造成内存溢出，需要设置`allowDisk`磁盘的`stage`：
   
   - `$bucket`
   - `$bucketAuto`
   - `$group`
   - `$sort` 当索引不支持排序操作
   - `$sortByCount`
