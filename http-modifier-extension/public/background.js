importScripts("ruleContract.js", "backgroundCore.js");

const MAX_LOGS = 50;
const APPLICATION_STATUS_KEY = "ruleApplicationStatus";
const ATTACHED_TAB_IDS_KEY = "attachedTabIds";
const extensionOrigin = chrome.runtime.getURL("");
const attachedTabs = new Set();
let requestLogs = [];
let applicationGeneration = 0;
let updateQueue = Promise.resolve();

const errorMessage = (error) =>
  error instanceof Error
    ? error.message
    : String(error || "Unknown Chrome error");

const chromeCall = (invoke) =>
  new Promise((resolve, reject) => {
    invoke((result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(result);
    });
  });

const getLocal = (keys) =>
  chromeCall((callback) => chrome.storage.local.get(keys, callback));
const setLocal = (value) =>
  chromeCall((callback) => chrome.storage.local.set(value, callback));
const getSession = (keys) =>
  chromeCall((callback) => chrome.storage.session.get(keys, callback));
const setSession = (value) =>
  chromeCall((callback) => chrome.storage.session.set(value, callback));
const getDynamicRules = () =>
  chromeCall((callback) =>
    chrome.declarativeNetRequest.getDynamicRules(callback),
  );
const updateDynamicRules = (options) =>
  chromeCall((callback) =>
    chrome.declarativeNetRequest.updateDynamicRules(options, callback),
  );
const getDebuggerTargets = () =>
  chromeCall((callback) => chrome.debugger.getTargets(callback));
const attachDebuggerTarget = (target) =>
  chromeCall((callback) => chrome.debugger.attach(target, "1.3", callback));
const detachDebuggerTarget = (target) =>
  chromeCall((callback) => chrome.debugger.detach(target, callback));
const sendDebuggerCommand = (target, method, params) =>
  chromeCall((callback) =>
    chrome.debugger.sendCommand(target, method, params, callback),
  );

const isExtensionPage = (sender) => {
  if (sender.id !== chrome.runtime.id || typeof sender.url !== "string") {
    return false;
  }

  try {
    const senderUrl = new URL(sender.url);
    const expectedUrl = new URL(extensionOrigin);
    return (
      senderUrl.protocol === expectedUrl.protocol &&
      senderUrl.host === expectedUrl.host
    );
  } catch {
    return false;
  }
};

const isContentScript = (sender) =>
  sender.id === chrome.runtime.id &&
  Number.isInteger(sender.tab?.id) &&
  typeof sender.url === "string" &&
  !isExtensionPage(sender);

const isValidLogPayload = (log) => {
  if (!log || typeof log !== "object" || Array.isArray(log)) return false;
  if (
    Object.keys(log).some(
      (key) =>
        !["method", "ruleId", "type", "url", "mockResponse"].includes(key),
    )
  ) {
    return false;
  }

  return (
    typeof log.url === "string" &&
    log.url.length > 0 &&
    log.url.length <= 4096 &&
    typeof log.method === "string" &&
    log.method.length > 0 &&
    log.method.length <= 16 &&
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
    log.mockResponse.preview.length <= 100
  );
};

const addLog = (log) => {
  requestLogs.unshift({
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    tabId: Number.isInteger(log.tabId) ? log.tabId : null,
    tabUrl: String(log.tabUrl || "").slice(0, 4096),
    method: String(log.method || "").slice(0, 16),
    ruleId: String(log.ruleId || "").slice(0, 256),
    type: log.type,
    url: String(log.url || "").slice(0, 4096),
    mockResponse: {
      bodyLength:
        Number.isSafeInteger(log.mockResponse?.bodyLength) &&
        log.mockResponse.bodyLength >= 0
          ? log.mockResponse.bodyLength
          : 0,
      preview: String(log.mockResponse?.preview || "").slice(0, 100),
    },
  });
  requestLogs = requestLogs.slice(0, MAX_LOGS);
};

const updateRuleBadge = (statuses) => {
  const appliedCount = statuses.filter(
    (status) => status.state === "applied",
  ).length;
  chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
  chrome.action.setBadgeText({
    text: appliedCount > 0 ? String(appliedCount) : "",
  });
  chrome.action.setTitle({
    title: `HTTP Modifier Settings (${appliedCount} active header rules)`,
  });
};

const checkRegexSupport = (regex) =>
  chromeCall((callback) =>
    chrome.declarativeNetRequest.isRegexSupported(
      { regex, isCaseSensitive: true, requireCapturing: false },
      callback,
    ),
  );

const excludeUnsupportedRegexes = async (built) => {
  const supportedCandidates = [];
  const unsupportedErrors = new Map();

  for (const candidate of built.candidates) {
    const regex = candidate.dnrRule.condition.regexFilter;
    if (!regex) {
      supportedCandidates.push(candidate);
      continue;
    }

    try {
      const result = await checkRegexSupport(regex);
      if (result?.isSupported) {
        supportedCandidates.push(candidate);
      } else {
        unsupportedErrors.set(
          candidate.sourceRuleId,
          result?.reason || "Chrome does not support this regular expression.",
        );
      }
    } catch (error) {
      unsupportedErrors.set(
        candidate.sourceRuleId,
        `Unable to verify Chrome regex support: ${errorMessage(error)}`,
      );
    }
  }

  return {
    candidates: supportedCandidates,
    statuses: built.statuses.map((status) =>
      unsupportedErrors.has(status.sourceRuleId)
        ? {
            sourceRuleId: status.sourceRuleId,
            state: "invalid",
            errors: {
              urlPattern: unsupportedErrors.get(status.sourceRuleId),
            },
          }
        : status,
    ),
  };
};

const applyRules = async (generation) => {
  const { rules = [] } = await getLocal(["rules"]);
  const built = await excludeUnsupportedRegexes(
    globalThis.HttpModifierBackgroundCore.buildDnrCandidates(rules),
  );
  const existingRules = await getDynamicRules();
  const result = await globalThis.HttpModifierBackgroundCore.applyDnrCandidates(
    built,
    updateDynamicRules,
    existingRules.map((rule) => rule.id),
  );

  if (generation !== applicationGeneration) return;

  const status = {
    generation,
    timestamp: Date.now(),
    globalError: result.globalError,
    existingRulesPreserved: result.existingRulesPreserved,
    statuses: result.statuses,
  };
  await setLocal({ [APPLICATION_STATUS_KEY]: status });
  updateRuleBadge(result.statuses);
};

const queueRuleUpdate = () => {
  const generation = ++applicationGeneration;
  updateQueue = updateQueue
    .then(
      () => applyRules(generation),
      () => applyRules(generation),
    )
    .catch(async (error) => {
      console.error("HTTP Modifier: Failed to apply rules", error);
      if (generation !== applicationGeneration) return;

      await setLocal({
        [APPLICATION_STATUS_KEY]: {
          generation,
          timestamp: Date.now(),
          globalError: errorMessage(error),
          statuses: [],
        },
      }).catch((storageError) => {
        console.error(
          "HTTP Modifier: Failed to persist rule application error",
          storageError,
        );
      });
      updateRuleBadge([]);
    });
  return updateQueue;
};

const persistAttachedTabs = () =>
  setSession({ [ATTACHED_TAB_IDS_KEY]: Array.from(attachedTabs) });

const reconcileAttachedTabs = async () => {
  const [{ [ATTACHED_TAB_IDS_KEY]: storedTabIds = [] }, targets] =
    await Promise.all([
      getSession([ATTACHED_TAB_IDS_KEY]),
      getDebuggerTargets(),
    ]);
  const liveTabIds = new Set(
    targets
      .filter((target) => target.attached && Number.isInteger(target.tabId))
      .map((target) => target.tabId),
  );

  attachedTabs.clear();
  for (const tabId of Array.isArray(storedTabIds) ? storedTabIds : []) {
    if (Number.isInteger(tabId) && liveTabIds.has(tabId)) {
      attachedTabs.add(tabId);
    }
  }
  await persistAttachedTabs();
};

const isDebuggerAttached = (tabId) =>
  globalThis.HttpModifierBackgroundCore.verifyDebuggerAttachment(
    tabId,
    getDebuggerTargets,
  );

const isManagedDebuggerAttached = async (tabId) => {
  if (!attachedTabs.has(tabId)) return false;
  if (await isDebuggerAttached(tabId)) return true;

  attachedTabs.delete(tabId);
  await persistAttachedTabs();
  return false;
};

const attachDebugger = async (tabId) => {
  if (!Number.isInteger(tabId)) {
    return { success: false, error: "Select a valid browser tab." };
  }
  if (await isManagedDebuggerAttached(tabId)) return { success: true };
  if (await isDebuggerAttached(tabId)) {
    return {
      success: false,
      error: "This tab is already attached to another debugger client.",
    };
  }

  const target = { tabId };
  try {
    await attachDebuggerTarget(target);
    if (!(await isDebuggerAttached(tabId))) {
      throw new Error("Chrome did not confirm the debugger attachment.");
    }
    await sendDebuggerCommand(target, "Fetch.enable", {
      patterns: [{ urlPattern: "*", requestStage: "Request" }],
    });
    attachedTabs.add(tabId);
    await persistAttachedTabs();
    return { success: true };
  } catch (error) {
    attachedTabs.delete(tabId);
    await persistAttachedTabs();
    if (await isDebuggerAttached(tabId).catch(() => false)) {
      await detachDebuggerTarget(target).catch(() => {});
    }
    return {
      success: false,
      error: errorMessage(error),
    };
  }
};

const detachDebugger = async (tabId) => {
  if (!Number.isInteger(tabId)) {
    return { success: false, error: "Select a valid browser tab." };
  }

  try {
    if (await isManagedDebuggerAttached(tabId)) {
      await detachDebuggerTarget({ tabId });
    }
    attachedTabs.delete(tabId);
    await persistAttachedTabs();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Debugger detach failed.",
    };
  }
};

const notifyTab = (tabId, type) => {
  chrome.tabs.sendMessage(tabId, { type }, () => void chrome.runtime.lastError);
};

const continuePausedRequest = (source, requestId) =>
  sendDebuggerCommand(source, "Fetch.continueRequest", { requestId });

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method !== "Fetch.requestPaused") return;

  getLocal(["rules"])
    .then(({ rules = [] }) =>
      globalThis.HttpModifierBackgroundCore.handlePausedRequest({
        source,
        params,
        rules,
        sendCommand: sendDebuggerCommand,
        onMock: ({ rule, request }) =>
          addLog({
            tabId: source.tabId,
            tabUrl: request.url,
            method: request.method,
            ruleId: rule.id,
            type: "debugger",
            url: request.url,
            mockResponse: {
              bodyLength: rule.responseBody.length,
              preview: rule.responseBody.slice(0, 100),
            },
          }),
      }),
    )
    .then((outcome) => {
      if (outcome.outcome === "failed") {
        console.error(
          "HTTP Modifier: Paused request could not resume",
          outcome,
        );
      }
    })
    .catch(async (error) => {
      console.error("HTTP Modifier: Failed to process paused request", error);
      try {
        await continuePausedRequest(source, params?.requestId);
      } catch (continueError) {
        console.error(
          "HTTP Modifier: Paused request fallback failed",
          continueError,
        );
      }
    });
});

chrome.debugger.onDetach.addListener((source) => {
  attachedTabs.delete(source.tabId);
  persistAttachedTabs().catch(() => {});
  notifyTab(source.tabId, "DEBUGGER_MODE_DISABLED");
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.rules) queueRuleUpdate();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.remove(["debuggerEnabled", "user"]);
  queueRuleUpdate();
});

chrome.runtime.onStartup.addListener(() => {
  reconcileAttachedTabs().catch(() => {});
  queueRuleUpdate();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !message?.type) return false;

  if (message.type === "LOG_REQUEST") {
    if (!isContentScript(sender) || !isValidLogPayload(message.payload)) {
      return false;
    }
    addLog({
      ...message.payload,
      tabId: sender.tab.id,
      tabUrl: sender.tab.url || sender.url,
    });
    return false;
  }

  if (message.type === "GET_DEBUGGER_STATUS" && isContentScript(sender)) {
    isManagedDebuggerAttached(sender.tab.id)
      .then((enabled) => sendResponse({ enabled }))
      .catch((error) =>
        sendResponse({ enabled: false, error: errorMessage(error) }),
      );
    return true;
  }

  if (!isExtensionPage(sender)) return false;

  if (message.type === "GET_DEBUGGER_STATUS") {
    isManagedDebuggerAttached(message.tabId)
      .then((enabled) => sendResponse({ enabled }))
      .catch((error) =>
        sendResponse({ enabled: false, error: errorMessage(error) }),
      );
    return true;
  }

  if (message.type === "GET_LOGS") {
    sendResponse({ logs: requestLogs });
    return false;
  }
  if (message.type === "CLEAR_LOGS") {
    requestLogs = [];
    sendResponse({ success: true });
    return false;
  }
  if (message.type === "ENABLE_DEBUGGER") {
    attachDebugger(message.tabId).then((result) => {
      if (result.success) notifyTab(message.tabId, "DEBUGGER_MODE_ENABLED");
      sendResponse(result);
    });
    return true;
  }
  if (message.type === "DISABLE_DEBUGGER") {
    detachDebugger(message.tabId).then((result) => {
      if (result.success) notifyTab(message.tabId, "DEBUGGER_MODE_DISABLED");
      sendResponse(result);
    });
    return true;
  }

  return false;
});

reconcileAttachedTabs().catch((error) => {
  console.error("HTTP Modifier: Failed to reconcile debugger sessions", error);
});
queueRuleUpdate();
