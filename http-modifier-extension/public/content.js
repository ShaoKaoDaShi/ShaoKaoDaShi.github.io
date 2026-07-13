(() => {
  const channelToken = crypto.randomUUID();
  const { normalizeRule, validateRule } = globalThis.HttpModifierRules;
  const MAX_URL_LENGTH = 4096;
  const MAX_METHOD_LENGTH = 16;
  const MAX_PREVIEW_LENGTH = 100;
  let handshakeComplete = false;
  let latestRules = [];
  let debuggerEnabled = false;

  const postToMainWorld = (type, payload = {}) => {
    window.postMessage({ type, channelToken, ...payload }, "*");
  };

  const sendState = () => {
    postToMainWorld("HTTP_MODIFIER_RULES_UPDATE", { rules: latestRules });
    postToMainWorld("HTTP_MODIFIER_DEBUGGER_MODE", {
      enabled: debuggerEnabled,
    });
  };

  const initializeMainWorld = () => {
    postToMainWorld("HTTP_MODIFIER_INIT");
    if (handshakeComplete) sendState();
  };

  const isValidLogPayload = (log) => {
    if (!log || typeof log !== "object" || Array.isArray(log)) return false;
    const keys = Object.keys(log);
    if (
      keys.some(
        (key) =>
          !["method", "ruleId", "type", "url", "mockResponse"].includes(key),
      )
    ) {
      return false;
    }

    return (
      typeof log.url === "string" &&
      log.url.length > 0 &&
      log.url.length <= MAX_URL_LENGTH &&
      typeof log.method === "string" &&
      log.method.length > 0 &&
      log.method.length <= MAX_METHOD_LENGTH &&
      ["fetch", "xhr"].includes(log.type) &&
      typeof log.ruleId === "string" &&
      log.ruleId.length > 0 &&
      log.ruleId.length <= 256 &&
      log.mockResponse &&
      typeof log.mockResponse === "object" &&
      !Array.isArray(log.mockResponse) &&
      Object.keys(log.mockResponse).every((key) =>
        ["bodyLength", "preview"].includes(key),
      ) &&
      Number.isSafeInteger(log.mockResponse.bodyLength) &&
      log.mockResponse.bodyLength >= 0 &&
      typeof log.mockResponse.preview === "string" &&
      log.mockResponse.preview.length <= MAX_PREVIEW_LENGTH
    );
  };

  const sendRules = () => {
    chrome.storage.local.get(["rules"], (result) => {
      if (chrome.runtime.lastError) return;

      latestRules = (Array.isArray(result.rules) ? result.rules : [])
        .map(normalizeRule)
        .filter(
          (rule) =>
            rule.type === "response" &&
            rule.enabled !== false &&
            validateRule(rule).valid,
        );
      if (handshakeComplete) sendState();
    });
  };

  const sendDebuggerStatus = () => {
    chrome.runtime.sendMessage({ type: "GET_DEBUGGER_STATUS" }, (response) => {
      if (chrome.runtime.lastError || !response) return;
      debuggerEnabled = response.enabled === true;
      if (handshakeComplete) sendState();
    });
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;

    if (event.data.type === "HTTP_MODIFIER_READY") {
      initializeMainWorld();
      return;
    }
    if (
      event.data.type === "HTTP_MODIFIER_ACK" &&
      event.data.channelToken === channelToken
    ) {
      handshakeComplete = true;
      sendState();
      return;
    }
    if (
      event.data.type !== "HTTP_MODIFIER_LOG" ||
      event.data.channelToken !== channelToken ||
      !isValidLogPayload(event.data.log)
    ) {
      return;
    }

    chrome.runtime.sendMessage(
      { type: "LOG_REQUEST", payload: event.data.log },
      () => void chrome.runtime.lastError,
    );
  });

  chrome.runtime.onMessage.addListener((message, sender) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message?.type === "DEBUGGER_MODE_ENABLED") {
      debuggerEnabled = true;
      if (handshakeComplete) sendState();
    } else if (message?.type === "DEBUGGER_MODE_DISABLED") {
      debuggerEnabled = false;
      if (handshakeComplete) sendState();
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.rules) sendRules();
  });

  const handshakeTimer = setInterval(() => {
    if (handshakeComplete) {
      clearInterval(handshakeTimer);
      return;
    }
    initializeMainWorld();
  }, 50);
  initializeMainWorld();
  sendRules();
  sendDebuggerStatus();
})();
