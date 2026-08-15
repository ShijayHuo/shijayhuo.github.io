---
layout: post
title: "漫谈架构师"
pin: true
excerpt: "我从架构师的角色与职责出发，谈谈能力模型、成长路径、HART 思维、架构原则和技术选型方法。"
date: 2023-09-23 11:12:00 +0800
categories: ["架构","程序人生"]
tags: ["架构"]
source_platform: PingCode
source_url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/bKk1Pp"
source_pages:
  - { title: "架构思维速记", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/aSex1z", date: "2023-09-06" }
  - { title: "架构原则速记", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/Lh09Af", date: "2023-09-07" }
  - { title: "架构师成长之术", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/t1Jlpr", date: "2023-09-17" }
  - { title: "如何成为一名软件架构师", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/xMyqAg", date: "2023-09-17" }
  - { title: "架构师成长之道", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/ZcEZzO", date: "2023-09-17" }
  - { title: "人人都是架构师", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/zuUOAi", date: "2023-09-17" }
  - { title: "如何选用一门技术", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/AmW_YE", date: "2023-09-20" }
  - { title: "架构师分享提纲", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/KnvE9I", date: "2023-09-21" }
  - { title: "漫谈架构师画板", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/bKk1Pp", date: "2023-09-21" }
  - { title: "成为架构师前的四个问题", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/n8RgRs", date: "2023-09-21" }
  - { title: "架构原则：合适、简单与演进", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/oSZ_xg", date: "2023-09-23" }
  - { title: "架构思维（HART）", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/tmGzn5", date: "2023-09-23" }
  - { title: "认识架构师", url: "https://coders.pingcode.com/wiki/spaces/JGS/pages/fXt_rt", date: "2023-09-23" }
---

在聊架构师之前，推荐大家先读一读[《软件架构实践》](/posts/software-architecture-practice/)。那篇文章讨论架构本身，以及一套真实系统如何从产品、技术、模块和运维等层次展开。

这一篇，我想聊的架构师，为什么需要这个角色，以及一个开发者如何逐步具备架构能力。

<div class="arch-panel">
  <h3>漫谈架构师</h3>
  <div class="arch-tree">
    <section class="arch-branch">
      <strong>认识架构</strong>
      <ul><li><a href="/posts/software-architecture-practice/">软件架构实践</a></li></ul>
    </section>
    <section class="arch-branch">
      <strong>认识架构师</strong>
      <ul><li><a href="#four-questions">几个问题</a></li><li><a href="#architect-role">角色、职责与边界</a></li></ul>
    </section>
    <section class="arch-branch">
      <strong>成为架构师</strong>
      <ul><li><a href="#growth-path">能力模型与成长路径</a></li><li><a href="#decision-methods">思维、原则与决策</a></li></ul>
    </section>
  </div>
</div>

<span id="four-questions"></span>

## 先回答四个问题

> 建议给自己 15–20 分钟，不急着寻找标准答案。

1. 你想成为架构师吗？为什么？
2. 你理想中的架构师是什么样的？现实中见到的又是什么样的？
3. 你认为架构师的必要条件有哪些？
4. 架构师必须是技术专家吗？为什么？

我想借这四个问题打破一个误区：我们经常把“架构师”想象成一个遥远的技术头衔，却忽略了架构设计本来就是研发工作的组成部分。

<span id="architect-role"></span>

## 架构师是一种能力，也可能是一个岗位

我经常听到几种说法：架构必须由专职人员负责；架构师必须是技术大佬；架构师只关注技术架构。

我的看法是，架构设计首先是一种研发基本能力。每个开发者都会在不同范围内拆分职责、组合模块并作出取舍，因此我愿意说：人人都是架构师。

全职架构师则是组织为了应对复杂系统和跨团队协作而设置的岗位。架构能力普遍存在，但这不代表每个团队都需要一名专职架构师。

## 架构师在组织中的位置

在我的理解里，软件架构师处在业务 Leader、产品经理、研发经理、研发人员和软件模块之间。他需要同时理解业务、产品、组织与技术，并对跨角色问题作出取舍。

<div class="arch-grid">
  <section class="arch-card"><h4>业务与产品</h4><div class="arch-nodes"><span class="arch-node blue">业务 Leader</span><span class="arch-node blue">产品经理</span></div></section>
  <section class="arch-card"><h4>组织与实现</h4><div class="arch-nodes"><span class="arch-node blue">研发经理</span><span class="arch-node blue">研发</span><span class="arch-node blue">软件模块</span></div></section>
  <section class="arch-card"><h4>决策中心</h4><div class="arch-nodes"><span class="arch-node green">软件架构师</span></div></section>
</div>

- 业务 Leader 与产品经理之间是多对多协作。
- 一个架构师需要对接多个产品经理和研发经理。
- 一个架构师会服务多个研发人员与多个软件模块。
- 研发人员与软件模块之间是一对多关系。

因此，我不认为只懂技术就足以成为架构师。架构师需要把不同角色的目标翻译成系统约束，再推动团队形成可执行的共同方案。

## 兼职架构师与全职架构师

在我的观察里，兼职架构师通常从团队内部自然产生。他面对内部积累的复杂性和技术债，以业务机会为先，并在实际开发中解决问题。我把这种模式概括为“顺康威定律：机会驱动”。

全职架构师更多出现在异构组织和长期战略场景中。竞争会带来目标的不确定性，跨团队协作也会产生冲突。我把这种模式概括为“逆康威定律：面临冲突”。

全职架构师的工作，可以简述为两点：

1. 一个人驱动一群人的活动。
2. 协调业务、产品和技术等多方活动，解决矛盾并取得平衡。

他还需要持续关注大局、分解系统与职责、对质量属性作取舍、管理技术债务，并提升整个团队的架构能力。

## 架构师总是必要吗

我的答案是不一定。小型研发组织未必需要全职架构师，因为架构和设计能力本来就是开发者的基本能力。

当竞争足够激烈、组织结构复杂、团队缺乏长期视角和顶层设计，或者跨团队合作效率较低时，全职架构师才更可能创造足够大的价值。

> 全职架构师不总是必要的，但架构设计对任何软件组织都是必要的。

## 从程序员开始承担架构职责

我认为，角色的变化不是从获得头衔开始，而是从观察问题的范围扩大开始。面对一个项目，我建议你主动回答下面的问题：

- 利益相关方是谁，主要业务目标是什么？
- 项目的整体解决方案是什么样的？
- 涉及哪些技术？
- 最大的风险是什么，你准备如何克服？
- 如果有机会重新做一遍，你会如何改进？

当你能够持续回答这些问题，关注点就已经从“完成代码”扩展到“保证整个系统产生价值”。接下来需要补齐的，是支撑这种责任的能力。

<span id="growth-path"></span>

## 成长所需的基础条件

我认为架构师既需要深度，也需要广度。除了计算机基础和网络知识，还要理解需求、开发、部署和上线交付的完整软件流程。

大量业务实践同样重要。见得多、经历得多、踩过足够多的坑，才更容易识别系统中的真正约束，并形成技术洞察力和可预见性。

这些经历最终需要沉淀为三种关键能力：

- **技术视野：** 理解技术的深度与广度，并判断技术变化可能带来的影响。
- **协调能力：** 理解利益相关方的目标，推动不同角色共同解决问题。
- **决策能力：** 在成本、风险、质量和交付速度之间作出取舍。

## 广度还是深度

广度型人才需要面对沟通、知识跨度和系统复杂度；专业领域人才则更关注行业深度、技术质量属性和交付速度。

我不赞成在广度和深度之间二选一。更稳妥的路径，是先扎深一个领域，建立解决真实问题的能力，再逐步横向扩展知识和影响范围。

## 能力不只是技术

在分享中，我把大家提到的能力放在了一张词云里。这里既有严肃的能力要求，也保留了一些团队讨论时的调侃。

<div class="arch-panel">
  <div class="arch-chip-cloud">
    <span class="arch-chip">业务技术结合能力</span><span class="arch-chip">可靠</span><span class="arch-chip">深入思考</span>
    <span class="arch-chip">开放</span><span class="arch-chip">善良</span><span class="arch-chip">宏观思维</span>
    <span class="arch-chip">balance</span><span class="arch-chip">会扯皮</span><span class="arch-chip">能背锅就是逆境商</span>
    <span class="arch-chip">任务拆解</span><span class="arch-chip">抗打击能力</span><span class="arch-chip">勇敢</span>
    <span class="arch-chip">深度学习</span><span class="arch-chip">快速学习能力</span><span class="arch-chip">业务能力强</span><span class="arch-chip">感召力</span><span class="arch-chip">感染力</span>
    <span class="arch-chip">号召力</span><span class="arch-chip">取舍能力</span><span class="arch-chip">独立思考</span>
    <span class="arch-chip">全局能力</span><span class="arch-chip">领导能力</span><span class="arch-chip">领袖能力</span><span class="arch-chip">沟通与协调</span>
    <span class="arch-chip">前瞻性</span><span class="arch-chip">抗压</span><span class="arch-chip">决策能力</span>
    <span class="arch-chip">专业能力</span><span class="arch-chip">分解目标</span><span class="arch-chip">知人善用</span><span class="arch-chip">逆向思维</span>
    <span class="arch-chip">落地能力</span><span class="arch-chip">影响力</span><span class="arch-chip">PPT 能力</span><span class="arch-chip">皮厚</span><span class="arch-chip">Trade-off</span>
    <span class="arch-chip">换位思考</span><span class="arch-chip">积极主动</span><span class="arch-chip">接盘侠</span><span class="arch-chip">带领方向的能力</span><span class="arch-chip">甩锅能力</span>
    <span class="arch-chip">思考能力</span><span class="arch-chip">会说话</span><span class="arch-chip">创新能力</span><span class="arch-chip">成本规划</span>
    <span class="arch-chip">协同能力</span><span class="arch-chip">行动力</span><span class="arch-chip">实事求是</span><span class="arch-chip">技术领导力</span>
    <span class="arch-chip">让别人相信你</span><span class="arch-chip">背锅</span><span class="arch-chip">说到做到、不画饼</span>
  </div>
</div>

我把这些词归纳为四类能力：理解业务与技术、分析和决策、沟通与领导、执行与承担责任。架构师的价值不是“知道很多技术”，而是能够推动正确的判断变成结果。

## 才与德

能力决定一个人能否找到方案，品格决定他会把方案带向哪里。因此，我把优秀架构师的品质归纳为“才”与“德”。

<div class="arch-panel">
  <div class="arch-grid">
    <div><h3>才</h3><p><strong>有眼光：</strong>有深度的业务理解，看到好的机会。</p><p><strong>擅思考：</strong>有足够的技术视野，找到正确的技术和组织设计。</p></div>
    <div><h3>德</h3><p><strong style="color:#19d36b">有良知：</strong>为人正直，以企业长期利益优先。</p><p><strong style="color:#19d36b">有勇气：</strong>面对冲突，坚持引导组织做正确的事情。</p></div>
  </div>
</div>

## 始于理性思考，成于科学实践

在我看来，架构师的价值创造来自独立、理性而有深度的思考。好的架构不是凭空发明出来的，而是在持续观察、验证和修正中被发现的。

深度思考意味着求真、保持怀疑、尊重事实和规律，并基于洞察与推理挑战惯性做法。总结则把一次经验转化为下一次决策可以复用的认识。

<div class="arch-panel">
  <ol>
    <li>从业务问题和系统约束中形成假设与设计。</li>
    <li>通过真实实践检验设计，而不是停留在纸面。</li>
    <li>分析结果，修正判断，再进入下一轮实验。</li>
    <li>以是否持续创造价值作为最终标准。</li>
  </ol>
  <div class="arch-equation">假设（设计）➜ 实验 ➜ 结论分析 ➜ <b>价值创造</b><br>↑　设计修正　↵</div>
</div>

长期的感召力来自良知，以及成功经验带来的信心和勇气。架构师既要有判断，也要让组织相信并共同执行这个判断。

## 大公司还是小公司

环境会影响成长机会，但我不认为公司规模本身就是答案。大公司通常提供复杂系统、专业分工和跨团队协作，小公司则更容易让一个人承担完整链路和更宽的职责。

我的建议是：先在研究机构或大公司尽快练出深度，再到小公司拓展广度。真正重要的仍然是思考深度与实战经验，而不是学历、头衔或公司规模。

能力模型解决“凭什么作出判断”，成长方法解决“如何提高判断质量”。当这些能力进入真实项目，最终都会落到架构决策上。

<span id="decision-methods"></span>

## 用 HART 组织架构思维

做架构决策时，我习惯用 HART 提醒自己：先理解人和问题，再选择作出决策的时机、依据与表达方式。

### 以人为本（Human）

我把“以人为本”放在第一位，因为设计的本质是社交。我要理解用户、开发、测试、项目经理和业务人员等利益相关方的要求。尊重并倾听他们的声音，是设计的起点。

### 延迟决策（Ambiguity）

我希望设计决策准确、清晰，但这不意味着越早越好。不到信息成熟的最后一刻，我不会急于作出最终决定。

极简架构只处理高优先级的质量属性。其他决策可以暂时悬置，影响有限的选择也可以留给更接近问题的人处理。

### 善于借鉴（Redesign）

我不会忽视前人的经验。其他团队可能已经遇到相同问题，我会从现有方案开始设计，并复用已经能够解决问题的框架。

### 化虚为实（Tangibility）

只用代码表达架构往往不够直观。我会借助原型、模型和架构图，让抽象方案变得可讨论、可验证，也让不同角色更容易建立共同理解。

## 用三项原则约束决策

HART 帮助我组织思考，我还会用三项原则限制方案的复杂度。

### 合适优于业界领先

我会把团队人数、已有积累和业务场景都当作设计约束。没有足够资源却承担过多目标，没有足够积累却试图一步登天，都会让先进方案变成负担。

### 简单优于复杂

我不会为了高可用、高性能和可扩展等质量属性过度设计，也不会为了“高大上”引入概念庞大的技术。每一份复杂度都应当对应一个真实问题。

### 演进优于一步到位

我会先分析当前业务的主要问题，快速落地并满足需要，再随着业务变化持续完善架构。我不会贪大求全，也不会盲目照搬大公司的做法。

## 把原则落到技术选型

做技术选型时，我最警惕的是为了追新而追新。新并不等于合适，流行也不等于能够解决当前团队的问题。

选择一门技术时，可以依次检查：

1. 是否匹配真实需求。
2. 是否主流，生态和文档是否完善。
3. 是否足够简单。
4. 是否符合系统已有的架构风格。

这份清单背后仍然是同一套判断：我会从人和问题出发，在信息充分时作出合适、简单且可以演进的决策。

## 结语

在我看来，架构师不是技术知识最多的人，也不是负责画图的人。这个角色的核心，是理解复杂问题、协调不同目标、作出取舍，并推动方案在实践中持续创造价值。

成为架构师也不是一次职位变化，而是关注范围、判断质量和责任边界不断扩大的过程。多思考、多总结、多实践，最终比头衔更重要。

## 延伸阅读

- [软件架构实践](/posts/software-architecture-practice/)
- [为什么大部分人做不了架构师？](https://juejin.cn/post/7251779626682023994)
