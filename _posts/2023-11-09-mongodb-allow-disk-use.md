---
layout: post
title: "allowDiskUse 选项"
date: 2023-11-09 15:10:14 +0800
categories: ["后端","数据库"]
tags: ["MongoDB"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/r7Uh4C"
---

Mongodb 默认是将临时文件在内存排序，但是超过 100M 就拒绝（报错）继续操作，超过 100M 就需要借助磁盘，打开 allowDiskUse 选项即可。

相关错误：Sort exceeded memory limit of 104857600 bytes, but did not opt in to external sorting. Aborting operation. Pass allowDiskUse:true to opt in.

相关资料：[https://www.mongodb.com/docs/manual/reference/method/cursor.allowDiskUse/](https://www.mongodb.com/docs/manual/reference/method/cursor.allowDiskUse/)
