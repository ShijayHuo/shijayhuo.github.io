---
layout: post
title: "npm 发包流程"
excerpt: "一、你真的需要发包吗？ 不是所有代码都值得发 npm。 一般适合发包的情况是： 通用工具函数 / SDK 多个项目都会用到的逻辑 希望别人能直接 npm install 用 公司内部的私有包 如果只是单项目用的小工具，放在仓库里反而更省事。 二、npm 账号 如果你已经有账号，可以直接跳过。 1npm login..."
date: 2023-11-04 10:00:00 +0800
categories: ["工程化"]
tags: ["NPM","发布","工程化"]
source_platform: GitHub Pages
source_url: "https://aaaaaajie.github.io/2023/11/04/npm-%E5%8F%91%E5%8C%85%E6%B5%81%E7%A8%8B/"
source_repository: "https://github.com/ShijayHuo/aaaaaajie.github.io"
---

{% raw %}
<h3 id="一、你真的需要发包吗？">一、你真的需要发包吗？</h3>
<blockquote>
<p>不是所有代码都值得发 npm。</p>
</blockquote>
<p>一般适合发包的情况是：</p>
<ul>
<li>通用工具函数 / SDK</li>
<li>多个项目都会用到的逻辑</li>
<li>希望别人能直接 <code>npm install</code> 用</li>
<li>公司内部的私有包</li>
</ul>
<p>如果只是单项目用的小工具，放在仓库里反而更省事。</p>
<hr>
<h3 id="二、npm-账号">二、npm 账号</h3>
<p>如果你已经有账号，可以直接跳过。</p>
<figure class="highlight bash"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><span class="line">npm login</span><br></pre></td></tr></table></figure>
<p>按提示输入：</p>
<ul>
<li>username</li>
<li>password</li>
<li>email</li>
</ul>
<p>登录成功后确认一下：</p>
<figure class="highlight bash"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><span class="line">npm <span class="built_in">whoami</span></span><br></pre></td></tr></table></figure>
<p>能看到用户名，说明 OK。</p>
<hr>
<h3 id="三、项目配置">三、项目配置</h3>
<p>重点关注 <code>package.json</code>，字段说明：</p>
<figure class="highlight json"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br><span class="line">4</span><br><span class="line">5</span><br><span class="line">6</span><br><span class="line">7</span><br><span class="line">8</span><br><span class="line">9</span><br><span class="line">10</span><br></pre></td><td class="code"><pre><span class="line"><span class="punctuation">&#123;</span></span><br><span class="line">  <span class="attr">&quot;name&quot;</span><span class="punctuation">:</span> <span class="string">&quot;@your-scope/your-package&quot;</span><span class="punctuation">,</span></span><br><span class="line">  <span class="attr">&quot;version&quot;</span><span class="punctuation">:</span> <span class="string">&quot;1.0.0&quot;</span><span class="punctuation">,</span></span><br><span class="line">  <span class="attr">&quot;main&quot;</span><span class="punctuation">:</span> <span class="string">&quot;dist/index.js&quot;</span><span class="punctuation">,</span></span><br><span class="line">  <span class="attr">&quot;types&quot;</span><span class="punctuation">:</span> <span class="string">&quot;dist/index.d.ts&quot;</span><span class="punctuation">,</span></span><br><span class="line">  <span class="attr">&quot;files&quot;</span><span class="punctuation">:</span> <span class="punctuation">[</span><span class="string">&quot;dist&quot;</span><span class="punctuation">]</span><span class="punctuation">,</span></span><br><span class="line">  <span class="attr">&quot;scripts&quot;</span><span class="punctuation">:</span> <span class="punctuation">&#123;</span></span><br><span class="line">    <span class="attr">&quot;build&quot;</span><span class="punctuation">:</span> <span class="string">&quot;xxx&quot;</span></span><br><span class="line">  <span class="punctuation">&#125;</span></span><br><span class="line"><span class="punctuation">&#125;</span></span><br></pre></td></tr></table></figure>
<h4 id="坑点一：name">坑点一：name</h4>
<ul>
<li>不能有大写字母</li>
<li>不能和 npm 上已有的包重名</li>
<li>强烈建议使用 scope：<code>@scope/name</code></li>
</ul>
<blockquote>
<p>scope 是为了<strong>防撞名</strong>。</p>
</blockquote>
<hr>
<h4 id="坑点二：version">坑点二：version</h4>
<p>npm 的规则很简单粗暴：</p>
<blockquote>
<p><strong>版本号不变，绝对发不了包</strong></p>
</blockquote>
<p>推荐用 npm 自带命令管理版本：</p>
<figure class="highlight bash"><table><tr><td class="gutter"><pre><span class="line">1</span><br><span class="line">2</span><br><span class="line">3</span><br></pre></td><td class="code"><pre><span class="line">npm version patch   <span class="comment"># 修 bug</span></span><br><span class="line">npm version minor   <span class="comment"># 加功能</span></span><br><span class="line">npm version major   <span class="comment"># 破坏性变更</span></span><br></pre></td></tr></table></figure>
<p>它会自动：</p>
<ul>
<li>修改 <code>package.json</code></li>
<li>打 git tag（如果是 git 仓库）</li>
</ul>
<hr>
<h3 id="四、控制发布内容">四、控制发布内容</h3>
<p>npm 默认会把<strong>几乎所有文件</strong>都发上去。</p>
<p>如果你不控制，可能会把这些一起发布：</p>
<ul>
<li>src</li>
<li>test</li>
<li>各种配置文件</li>
<li>本地脚本</li>
</ul>
<h4 id="推荐方式：使用-files">推荐方式：使用 <code>files</code></h4>
<figure class="highlight json"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><span class="line"><span class="attr">&quot;files&quot;</span><span class="punctuation">:</span> <span class="punctuation">[</span><span class="string">&quot;dist&quot;</span><span class="punctuation">]</span></span><br></pre></td></tr></table></figure>
<p>这是<strong>白名单机制</strong>，最安全、最直观。</p>
<h5 id="发布前一定做的一步">发布前一定做的一步</h5>
<figure class="highlight bash"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><span class="line">npm pack</span><br></pre></td></tr></table></figure>
<p>它会生成一个 <code>.tgz</code> 文件，相当于<strong>发布预览</strong>。<br>
解压看一眼，确认里面真的是你想让别人安装的内容。</p>
<hr>
<h3 id="五、构建">五、构建</h3>
<p>如果你用的是：</p>
<ul>
<li>TypeScript</li>
<li>Babel</li>
<li>打包工具</li>
</ul>
<p>那基本流程一定是：</p>
<figure class="highlight bash"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><span class="line">npm run build</span><br></pre></td></tr></table></figure>
<p>确保：</p>
<ul>
<li><code>dist/</code> 真实存在</li>
<li><code>main / types</code> 指向的文件真的在包里</li>
</ul>
<blockquote>
<p>npm 不会自动 build，你不 build，它就发“空气”。</p>
</blockquote>
<hr>
<h3 id="六、发布">六、发布</h3>
<h4 id="普通包">普通包</h4>
<figure class="highlight bash"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><span class="line">npm publish</span><br></pre></td></tr></table></figure>
<h4 id="scope-包">scope 包</h4>
<figure class="highlight bash"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><span class="line">npm publish --access public</span><br></pre></td></tr></table></figure>
<p>如果不加这个参数，十有八九会遇到权限或 private 相关报错。</p>
<hr>
<h3 id="七、验证">七、验证</h3>
<p>别半场开香槟，验证下：</p>
<figure class="highlight bash"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><span class="line">npm view your-package-name</span><br></pre></td></tr></table></figure>
<p>或者新建目录测试安装：</p>
<figure class="highlight bash"><table><tr><td class="gutter"><pre><span class="line">1</span><br></pre></td><td class="code"><pre><span class="line">npm install your-package-name</span><br></pre></td></tr></table></figure>
<p>能装、能用，才算真的完成。</p>
<hr>
<h3 id="八、坑点回顾">八、坑点回顾</h3>
<h4 id="❌-忘了改-version">❌ 忘了改 version</h4>
<p>解决方案只有一个：<br>
<strong>改版本号，再发。</strong></p>
<hr>
<h4 id="❌-main-types-写对了，但文件不存在">❌ main / types 写对了，但文件不存在</h4>
<p>表现是：安装成功，一 import 就炸。</p>
<p>排查思路：</p>
<ul>
<li>文件路径是否真实存在</li>
<li><code>npm pack</code> 后包里有没有这个文件</li>
</ul>
<hr>
<h4 id="❌-不该发布的文件被发上去了">❌ 不该发布的文件被发上去了</h4>
<p>解决方案：</p>
<ul>
<li>用 <code>files</code> 控制范围</li>
<li>每次发包前 <code>npm pack</code></li>
</ul>
<hr>
<h4 id="❌-二级认证（2FA）导致发布失败-CI-发不了包">❌ 二级认证（2FA）导致发布失败 / CI 发不了包</h4>
<p>很多人第一次开 2FA，是在“安全感”里翻车的。</p>
<p>常见报错/表现：</p>
<ul>
<li>本地 <code>npm publish</code> 要求输入一次性验证码（OTP）</li>
<li>CI 里 <code>npm publish</code> 直接失败（因为没人能交互式输入 OTP）</li>
<li><code>npm login</code>/<code>npm publish</code> 提示你需要 <code>--otp=xxxxxx</code></li>
<li>使用了 token 但仍然提示 2FA 或权限不足</li>
</ul>
<p>排查与解决思路：</p>
<ol>
<li><strong>先确认你账号的 2FA 策略</strong><br>
在 npm 官网的账户安全设置里，2FA 常见有两种：</li>
</ol>
<ul>
<li><strong>仅对“发布/修改包”启用 2FA</strong>（推荐，且对自动化更友好）</li>
<li><strong>对“登录”也启用 2FA</strong>（更严格，但会让 CI/脚本更麻烦）</li>
</ul>
<p>如果你把 2FA 开在“登录”，那 CI 里用用户名密码登录基本走不通。</p>
<ol start="2">
<li><strong>本地发布：按需加 <code>--otp</code></strong><br>
当提示 OTP 时，直接带上：</li>
</ol>
<ul>
<li><code>npm publish --otp=123456</code></li>
</ul>
<p>OTP 有时间窗口，输慢了就会失效。</p>
<ol start="3">
<li><strong>CI/自动化发布：不要用交互式登录，改用 Token</strong><br>
正确姿势是：</li>
</ol>
<ul>
<li>在 npm 创建 <strong>Automation Token</strong>（或者至少是 Publish 权限的 token）</li>
<li>在 CI 里写入 <code>NPM_TOKEN</code>，通过 <code>.npmrc</code> 使用 token</li>
</ul>
<blockquote>
<p>关键点：CI 需要的是“非交互式凭证”，而不是 OTP。</p>
</blockquote>
<ol start="4">
<li><strong>注意：2FA + Token 不是“随便一配就行”</strong></li>
</ol>
<ul>
<li>如果你启用了“对登录也 2FA”，某些流程下 token 仍可能被限制/需要额外配置</li>
<li>确保 token 具备发布范围（scope）的权限</li>
<li>scope 包发布仍可能需要 <code>--access public</code></li>
</ul>
<ol start="5">
<li><strong>强烈建议保存 Recovery Codes（恢复码）</strong><br>
手机丢了/验证器没了，恢复码是你找回发布权限的最后一根绳。</li>
</ol>
<blockquote>
<p>总结：本地发布可以 <code>--otp</code>，自动化发布要用 token；2FA 开在“发布”通常比开在“登录”更符合实际工程流程。</p>
</blockquote>
{% endraw %}
