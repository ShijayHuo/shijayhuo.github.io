---
layout: post
title: "聚合管道 Stage(阶段)"
date: 2023-12-06 15:00:49 +0800
categories: ["后端","数据库"]
tags: ["MongoDB"]
source_platform: PingCode
source_url: "https://pingcode.com/spaces/tCjjncWVbJ/pages/e3WeEE"
---

| Stage | Description | 翻译 |
| --- | --- | --- |
| `$addFields` | Adds new fields to documents. Similar to `$project`, `$addFields` reshapes each document in the stream; specifically, by adding new fields to output documents that contain both the existing fields from the input documents and the newly added fields.<br>`$set` is an alias for [.](https://www.mongodb.com/docs/v4.4/reference/operator/aggregation/addFields/#mongodb-pipeline-pipe.-addFields)`$addFields` | 为文档添加新字段。类似于\`$project\`，\`$addFields\`重新构造流中的每个文档；具体地，通过向输出文档添加新字段，这些新字段包含输入文档中的现有字段和新添加的字段。<br>\`$set\`是\`$addFields\`的别名。 |
| `$bucket` | Categorizes incoming documents into groups, called buckets, based on a specified expression and bucket boundaries. | 根据指定的表达式和桶边界，将传入的文档分为不同的组，称为桶。 |
| `$bucketAuto` | Categorizes incoming documents into a specific number of groups, called buckets, based on a specified expression. Bucket boundaries are automatically determined in an attempt to evenly distribute the documents into the specified number of buckets. | 根据指定的表达式将传入的文件分类到特定数量的组中，称为存储桶。存储桶边界是自动确定的，目的是尽量均匀地将文件分配到指定数量的存储桶中。 |
| `$changeStream` | Returns a [Change Stream](https://www.mongodb.com/docs/v4.4/changeStreams/#std-label-changeStreams) cursor for the collection. This stage can only occur once in an aggregation pipeline and it must occur as the first stage. | 返回一个用于集合的变更流的游标。这个阶段在聚合管道中只能出现一次，并且必须作为第一个阶段出现。 |
| `$collStats` | Returns statistics regarding a collection or view. | 返回有关集合或视图的统计信息。 |
| `**$count**` | Returns a count of the number of documents at this stage of the aggregation pipeline. | 在聚合管道的这个阶段，返回文档数量的计数。 |
| `$facet` | Processes multiple [aggregation pipelines](https://www.mongodb.com/docs/v4.4/core/aggregation-pipeline/#std-label-aggregation-pipeline) within a single stage on the same set of input documents. Enables the creation of multi-faceted aggregations capable of characterizing data across multiple dimensions, or facets, in a single stage. | 在同一组输入文档上的单个阶段中处理多个聚合管道。可以创建多面向的聚合，能够在一个阶段中对数据进行多维度或多个方面的描述。 |
| `$geoNear` | Returns an ordered stream of documents based on the proximity to a geospatial point. Incorporates the functionality of `$match`, `$sort`, and `$limit` for geospatial data. The output documents include an additional distance field and can include a location identifier field. | 根据与地理空间点的接近程度返回一个有序的文档流。结合了`$match`、`$sort`和`$limit`对地理空间数据的功能。输出的文档包括一个额外的距离字段，并且可以包括一个位置标识字段。 |
| `$graphLookup` | Performs a recursive search on a collection. To each output document, adds a new array field that contains the traversal results of the recursive search for that document. | 在集合上执行递归搜索。对于每个输出文档，添加一个新的数组字段，其中包含该文档的递归搜索的遍历结果。 |
| `**$group**` | Groups input documents by a specified identifier expression and applies the accumulator expression(s), if specified, to each group. Consumes all input documents and outputs one document per each distinct group. The output documents only contain the identifier field and, if specified, accumulated fields. | 按照指定的标识表达式将输入文档分组，并对每个组应用累加器表达式（如果指定）。消耗所有输入文档，并为每个不同的组输出一个文档。输出文档只包含标识字段和（如果指定）累积字段。 |
| `$indexStats` | Returns statistics regarding the use of each index for the collection. | 返回有关集合每个索引使用情况的统计信息。 |
| `$limit` | Passes the first *n* documents unmodified to the pipeline where *n* is the specified limit. For each input document, outputs either one document (for the first *n* documents) or zero documents (after the first *n* documents). | 将前 n 个文档不加修改地传递到管道中，其中 n 是指定的限制。对于每个输入文档，输出一个文档（对于前 n 个文档）或零个文档（在第 n 个文档之后）。 |
| `$listSessions` | Lists all sessions that have been active long enough to propagate to the `system.sessions` collection. | 列出了所有已经活跃了足够长时间以传播到`system.sessions`集合的会话。 |
| `$lookup` | Performs a left outer join to another collection in the *same* database to filter in documents from the "joined" collection for processing. | 在**相同**数据库中，执行左外连接到另一个集合，以从“连接”集合中筛选出要处理的文档。 |
| `$match` | Filters the document stream to allow only matching documents to pass unmodified into the next pipeline stage. `$match` uses standard MongoDB queries. For each input document, outputs either one document (a match) or zero documents (no match). | 过滤文档流，只允许匹配的文档在下一个流程阶段中不被修改地传递。`$match`使用标准的MongoDB查询。对于每个输入文档，输出一个文档(匹配)或零个文档(不匹配)。 |
| `$merge` | Writes the resulting documents of the aggregation pipeline to a collection. The stage can incorporate (insert new documents, merge documents, replace documents, keep existing documents, fail the operation, process documents with a custom update pipeline) the results into an output collection. To use the `$merge` stage, it must be the last stage in the pipeline.<br>*New in version 4.2*. | 将聚合管道的结果文档写入集合。该阶段可以将结果合并到输出集合中（插入新文档、合并文档、替换文档、保留现有文档、操作失败、使用自定义更新管道处理文档）。要使用 \`$merge\` 阶段，它必须是管道中的最后一个阶段。<br>*4.2版本的新功能* 。 |
| `$out` | Writes the resulting documents of the aggregation pipeline to a collection. To use the `$out` stage, it must be the last stage in the pipeline. | 将聚合管道的结果文档写入集合中。要使用 `$out`阶段，它必须是管道中的最后一个阶段。 |
| `$planCacheStats` | Returns [plan cache](https://www.mongodb.com/docs/v4.4/core/query-plans/) information for a collection. | 返回一个集合的计划缓存信息。 |
| `$project` | Reshapes each document in the stream, such as by adding new fields or removing existing fields. For each input document, outputs one document.<br>See also `$unset` for removing existing fields. | 调整流中的每个文档，例如添加新字段或删除现有字段。对于每个输入文档，输出一个文档。<br>另请参阅 `$unset`用于删除现有字段。 |
| `$redact` | Reshapes each document in the stream by restricting the content for each document based on information stored in the documents themselves. Incorporates the functionality of `$project` and `$match`. Can be used to implement field level redaction. For each input document, outputs either one or zero documents. | 将流中的每个文档重新塑形，通过根据文档中存储的信息限制每个文档的内容。结合了  `$project`和  `$match`的功能。可用于实现字段级数据删除。对于每个输入文档，输出一个或零个文档。 |
| `$replaceRoot` | Replaces a document with the specified embedded document. The operation replaces all existing fields in the input document, including the `\_id` field. Specify a document embedded in the input document to promote the embedded document to the top level.<br>`$replaceWith` is an alias for `$replaceRoot` stage. | 使用指定的嵌入式文档替换文档。此操作将替换输入文档中的所有现有字段，包括`\_id`字段。指定嵌入在输入文档中的文档，将该嵌入式文档提升到顶层。<br>`$replaceWith`是 `$replaceRoot`阶段的别名。 |
| `$replaceWith` | Replaces a document with the specified embedded document. The operation replaces all existing fields in the input document, including the `\_id` field. Specify a document embedded in the input document to promote the embedded document to the top level.<br>`$replaceWith` is an alias for `$replaceRoot` stage. | 用指定的嵌入式文档替换一个文档。此操作会替换输入文档中的所有现有字段，包括 \`\_id\` 字段。指定一个嵌入在输入文档中的文档，将会将该嵌入文档提升到顶层。<br>`$replaceWith`是`$replaceRoot`阶段的别名。 |
| `$sample` | Randomly selects the specified number of documents from its input. | 从输入中随机选择指定数量的文件。 |
| `$search` | Performs a full-text search of the field or fields in an [Atlas](https://www.mongodb.com/docs/atlas/reference/atlas-search/query-syntax/) collection.<br>##### NOTE<br>`$search` is only available for MongoDB Atlas clusters, and is not available for self-managed deployments. | 在 Atlas 集合中对字段或字段进行全文搜索。<br>##### 注意<br>`$search`仅适用于MongoDB Atlas集群，不适用于自管理部署。 |
| `$set` | Adds new fields to documents. Similar to `$project`, `$set` reshapes each document in the stream; specifically, by adding new fields to output documents that contain both the existing fields from the input documents and the newly added fields.<br>`$set` is an alias for `$addFields` stage. | 向文档中添加新字段。与 `$project`类似，`$set`对流中的每个文档进行重塑；具体来说，它通过向输出文档中添加新字段来包含输入文档中的现有字段和新添加的字段。<br>`$set`是 `$addFields`阶段的别名。 |
| `$skip` | Skips the first *n* documents where *n* is the specified skip number and passes the remaining documents unmodified to the pipeline. For each input document, outputs either zero documents (for the first *n* documents) or one document (if after the first *n* documents). | 跳过前 *n* 个文档，其中 *n* 是指定的跳过数量，并将其余文档不经修改地传递给流水线。对于每个输入文档，输出零个文档（对于前 *n* 个文档）或一个文档（如果在前 *n* 个文档之后）。 |
| `$sort` | Reorders the document stream by a specified sort key. Only the order changes; the documents remain unmodified. For each input document, outputs one document. | 重新按照指定的排序键对文档流进行排序。只有顺序改变；文档保持不变。对于每个输入文档，输出一个文档。 |
| `$sortByCount` | Groups incoming documents based on the value of a specified expression, then computes the count of documents in each distinct group. | 根据指定表达式的值对输入的文档进行分组，然后计算每个不同组中文档的数量。 |
| `$unionWith` | Performs a union of two collections; i.e. combines pipeline results from two collections into a single result set.<br>*New in version 4.4*. | 执行两个集合的并集操作；即将两个集合的管道结果合并为一个结果集。<br>*在4.4版本中新增* 。 |
| `$unset` | Removes/excludes fields from documents.<br>`$unset` is an alias for `$project` stage that removes fields. | 从文档中移除/排除字段。<br>`$unset`是移除字段的`$project`阶段的别名。 |
| `$unwind` | Deconstructs an array field from the input documents to output a document for *each* element. Each output document replaces the array with an element value. For each input document, outputs *n* documents where *n* is the number of array elements and can be zero for an empty array. | 将输入文档中的数组字段解构为*每个* 元素输出一个文档。每个输出文档用一个元素值替换数组。对于每个输入文档，输出*n*个文档，其中*n*是数组元素的数量，对于空数组可以为零。 |

#### Mysql 的执行顺序

![聚合管道 Stage(阶段) 配图 1](/assets/img/posts/pingcode-e3weee/image-001.png)

##### Mongodb 聚合管道执行优先级

MongoDB 聚合管道中的各个阶段的执行顺序如下：

1. **$match** 阶段：用于过滤文档。
2. **$project** 阶段：用于修改文档的结构。
3. **$group** 阶段：用于将文档分组。
4. **$sort** 阶段：用于对文档进行排序。
5. **$limit** 阶段：用于限制文档的数量。
6. **$skip** 阶段：用于跳过指定数量的文档。
7. **$unwind** 阶段：用于展开数组字段。
8. **$lookup** 阶段：用于连接两个集合。
9. **$union** 阶段：用于合并多个集合。
10. **$merge** 阶段：用于合并多个文档。
