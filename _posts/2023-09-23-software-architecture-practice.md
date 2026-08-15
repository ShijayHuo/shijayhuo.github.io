---
layout: post
title: "软件架构实践"
excerpt: "从软件架构的基本概念出发，以 PingCode 的产品、技术、模块、微前端和运维架构为例，理解如何把系统拆分并重新组合。"
date: 2023-09-23 09:53:00 +0800
categories: ["架构"]
tags: ["架构"]
source_platform: PingCode
source_url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/KnvE9I"
---

架构设计，就是把一堆零件组织起来，创造一个能够工作的系统。要做好这件事，首先需要理解系统由什么组成、为什么要拆分，以及不同层次的设计分别解决什么问题。

## 从顶层结构认识架构

架构是软件系统的顶层结构。它把系统拆分成不同层次的子系统、组件与模块，并明确这些部分之间的关系。

<div class="arch-stack">
  <section class="arch-layer"><h4>软件系统</h4><div class="arch-nodes"><span class="arch-node blue">系统</span></div></section>
  <section class="arch-layer"><h4>子系统</h4><div class="arch-nodes"><span class="arch-node green">子系统 A</span><span class="arch-node green">子系统 B</span><span class="arch-node green">子系统 C</span></div></section>
  <section class="arch-layer"><h4>结构单元</h4><div class="arch-nodes"><span class="arch-node purple">组件</span><span class="arch-node purple">模块</span><span class="arch-node orange">业务能力</span></div></section>
</div>
<p class="arch-caption">架构：软件系统的顶层结构</p>

几个容易混淆的概念，可以这样区分：

- **模块**更强调逻辑上的职责划分。
- **组件**更强调物理上的封装、部署或复用单元。
- **框架**提供可复用的实现骨架和约束。
- **架构**描述具体系统的顶层结构，以及关键组成之间如何协作。

## 为什么需要架构设计

架构设计主要为了解决复杂度带来的问题。性能、可用性、扩展性、成本、安全和规模等目标经常相互制约，设计者必须识别主要矛盾并作出取舍。

<div class="arch-panel">
  <h3>复杂度来源</h3>
  <div class="arch-nodes"><span class="arch-node">高性能</span><span class="arch-node">高可用</span><span class="arch-node">可扩展</span><span class="arch-node">低成本</span><span class="arch-node">安全</span><span class="arch-node">规模</span></div>
</div>

## 从业务到技术：架构的不同视角

同一个系统可以从多个视角观察。这些分类不是互斥关系，而是分别回答“提供什么能力”“业务如何运转”和“技术如何支撑”等问题。

<div class="arch-grid">
  <section class="arch-card"><h4>产品架构</h4><p>描述产品能力如何组织，以及不同产品、功能和入口之间的关系。</p></section>
  <section class="arch-card"><h4>业务架构</h4><p>从业务目标、流程和边界出发，组织业务能力及其协作关系。</p></section>
  <section class="arch-card"><h4>技术架构</h4><p>描述应用、服务、基础设施与数据等技术层次及其关系。</p></section>
</div>

继续向下拆分，还可以观察数据架构、应用架构以及具体的技术架构风格，例如事件驱动、分层架构（MVC）、领域驱动和分布式架构。

## 用 PingCode 看架构如何落地

只有抽象概念还不够。下面从一套真实产品出发，依次观察产品能力、技术分层、模块结构、微前端和运维体系。

### 产品架构

产品架构首先回答“产品向用户提供哪些能力，以及这些能力如何组织”。

<div class="arch-grid">
  <section class="arch-card"><h4>协作空间</h4><div class="arch-nodes"><span class="arch-node cyan">目标管理</span><span class="arch-node cyan">目标对齐</span><span class="arch-node cyan">讨论社区</span><span class="arch-node cyan">话题空间</span></div></section>
  <section class="arch-card"><h4>产品管理</h4><div class="arch-nodes"><span class="arch-node red">工单收集与处理</span><span class="arch-node red">需求池管理</span><span class="arch-node red">需求评审排期</span><span class="arch-node red">产品路线图</span></div></section>
  <section class="arch-card"><h4>项目管理</h4><div class="arch-nodes"><span class="arch-node blue">Scrum</span><span class="arch-node blue">Kanban</span><span class="arch-node blue">瀑布开发</span><span class="arch-node blue">项目集</span><span class="arch-node blue">进度管理</span><span class="arch-node blue">流程管理</span><span class="arch-node blue">迭代管理</span><span class="arch-node blue">版本管理</span><span class="arch-node blue">工时管理</span><span class="arch-node blue">资源管理</span></div></section>
  <section class="arch-card"><h4>测试管理</h4><div class="arch-nodes"><span class="arch-node green">测试用例维护</span><span class="arch-node green">测试用例评审</span><span class="arch-node green">测试计划执行</span><span class="arch-node green">测试报告</span></div></section>
  <section class="arch-card"><h4>知识管理</h4><div class="arch-nodes"><span class="arch-node purple">多人协同编辑</span><span class="arch-node purple">知识沉淀与共享</span><span class="arch-node purple">模板管理</span><span class="arch-node purple">历史版本管理</span></div></section>
  <section class="arch-card"><h4>应用市场</h4><div class="arch-nodes"><span class="arch-node">GitHub</span><span class="arch-node">GitLab</span><span class="arch-node">Jenkins</span><span class="arch-node">Bitbucket</span><span class="arch-node">VS Code</span><span class="arch-node">Jira</span><span class="arch-node">Gitee</span><span class="arch-node">云服务</span></div></section>
</div>

<div class="arch-stack">
  <section class="arch-layer"><h4>自动化</h4><div class="arch-nodes"><span class="arch-node cyan">自动化规则</span><span class="arch-node cyan">计划规则</span><span class="arch-node cyan">即时规则</span><span class="arch-node cyan">运行历史</span></div></section>
  <section class="arch-layer"><h4>效能度量</h4><div class="arch-nodes"><span class="arch-node purple">交付效率</span><span class="arch-node purple">交付能力</span><span class="arch-node purple">交付质量</span><span class="arch-node purple">数据下钻</span></div></section>
  <section class="arch-layer"><h4>目录服务</h4><div class="arch-nodes"><span class="arch-node orange">组织架构同步</span><span class="arch-node orange">单点登录</span><span class="arch-node orange">多团队管理</span><span class="arch-node orange">安全管理</span></div></section>
</div>

### 技术架构

技术架构把产品能力映射到应用、服务、基础设施与数据层。

<div class="arch-stack">
  <section class="arch-layer"><h4>应用层</h4><div class="arch-nodes"><span class="arch-node blue">Web 应用</span><span class="arch-node blue">移动端</span><span class="arch-node blue">应用市场</span><span class="arch-node blue">小程序</span><span class="arch-node blue">Open API</span></div></section>
  <section class="arch-layer"><h4>服务层</h4><div class="arch-nodes"><span class="arch-node green">Agile</span><span class="arch-node green">Plan</span><span class="arch-node green">Testhub</span><span class="arch-node green">Goals</span><span class="arch-node green">Wiki</span><span class="arch-node green">Flow</span><span class="arch-node red">Iris 消息服务</span><span class="arch-node red">Typhon 账户服务</span><span class="arch-node red">Atlas 文件服务</span></div></section>
  <section class="arch-layer"><h4>基础设施</h4><div class="arch-nodes"><span class="arch-node purple">PC-CORE</span><span class="arch-node purple">EROS</span><span class="arch-node purple">CHAOS</span></div></section>
  <section class="arch-layer"><h4>数据层</h4><div class="arch-nodes"><span class="arch-node">MongoDB</span><span class="arch-node">Redis</span><span class="arch-node">AWS S3</span></div></section>
</div>

### 模块内部结构

继续深入单个模块，可以看到前端分层、服务职责、通用能力和基础库之间的关系。

<div class="arch-stack">
  <section class="arch-layer"><h4>前端</h4><div class="arch-nodes"><span class="arch-node orange">View（Angular Component、Directive、Pipe）</span><span class="arch-node orange">ViewModel</span><span class="arch-node orange">Data Service Layer（API Service、Store）</span><span class="arch-node orange">Model</span></div></section>
  <section class="arch-layer"><h4>模块</h4><div class="arch-nodes"><span class="arch-node blue">模块 1…n</span><span class="arch-node red">Facade → Service → Repository</span><span class="arch-node red">权限控制</span><span class="arch-node green">日志记录</span></div></section>
  <section class="arch-layer"><h4>通用能力</h4><div class="arch-nodes"><span class="arch-node purple">config</span><span class="arch-node purple">i18n</span><span class="arch-node purple">mailer</span><span class="arch-node purple">initializer</span><span class="arch-node purple">middlewares</span><span class="arch-node purple">notification</span><span class="arch-node purple">entities</span><span class="arch-node purple">info</span></div></section>
  <section class="arch-layer"><h4>基础库</h4><div class="arch-nodes"><span class="arch-node blue">CHAOS</span><span class="arch-node blue">EROS</span><span class="arch-node blue">PC-CORE</span></div></section>
</div>

### 微前端架构

在前端侧，Portal 负责全局能力和子应用生命周期，各业务应用共享组件库与状态管理能力。

<div class="arch-stack">
  <section class="arch-layer"><h4>Portal</h4><div class="arch-nodes"><span class="arch-node cyan">左侧导航</span><span class="arch-node cyan">通知</span><span class="arch-node cyan">全局数据加载</span><span class="arch-node cyan">搜索</span><span class="arch-node green">子应用注册、销毁和加载</span></div></section>
  <section class="arch-layer"><h4>Applications</h4><div class="arch-nodes"><span class="arch-node green">Agile</span><span class="arch-node green">Testhub</span><span class="arch-node green">Wiki</span><span class="arch-node green">Plan</span><span class="arch-node green">Goals</span><span class="arch-node green">Flow</span><span class="arch-node green">Access</span><span class="arch-node green">Pipe</span><span class="arch-node green">Repo</span></div></section>
  <section class="arch-layer"><h4>组件与状态</h4><div class="arch-nodes"><span class="arch-node purple">业务组件库 NGX-STYX：Layout、EntityDetail、Comment、Attachment、Insight…</span><span class="arch-node blue">组件库 NGX-TETHYS：Button、Dropdown、Card、Layout、Table、Dialog、Popover…</span><span class="arch-node orange">@worktile/planet</span><span class="arch-node orange">@tethy/store</span></div></section>
</div>

### 运维架构

系统上线后，还需要安全、监控、日志、运行平台、基础设施编排和云资源共同支撑。

<div class="arch-stack">
  <section class="arch-layer"><div class="arch-nodes"><span class="arch-node red">Security：Wazuh / Openstar</span></div></section>
  <section class="arch-layer"><div class="arch-nodes"><span class="arch-node orange">Monitoring：Zabbix / Prometheus / Grafana / SkyWalking</span></div></section>
  <section class="arch-layer"><div class="arch-nodes"><span class="arch-node">Logging：Elasticsearch / Fluentd / Kibana / Sentry</span></div></section>
  <section class="arch-layer"><div class="arch-nodes"><span class="arch-node green">NLB</span><span class="arch-node green">Nginx</span><span class="arch-node green">Node.js</span><span class="arch-node green">Helm</span><span class="arch-node green">Jenkins</span><span class="arch-node green">PingCode Pipe</span></div></section>
  <section class="arch-layer"><div class="arch-nodes"><span class="arch-node green">Kubernetes</span><span class="arch-node green">MongoDB / Redis / Elasticsearch</span></div></section>
  <section class="arch-layer"><div class="arch-nodes"><span class="arch-node cyan">Terraform</span><span class="arch-node cyan">Packer</span><span class="arch-node cyan">Ansible</span></div></section>
  <section class="arch-layer"><div class="arch-nodes"><span class="arch-node blue">AWS（EC2 / S3）</span></div></section>
</div>

## 架构实践的核心

这些视图描述的是同一个产品，只是观察层次不同。实践中的关键不是画出更多图，而是让每张图回答明确的问题，并让产品能力、技术实现和运行保障彼此对应。

架构也不是一次性完成的静态蓝图。业务目标和系统复杂度不断变化，架构需要随着真实问题持续演进。

## 延伸阅读

- [《软件架构入门》](https://www.ruanyifeng.com/blog/2016/09/software-architecture.html)
- [《漫谈架构师》](/posts/talking-about-architects/)

## 原始资料

- [架构师分享提纲](https://coders.pingcode.com/wiki/spaces/JGS/pages/KnvE9I)，2023-09-21
- [架构实践](https://coders.pingcode.com/wiki/spaces/JGS/pages/simKOr)，2023-09-22
- [架构分类](https://coders.pingcode.com/wiki/spaces/JGS/pages/CUUQ9N)，2023-09-23
- [认识架构](https://coders.pingcode.com/wiki/spaces/JGS/pages/e-1VKt)，2023-09-23
