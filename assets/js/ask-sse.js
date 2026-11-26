/* Ask protocol helpers. Contract version 1: docs/ask/contract.md.
   Parsing, request shaping, and turn state. No network and no DOM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.AskProtocol = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var URL_RE = /^\/(about\/|posts\/[A-Za-z0-9][A-Za-z0-9._-]*\/)$/;
  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  var VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  var KNOWN_EVENTS = { meta: 1, token: 1, sources: 1, done: 1, error: 1 };

  var TEXT = {
    network: "网络异常，这次没有收到完整回答。",
    unconfigured: "问答服务尚未配置。",
    tooLong: "问题太长。",
    tooBig: "请求太大。",
    timeout: "回答超时，已停止等待。",
    stopped: "已停止",
    quota: "已达到 20 次上限"
  };

  var LIMITS = {
    question: 2000,
    history: 6,
    content: 4000,
    sourceIds: 8,
    sourceId: 64,
    title: 120,
    heading: 160,
    version: 64,
    bodyBytes: 32768,
    remainingMax: 19,
    timeoutMs: 25000
  };

  function clipChars(value, max) {
    var chars = Array.from(String(value == null ? "" : value));
    if (chars.length <= max) return chars.join("");
    return chars.slice(0, max).join("");
  }

  function charLength(value) {
    return Array.from(String(value == null ? "" : value)).length;
  }

  function utf8Bytes(value) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value).length;
    return unescape(encodeURIComponent(value)).length;
  }

  function readRemaining(value) {
    if (typeof value !== "number" || !Number.isInteger(value)) return null;
    if (value < 0 || value > LIMITS.remainingMax) return null;
    return value;
  }

  function readKnowledgeVersion(value) {
    if (typeof value !== "string") return null;
    if (value.length < 1 || value.length > LIMITS.version) return null;
    if (!VERSION_RE.test(value)) return null;
    return value;
  }

  function isSourceId(value) {
    return typeof value === "string" && value.length >= 1 && value.length <= LIMITS.sourceId && ID_RE.test(value);
  }

  function validateSource(raw, seen) {
    if (!raw || typeof raw !== "object") return null;
    var url = typeof raw.url === "string" ? raw.url : "";
    if (!URL_RE.test(url)) return null;
    if (seen && seen[url]) return null;
    var title = typeof raw.title === "string" ? clipChars(raw.title, LIMITS.title) : "";
    if (!title) return null;
    var heading = typeof raw.heading === "string" ? clipChars(raw.heading, LIMITS.heading) : "";
    var id = isSourceId(raw.id) ? raw.id : "";
    if (seen) seen[url] = true;
    return { id: id, title: title, url: url, heading: heading };
  }

  function acceptSources(list) {
    var seen = {};
    var accepted = [];
    if (!Array.isArray(list)) return accepted;
    list.forEach(function (item) {
      var source = validateSource(item, seen);
      if (source) accepted.push(source);
    });
    return accepted;
  }

  function parseBlock(block) {
    if (!block || !String(block).trim()) return null;
    var eventName = "message";
    var dataLines = [];
    var lines = String(block).split("\n");
    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      if (!line || !line.trim()) continue;
      if (line.charAt(0) === ":") continue;
      if (line.indexOf("event:") === 0) {
        eventName = line.slice(6).trim() || "message";
        continue;
      }
      if (line.indexOf("data:") === 0) {
        var value = line.slice(5);
        if (value.charAt(0) === " ") value = value.slice(1);
        dataLines.push(value);
      }
    }
    if (!dataLines.length) return null;
    try {
      var data = JSON.parse(dataLines.join("\n"));
      if (!data || typeof data !== "object") return null;
      return { event: eventName, data: data };
    } catch (error) {
      return null;
    }
  }

  function normalizeNewlines(value) {
    return String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function blocksFrom(buffer, flush) {
    var text = normalizeNewlines(buffer);
    var parts = text.split("\n\n");
    var rest = "";
    if (!flush) rest = parts.pop();
    var events = [];
    parts.forEach(function (part) {
      var event = parseBlock(part);
      if (event) events.push(event);
    });
    return { events: events, rest: rest };
  }

  function parseSse(text) {
    return blocksFrom(text, true).events;
  }

  function createParser() {
    var buffer = "";
    return {
      push: function (chunk) {
        buffer += chunk == null ? "" : String(chunk);
        if (buffer.charAt(buffer.length - 1) === "\r") {
          var held = buffer.slice(0, -1);
          var drained = blocksFrom(held, false);
          buffer = drained.rest + "\r";
          return drained.events;
        }
        var drainedFull = blocksFrom(buffer, false);
        buffer = drainedFull.rest;
        return drainedFull.events;
      },
      finish: function () {
        var drained = blocksFrom(buffer, true);
        buffer = "";
        return drained.events;
      }
    };
  }

  function createTurn() {
    return {
      text: "",
      sources: [],
      sourceIds: [],
      remaining: null,
      knowledgeVersion: null,
      pending: true,
      stopped: false,
      stopKind: "",
      errorText: "",
      terminal: false,
      complete: false,
      failed: false,
      quota: false,
      sawMeta: false,
      sawSources: false
    };
  }

  function sourceIdsOf(sources) {
    var ids = [];
    (sources || []).forEach(function (source) {
      if (ids.length >= LIMITS.sourceIds) return;
      if (source && isSourceId(source.id)) ids.push(source.id);
    });
    return ids;
  }

  function applySseEvent(turn, event) {
    if (!turn || turn.terminal) return turn;
    if (!event || !KNOWN_EVENTS[event.event]) return turn;
    var data = event.data;
    if (!data || typeof data !== "object") return turn;
    if (event.event === "meta") {
      if (turn.sawMeta) return turn;
      turn.sawMeta = true;
      var remaining = readRemaining(data.remaining);
      if (remaining !== null) turn.remaining = remaining;
      var version = readKnowledgeVersion(data.knowledgeVersion);
      if (version) turn.knowledgeVersion = version;
      return turn;
    }
    if (event.event === "token") {
      if (typeof data.text === "string" && data.text) turn.text += data.text;
      return turn;
    }
    if (event.event === "sources") {
      if (turn.sawSources) return turn;
      turn.sawSources = true;
      turn.sources = acceptSources(data.sources);
      turn.sourceIds = sourceIdsOf(turn.sources);
      return turn;
    }
    if (event.event === "done") {
      turn.pending = false;
      turn.terminal = true;
      turn.complete = true;
      return turn;
    }
    turn.pending = false;
    turn.terminal = true;
    turn.failed = true;
    turn.complete = false;
    turn.errorText = typeof data.message === "string" && data.message ? data.message : TEXT.network;
    return turn;
  }

  function interpretHttp(status, bodyText) {
    var parsed = null;
    if (typeof bodyText === "string" && bodyText) {
      try {
        parsed = JSON.parse(bodyText);
      } catch (error) {
        parsed = null;
      }
    }
    var valid = parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
      typeof parsed.message === "string" && typeof parsed.error === "string";
    if (!valid) {
      return { message: TEXT.network, remaining: null, hasRemaining: false, quota: false };
    }
    if (status === 503) {
      return { message: TEXT.unconfigured, remaining: null, hasRemaining: false, quota: false };
    }
    if (status === 429) {
      var quotaRemaining = readRemaining(parsed.remaining);
      return {
        message: parsed.message,
        remaining: quotaRemaining === null ? 0 : quotaRemaining,
        hasRemaining: true,
        quota: true
      };
    }
    if (status === 502) {
      var upstreamRemaining = readRemaining(parsed.remaining);
      return {
        message: parsed.message,
        remaining: upstreamRemaining,
        hasRemaining: upstreamRemaining !== null,
        quota: false
      };
    }
    return { message: parsed.message, remaining: null, hasRemaining: false, quota: false };
  }

  function applyHttp(turn, interpreted) {
    turn.pending = false;
    turn.terminal = true;
    turn.failed = true;
    turn.complete = false;
    turn.text = interpreted.message;
    turn.errorText = "";
    turn.sources = [];
    turn.sourceIds = [];
    if (interpreted.hasRemaining) turn.remaining = interpreted.remaining;
    turn.quota = !!interpreted.quota;
    return turn;
  }

  function applyStop(turn) {
    if (!turn || turn.terminal) return turn;
    turn.pending = false;
    turn.terminal = true;
    turn.stopped = true;
    turn.stopKind = "user";
    turn.complete = false;
    if (!turn.text) turn.text = "";
    return turn;
  }

  function applyTimeout(turn) {
    if (!turn || turn.terminal) return turn;
    turn.pending = false;
    turn.terminal = true;
    turn.stopped = true;
    turn.stopKind = "timeout";
    turn.complete = false;
    turn.text = TEXT.timeout;
    return turn;
  }

  function applyIncomplete(turn) {
    if (!turn || turn.terminal) return turn;
    turn.pending = false;
    turn.terminal = true;
    turn.failed = true;
    turn.complete = false;
    turn.errorText = TEXT.network;
    return turn;
  }

  function applyUnconfigured(turn) {
    turn.pending = false;
    turn.terminal = true;
    turn.failed = true;
    turn.complete = false;
    turn.text = TEXT.unconfigured;
    turn.errorText = "";
    turn.sources = [];
    turn.sourceIds = [];
    return turn;
  }

  function applyLocalMessage(turn, message) {
    turn.pending = false;
    turn.terminal = true;
    turn.failed = true;
    turn.complete = false;
    turn.text = message;
    turn.errorText = "";
    turn.sources = [];
    turn.sourceIds = [];
    return turn;
  }

  function remainingLabel(value) {
    if (typeof value !== "number" || !Number.isInteger(value)) return "";
    if (value > 0) return "还可问 " + value + " 次";
    if (value === 0) return TEXT.quota;
    return "";
  }

  function greetingForHour(hour) {
    var value = Number(hour);
    if (value >= 5 && value < 12) return "上午好";
    if (value >= 12 && value < 18) return "下午好";
    return "晚上好";
  }

  function resolveEndpoint(raw) {
    var value = String(raw == null ? "" : raw).trim();
    if (!value) return "";
    var url;
    try {
      url = new URL(value);
    } catch (error) {
      return "";
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    var path = url.pathname || "/";
    path = path.replace(/\/+$/, "");
    if (path.slice(-4) !== "/ask") path += "/ask";
    if (path.charAt(0) !== "/") path = "/" + path;
    return url.origin + path + url.search;
  }

  function hasMockQuery(search) {
    var text = String(search || "");
    if (text.charAt(0) === "?") text = text.slice(1);
    if (!text) return false;
    var parts = text.split("&");
    for (var i = 0; i < parts.length; i += 1) {
      var key = parts[i].split("=")[0];
      try {
        key = decodeURIComponent(key);
      } catch (error) {
        key = parts[i].split("=")[0];
      }
      if (key === "ask-mock") return true;
    }
    return false;
  }

  function readMockScenario(search) {
    var text = String(search || "");
    if (text.charAt(0) === "?") text = text.slice(1);
    var parts = text.split("&");
    for (var i = 0; i < parts.length; i += 1) {
      if (!parts[i]) continue;
      var pair = parts[i].split("=");
      var key = pair[0];
      try {
        key = decodeURIComponent(key);
      } catch (error) {
        key = pair[0];
      }
      if (key !== "ask-mock") continue;
      var value = pair.slice(1).join("=");
      try {
        value = decodeURIComponent(value.replace(/\+/g, " "));
      } catch (error) {
        value = pair.slice(1).join("=");
      }
      return value || "normal";
    }
    return "";
  }

  function resolveMode(input) {
    var data = input || {};
    if (String(data.askDemo) === "true") return "demo";
    var transport = String(data.askTransport || "");
    if (transport === "mock" || hasMockQuery(data.search)) return "mock";
    if (!resolveEndpoint(data.askApi)) return "unconfigured";
    return "api";
  }

  function createHistory(messages) {
    var items = [];
    (messages || []).forEach(function (message) {
      if (!message) return;
      if (message.role !== "user" && message.role !== "assistant") return;
      if (message.role === "assistant") {
        if (!message.complete || message.pending || message.stopped || message.failed) return;
      }
      var content = clipChars(message.text != null ? message.text : message.content, LIMITS.content);
      var item = { role: message.role, content: content, sourceIds: [] };
      if (message.role === "assistant" && Array.isArray(message.sourceIds)) {
        message.sourceIds.forEach(function (id) {
          if (item.sourceIds.length >= LIMITS.sourceIds) return;
          if (isSourceId(id)) item.sourceIds.push(id);
        });
      }
      items.push(item);
    });
    if (items.length > LIMITS.history) items = items.slice(items.length - LIMITS.history);
    return items;
  }

  function createRequest(question, priorMessages) {
    var trimmed = String(question == null ? "" : question).trim();
    if (!trimmed) return { ok: false, code: "empty" };
    if (charLength(trimmed) > LIMITS.question) {
      return { ok: false, code: "long", message: TEXT.tooLong };
    }
    var body = { question: trimmed, history: createHistory(priorMessages) };
    var json = JSON.stringify(body);
    if (utf8Bytes(json) > LIMITS.bodyBytes) {
      return { ok: false, code: "large", message: TEXT.tooBig };
    }
    return { ok: true, body: body, json: json };
  }

  function historyEndpoint(endpoint) {
    var value = String(endpoint || "").trim();
    if (!value) return "";
    var url;
    try {
      url = new URL(value);
    } catch (error) {
      return "";
    }
    var path = (url.pathname || "/").replace(/\/+$/, "");
    if (path.slice(-4) !== "/ask") return "";
    return url.origin + path + "/history";
  }

  function historyPathname(value) {
    try {
      return new URL(value).pathname.replace(/\/+$/, "") || "/";
    } catch (error) {
      return "";
    }
  }

  function isAskHistoryUrl(value) {
    return historyPathname(value) === "/ask/history";
  }

  function isSameHistoryPath(left, right) {
    var path = historyPathname(left);
    if (path !== "/ask/history" || path !== historyPathname(right)) return false;
    try {
      return new URL(left).origin === new URL(right).origin;
    } catch (error) {
      return false;
    }
  }

  function historyRequestUrl(endpoint) {
    var value = historyEndpoint(endpoint);
    if (!value) return "";
    var url = new URL(value);
    url.searchParams.set("ask_cache", String(Date.now()));
    return url.href;
  }

  function createHistoryFetchInit() {
    return {
      method: "GET",
      credentials: "omit",
      cache: "no-store",
      headers: { Accept: "application/json" }
    };
  }

  function parseHistoryResponse(payload) {
    if (!payload || typeof payload !== "object") return null;
    var remaining = payload.remaining;
    if (typeof remaining !== "number" || !Number.isInteger(remaining) || remaining < 0 || remaining > 20) return null;
    if (!Array.isArray(payload.messages)) return null;
    var messages = [];
    payload.messages.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      if (item.role !== "user" && item.role !== "assistant") return;
      if (typeof item.content !== "string") return;
      var content = clipChars(item.content, LIMITS.content);
      if (item.role === "user") {
        messages.push({ role: "user", content: content });
        return;
      }
      messages.push({ role: "assistant", content: content, sources: acceptSources(item.sources) });
    });
    if (messages.length > 40) messages = messages.slice(messages.length - 40);
    var day = typeof payload.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(payload.day) ? payload.day : "";
    return { day: day, remaining: remaining, messages: messages };
  }

  function createFetchInit(json, signal) {
    var init = {
      method: "POST",
      credentials: "omit",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream"
      },
      body: json
    };
    if (signal) init.signal = signal;
    return init;
  }

  function reduceEvents(events) {
    var turn = createTurn();
    (events || []).forEach(function (event) {
      applySseEvent(turn, event);
    });
    return turn;
  }

  return {
    URL_RE: URL_RE,
    TEXT: TEXT,
    LIMITS: LIMITS,
    clipChars: clipChars,
    charLength: charLength,
    utf8Bytes: utf8Bytes,
    readRemaining: readRemaining,
    validateSource: validateSource,
    acceptSources: acceptSources,
    parseBlock: parseBlock,
    parseSse: parseSse,
    createParser: createParser,
    createTurn: createTurn,
    applySseEvent: applySseEvent,
    interpretHttp: interpretHttp,
    applyHttp: applyHttp,
    applyStop: applyStop,
    applyTimeout: applyTimeout,
    applyIncomplete: applyIncomplete,
    applyUnconfigured: applyUnconfigured,
    applyLocalMessage: applyLocalMessage,
    remainingLabel: remainingLabel,
    greetingForHour: greetingForHour,
    resolveEndpoint: resolveEndpoint,
    historyEndpoint: historyEndpoint,
    isAskHistoryUrl: isAskHistoryUrl,
    isSameHistoryPath: isSameHistoryPath,
    historyRequestUrl: historyRequestUrl,
    createHistoryFetchInit: createHistoryFetchInit,
    parseHistoryResponse: parseHistoryResponse,
    hasMockQuery: hasMockQuery,
    readMockScenario: readMockScenario,
    resolveMode: resolveMode,
    createHistory: createHistory,
    createRequest: createRequest,
    createFetchInit: createFetchInit,
    reduceEvents: reduceEvents
  };
});
