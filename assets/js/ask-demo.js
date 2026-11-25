/* Ajie's 思源地 ask demo.
   Interactive prototype only: scripted replies, no model and no retrieval.
   Questions stay in sessionStorage. The URL never receives the question text. */
(function () {
  "use strict";

  var STORE_KEY = "ajie-ask-demo-v1";
  var PENDING_KEY = "ajie-ask-pending";
  var CLEAR_HOME_KEY = "ajie-ask-clear-home";
  var DISCLAIMER = "交互原型，回答为演示内容，未接入真实问答";

  var runtime = document.body.getAttribute("data-ask-runtime") || "site";
  var active = null;
  var sendGuard = false;
  var followAnswer = true;
  var scrollLock = 0;

  var INTENTS = [
    {
      id: "who",
      label: "你是谁",
      keys: ["你是谁", "自我介绍", "介绍一下你", "介绍下你", "霍世杰", "关于你", "你是做什么"],
      sources: [
        { title: "关于", url: "/about/" },
        { title: "新启程—开篇", url: "/posts/new-beginning/" }
      ],
      text:
        "我是霍世杰。下面只转述已经发布的关于页，不是这次对话新查到的经历。\n\n关于页里的介绍是：从业 9 年，过去是 CV 工程师，如今自称为 AI Agent 指挥家；核心做后端，后来延伸到前端，专注设计和优化架构，近两年也兼着产品和运维，称之为全栈。参与过的产品写了 Worktile、PingCode、NocoBase。\n\n同一页还写了价值观：人和人能不能长久连接，取决于三观；思考和行事看重哲学思维和科学精神，比如先看前提、求真务实。讨厌虚伪，也讨厌不考虑前提和验证就给人和事定性。兴趣一节写的是书法，自娱自乐。\n\n博客叫「Ajie's 思源地」，副标题是「保持好奇，持续学习」。"
    },
    {
      id: "values",
      label: "价值观",
      keys: ["价值观", "三观", "讨厌什么", "哲学思维"],
      sources: [{ title: "关于", url: "/about/" }],
      text:
        "关于页的「我的价值观」写了三层意思。人和人能不能连接得长久，取决于三观。思考和行事的底层是哲学思维和科学精神：遇到问题先辩证看，先保持怀疑，弄清前提和原因；做事求真务实。讨厌虚伪，也讨厌不考虑前提和验证就片面定性。\n\n演示回答只复述这一节，没有补充关于页以外的事例。"
    },
    {
      id: "calligraphy",
      label: "书法",
      keys: ["书法"],
      sources: [{ title: "关于", url: "/about/" }],
      text:
        "关于页的兴趣只写了一句：「书法，自娱自乐」，并放了一张书法图片。公开介绍里没有师承、年限或其他经历，演示回答不补这些。"
    },
    {
      id: "origin",
      label: "思源地",
      keys: ["思源地", "为什么叫", "博客名字", "站名", "这个名字"],
      sources: [
        { title: "新启程—开篇", url: "/posts/new-beginning/" },
        { title: "关于", url: "/about/" }
      ],
      text:
        "站点名字是「Ajie's 思源地」，副标题是「保持好奇，持续学习」。已发布的《新启程—开篇》里有一句：「这个博客作为自己的思源地，同时也记录一些有深度的文章，也可能转载一些之前在其他平台写过的笔记」。\n\n演示稿只引用这句，不另外编一个名字由来。"
    },
    {
      id: "developers",
      label: "这个时代的开发者",
      keys: ["开发者", "程序员已死", "vibe", "vibe coding", "什么样的程序员", "软件工程师"],
      sources: [{ title: "这个时代到底需要什么样的开发者？", url: "/posts/developers-in-the-ai-era/" }],
      text:
        "这是置顶文章《这个时代到底需要什么样的开发者？》里的看法，演示回答只转述原文要点。\n\n文章从「前端已死、设计已死、后端已死、程序员已死」这类说法写起，认为把「一部分工作可以自动化，一个岗位可能不再需要那么多人」直接说成「这个专业已经没有价值」，中间跳了步。文中把态度分成不放心 AI、愿意用但关键处要亲自把关，以及准备把整个开发交给 AI。\n\n核心判断是：实现可以交给工具，但把问题想清楚、让系统正确表达业务、检查是否可靠、出了故障能找到原因，这些仍然在。只凭「我会写代码」，已经很难完整解释自己的价值。文章也写了，这些案例回答不了岗位最终会增加还是减少多少。\n\n演示稿没有把原文后半的数据模型、错误处理和查询例子再展开。"
    },
    {
      id: "taste",
      label: "AI 味儿",
      keys: ["ai味", "ai 味", "don't make me think", "别让我思考", "生成式文案", "引导说明"],
      sources: [{ title: "软件的 AI 味儿——Don't make me think", url: "/posts/ai-taste-dont-make-me-think/" }],
      text:
        "《软件的 AI 味儿——Don't make me think》谈的不是配色或圆角，而是生成式文案和引导说明太多。原文的观察是：打开一个刚做出来的产品，空白处先来一段自我介绍，按钮旁边跟着解释，助手还没等你开口，就已经列出它能做的十件事。怪，往往怪在话太多，不是功能太少。\n\n文章引用 Steve Krug：好的界面应当显而易见；每个页面先去掉一半文字，再把剩下的去掉一半。观点是别用说明去补交互。一个按钮如果需要一段话才能解释清楚，问题多半在按钮。\n\n后半还写到，生成变快以后，把软件打磨到好用仍然不容易。少一点 AI 味儿，是让下一步显而易见。"
    },
    {
      id: "architect",
      label: "架构师",
      keys: ["架构师", "怎么看架构", "hart"],
      sources: [
        { title: "漫谈架构师", url: "/posts/talking-about-architects/" },
        { title: "软件架构实践", url: "/posts/software-architecture-practice/" }
      ],
      text:
        "《漫谈架构师》开头建议先读《软件架构实践》。这篇想聊的是为什么需要架构师，以及一个开发者如何逐步具备架构能力。\n\n文章先放了四个问题：想不想成为架构师、理想和现实里的架构师、必要条件、架构师是否必须是技术专家。它想打破的误区是，把架构师想成一个遥远的头衔，却忽略架构设计本来就是研发工作的一部分。文首的摘要还写到，后文会谈角色与职责、能力模型、成长路径、HART 思维、架构原则和技术选型。\n\n演示回答停在这个入口，不把后文复述成另一篇文章。"
    },
    {
      id: "simon",
      label: "西蒙学习法",
      keys: ["西蒙", "一万小时", "刻意练习", "学习法"],
      sources: [{ title: "西蒙学习法和一万小时定律", url: "/posts/simon-learning-method-and-10000-hour-rule/" }],
      text:
        "《西蒙学习法和一万小时定律》把两件事分开，而且写明科普部分参考了 AI。演示回答只转述这篇里的区分，不另加作者本人的练习时长。\n\n文章说，中文里流行的西蒙学习法通常被总结成：选定方向，把知识拆小，持续专注，一个有基础的人可以在大约六个月掌握一门学问。它同时注明，这更像后来的通俗总结，不是西蒙本人颁布的一套标准步骤。西蒙更明确的贡献，是和蔡斯一起研究的「组块」和模式识别。\n\n一万小时定律被文章写成专业能力为什么无法完全速成，而不是「堆满时间就会成为专家」。它强调艾利克森说的刻意练习：目标具体、略高于当前水平、针对薄弱处、有反馈、按反馈改正。按每天三小时估算，一万小时大约九年，文章把这个数字当作常见换算，不是作者自己的经历。\n\n放在一起：西蒙学习法谈有限时间里建立知识结构，一万小时谈长期精进。两者不是二选一。"
    },
    {
      id: "interview",
      label: "面试",
      keys: ["面试", "招聘", "怎么招"],
      sources: [{ title: "我是如何面试程序员的", url: "/posts/how-i-interview-programmers/" }],
      text:
        "《我是如何面试程序员的》里，作者说自己很少把面试总结成一份题单。简单说是看能不能聊得来；多一点是看技术、沟通、协作，以及和团队合不合得来。文章声明，这些只基于个人所见所闻。\n\n文中把考察分成硬技能和软实力。硬技能主要是专业知识和智力，看能不能把事情做出来；软实力包括沟通、协作、学习、责任心、价值观，以及遇到困难时的表现。态度上引用了前公司 CEO 的「找对的人，做对的事」，并写明不赞成面试官靠考倒对方来显示优越感。\n\n演示回答不补充文章里没有的通过率或人数。"
    },
    {
      id: "ddd",
      label: "领域驱动设计",
      keys: ["ddd", "领域驱动", "分层架构"],
      sources: [{ title: "领域驱动设计实践总结", url: "/posts/domain-driven-design-and-layered-architecture/" }],
      text:
        "《领域驱动设计实践总结》把 DDD 写成围绕业务来设计软件的方法：开发者和熟悉业务的人一起弄清概念、流程和规则，再变成代码里的模型。\n\n开头的三个关键词是领域、模型、驱动。领域就是软件要处理的那部分业务。模型是把业务里重要的对象、关系和限制整理出来，不必照搬所有细节。驱动是按这套模型来设计代码，一条规则变了，应该知道去哪里改。\n\n文章接着用「大家都说客户，但销售、财务和开发指的可能不是同一件事」说明为什么要把规则收成同一套模型。演示回答只到这个开头。"
    },
    {
      id: "cordis",
      label: "Cordis",
      keys: ["cordis", "可逆性", "插件系统", "deepseek harness"],
      sources: [
        { title: "DeepSeek Harness 的底层基石——Cordis（一）", url: "/posts/cordis-plugin-guide/" },
        { title: "解读 DeepSeek Harness Cordis 的可逆性及生命周期", url: "/posts/cordis-reversibility/" }
      ],
      text:
        "博客里已经发布了两篇 Cordis 笔记，演示回答只说两篇开头已经写明的部分。\n\n《DeepSeek Harness 的底层基石——Cordis（一）》引用作者的解释：Cordis 是元框架，用来构建框架；名字来自拉丁语的「心」。它不绑定具体业务，提供的是插件系统，并希望做到可逆性。文中也引用了 DeepSeek Harness 的说明：工具、模型适配、文件访问，直到 agent loop，都可以是挂到共享上下文上的插件。\n\n下一篇《解读 DeepSeek Harness Cordis 的可逆性及生命周期》把可逆性说成回收资源的能力：插件可以安全加入，也可以完整移除，而且移除之后不留下脏状态。\n\n演示稿不往下复述源码。"
    },
    {
      id: "blogging",
      label: "为什么写博客",
      keys: ["还有必要写博客", "写博客吗", "为什么写博客", "博客还有必要", "ai时代写博客", "ai 时代写博客"],
      sources: [{ title: "AI 时代，还有必要写博客吗？", url: "/posts/ai-era-blogging/" }],
      text:
        "《AI 时代，还有必要写博客吗？》的结论是：要写，但方式可以变。\n\n文章认为博客首先是写给自己的，用来理清知识点、强化记忆、留下技术足迹；它更像自己的技术手册。AI 可以起草、检查逻辑、润色语言，但不能代替理解、试错过程和文章结构。核心内容仍然要自己做主。\n\n最后一句的意思是：可以不写给别人看的博客，但至少写给自己看的技术笔记。"
    },
    {
      id: "blog",
      label: "博客写什么",
      keys: ["博客写什么", "博客里有什么", "哪些文章", "写些什么", "主要写什么", "有什么文章", "博客主要", "这个博客"],
      sources: [
        { title: "软件的 AI 味儿——Don't make me think", url: "/posts/ai-taste-dont-make-me-think/" },
        { title: "这个时代到底需要什么样的开发者？", url: "/posts/developers-in-the-ai-era/" },
        { title: "漫谈架构师", url: "/posts/talking-about-architects/" },
        { title: "领域驱动设计实践总结", url: "/posts/domain-driven-design-and-layered-architecture/" }
      ],
      text:
        "这是霍世杰的技术博客「Ajie's 思源地」。已发布文章里，首页现在能看到程序人生和架构，例如 AI 时代的开发者、软件的 AI 味儿、架构师、领域驱动设计，也有 Cordis、面试和学习方法。更早的笔记覆盖前端、后端、数据库和工程化。置顶的是《这个时代到底需要什么样的开发者？》《漫谈架构师》《RxJS 全面解析》和《PingCode Wiki 权限设计之ACL》。\n\n分类、标签和归档仍是原来的入口。演示回答不报篇数，这样就不会把未发布的草稿算进去。"
    },
    {
      id: "acl",
      label: "ACL",
      keys: ["acl", "页面权限", "权限设计"],
      sources: [{ title: "PingCode Wiki 权限设计之ACL", url: "/posts/pingcode-wiki-acl-permission-design/" }],
      text:
        "置顶文章《PingCode Wiki 权限设计之ACL》写的是 PingCode Wiki 的页面权限。开头说 2021 年 Wiki 加了协同编辑、页面权限、表情符号等能力。作者之前写过 Worktile 的 RBAC，这一篇改讲 Wiki 页面权限选用的 ACL（Access Control List），并用 Linux 的权限作为对照。\n\n正文分成 ACL 介绍、为什么这样选、以及设计实现。演示回答不往下复述实现细节。"
    },
    {
      id: "rxjs",
      label: "RxJS",
      keys: ["rxjs"],
      sources: [{ title: "RxJS 全面解析", url: "/posts/rxjs-complete-guide/" }],
      text:
        "《RxJS 全面解析》是一篇置顶长文。前言写的是：哪怕还没有了解过 RxJS，也可以从零看；作者希望带着问题来的人能找到答案，并提醒文章较长，适合收藏反复看。\n\n概览里，作者把自己的学习过程写成先会基本使用，再研究部分操作符，最后才看背景、设计思想和实现。演示稿不逐个转述操作符。"
    },
    {
      id: "mentor",
      label: "导师",
      keys: ["导师", "带教", "带新人"],
      sources: [{ title: "如何做好一个导师", url: "/posts/being-a-good-mentor/" }],
      text:
        "《如何做好一个导师》写的是带新人，不是分配完任务就结束。文章列出的目标是：帮新人融入团队，发掘潜能，让人在工作里找到归属感。具体做法从第一次自我介绍、认识团队、同步协作方式写起。\n\n演示回答只保留这个开头，后面的步骤请直接看原文。"
    },
    {
      id: "git",
      label: "Git 分支",
      keys: ["gitflow", "git 分支", "分支管理", "分支模型"],
      sources: [
        { title: "Git 分支管理", url: "/posts/gitflow-branch-management/" },
        { title: "Git 分支与部署环境", url: "/posts/git-branches-and-environments/" }
      ],
      text:
        "《Git 分支管理》从团队协作里的分歧写起，把 GitFlow 理解成一套发布秩序，而不是 Git 官方标准。文章说明这套模型来自 Vincent Driessen 2010 年的文章，并提到作者在 2020 年补充过：如果团队在做持续交付，应该用更简单的工作流。\n\n相关的还有一篇已发布的《Git 分支与部署环境》。演示回答不展开两篇里的流程表。"
    },
    {
      id: "hello",
      label: "打招呼",
      keys: [],
      sources: [{ title: "关于", url: "/about/" }],
      text:
        "你好。这里是「Ajie's 思源地」的演示对话，没有接入模型，也不会假装刚刚检索了全站。\n\n可以直接问「你是谁」，或者问一篇已经发布的文章，比如这个时代的开发者、AI 味儿、架构师、西蒙学习法。"
    }
  ];

  var CONTINUATIONS = ["继续", "展开说说", "展开", "再说详细点", "详细一点", "多说一点", "然后呢", "继续说", "再讲讲"];

  function norm(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function nid(prefix) {
    return prefix + Math.random().toString(36).slice(2, 10);
  }

  function loadStore() {
    try {
      var data = JSON.parse(sessionStorage.getItem(STORE_KEY) || "");
      if (!data || typeof data !== "object" || !data.sessions) throw new Error("empty");
      return data;
    } catch (error) {
      return { sessions: {}, currentId: null };
    }
  }

  function saveStore(store) {
    var ids = Object.keys(store.sessions);
    if (ids.length > 10) {
      ids
        .sort(function (a, b) {
          return (store.sessions[a].updatedAt || 0) - (store.sessions[b].updatedAt || 0);
        })
        .slice(0, ids.length - 10)
        .forEach(function (id) {
          delete store.sessions[id];
        });
    }
    sessionStorage.setItem(STORE_KEY, JSON.stringify(store));
  }

  function hrefFor(path) {
    if (!path) return "#";
    if (/^https?:/i.test(path)) return path;
    var base = document.body.getAttribute("data-ask-link-base") || "";
    return base + path;
  }

  function askPageUrl() {
    var hero = document.getElementById("ask-hero");
    var app = document.getElementById("ask-app");
    return (hero && hero.getAttribute("data-ask-url")) || (app && app.getAttribute("data-ask-url")) || "/ask/";
  }

  function shanghaiHour() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      hour: "numeric",
      hourCycle: "h23"
    }).formatToParts(new Date());
    var hour = parts.filter(function (part) { return part.type === "hour"; })[0];
    return Number(hour && hour.value);
  }

  function greetingText() {
    var hour = shanghaiHour();
    if (hour >= 5 && hour < 12) return "上午好";
    if (hour >= 12 && hour < 18) return "下午好";
    return "晚上好";
  }

  function applyGreeting() {
    var text = greetingText();
    ["ask-hero-title", "ask-greet"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = text;
    });
  }

  function adoptSession(id) {
    var next = Object.assign({}, history.state || {}, { askSessionId: id });
    if (runtime === "file") next.askView = "ask";
    var url = runtime === "file" ? location.pathname : location.pathname + location.search;
    history.replaceState(next, "", url);
  }

  function resolveSessionId() {
    var store = loadStore();
    var stateId = history.state && history.state.askSessionId;
    if (stateId) return stateId;
    if (runtime === "file") return null;
    var pending = sessionStorage.getItem(PENDING_KEY);
    if (pending && store.sessions[pending]) {
      sessionStorage.removeItem(PENDING_KEY);
      adoptSession(pending);
      return pending;
    }
    return null;
  }

  function createSession(text) {
    var store = loadStore();
    var id = nid("s");
    store.sessions[id] = {
      id: id,
      updatedAt: Date.now(),
      messages: [{ id: nid("m"), role: "user", text: text }]
    };
    store.currentId = id;
    saveStore(store);
    return id;
  }

  function appendUser(sessionId, text) {
    var store = loadStore();
    var session = store.sessions[sessionId];
    var message = { id: nid("m"), role: "user", text: text };
    session.messages.push(message);
    session.updatedAt = Date.now();
    store.currentId = sessionId;
    saveStore(store);
    return message;
  }

  function scoreIntent(text, intent) {
    if (!intent.keys.length) return 0;
    var normalized = norm(text);
    var score = 0;
    intent.keys.forEach(function (key) {
      var needle = norm(key);
      if (needle && normalized.indexOf(needle) !== -1) score += needle.length;
    });
    return score;
  }

  function bestIntent(text) {
    var best = null;
    var bestScore = 0;
    INTENTS.forEach(function (intent) {
      if (intent.id === "hello") return;
      var score = scoreIntent(text, intent);
      if (score > bestScore) {
        best = intent;
        bestScore = score;
      }
    });
    return best;
  }

  function isGreeting(text) {
    var normalized = norm(text).replace(/[！!。.?？~～,，]/g, "");
    return ["你好", "您好", "嗨", "hi", "hello", "在吗", "早上好", "晚上好"].indexOf(normalized) !== -1;
  }

  function isContinuation(text) {
    var normalized = norm(text).replace(/[！!。.?？~～]/g, "");
    return CONTINUATIONS.some(function (phrase) {
      return normalized === norm(phrase);
    });
  }

  function previousAssistant(session) {
    var messages = session.messages || [];
    for (var i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "assistant" && messages[i].intent) return messages[i];
    }
    return null;
  }

  function composeAnswer(text, session) {
    if (isGreeting(text)) {
      var hello = INTENTS.filter(function (intent) {
        return intent.id === "hello";
      })[0];
      return { intent: hello.id, label: hello.label, sources: hello.sources, text: hello.text };
    }
    var intent = bestIntent(text);
    if (intent) {
      return { intent: intent.id, label: intent.label, sources: intent.sources, text: intent.text };
    }
    if (isContinuation(text)) {
      var previous = previousAssistant(session);
      if (!previous) {
        return {
          intent: "continue",
          label: "继续",
          sources: [],
          text: "还没有上一条演示回答可以展开。先问一个具体问题，例如「你是谁」或「架构师」。"
        };
      }
      var title = previous.sources && previous.sources[0] ? previous.sources[0].title : "上一篇";
      return {
        intent: "continue",
        label: "继续",
        sources: previous.sources || [],
        text:
          "演示稿里「" +
          (previous.label || "上一个问题") +
          "」只准备了一段回答，没有第二段隐藏内容。要看展开，直接打开《" +
          title +
          "》。这次仍然不是实时检索。"
      };
    }
    return {
      intent: "unknown",
      label: "未收录的问题",
      sources: [
        { title: "软件的 AI 味儿——Don't make me think", url: "/posts/ai-taste-dont-make-me-think/" },
        { title: "这个时代到底需要什么样的开发者？", url: "/posts/developers-in-the-ai-era/" },
        { title: "漫谈架构师", url: "/posts/talking-about-architects/" }
      ],
      text:
        "这句话没有对应的演示稿。这个页面不会去检索博客，也没有接入模型，所以不会编一段像实时回答的内容，也不会补充作者没有公开写过的经历或数字。\n\n如果只是想从博客里接着看，下面三篇都是已经发布的文章。也可以换一个更接近现有文章的问法，比如「你是谁」「AI 味儿」「架构师」「西蒙学习法」。"
    };
  }

  function showHint(which, message) {
    var id = which === "chat" ? "ask-chat-hint" : which === "empty" ? "ask-empty-hint" : "ask-hero-hint";
    var el = document.getElementById(id);
    if (el) el.textContent = message || "";
  }

  function setStatus(message) {
    var el = document.getElementById("ask-status");
    if (el) el.textContent = message || "";
  }

  function chatIsActive() {
    if (!document.getElementById("ask-app")) return false;
    if (runtime !== "file") return true;
    var view = document.getElementById("view-ask");
    return !view || !view.hidden;
  }

  function setGeneratingUI(on) {
    var stop = document.getElementById("ask-stop");
    var send = document.getElementById("ask-chat-send");
    if (stop) stop.hidden = !on;
    if (send) send.setAttribute("aria-disabled", on ? "true" : "false");
    document.querySelectorAll("#ask-app [data-ask-suggest]").forEach(function (button) {
      button.disabled = on;
    });
  }

  function linkElement(source) {
    var anchor = document.createElement("a");
    anchor.href = hrefFor(source.url);
    anchor.textContent = source.title;
    if (runtime === "file") {
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
    }
    return anchor;
  }

  function fillSources(sources, message) {
    var hasSources = message.sources && message.sources.length && !message.pending;
    sources.hidden = !hasSources;
    sources.replaceChildren();
    if (!hasSources) return;
    var list = document.createElement("ul");
    message.sources.forEach(function (source) {
      var item = document.createElement("li");
      item.appendChild(linkElement(source));
      list.appendChild(item);
    });
    sources.appendChild(list);
  }

  function renderMessage(message) {
    var article = document.createElement("article");
    article.className = "ask-msg ask-msg-" + message.role;
    article.dataset.id = message.id;

    var bubble = document.createElement("div");
    bubble.className = "ask-bubble";
    var text = document.createElement("div");
    text.className = "ask-bubble-text";
    text.textContent = message.text || "";
    bubble.appendChild(text);

    if (message.role === "user") {
      article.appendChild(bubble);
      return article;
    }

    var pending = document.createElement("p");
    pending.className = "ask-pending";
    pending.textContent = "正在生成";
    pending.hidden = !(message.pending && !message.text);
    bubble.insertBefore(pending, text);

    var stopped = document.createElement("p");
    stopped.className = "ask-stopped";
    stopped.textContent = "已停止";
    stopped.hidden = !message.stopped;
    bubble.appendChild(stopped);

    var sources = document.createElement("div");
    sources.className = "ask-sources";
    fillSources(sources, message);
    bubble.appendChild(sources);
    article.appendChild(bubble);
    return article;
  }

  function renderSession(session) {
    var box = document.getElementById("ask-messages");
    var empty = document.getElementById("ask-empty");
    if (!box) return;
    var messages = session && session.messages ? session.messages : [];
    box.replaceChildren();
    messages.forEach(function (message) {
      box.appendChild(renderMessage(message));
    });
    var hasMessages = messages.length > 0;
    var thread = document.getElementById("ask-thread");
    var composer = document.getElementById("ask-chat-form");
    var app = document.getElementById("ask-app");
    if (empty) empty.hidden = hasMessages;
    if (thread) thread.hidden = !hasMessages;
    if (composer) composer.hidden = !hasMessages;
    if (app) app.setAttribute("data-ask-state", hasMessages ? "chat" : "empty");
    var last = box.lastElementChild;
    if (last && messages.length && followAnswer) reveal(last);
  }

  function nearBottom() {
    var doc = document.documentElement;
    return doc.scrollHeight - (window.scrollY + window.innerHeight) < 180;
  }

  function reveal(node) {
    if (!node) return;
    scrollLock += 1;
    node.scrollIntoView({ block: "nearest" });
    window.requestAnimationFrame(function () {
      scrollLock = Math.max(0, scrollLock - 1);
    });
  }

  function paintAssistant(message) {
    var node = document.querySelector('#ask-messages [data-id="' + message.id + '"]');
    if (!node) return false;
    var text = node.querySelector(".ask-bubble-text");
    var pending = node.querySelector(".ask-pending");
    var stopped = node.querySelector(".ask-stopped");
    var sources = node.querySelector(".ask-sources");
    if (text) text.textContent = message.text || "";
    if (pending) pending.hidden = !(message.pending && !message.text);
    if (stopped) stopped.hidden = !message.stopped;
    if (sources) fillSources(sources, message);
    if (followAnswer) reveal(node);
    return true;
  }

  function stopTimer() {
    if (active && active.timer) window.clearInterval(active.timer);
    if (active) active.timer = 0;
  }

  function haltActive(markStopped) {
    if (!active) return;
    var sessionId = active.sessionId;
    var assistantId = active.assistantId;
    stopTimer();
    active = null;
    setGeneratingUI(false);
    if (!markStopped) return;
    var store = loadStore();
    var session = store.sessions[sessionId];
    if (!session) return;
    var assistant = session.messages.filter(function (message) {
      return message.id === assistantId;
    })[0];
    if (assistant && assistant.pending) {
      assistant.pending = false;
      assistant.stopped = true;
      session.updatedAt = Date.now();
      saveStore(store);
    }
  }

  function startGeneration(sessionId, userMessageId) {
    if (active && active.sessionId === sessionId && active.userMessageId === userMessageId) return;
    haltActive(false);
    var store = loadStore();
    var session = store.sessions[sessionId];
    if (!session) return;
    var userMessage = session.messages.filter(function (message) {
      return message.id === userMessageId;
    })[0];
    if (!userMessage) return;
    var existing = null;
    session.messages.forEach(function (message) {
      if (message.role === "assistant" && message.replyTo === userMessageId) existing = message;
    });
    if (existing && !existing.pending) {
      renderSession(session);
      setGeneratingUI(false);
      return;
    }
    var answer = composeAnswer(userMessage.text, session);
    if (!existing) {
      existing = {
        id: nid("m"),
        role: "assistant",
        replyTo: userMessageId,
        text: "",
        pending: true,
        stopped: false,
        intent: answer.intent,
        label: answer.label,
        sources: answer.sources
      };
      session.messages.push(existing);
      session.updatedAt = Date.now();
      saveStore(store);
    }
    var full = answer.text;
    var index = existing.text ? existing.text.length : 0;
    active = {
      sessionId: sessionId,
      userMessageId: userMessageId,
      assistantId: existing.id,
      timer: 0
    };
    setGeneratingUI(true);
    followAnswer = true;
    setStatus(index ? "继续生成" : "正在生成");
    renderSession(loadStore().sessions[sessionId]);
    var questions = document.querySelectorAll("#ask-messages .ask-msg-user");
    var question = questions[questions.length - 1];
    var chatInput = document.getElementById("ask-chat-input");
    if (question && document.activeElement !== chatInput) {
      question.tabIndex = -1;
      question.focus({ preventScroll: true });
    }
    var step = full.length > 320 ? 4 : 2;
    active.timer = window.setInterval(function () {
      if (!active || active.assistantId !== existing.id) return;
      index = Math.min(full.length, index + step);
      var current = loadStore();
      var liveSession = current.sessions[sessionId];
      var live = liveSession && liveSession.messages.filter(function (message) {
        return message.id === existing.id;
      })[0];
      if (!live) {
        haltActive(false);
        return;
      }
      live.text = full.slice(0, index);
      live.pending = index < full.length;
      live.intent = answer.intent;
      live.label = answer.label;
      live.sources = answer.sources;
      liveSession.updatedAt = Date.now();
      if (index >= full.length) {
        live.pending = false;
        live.stopped = false;
        saveStore(current);
        stopTimer();
        active = null;
        setGeneratingUI(false);
        setStatus("");
        if (!paintAssistant(live)) renderSession(liveSession);
        return;
      }
      saveStore(current);
      if (!paintAssistant(live)) renderSession(liveSession);
    }, 28);
  }

  function stopGeneration() {
    if (!active) return;
    var sessionId = active.sessionId;
    var assistantId = active.assistantId;
    stopTimer();
    active = null;
    var store = loadStore();
    var session = store.sessions[sessionId];
    var assistant = session && session.messages.filter(function (message) {
      return message.id === assistantId;
    })[0];
    if (assistant) {
      assistant.pending = false;
      assistant.stopped = true;
      if (!assistant.text) assistant.text = "";
      session.updatedAt = Date.now();
      saveStore(store);
      renderSession(session);
    }
    setGeneratingUI(false);
    setStatus("已停止");
    showHint("chat", "");
  }

  function syncChat() {
    if (!chatIsActive()) return;
    var sessionId = resolveSessionId();
    var session = sessionId ? loadStore().sessions[sessionId] : null;
    renderSession(session);
    if (!session) {
      setGeneratingUI(false);
      return;
    }
    var last = session.messages[session.messages.length - 1];
    var needs = last && (last.role === "user" || (last.role === "assistant" && last.pending));
    if (!needs) {
      setGeneratingUI(false);
      return;
    }
    var userMessage = null;
    for (var i = session.messages.length - 1; i >= 0; i -= 1) {
      if (session.messages[i].role === "user") {
        userMessage = session.messages[i];
        break;
      }
    }
    if (userMessage) startGeneration(session.id, userMessage.id);
  }

  function markNav(isAsk) {
    if (runtime !== "file") return;
    document.querySelectorAll("#sidebar .nav-item").forEach(function (item) {
      item.classList.remove("active");
    });
    var link = document.querySelector(isAsk ? "[data-ask-nav='ask']" : "#sidebar .nav-item [data-ask-nav='home']");
    if (link && link.closest(".nav-item")) link.closest(".nav-item").classList.add("active");
    var title = document.getElementById("topbar-title");
    if (title) {
      if (!title.dataset.askHomeTitle) title.dataset.askHomeTitle = title.textContent.trim();
      title.textContent = isAsk ? "AI 问答" : title.dataset.askHomeTitle;
    }
  }

  function showView(name) {
    var home = document.getElementById("view-home");
    var ask = document.getElementById("view-ask");
    if (!home || !ask) return;
    home.hidden = name !== "home";
    ask.hidden = name !== "ask";
    document.dispatchEvent(new CustomEvent("ask-view", { detail: { view: name } }));
    markNav(name === "ask");
    if (name === "home") {
      haltActive(false);
      var input = document.getElementById("ask-input");
      if (input) input.value = "";
      showHint("home", "");
      resetHomeSend();
      window.scrollTo(0, 0);
      return;
    }
    haltActive(false);
    window.scrollTo(0, 0);
    syncChat();
  }

  function resetHomeSend() {
    var button = document.getElementById("ask-send");
    if (button) {
      button.textContent = "发送";
      button.removeAttribute("aria-busy");
    }
    document.querySelectorAll("#ask-hero [data-ask-suggest]").forEach(function (item) {
      item.removeAttribute("aria-busy");
    });
  }

  function markHomeSending(control) {
    var button = document.getElementById("ask-send");
    if (button) {
      button.setAttribute("aria-busy", "true");
      button.textContent = "发送中";
    }
    if (control && control.setAttribute) control.setAttribute("aria-busy", "true");
  }

  function sendHome(text, control) {
    if (sendGuard) return;
    var value = String(text || "").trim();
    if (!value) {
      showHint("home", "请输入内容后再发送");
      var homeInput = document.getElementById("ask-input");
      if (homeInput) homeInput.focus();
      return;
    }
    sendGuard = true;
    markHomeSending(control);
    haltActive(true);
    var id = createSession(value);
    var input = document.getElementById("ask-input");
    if (input) input.value = value;
    showHint("home", "");
    if (runtime === "file") {
      history.pushState({ askView: "ask", askSessionId: id }, "", location.pathname);
      sendGuard = false;
      showView("ask");
      return;
    }
    sessionStorage.setItem(PENDING_KEY, id);
    sessionStorage.setItem(CLEAR_HOME_KEY, "1");
    window.location.assign(askPageUrl());
  }

  function sendChat(text) {
    if (sendGuard) return;
    if (active) {
      showHint("chat", "请先停止，或等这一条结束");
      return;
    }
    var value = String(text || "").trim();
    if (!value) {
      var onEmpty = document.getElementById("ask-empty") && !document.getElementById("ask-empty").hidden;
      showHint(onEmpty ? "empty" : "chat", "请输入内容后再发送");
      var focus = document.getElementById(onEmpty ? "ask-empty-input" : "ask-chat-input");
      if (focus) focus.focus();
      return;
    }
    sendGuard = true;
    showHint("chat", "");
    var sessionId = resolveSessionId();
    var userMessage;
    if (!sessionId || !loadStore().sessions[sessionId]) {
      sessionId = createSession(value);
      adoptSession(sessionId);
      userMessage = loadStore().sessions[sessionId].messages[0];
    } else {
      userMessage = appendUser(sessionId, value);
    }
    ["ask-chat-input", "ask-empty-input"].forEach(function (id) {
      var field = document.getElementById(id);
      if (field) field.value = "";
    });
    sendGuard = false;
    startGeneration(sessionId, userMessage.id);
  }

  function bindComposer(textarea, submit) {
    if (!textarea || textarea.dataset.askBound === "1") return;
    textarea.dataset.askBound = "1";
    var composing = false;
    var ignoreEnterUntil = 0;
    textarea.addEventListener("compositionstart", function () {
      composing = true;
    });
    textarea.addEventListener("compositionend", function () {
      composing = false;
      ignoreEnterUntil = performance.now() + 80;
    });
    textarea.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" || event.shiftKey) return;
      if (event.isComposing || composing || event.keyCode === 229 || performance.now() < ignoreEnterUntil) return;
      event.preventDefault();
      submit();
    });
    textarea.addEventListener("input", function () {
      var which = textarea.id === "ask-chat-input" ? "chat" : "home";
      if (textarea.value.trim()) showHint(which, "");
    });
  }

  function bindAll() {
    var homeForm = document.getElementById("ask-hero-form");
    if (homeForm) {
      homeForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = document.getElementById("ask-input");
        sendHome(input ? input.value : "");
      });
    }
    var emptyForm = document.getElementById("ask-empty-form");
    if (emptyForm) {
      emptyForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = document.getElementById("ask-empty-input");
        if (input && !String(input.value || "").trim()) showHint("empty", "请输入内容后再发送");
        sendChat(input ? input.value : "");
      });
    }
    var chatForm = document.getElementById("ask-chat-form");
    if (chatForm) {
      chatForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var input = document.getElementById("ask-chat-input");
        sendChat(input ? input.value : "");
      });
    }
    bindComposer(document.getElementById("ask-input"), function () {
      var input = document.getElementById("ask-input");
      sendHome(input ? input.value : "");
    });
    bindComposer(document.getElementById("ask-empty-input"), function () {
      var input = document.getElementById("ask-empty-input");
      sendChat(input ? input.value : "");
    });
    bindComposer(document.getElementById("ask-chat-input"), function () {
      var input = document.getElementById("ask-chat-input");
      sendChat(input ? input.value : "");
    });
    var stop = document.getElementById("ask-stop");
    if (stop) stop.addEventListener("click", stopGeneration);
    document.addEventListener("click", function (event) {
      var askNav = event.target.closest("[data-ask-nav='ask']");
      if (!askNav) return;
      sessionStorage.removeItem(PENDING_KEY);
      if (runtime !== "file") return;
      event.preventDefault();
      history.pushState({ askView: "ask" }, "", location.pathname);
      showView("ask");
    });
    document.addEventListener("ask-home", function () {
      if (runtime !== "file") return;
      var ask = document.getElementById("view-ask");
      if (!ask || ask.hidden) return;
      history.pushState({ askView: "home" }, "", location.pathname);
      showView("home");
    });
    if (runtime === "file") {
      window.addEventListener("popstate", function (event) {
        var view = event.state && event.state.askView === "ask" ? "ask" : "home";
        showView(view);
      });
    }
  }

  function boot() {
    if (document.documentElement.dataset.askBound !== "1") {
      document.documentElement.dataset.askBound = "1";
      bindAll();
    }
    if (runtime === "file") {
      if (!history.state || !history.state.askView) {
        history.replaceState({ askView: "home" }, "", location.pathname);
      }
      applyGreeting();
      var initial = history.state && history.state.askView === "ask" ? "ask" : "home";
      showView(initial);
      return;
    }
    applyGreeting();
    if (document.getElementById("ask-app")) syncChat();
  }

  window.addEventListener("scroll", function () {
    if (scrollLock) return;
    followAnswer = nearBottom();
  }, { passive: true });

  window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
      stopTimer();
      active = null;
    }
    var homeInput = document.getElementById("ask-input");
    if (homeInput && sessionStorage.getItem(CLEAR_HOME_KEY) === "1") {
      homeInput.value = "";
      sessionStorage.removeItem(CLEAR_HOME_KEY);
      resetHomeSend();
    }
    if (homeInput) resetHomeSend();
    if (runtime === "site" && document.getElementById("ask-app")) syncChat();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
