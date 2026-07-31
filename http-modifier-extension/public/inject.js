(() => {
  const rulesContract = globalThis.HttpModifierRules;
  const fetchRuntime = globalThis.HttpModifierFetch;
  const xhrRuntime = globalThis.HttpModifierXhr;

  if (
    typeof rulesContract?.normalizeRule !== "function" ||
    typeof rulesContract?.findMatchingResponseRule !== "function" ||
    typeof fetchRuntime?.createFetchMock !== "function" ||
    typeof xhrRuntime?.createXhrMock !== "function"
  ) {
    throw new Error("HTTP Modifier runtime failed to initialize.");
  }

  let rules = [];
  let debuggerEnabled = false;
  let channelToken = null;

  const sendLog = (log) => {
    if (!channelToken) return;
    window.postMessage({ type: "HTTP_MODIFIER_LOG", channelToken, log }, "*");
  };

  const acceptRules = (value) => {
    if (!Array.isArray(value)) return null;

    const acceptedRules = [];
    for (const sourceRule of value) {
      const rule = rulesContract.normalizeRule(sourceRule);
      if (
        rule.type !== "response" ||
        rule.enabled === false ||
        !rulesContract.validateRule(rule).valid
      ) {
        return null;
      }
      acceptedRules.push(rule);
    }
    return acceptedRules;
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window || !event.data) return;
    if (
      event.data.type === "HTTP_MODIFIER_INIT" &&
      typeof event.data.channelToken === "string"
    ) {
      if (channelToken && event.data.channelToken !== channelToken) return;
      channelToken = event.data.channelToken;
      window.postMessage({ type: "HTTP_MODIFIER_ACK", channelToken }, "*");
      return;
    }
    if (!channelToken || event.data.channelToken !== channelToken) return;

    if (event.data.type === "HTTP_MODIFIER_RULES_UPDATE") {
      const acceptedRules = acceptRules(event.data.rules);
      if (acceptedRules) rules = acceptedRules;
      return;
    }

    if (
      event.data.type === "HTTP_MODIFIER_DEBUGGER_MODE" &&
      typeof event.data.enabled === "boolean"
    ) {
      debuggerEnabled = event.data.enabled;
    }
  });

  const environment = {
    Response: window.Response,
    Request: window.Request,
    URL: window.URL,
    Event: window.Event,
    DOMException: window.DOMException,
    baseUrl: window.location.href,
    getRules: () => rules,
    isDebuggerEnabled: () => debuggerEnabled,
    rulesContract,
    sendLog,
  };

  window.fetch = fetchRuntime.createFetchMock(window.fetch, environment);
  window.XMLHttpRequest = xhrRuntime.createXhrMock(
    window.XMLHttpRequest,
    environment,
  );

  delete globalThis.HttpModifierRules;
  delete globalThis.HttpModifierFetch;
  delete globalThis.HttpModifierXhr;

  window.postMessage({ type: "HTTP_MODIFIER_READY" }, "*");
})();
