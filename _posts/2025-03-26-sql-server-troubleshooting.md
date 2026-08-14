---
layout: post
title: "SQL Server(MSSQL)踩坑记录"
excerpt: "MSSQL 出的比较早，遵循严格的 SQL 语法，并不像 MySQL 和 PostgreSQL 那样宽松，也不支持存储 JSON 字段，里面有坑。 别名提示： SQL Server = MSSQL = mssql, MySQL = mysql, PostgreSQL = pg 索引 NULL 是有效值 mssql..."
date: 2025-03-26 16:30:00 +0800
categories: ["后端","数据库"]
tags: ["SQL Server"]
source_platform: GitHub Pages
source_url: "https://aaaaaajie.github.io/2025/03/26/mssql%E4%BD%BF%E7%94%A8%E4%B8%AD%E9%81%87%E5%88%B0%E7%9A%84%E9%97%AE%E9%A2%98/"
source_repository: "https://github.com/ShijayHuo/aaaaaajie.github.io"
---

{% raw %}
<blockquote>
<p>MSSQL 出的比较早，遵循严格的 SQL 语法，并不像 MySQL 和 PostgreSQL 那样宽松，也不支持存储 JSON 字段，里面有坑。</p>
</blockquote>
<blockquote>
<p>别名提示： SQL Server = MSSQL = mssql, MySQL = mysql, PostgreSQL = pg</p>
</blockquote>
<h1>索引</h1>
<h2 id="NULL-是有效值">NULL 是有效值</h2>
<p>mssql 中 NULL 是有效值，设置唯一索引的字段只能有一个 NULL。但在 pg 和 mysql 中，多个 NULL 视为不同的值。</p>
<table>
<thead>
<tr>
<th>ID</th>
<th>Email</th>
</tr>
</thead>
<tbody>
<tr>
<td>1</td>
<td>NULL（插入成功）</td>
</tr>
<tr>
<td>2</td>
<td>NULL (插入失败，重复)</td>
</tr>
</tbody>
</table>
<h2 id="删除索引">删除索引</h2>
<p>在 MSSQL 中，UNIQUE 约束会自动创建一个唯一索引，索引不能直接通过 DROP INDEX 删除，需要先删除 UNIQUE 约束。</p>
<h1>视图</h1>
<h2 id="创建视图">创建视图</h2>
<p>注意：必须得有指定列名</p>
<ul>
<li>CREATE VIEW test1 AS SELECT 1 ❌</li>
<li>CREATE VIEW test1 AS SELECT 1 as value ✅</li>
</ul>
<!-- flag of hidden posts -->
{% endraw %}
