---
layout: post
title: Git 分支管理
date: 2026-08-09 14:00 +0800
image:
  path: /assets/img/posts/2026-08-09/gitflow-cover-v5.png
tags: [Git, 项目协作]
categories: [项目协作]
---

> 哎，又是记录吵架的一天～

新团队嘛，又遇到了协作问题，争论了几天，好几个人开了两三次会议，实践了几次，效果都不太好。个人认为没有达到统一其实是有一部分认知问题的，接下来详细聊聊这部分相关的知识。

首先，我觉得作为一个合格的程序员应该需要了解 GitFlow，GitFlow 之所以经典和流行，是因为它把遇到的复杂场景都给出了一套解决方案，我也更愿意把分支模型理解成一套**发布秩序**，我们先从 GitFlow 入手。

## GitFlow 到底从哪里来的？

GitFlow 不是 Git 官方制定的标准，它最早来自 Vincent Driessen 在 2010 年发布的文章 [A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)。

2020 年，作者在原文开头补了一段反思：

> “This model was conceived in 2010...”

> “If your team is doing continuous delivery ... adopt a much simpler workflow.”

意思很直接：这个模型诞生于 2010 年。如果团队做的是持续交付，应该考虑 GitHub Flow 这类更简单的工作流；如果软件有明确版本，或者需要同时维护多个已经交付出去的版本，GitFlow 仍然合适。

所以，这段话作者是想告诉各位：GitFlow 可以学，但也不要把它当成不分场景的标准答案。

## GitFlow 的核心：两条主线，三类临时分支

原版 GitFlow 使用 `master`。当然，现在大多数仓库已经改用 `main`了哈，本文也统一写成 `main`，两者没有本质区别。

GitFlow 里面有两条长期存在的主线：

- `main`：保存已经发布、随时可以对应到生产版本的代码。
- `develop`：保存已经完成集成、准备进入下一个版本的代码。

在两条主线之外，还有三类用完就删的辅助分支：

| 分支 | 从哪里创建 | 最后合并到哪里 | 解决什么问题 |
|---|---|---|---|
| `feature/*` | `develop` | `develop` | 隔离一个功能或普通 Bug 的开发过程 |
| `release/*` | `develop` | `main` 和 `develop` | 冻结本次发布范围，集中测试和修复 |
| `hotfix/*` | `main` | `main` 和 `develop` | 绕开未完成的新版本，紧急修复线上问题 |

把它画成一条简化的流向，大概是这样：

```text
feature/* ──┐
feature/* ──┼──> develop ──> release/1.4.0 ──┬──> main ──> tag v1.4.0
feature/* ──┘                                └──> develop（回合并）

main ──> hotfix/1.4.1 ──┬──> main ──> tag v1.4.1
                         └──> develop / 当前 release（回合并）
```

这里重要有三条规则：

1. `main` 只表达已经发布的状态，`develop` 表达下一个版本的状态。
2. `release` 创建以后，本次版本原则上不再接收新功能，只做测试、修 Bug 和版本信息调整。
3. 在 `release` 或 `hotfix` 上做过的修改，必须回到后续开发线，否则下次发布很可能把旧问题重新带回来。

## 举个栗子🌰

假设生产环境当前运行的是 `v1.3.2`，团队正在开发 `v1.4.0`。

### 1. 日常功能从 develop 开始

每个需求从 `develop` 创建自己的分支，例如：

```bash
git switch develop
git switch -c feature/PROJ-123-export-report
```

开发完成后发起 Pull Request 或 Merge Request，通过代码评审和 CI，再合并回 `develop`。没有完成的功能不要为了“赶上版本”先合进去，可以继续留在自己的分支，也可以在具备条件时用 Feature Flag 隐藏。

### 2. 到了提测节点，切出 release 分支

当 `v1.4.0` 计划内的功能已经进入 `develop`，从它创建：

```bash
git switch develop
git switch -c release/1.4.0
```

从这一刻开始，`release/1.4.0` 就代表本次发版范围。测试人员可以围绕它做集成测试、回归测试和验收；开发人员也可以在 `develop` 上继续准备 `v1.5.0`，两边互不阻塞。

`release` 阶段只接受与本次发布有关的修改。突然插进来的普通新需求，哪怕代码已经写完，也应该等下一个版本。否则所谓的“版本冻结”就只剩一个名字。

### 3. 发布时同时收口 main 和 develop

验收通过后，把 `release/1.4.0` 合并到 `main`，并在 `main` 上创建 `v1.4.0` Tag；随后再把 `release/1.4.0` 合并回 `develop`，带回测试阶段产生的修复，最后删除 release 分支。

```bash
git switch main
git merge --no-ff release/1.4.0
git tag -a v1.4.0 -m "Release v1.4.0"

git switch develop
git merge --no-ff release/1.4.0
git branch -d release/1.4.0
```

原版 GitFlow 推荐 `--no-ff`，是为了保留这次功能或发布分支的边界。实际团队也可以统一使用 Squash Merge、Rebase Merge 或普通 Merge，但最好只选一种，保证历史记录和回滚方式一致。

### 4. 线上出问题，从 main 拉 hotfix

假设 `v1.4.0` 上线后发现一个严重问题，而 `develop` 已经混入不少 `v1.5.0` 的代码。这时不能直接拿 `develop` 去修生产，应该从 `main` 创建：

```bash
git switch main
git switch -c hotfix/1.4.1
```

修复验证完成后，合并到 `main` 并打 `v1.4.1` Tag，同时合并回 `develop`。如果此时还有一个正在测试的 `release` 分支，也要保证修复进入它。GitFlow 原文的处理是优先合入当前 `release`，等 release 结束时再自然回到 `develop`。

Hotfix 最容易犯的错，是线上虽然修好了，开发线却没有修。短期看任务已经结束，等下一个版本从 `develop` 发布时，同一个 Bug 又会出现一次。

## 多个环境怎么和分支对应？

不少团队会把 `alpha`、`beta`、`staging/rc`、`prod` 都建成分支，看起来和环境一一对应，很整齐。但要先分清两个概念：

- 分支表示的是一条代码演进线。
- 环境表示的是一个部署目标。

二者可以建立触发关系，却不是一回事。GitLab 的环境文档也把 environment 定义为开发、测试、预发布、生产这类部署目标，并单独记录“什么代码部署到了哪里”。详见 [GitLab Environments](https://docs.gitlab.com/ci/environments/)。

我之前公司的做法：

| 环境 | 建议来源 | 用途 |
|---|---|---|
| Review / 临时环境 | `feature/*` 或合并请求 | 产品、测试提前查看单个需求 |
| Dev / Integration | `develop` | 验证下个版本的集成状态 |
| Rc / Staging | `release/*`，以及最终发布 Tag | 做版本级回归、验收和发布前检查 |
| Production | `main` 上的正式 Tag | 部署可追溯的正式版本 |

这里有两个细节很重要：

第一，`release` 分支可以产生候选构建，但正式发布最好从 `main` 上的 Tag 生成不可变构建产物，再让同一份产物依次经过 Staging 和 Production。不要每换一个环境就重新编译一次，否则测试通过的东西和最后上线的东西可能已经不是同一份。

第二，环境差异应该放在配置、密钥和部署参数里，不要靠修改不同环境分支里的代码来维持。否则 `test` 合到 `staging`、`staging` 再合到 `prod` 时，既容易带入环境配置，也很难说清某个提交到底在哪里。

当然，环境分支并不是绝对不能用。[GitLab Flow](https://about.gitlab.com/topics/version-control/what-is-gitlab-flow/) 也允许增加 `production`、`stable` 或多个预生产分支，让提交按环境向下游流动。它适合已经形成这种发布审批链的团队，只是这属于 GitLab Flow 的选择，不是经典 GitFlow 本身的要求。

## GitFlow 和敏捷开发

### 固定迭代、集中发版

如果团队采用两周一个迭代，迭代末尾统一提测、回归和上线，GitFlow 很容易对齐：需求在 `feature` 开发，进入 `develop` 完成集成，到版本冻结时切 `release`。测试 `release` 的同时，下个 迭代还能继续在 `develop` 开发。

这种模式常见于Web端、移动端、桌面软件、私有化交付的产品，以及上线前必须走完整验收流程的系统。

### 看板模式或持续部署

如果一个需求完成后就应该立即上线，一天可能部署很多次，完整 GitFlow 往往太重。代码每次都要经过 `feature -> develop -> release -> main`，会产生很多没有实际价值的等待和重复合并。

这类团队更适合 GitHub Flow 或 Trunk-Based Development：从 `main` 拉一个很短的分支，通过评审和测试后尽快合回 `main`，再由流水线逐步部署。GitFlow 作者在 2020 年的反思，主要说的就是这个场景。

DORA 对主干开发的建议也很明确：分支保持短命，至少每天合并一次，尽量避免长期代码冻结。可以参考 [DORA：Trunk-based development](https://dora.dev/capabilities/trunk-based-development/)。

### 多版本并行维护

如果客户现场同时运行 `v1.x`、`v2.x`，或者产品存在 LTS 版本，仅有 `main` 和 `develop` 还不够。通常需要增加 `release/1.x`、`release/2.x` 这类维护分支，修复先进入主开发线，再按需 backport 或 cherry-pick 到仍受支持的版本。

这种场景反而是 GitFlow、Release Flow 更有价值的地方：它们愿意用更多分支和合并成本，换取多个版本之间清晰的边界。

## 几家标杆公司的公开做法

当然，大公司内部通常不止一种研发模式，但他们对外明确说明的工作流，大多数是最佳实践，我们可以看下他们是怎么玩的。

| 企业 / 体系 | 公开做法 | 背后的发布方式 |
|---|---|---|
| GitHub | [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)：从默认分支创建短分支，提交 PR，评审和检查通过后合并，再删除分支 | 流程轻，适合频繁集成和频繁交付 |
| Microsoft | [Microsoft Release Flow](https://learn.microsoft.com/en-us/devops/develop/how-microsoft-develops-devops)：短期 topic 分支进入 `main`，`main` 始终可构建；到迭代或重大版本节点再创建 release 分支 | 主干开发配合定时发布，文档中的团队通常按三周迭代发版，并使用 Feature Flag 和渐进式部署 |
| GitLab | [GitLab Flow](https://about.gitlab.com/topics/version-control/what-is-gitlab-flow/)：功能和修复先进入 `main`，按需要增加 production、stable、预生产或版本分支 | 在 GitHub Flow 和 GitFlow 之间折中，兼顾持续交付、多环境和多版本维护 |

看完之后，发现标杆企业也并没有统一照搬完整 GitFlow。他们是保留“短分支开发、发布时建立边界、线上修复必须回到后续版本”这些思想，然后减少长期分支。

Microsoft 的做法是比较有意思的：它同样会在迭代结束时切 release 分支，但没有长期 `develop`；release 分支也不再合回 `main`，而是要求修复先进入 `main`，再 cherry-pick 到对应 release。它解决的问题和 GitFlow 很像，只是合并方向正好换了一种设计。

## 不变的规则

不管 GitFlow、GitHub Flow 还是主干开发，有些规则比给分支起什么名字更重要：

1. **保护长期分支。** `main`、`develop` 和仍在维护的 `release` 禁止直接 Push，统一通过 PR/MR 合并。
2. **让 CI 成为合并门禁。** 编译、单元测试、静态检查、安全扫描不过，不允许合并；不要等代码进了 `develop` 才第一次跑完整检查。
3. **缩短 feature 分支寿命。** 一个分支最好只解决一件事。需求太大就拆小，用 Feature Flag 隔离未开放功能，别让分支存活几个星期。
4. **release 创建后冻结范围。** 只接收阻塞发布的问题，不临时塞普通需求。谁有权创建 release、谁有权批准上线，也应该写清楚。
5. **Hotfix 必须回流。** 线上修复完成不等于任务完成；确认 `main`、`develop` 以及仍受支持的版本都已包含修复，才算真正结束。
6. **Tag 和构建产物都不可变。** 正式版本用带版本号的 Tag 对应唯一提交，产物记录 Commit SHA、Tag 和构建编号，已经发布的 Tag 不移动、不覆盖。
7. **同一份产物逐级晋级。** 环境只改变配置和部署权限，不重新生成另一份“看起来版本号相同”的包。
8. **定期清理分支。** 合并后自动删除临时分支，对长期未更新的分支设置提醒。分支越多，不代表管理越专业，很多时候只代表没人敢删。

## 结语

如果团队目前是“多个环境 + 两周迭代 + 集中发版 + 偶尔 Hotfix”，完整 GitFlow 是一套容易理解、也比较稳妥的起点。如果是 Web 服务持续部署，建议从 `main + 短期功能分支 + PR + Feature Flag` 开始，如果你面的场景比较简单，可以参照 [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow)、[Microsoft Release Flow](https://learn.microsoft.com/en-us/devops/develop/how-microsoft-develops-devops)、[GitLab Flow](https://about.gitlab.com/topics/version-control/what-is-gitlab-flow/)。

不得不承认的是：分支越多，合并路径就越多，团队要承担的认知成本也越高，但好的分支模型应该是任何人都能马上回答四个问题：我应该从哪里开始改，改完合到哪里，这段代码什么时候能上线，线上出问题以后怎样保证所有后续版本都不会再犯。
