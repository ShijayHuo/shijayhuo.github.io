---
layout: post
title: "使用nodejs实现redis的pub/sub"
excerpt: "最近在做研发版企业微信/飞书的对接，其中的工作内容之一是：消息推送。为了让用户更好的协同办公，我们需要通过企业微信/飞书等平台推送提醒或消息给其他协作者，项目中采用 redis 的 pub/sub 模式(使用及其简单,跟我以往使用 mq 相比)，所以对这块重新学习了下。 ok，…"
date: 2020-07-06 22:09:08 +0800
categories: ["后端","数据库","架构"]
tags: ["Node.js","Redis","架构"]
source_platform: Juejin
source_url: "https://juejin.cn/post/6847902219002445837"
---

{% raw %}
<p>最近在做研发版企业微信/飞书的对接，其中的工作内容之一是：消息推送。为了让用户更好的协同办公，我们需要通过企业微信/飞书等平台推送提醒或消息给其他协作者，项目中采用 redis 的 pub/sub 模式(使用及其简单,跟我以往使用 mq 相比)，所以对这块重新学习了下。<br>
ok，废话不多说了，本文将简单介绍发布订阅模式，并从 redis pub/sub 的使用，自己用 nodejs 实现一个跟其类似的功能，过程中主要用到的 是 nodejs 原生模块 net。</p>
<h2 id="介绍" class="heading">介绍</h2>
<p>发布订阅模式，是常见处理消息的模式，这里贴出烂大街，但描述很好的图：<br>
</p><figure><img alt="使用nodejs实现redis的pub/sub 配图" src="/assets/img/posts/juejin-6847902219002445837/image-001.jpg"><figcaption></figcaption></figure><p></p>
<p>从图上可以看到，订阅者通过调度中心进行订阅，发布者发布消息给调度中心，调度中心再将消息分发到各个订阅者。而订阅者和发布者都是通过调度中心来完成对应操作的，这里的调度中心就是 发布/订阅 模式。那么为什么要有该模式呢？下面就讲一下它具体做了什么事，有什么好处！</p>
<h2 id="好处" class="heading">好处</h2>
<ul>
<li>解耦：它抽象了 订阅者和发布者，他们彼此是不知道对方的存在，他们甚至是不同平台、基于不同语言的，而他们只需要做好自己的事情，这当然也符合编程中的单一原则。</li>
<li>伸缩性： 发布者只管发布消息，发完一次消息他就可以再去发其他消息，不必等待后续子系统的一个响应情况。</li>
<li>可靠性：主要是采用异步的方式传递，异步的好处在座各位都是写 js 的，主要体现在负载方面。</li>
</ul>
<p>ok，介绍了其好处，下面根据 redis 的 pub/sub 模式，用 nodejs 实现一个跟其一样的功能，在实现之前介绍一下 redis 的 pub/sub 模式</p>
<h2 id="redis-的-pubsub-模式" class="heading">redis 的 pub/sub 模式</h2>
<p>redis 中的发布订阅模式多种多样，根据业务制定出的场景，这里只讲一个最简单的。
</p><figure><img alt="使用nodejs实现redis的pub/sub 配图" src="/assets/img/posts/juejin-6847902219002445837/image-002.jpg"><figcaption></figcaption></figure>
这张图在调度中心内部又分出一个叫 channel(频道、通道)的东西，有了 channel，相当于给订阅者和发布者制定了一个协议，发布者能够给订阅了同一通道的订阅者推送消息，就能够更进一步的细化，其他更复杂的场景则更细化，本文旨在弄清原理，所以实现最简单场景。<p></p>
<h2 id="实现" class="heading">实现</h2>
<p>ioredis 是 nodejs 常用的驱动之一，封装了 redis 的常用 API，下面使用 ioredis 展示上述模式：</p>
<ul>
<li>订阅 sub.js</li>
</ul>
<pre><code class="hljs js" lang="js"><span class="hljs-keyword">import</span> Redis <span class="hljs-keyword">from</span> <span class="hljs-string">"ioredis"</span>;
<span class="hljs-keyword">const</span> client = <span class="hljs-keyword">new</span> Redis({
  <span class="hljs-attr">host</span>: <span class="hljs-string">"127.0.0.1"</span>,
  <span class="hljs-attr">port</span>: <span class="hljs-number">6379</span>,
  <span class="hljs-attr">password</span>: <span class="hljs-string">"123456"</span>,
  <span class="hljs-attr">name</span>: <span class="hljs-string">"myRedis"</span>,
});
<span class="hljs-comment">// 订阅频道：myChannel</span>
client.subscribe(<span class="hljs-string">"mychannel"</span>, (e) =&gt; {
  <span class="hljs-built_in">console</span>.log(<span class="hljs-string">"subscribe channel: mychannel"</span>);
});
<span class="hljs-comment">// 监听 发来的消息</span>
client.on(<span class="hljs-string">"message"</span>, (channel, message) =&gt; {
  <span class="hljs-built_in">console</span>.log(<span class="hljs-string">`channel: <span class="hljs-subst">${channel}</span>,message: <span class="hljs-subst">${message}</span>`</span>);
});
<span class="hljs-comment">// 监听 错误</span>
client.on(<span class="hljs-string">"error"</span>, (err) =&gt; {
  <span class="hljs-built_in">console</span>.log(<span class="hljs-string">"response err:"</span> + err);
});
</code></pre><ul>
<li>发布 pub.js</li>
</ul>
<pre><code class="hljs js" lang="js"><span class="hljs-keyword">import</span> Redis <span class="hljs-keyword">from</span> <span class="hljs-string">"ioredis"</span>;
<span class="hljs-keyword">const</span> client = <span class="hljs-keyword">new</span> Redis({
  <span class="hljs-attr">host</span>: <span class="hljs-string">"127.0.0.1"</span>,
  <span class="hljs-attr">port</span>: <span class="hljs-number">6379</span>,
  <span class="hljs-attr">password</span>: <span class="hljs-string">"123456"</span>,
  <span class="hljs-attr">name</span>: <span class="hljs-string">"myserver-3y"</span>,
});
<span class="hljs-keyword">const</span> msg = { <span class="hljs-attr">id</span>: <span class="hljs-number">1</span>, <span class="hljs-attr">name</span>: <span class="hljs-string">"ipenman"</span>, <span class="hljs-attr">content</span>: <span class="hljs-string">"明天不上班"</span> };
client.publish(<span class="hljs-string">"mychannel"</span>, <span class="hljs-built_in">JSON</span>.stringify(msg));
</code></pre><p>node 启动 sub.js、pub.js，展示效果看下图：</p>
<p></p><figure><img alt="效果图" src="/assets/img/posts/juejin-6847902219002445837/image-003.jpg"><figcaption></figcaption></figure><p></p>
<p>刚才的例子中，可以看到通过配置进行连接，然后再进行订阅(subscribe)或发布(publish)，还有一个监听功能，效果图中可以看到订阅启动监听之后是不可打断的，所以判断是个长连接，根据使用我们从客户端入手。</p>
<p>一、创建 client.ts</p>
<pre><code class="hljs ts" lang="ts"><span class="hljs-keyword">import</span> { connect, Socket, SocketConnectOpts } <span class="hljs-keyword">from</span> <span class="hljs-string">"net"</span>;
<span class="hljs-keyword">class</span> Client {
  <span class="hljs-keyword">private</span> connection: Socket;
  <span class="hljs-keyword">private</span> config: SocketConnectOpts;

  <span class="hljs-keyword">constructor</span>(<span class="hljs-params">config: SocketConnectOpts</span>) {
    <span class="hljs-keyword">this</span>.config = config;
    <span class="hljs-comment">// 创建一个客户端连接</span>
    <span class="hljs-keyword">this</span>.connection = connect(config);
  }

  subscribe(channelName: <span class="hljs-built_in">string</span>, handle: (err: <span class="hljs-built_in">Error</span>)｜<span class="hljs-built_in">Function</span> =&gt; <span class="hljs-built_in">void</span>) {
    <span class="hljs-keyword">this</span>.connection.write(<span class="hljs-built_in">JSON</span>.stringify({ <span class="hljs-keyword">type</span>: <span class="hljs-string">"subscribe"</span>, name: channelName }), handle);
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>; <span class="hljs-comment">// this 是为了能够像redis一样链式调用</span>
  }
  publish(channelName: <span class="hljs-built_in">string</span>, message: <span class="hljs-built_in">string</span>) {
    <span class="hljs-keyword">this</span>.connection.write(<span class="hljs-built_in">JSON</span>.stringify({ <span class="hljs-keyword">type</span>: <span class="hljs-string">"publish"</span>, name: channelName, message: message }));
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>;
  }

  on(eventName: <span class="hljs-built_in">string</span>, handle: <span class="hljs-function">(<span class="hljs-params">...args</span>) =&gt;</span> <span class="hljs-built_in">void</span> | <span class="hljs-built_in">Function</span>) {
        <span class="hljs-comment">// 这里只是举例，所以只写了一个message，复杂的可以用switch或策略模式</span>
    <span class="hljs-keyword">if</span> (eventName === <span class="hljs-string">'message'</span>) {
      <span class="hljs-keyword">this</span>.connection.on(<span class="hljs-string">'data'</span>, <span class="hljs-function">(<span class="hljs-params">data</span>) =&gt;</span> {
        <span class="hljs-keyword">const</span> sData = data.toString()
        <span class="hljs-keyword">const</span> { name, message } = <span class="hljs-built_in">JSON</span>.parse(sData)
        handle(name, message)
      })
    }
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>
  }
}
</code></pre><p>客户端很简单，只是给服务端发送请求指令。</p>
<p>二、服务端 server.ts</p>
<pre><code class="hljs ts" lang="ts"><span class="hljs-keyword">import</span> { createServer, AddressInfo, Socket } <span class="hljs-keyword">from</span> <span class="hljs-string">"net"</span>;
<span class="hljs-keyword">const</span> pubsub = <span class="hljs-keyword">new</span> PubSub(); <span class="hljs-comment">// PubSub：订阅发布模式</span>
<span class="hljs-keyword">const</span> server = createServer(); <span class="hljs-comment">// 创建服务</span>
server
  .on(<span class="hljs-string">"connection"</span>, <span class="hljs-function">(<span class="hljs-params">socket</span>) =&gt;</span> {
    <span class="hljs-keyword">const</span> id = <span class="hljs-keyword">new</span> <span class="hljs-built_in">Date</span>().getTime(); <span class="hljs-comment">// 生成该连接唯一标识id</span>
    socket
      <span class="hljs-comment">// 收到客户端请求指令</span>
      .on(<span class="hljs-string">"data"</span>, <span class="hljs-function">(<span class="hljs-params">data</span>) =&gt;</span> {
        <span class="hljs-keyword">const</span> sData = data.toString();
        <span class="hljs-keyword">const</span> { <span class="hljs-keyword">type</span>, name, message }: Data = <span class="hljs-built_in">JSON</span>.parse(sData);
        <span class="hljs-keyword">if</span> (<span class="hljs-keyword">type</span> === <span class="hljs-string">"subscribe"</span>) {
          pubsub.subscriber(name, { id, socket });
        } <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> (<span class="hljs-keyword">type</span> === <span class="hljs-string">"publish"</span>) {
          pubsub.publish(name, message);
        }
      });
  })
  .on(<span class="hljs-string">"error"</span>, <span class="hljs-function">(<span class="hljs-params">e</span>) =&gt;</span> {
    <span class="hljs-built_in">console</span>.error(e);
  })
  .listen(<span class="hljs-number">3300</span>);
</code></pre><p>上边先实现了简单的服务端收到客户端指令，调用 pubsub 对应的方法，该模式的重点 就是上面的 <strong>PubSub</strong>，下面看下具体实现：</p>
<pre><code class="hljs ts" lang="ts"><span class="hljs-keyword">class</span> PubSub {
  <span class="hljs-keyword">private</span> channels: Map&lt;<span class="hljs-built_in">string</span>, Channel&gt;;
  <span class="hljs-keyword">constructor</span>(<span class="hljs-params"></span>) {
    <span class="hljs-keyword">this</span>.channels = <span class="hljs-keyword">new</span> Map();
  }

  subscriber(channelName: <span class="hljs-built_in">string</span>, subscriber: Subscriber) {
    <span class="hljs-keyword">const</span> channel = <span class="hljs-keyword">this</span>.channels.get(channelName);
    <span class="hljs-keyword">if</span> (!channel) {
      <span class="hljs-keyword">const</span> channel = <span class="hljs-keyword">new</span> Channel(channelName, subscriber);
      <span class="hljs-keyword">this</span>.channels.set(channelName, channel);
    } <span class="hljs-keyword">else</span> {
      channel.subscribe(subscriber);
    }
  }
  publish(channelName: <span class="hljs-built_in">string</span>, message: <span class="hljs-built_in">string</span>) {
    <span class="hljs-comment">// 找出对应channel，推送消息</span>
    <span class="hljs-keyword">const</span> channel = <span class="hljs-keyword">this</span>.channels.get(channelName);
    channel &amp;&amp; channel.publish(message);
  }
}
<span class="hljs-keyword">interface</span> Subscriber {
  id: <span class="hljs-built_in">number</span>;
  socket: Socket;
}
<span class="hljs-keyword">export</span> <span class="hljs-keyword">interface</span> Data {
  <span class="hljs-keyword">type</span>?: <span class="hljs-built_in">string</span>;
  name?: <span class="hljs-built_in">string</span>;
  message?: <span class="hljs-built_in">string</span>;
}

<span class="hljs-comment">// 管道、频道</span>
<span class="hljs-keyword">class</span> Channel {
  <span class="hljs-keyword">private</span> _name: <span class="hljs-built_in">string</span>;
  <span class="hljs-keyword">private</span> _subscribers: Subscriber[] = [];

  <span class="hljs-keyword">constructor</span>(<span class="hljs-params">name, subscriber</span>) {
    <span class="hljs-keyword">this</span>._name = name;
    <span class="hljs-keyword">this</span>._subscribers.push(subscriber);
  }

  subscribe(subscriber: Subscriber) {
    <span class="hljs-keyword">this</span>._subscribers.push(subscriber);
  }

  publish(message: <span class="hljs-built_in">string</span>) {
    <span class="hljs-comment">// 推送消息</span>
    <span class="hljs-keyword">this</span>._subscribers.forEach(<span class="hljs-function">(<span class="hljs-params">subscriber</span>) =&gt;</span> subscriber.socket.write(<span class="hljs-built_in">JSON</span>.stringify({ name: <span class="hljs-keyword">this</span>._name, message: message })));
  }
}
</code></pre><p>至此，一个基础的发布订阅模式就出来了。为了更好的解耦，后续我做了一些优化并添加了几个功能，如取消订阅，销毁连接等操作，下面是完整代码：</p>
<p>server.ts</p>
<pre><code class="hljs ts" lang="ts"><span class="hljs-keyword">import</span> { createServer, AddressInfo, Socket } <span class="hljs-keyword">from</span> <span class="hljs-string">"net"</span>;

<span class="hljs-keyword">class</span> PubSub {
  <span class="hljs-keyword">private</span> channels: Map&lt;<span class="hljs-built_in">string</span>, Channel&gt;;
  <span class="hljs-keyword">constructor</span>(<span class="hljs-params"></span>) {
    <span class="hljs-keyword">this</span>.channels = <span class="hljs-keyword">new</span> Map();
  }
  getSubscribers(channelName: <span class="hljs-built_in">string</span>) {
    <span class="hljs-keyword">const</span> channel = <span class="hljs-keyword">this</span>.channels.get(channelName);
    <span class="hljs-keyword">if</span> (channel) {
      <span class="hljs-keyword">return</span> channel.subscribers.length;
    }
  }
  subscriber(channelName: <span class="hljs-built_in">string</span>, subscriber: Subscriber) {
    <span class="hljs-keyword">const</span> channel = <span class="hljs-keyword">this</span>.channels.get(channelName);
    <span class="hljs-keyword">if</span> (!channel) {
      <span class="hljs-keyword">const</span> channel = <span class="hljs-keyword">new</span> Channel(channelName, subscriber);
      <span class="hljs-keyword">this</span>.channels.set(channelName, channel);
    } <span class="hljs-keyword">else</span> {
      channel.subscribe(subscriber);
    }
  }
  unsubscriber(channelName: <span class="hljs-built_in">string</span>, subscriber: Subscriber) {
    <span class="hljs-keyword">const</span> channel = <span class="hljs-keyword">this</span>.channels.get(channelName);
    channel.subscribe(subscriber);
  }
  publish(channelName: <span class="hljs-built_in">string</span>, message: <span class="hljs-built_in">string</span>) {
    <span class="hljs-keyword">const</span> channel = <span class="hljs-keyword">this</span>.channels.get(channelName);
    channel &amp;&amp; channel.publish(message);
  }
  destroy(subscriber: Subscriber) {
    <span class="hljs-keyword">for</span> (<span class="hljs-keyword">const</span> [channelName, channel] of <span class="hljs-keyword">this</span>.channels) {
      channel.unsubscribe(subscriber);
    }
  }
}
<span class="hljs-keyword">interface</span> Subscriber {
  id: <span class="hljs-built_in">number</span>;
  socket: Socket;
}
<span class="hljs-keyword">export</span> <span class="hljs-keyword">interface</span> Data {
  <span class="hljs-keyword">type</span>?: <span class="hljs-built_in">string</span>;
  name?: <span class="hljs-built_in">string</span>;
  message?: <span class="hljs-built_in">string</span>;
}
<span class="hljs-keyword">class</span> Channel {
  <span class="hljs-keyword">private</span> _name: <span class="hljs-built_in">string</span>;
  <span class="hljs-keyword">private</span> _subscribers: Subscriber[] = [];

  <span class="hljs-keyword">constructor</span>(<span class="hljs-params">name, subscriber</span>) {
    <span class="hljs-keyword">this</span>._name = name;
    <span class="hljs-keyword">this</span>._subscribers.push(subscriber);
  }
  <span class="hljs-keyword">get</span> name() {
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>._name;
  }
  <span class="hljs-keyword">get</span> subscribers() {
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>._subscribers;
  }
  subscribe(subscriber: Subscriber) {
    <span class="hljs-keyword">this</span>._subscribers.push(subscriber);
  }
  unsubscribe(subscriber: Subscriber) {
    <span class="hljs-keyword">const</span> subscriberIndex = <span class="hljs-keyword">this</span>._subscribers.findIndex(<span class="hljs-function">(<span class="hljs-params">sub</span>) =&gt;</span> subscriber.id === sub.id);
    <span class="hljs-keyword">if</span> (subscriberIndex !== <span class="hljs-number">-1</span>) {
      <span class="hljs-keyword">this</span>._subscribers.splice(subscriberIndex, <span class="hljs-number">1</span>);
      subscriber.socket.write(<span class="hljs-built_in">JSON</span>.stringify({ name: <span class="hljs-keyword">this</span>._name, message: <span class="hljs-string">`取消订阅成功`</span> }));
    }
  }

  publish(message: <span class="hljs-built_in">string</span>) {
    <span class="hljs-keyword">this</span>._subscribers.forEach(<span class="hljs-function">(<span class="hljs-params">subscriber</span>) =&gt;</span> subscriber.socket.write(<span class="hljs-built_in">JSON</span>.stringify({ name: <span class="hljs-keyword">this</span>._name, message: message })));
  }
}
<span class="hljs-keyword">const</span> pubsub = <span class="hljs-keyword">new</span> PubSub();
<span class="hljs-keyword">const</span> server = createServer();
server
  .on(<span class="hljs-string">"connection"</span>, <span class="hljs-function">(<span class="hljs-params">socket</span>) =&gt;</span> {
    <span class="hljs-keyword">const</span> id = <span class="hljs-keyword">new</span> <span class="hljs-built_in">Date</span>().getTime();
    socket
      .on(<span class="hljs-string">"data"</span>, <span class="hljs-function">(<span class="hljs-params">data</span>) =&gt;</span> {
        <span class="hljs-keyword">const</span> sData = data.toString();
        <span class="hljs-keyword">const</span> { <span class="hljs-keyword">type</span>, name, message }: Data = <span class="hljs-built_in">JSON</span>.parse(sData);
        <span class="hljs-keyword">if</span> (<span class="hljs-keyword">type</span> === <span class="hljs-string">"subscribe"</span>) {
          pubsub.subscriber(name, { id, socket });
          <span class="hljs-built_in">console</span>.log(<span class="hljs-string">`当前订阅人数：<span class="hljs-subst">${pubsub.getSubscribers(name)}</span>`</span>);
        } <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> (<span class="hljs-keyword">type</span> === <span class="hljs-string">"unsubcribe"</span>) {
          pubsub.unsubscriber(name, { id, socket });
        } <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> (<span class="hljs-keyword">type</span> === <span class="hljs-string">"publish"</span>) {
          pubsub.publish(name, message);
        }
      })
      .on(<span class="hljs-string">"close"</span>, <span class="hljs-function"><span class="hljs-keyword">function</span> (<span class="hljs-params">status</span>) </span>{
        <span class="hljs-built_in">console</span>.log(<span class="hljs-string">"关闭连接"</span>, status);
        pubsub.destroy({ id, socket });
      })
      .on(<span class="hljs-string">"error"</span>, <span class="hljs-function">(<span class="hljs-params">e</span>) =&gt;</span> {
        socket.destroy();
      });
  })
  .on(<span class="hljs-string">"error"</span>, <span class="hljs-function">(<span class="hljs-params">e</span>) =&gt;</span> {
    <span class="hljs-built_in">console</span>.error(e);
  })
  .listen(<span class="hljs-number">6379</span>);
</code></pre><p>client.ts</p>
<pre><code class="hljs ts" lang="ts"><span class="hljs-keyword">import</span> { connect, Socket, SocketConnectOpts } <span class="hljs-keyword">from</span> <span class="hljs-string">"net"</span>;
<span class="hljs-keyword">export</span> <span class="hljs-keyword">class</span> Client {
  <span class="hljs-keyword">private</span> connection: Socket;
  <span class="hljs-keyword">private</span> config: SocketConnectOpts;
  <span class="hljs-keyword">constructor</span>(<span class="hljs-params">config: SocketConnectOpts</span>) {
    <span class="hljs-keyword">this</span>.config = config;
    <span class="hljs-keyword">this</span>.connection = <span class="hljs-keyword">this</span>.createConnection();
  }
  <span class="hljs-keyword">private</span> createConnection() {
    <span class="hljs-keyword">return</span> connect(<span class="hljs-keyword">this</span>.config);
  }
  on(eventName: <span class="hljs-built_in">string</span>, handle: <span class="hljs-function">(<span class="hljs-params">...args</span>) =&gt;</span> <span class="hljs-built_in">void</span> | <span class="hljs-built_in">Function</span>) {
    <span class="hljs-keyword">if</span> (eventName === <span class="hljs-string">"message"</span>) {
      <span class="hljs-keyword">this</span>.connection.on(<span class="hljs-string">"data"</span>, <span class="hljs-function">(<span class="hljs-params">data</span>) =&gt;</span> {
        <span class="hljs-keyword">const</span> sData = data.toString();
        <span class="hljs-keyword">const</span> { name, message } = <span class="hljs-built_in">JSON</span>.parse(sData);
        handle(name, message);
      });
    }
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>;
  }
  unsubscribe(channelName: <span class="hljs-built_in">string</span>, handle: <span class="hljs-function">(<span class="hljs-params">err: <span class="hljs-built_in">Error</span></span>) =&gt;</span> <span class="hljs-built_in">void</span>) {
    <span class="hljs-keyword">this</span>.connection.write(<span class="hljs-built_in">JSON</span>.stringify({ <span class="hljs-keyword">type</span>: <span class="hljs-string">"unsubscribe"</span>, name: channelName }), handle);
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>;
  }
  subscribe(channelName: <span class="hljs-built_in">string</span>, handle: <span class="hljs-function">(<span class="hljs-params">err: <span class="hljs-built_in">Error</span></span>) =&gt;</span> <span class="hljs-built_in">void</span>) {
    <span class="hljs-keyword">this</span>.connection.write(<span class="hljs-built_in">JSON</span>.stringify({ <span class="hljs-keyword">type</span>: <span class="hljs-string">"subscribe"</span>, name: channelName }), handle);
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>;
  }
  publish(channelName: <span class="hljs-built_in">string</span>, message: <span class="hljs-built_in">string</span>) {
    <span class="hljs-keyword">this</span>.connection.write(<span class="hljs-built_in">JSON</span>.stringify({ <span class="hljs-keyword">type</span>: <span class="hljs-string">"publish"</span>, name: channelName, message: message }));
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">this</span>;
  }
}
</code></pre><p>认真看到这里，觉得也耽误大伙很长时间了，下面就进入使用和测试环节。</p>
<h2 id="使用" class="heading">使用</h2>
<p>使用方式跟 redis 的 pub、sub 一毛一样。</p>
<p>sub.ts</p>
<pre><code class="hljs ts" lang="ts"><span class="hljs-keyword">import</span> { Client } <span class="hljs-keyword">from</span> <span class="hljs-string">"./client"</span>;
<span class="hljs-keyword">const</span> client = <span class="hljs-keyword">new</span> Client({ port: <span class="hljs-number">6379</span>, host: <span class="hljs-string">"127.0.0.1"</span> });
client.subscribe(<span class="hljs-string">"mychannel"</span>, <span class="hljs-function"><span class="hljs-params">()</span> =&gt;</span> {
  <span class="hljs-built_in">console</span>.log(<span class="hljs-string">"订阅成功！"</span>);
});
client.on(<span class="hljs-string">"message"</span>, <span class="hljs-function">(<span class="hljs-params">channel, data</span>) =&gt;</span> {
  <span class="hljs-built_in">console</span>.log(channel, data);
});
</code></pre><p>pub.ts</p>
<pre><code class="hljs ts" lang="ts"><span class="hljs-keyword">import</span> { Client } <span class="hljs-keyword">from</span> <span class="hljs-string">"./client"</span>;
<span class="hljs-keyword">const</span> client = <span class="hljs-keyword">new</span> Client({ port: <span class="hljs-number">6379</span>, host: <span class="hljs-string">"127.0.0.1"</span> });
<span class="hljs-keyword">const</span> msg = { id: <span class="hljs-number">1</span>, name: <span class="hljs-string">"ipenman"</span>, content: <span class="hljs-string">"明天不上班"</span> };
client.publish(<span class="hljs-string">"mychannel"</span>, <span class="hljs-built_in">JSON</span>.stringify(msg));
</code></pre><p>启动 server.ts
启动 sub.ts 订阅
启动 pub.ts 发布消息</p>
<p>测试结果如下：
</p><figure><img alt="使用nodejs实现redis的pub/sub 配图" src="/assets/img/posts/juejin-6847902219002445837/image-004.jpg"><figcaption></figcaption></figure><p></p>
<p>perfect!</p>
<h2 id="最后" class="heading">最后</h2>
<p>实际开发中大多数直接用主流现成的库，而不会去造轮子，然造轮子非我本意，但是可以通过造轮子的方式，能够更弄清楚他的原理，岂不乐乎！</p>
{% endraw %}
