/* Safe markdown for ask bubbles.
   Model text is untrusted: escape first, allow only a few tags, never make links. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.AskMarkdown = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ALLOWED_TAG = /^(?:<(?:p|strong|em|code|ul|ol|li|br|pre)>|<\/(?:p|strong|em|code|ul|ol|li|pre)>)$/;

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      if (ch === "&") return "&amp;";
      if (ch === "<") return "&lt;";
      if (ch === ">") return "&gt;";
      if (ch === "\"") return "&quot;";
      return "&#39;";
    });
  }

  function isCiteJson(raw) {
    var trimmed = String(raw || "").trim();
    if (!trimmed || trimmed.charAt(0) !== "{" || trimmed.charAt(trimmed.length - 1) !== "}") return false;
    try {
      var value = JSON.parse(trimmed);
      return !!value && typeof value === "object" && !Array.isArray(value) && Array.isArray(value.cite);
    } catch (error) {
      return false;
    }
  }

  function isFenceOpen(text, index) {
    if (index > 0 && text.charAt(index - 1) !== "\n") return false;
    var lineEnd = text.indexOf("\n", index);
    var line = lineEnd < 0 ? text.slice(index) : text.slice(index, lineEnd);
    return /^[ \t]*```/.test(line);
  }

  function readFence(text, start) {
    var lineEnd = text.indexOf("\n", start);
    if (lineEnd < 0) return { closed: false, end: text.length, inner: "" };
    var cursor = lineEnd + 1;
    while (cursor <= text.length) {
      var next = text.indexOf("\n", cursor);
      var line = next < 0 ? text.slice(cursor) : text.slice(cursor, next);
      if (/^[ \t]*```/.test(line)) {
        var end = next < 0 ? text.length : next + 1;
        return { closed: true, end: end, inner: text.slice(lineEnd + 1, cursor).replace(/\n$/, "") };
      }
      if (next < 0) break;
      cursor = next + 1;
    }
    return { closed: false, end: text.length, inner: text.slice(lineEnd + 1) };
  }

  function scanJsonObject(text, start) {
    var depth = 1;
    var inString = false;
    var escape = false;
    for (var i = start + 1; i < text.length; i++) {
      var ch = text.charAt(i);
      if (inString) {
        if (escape) {
          escape = false;
          continue;
        }
        if (ch === "\\") {
          escape = true;
          continue;
        }
        if (ch === "\"") inString = false;
        continue;
      }
      if (ch === "\"") {
        inString = true;
        continue;
      }
      if (ch === "{") {
        depth += 1;
        continue;
      }
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) return { kind: "object", end: i + 1 };
      }
    }
    return { kind: "incomplete" };
  }

  function skipWs(text, index) {
    var i = index;
    while (i < text.length && /\s/.test(text.charAt(i))) i += 1;
    return i;
  }

  function readJsonString(text, index) {
    var escape = false;
    for (var i = index + 1; i < text.length; i++) {
      var ch = text.charAt(i);
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === "\"") return i + 1;
    }
    return -1;
  }

  function couldBecomeCite(suffix) {
    if (!suffix || suffix.charAt(0) !== "{") return false;
    var i = skipWs(suffix, 1);
    if (i >= suffix.length) return true;
    if (suffix.charAt(i) !== "\"") return false;
    i += 1;
    var key = "cite";
    var k = 0;
    while (i < suffix.length && k < key.length && suffix.charAt(i) === key.charAt(k)) {
      i += 1;
      k += 1;
    }
    if (i >= suffix.length) return true;
    if (k !== key.length || suffix.charAt(i) !== "\"") return false;
    i += 1;
    i = skipWs(suffix, i);
    if (i >= suffix.length) return true;
    if (suffix.charAt(i) !== ":") return false;
    i += 1;
    i = skipWs(suffix, i);
    if (i >= suffix.length) return true;
    if (suffix.charAt(i) !== "[") return false;
    i += 1;
    var expectValue = true;
    while (i < suffix.length) {
      i = skipWs(suffix, i);
      if (i >= suffix.length) return true;
      var ch = suffix.charAt(i);
      if (ch === "]") {
        i = skipWs(suffix, i + 1);
        if (i >= suffix.length) return true;
        return suffix.charAt(i) === "}";
      }
      if (!expectValue && ch === ",") {
        expectValue = true;
        i += 1;
        continue;
      }
      if (ch !== "\"") return false;
      var closed = readJsonString(suffix, i);
      if (closed < 0) return true;
      i = closed;
      expectValue = false;
    }
    return true;
  }

  function startedCiteKey(suffix) {
    return /^\{\s*"c/.test(suffix);
  }

  function stripCiteMarkers(text, streaming) {
    var src = String(text == null ? "" : text);
    var out = "";
    var i = 0;
    while (i < src.length) {
      if (isFenceOpen(src, i)) {
        var fence = readFence(src, i);
        if (fence.closed) {
          if (isCiteJson(fence.inner)) {
            i = fence.end;
            continue;
          }
          out += src.slice(i, fence.end);
          i = fence.end;
          continue;
        }
        var inner = fence.inner.trim();
        if (isCiteJson(inner) || (couldBecomeCite(inner) && (streaming || startedCiteKey(inner)))) break;
        out += src.slice(i);
        break;
      }
      if (src.charAt(i) === "{") {
        var scanned = scanJsonObject(src, i);
        if (scanned.kind === "object") {
          var raw = src.slice(i, scanned.end);
          if (isCiteJson(raw)) {
            i = scanned.end;
            continue;
          }
          out += raw;
          i = scanned.end;
          continue;
        }
        var suffix = src.slice(i);
        if (couldBecomeCite(suffix) && (streaming || startedCiteKey(suffix))) break;
      }
      out += src.charAt(i);
      i += 1;
    }
    return out;
  }

  function isUl(line) {
    return /^\s*[-*+]\s+\S/.test(line);
  }

  function isOl(line) {
    return /^\s*\d{1,3}[.)]\s+\S/.test(line);
  }

  function hasEmphasis(line) {
    return /(^|[^\w*])\*[^\s*](?:[^*]|\*(?!\*))*\*/.test(line) ||
      /(^|[^A-Za-z0-9_])_[^\s_][^_\n]*_(?![A-Za-z0-9_])/.test(line);
  }

  function hasMarkdown(text) {
    if (text.indexOf("**") >= 0 || text.indexOf("__") >= 0 || text.indexOf("`") >= 0) return true;
    var lines = text.split("\n");
    for (var i = 0; i < lines.length; i++) {
      if (isUl(lines[i]) || isOl(lines[i]) || /^\s*```/.test(lines[i]) || hasEmphasis(lines[i])) return true;
    }
    return false;
  }

  function isWord(ch) {
    return /[A-Za-z0-9]/.test(ch);
  }

  function canOpenEm(text, index, marker) {
    var next = text.charAt(index + 1);
    if (!next || /\s/.test(next) || next === marker) return false;
    if (marker === "_") {
      var prev = index > 0 ? text.charAt(index - 1) : "";
      if (prev && isWord(prev)) return false;
    }
    return true;
  }

  function canCloseEm(text, index, marker) {
    var prev = index > 0 ? text.charAt(index - 1) : "";
    if (!prev || /\s/.test(prev)) return false;
    if (marker === "_") {
      var next = text.charAt(index + 1);
      if (next && isWord(next)) return false;
    }
    return true;
  }

  function renderInline(text) {
    var html = "";
    var i = 0;
    var stack = [];
    function top() {
      return stack.length ? stack[stack.length - 1] : null;
    }
    function closeKind(kind) {
      if (kind === "code") return "</code>";
      if (kind === "strong") return "</strong>";
      return "</em>";
    }
    while (i < text.length) {
      var current = top();
      if (current && current.kind === "code") {
        if (text.charAt(i) === "`") {
          html += "</code>";
          stack.pop();
        } else {
          html += escapeHtml(text.charAt(i));
        }
        i += 1;
        continue;
      }
      if (text.charAt(i) === "`") {
        html += "<code>";
        stack.push({ kind: "code", marker: "`" });
        i += 1;
        continue;
      }
      var pair = text.slice(i, i + 2);
      if (pair === "**" || pair === "__") {
        var next = text.charAt(i + 2);
        var prev = i > 0 ? text.charAt(i - 1) : "";
        if (current && current.kind === "strong" && current.marker === pair && prev && !/\s/.test(prev)) {
          html += "</strong>";
          stack.pop();
          i += 2;
          continue;
        }
        var strongOpen = false;
        for (var s = 0; s < stack.length; s++) {
          if (stack[s].kind === "strong") strongOpen = true;
        }
        if (!strongOpen && next && !/\s/.test(next)) {
          html += "<strong>";
          stack.push({ kind: "strong", marker: pair });
          i += 2;
          continue;
        }
      }
      var ch = text.charAt(i);
      if ((ch === "*" || ch === "_") && current && current.kind === "em" && current.marker === ch && canCloseEm(text, i, ch)) {
        html += "</em>";
        stack.pop();
        i += 1;
        continue;
      }
      var emOpen = false;
      for (var e = 0; e < stack.length; e++) {
        if (stack[e].kind === "em") emOpen = true;
      }
      if ((ch === "*" || ch === "_") && !emOpen && canOpenEm(text, i, ch)) {
        html += "<em>";
        stack.push({ kind: "em", marker: ch });
        i += 1;
        continue;
      }
      html += escapeHtml(ch);
      i += 1;
    }
    while (stack.length) html += closeKind(stack.pop().kind);
    return html;
  }

  function parseBlocks(text) {
    var lines = String(text || "").split("\n");
    var blocks = [];
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*```/.test(line)) {
        var body = [];
        i += 1;
        while (i < lines.length && !/^\s*```/.test(lines[i])) {
          body.push(lines[i]);
          i += 1;
        }
        if (i < lines.length) i += 1;
        blocks.push({ type: "pre", text: body.join("\n") });
        continue;
      }
      if (/^\s*$/.test(line)) {
        i += 1;
        continue;
      }
      if (isUl(line)) {
        var items = [];
        while (i < lines.length && isUl(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
          i += 1;
        }
        blocks.push({ type: "ul", items: items });
        continue;
      }
      if (isOl(line)) {
        var ordered = [];
        while (i < lines.length && isOl(lines[i])) {
          ordered.push(lines[i].replace(/^\s*\d{1,3}[.)]\s+/, ""));
          i += 1;
        }
        blocks.push({ type: "ol", items: ordered });
        continue;
      }
      var para = [];
      while (i < lines.length && lines[i].trim() && !isUl(lines[i]) && !isOl(lines[i]) && !/^\s*```/.test(lines[i])) {
        para.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: "p", lines: para });
    }
    return blocks;
  }

  function renderBlock(block) {
    if (block.type === "pre") return "<pre><code>" + escapeHtml(block.text) + "</code></pre>";
    if (block.type === "ul" || block.type === "ol") {
      var tag = block.type;
      return "<" + tag + ">" + block.items.map(function (item) {
        return "<li>" + renderInline(item) + "</li>";
      }).join("") + "</" + tag + ">";
    }
    return "<p>" + block.lines.map(renderInline).join("<br>") + "</p>";
  }

  function htmlIsSafe(html) {
    var source = String(html || "");
    var tags = source.match(/<\/?[A-Za-z][^>]*>/g) || [];
    for (var i = 0; i < tags.length; i++) {
      if (!ALLOWED_TAG.test(tags[i])) return false;
    }
    if (source.replace(/<\/?[A-Za-z][^>]*>/g, "").indexOf("<") >= 0) return false;
    return true;
  }

  function renderAnswer(cleaned) {
    if (!cleaned || !hasMarkdown(cleaned)) return escapeHtml(cleaned);
    return parseBlocks(cleaned).map(renderBlock).join("");
  }

  function answerHtml(text, options) {
    var streaming = !!(options && options.streaming);
    return renderAnswer(stripCiteMarkers(text, streaming));
  }

  function setClass(element, on) {
    if (!element || !element.classList) return;
    if (on) element.classList.add("ask-md");
    else element.classList.remove("ask-md");
  }

  function fillAnswer(element, text, options) {
    if (!element) return;
    var streaming = !!(options && options.streaming);
    var cleaned = stripCiteMarkers(text, streaming);
    if (!hasMarkdown(cleaned)) {
      setClass(element, false);
      element.innerHTML = "";
      element.textContent = cleaned;
      return;
    }
    var html = renderAnswer(cleaned);
    setClass(element, true);
    if (!htmlIsSafe(html)) {
      element.innerHTML = "";
      element.textContent = cleaned;
      return;
    }
    element.textContent = "";
    element.innerHTML = html;
  }

  return {
    escapeHtml: escapeHtml,
    answerHtml: answerHtml,
    fillAnswer: fillAnswer,
    htmlIsSafe: htmlIsSafe
  };
});
