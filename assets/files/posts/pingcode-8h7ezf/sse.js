var http = require("http");

const text = `技术团队 Leader 的⼀个重要使命就是要让⾃⼰的团队成为⾼效的研发组织，⼀个⾼效的研发组织必然是⼀个学习型组织。在我们团队组建之初就确定了我们要打造⼀个学习型组织，通过不断的分享与学习，反馈，从⽽持续成⻓和提升，进⽽帮助公司达到⻓期的成功。
一一 Worktile CTO Terry

     Worktile 是一家技术型公司，自公司 2013 年成立开始做技术分享这件事到 2022 年已经有 9 年的时间，从刚开始的 TechShare，再到现在的 技术周刊、每日一学、技术专题、还有我们自己的开发者大会，这些无疑都可以证明我们对技术分享这件事的态度。 在 Worktile，「所有的分享都是有意义的」，我们自始至终都不会对分享内容和讲师进行评比，只要你站在台上，你就被大家所认可。技术分享的本质并不一定是为了了解到新的知识，而是通过分享产生了新的认知和新的行为，从而获得提升与成长。
`;

function splitTextIntoSegments(text, segmentCount) {
  const words = text.split(' '); // 将字符串按照空格分割成单词数组
  const segmentSize = Math.ceil(words.length / segmentCount); // 计算每段的单词数量

  const segments = [];
  let currentSegment = '';

  for (let i = 0; i < words.length; i++) {
    currentSegment += words[i] + ' '; // 将单词添加到当前段

    if ((i + 1) % segmentSize === 0 || i === words.length - 1) {
      segments.push(currentSegment.trim()); // 当达到每段单词数量或到达最后一个单词时，将当前段添加到段落数组
      currentSegment = ''; // 重置当前段
    }
  }

  return segments;
}

let i = 0;
http.createServer(function (req, res) {
  var fileName = "." + req.url;

  if (fileName === "./stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": '*',
    });
    res.write("retry: 10000\n");
    res.write("event: connecttime\n");
    res.write("data: " + (new Date()) + "\n\n");
    
    interval = setInterval(function () {
      res.write("data: " + text[i] + "\n\n");
      i++;
    }, 100);

    req.connection.addListener("close", function () {
      clearInterval(interval);
    }, false);
  }
}).listen(8844, "127.0.0.1");