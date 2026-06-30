// background.js

let requestLogs = [];
const MAX_LOGS = 50;
let attachedTabs = new Set();

// Load attached tabs from session storage on startup
if (chrome.storage.session) {
  chrome.storage.session.get(["attachedTabIds"], (result) => {
    if (result.attachedTabIds) {
      attachedTabs = new Set(result.attachedTabIds);
    }
  });
}

async function updateSession() {
  if (chrome.storage.session) {
    await chrome.storage.session.set({
      attachedTabIds: Array.from(attachedTabs),
    });
  }
}

function updateRuleBadge(rules) {
  const enabledRuleCount = rules.filter(
    (rule) => rule.enabled !== false,
  ).length;

  chrome.action.setBadgeBackgroundColor({ color: "#2563eb" });
  chrome.action.setBadgeText({
    text: enabledRuleCount > 0 ? String(enabledRuleCount) : "",
  });
  chrome.action.setTitle({
    title: `HTTP Modifier Settings (${enabledRuleCount} enabled rules)`,
  });
}

function updateRules() {
  chrome.storage.local.get(["rules"], (result) => {
    const rules = result.rules || [];
    updateRuleBadge(rules);

    const headerRules = rules.filter(
      (r) => r.type === "header" && r.enabled !== false,
    );

    // Convert to DNR rules
    const dnrRules = headerRules.map((rule, index) => {
      const id = index + 1; // DNR rule IDs must be integers

      const action = {
        type: "modifyHeaders",
      };

      const headerOperation = rule.operation; // set, remove, append
      const headerInfo = {
        header: rule.headerName,
        operation: headerOperation,
        value: headerOperation === "remove" ? undefined : rule.headerValue,
      };

      if (rule.actionType === "request") {
        action.requestHeaders = [headerInfo];
      } else {
        action.responseHeaders = [headerInfo];
      }

      // Determine condition
      const condition = {
        resourceTypes: [
          "main_frame",
          "sub_frame",
          "stylesheet",
          "script",
          "image",
          "font",
          "object",
          "xmlhttprequest",
          "ping",
          "csp_report",
          "media",
          "websocket",
          "other",
        ],
      };

      if (/[^a-zA-Z0-9/._:?-]/.test(rule.urlPattern)) {
        condition.regexFilter = rule.urlPattern;
      } else {
        condition.urlFilter = rule.urlPattern;
      }

      return {
        id: id,
        priority: 1,
        action: action,
        condition: condition,
      };
    });

    // Update dynamic rules
    chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
      const removeRuleIds = existingRules.map((r) => r.id);
      chrome.declarativeNetRequest.updateDynamicRules(
        {
          removeRuleIds: removeRuleIds,
          addRules: dnrRules,
        },
        () => {
          if (chrome.runtime.lastError) {
            console.error("Error updating rules:", chrome.runtime.lastError);
          } else {
            console.log("Rules updated successfully:", dnrRules);
          }
        },
      );
    });
  });
}

// Debugger Logic
async function attachDebugger(tabId) {
  if (attachedTabs.has(tabId)) {
    return { success: true };
  }

  const target = { tabId };
  try {
    await chrome.debugger.attach(target, "1.3");
    await chrome.debugger.sendCommand(target, "Fetch.enable", {
      patterns: [
        { urlPattern: "*", requestStage: "Request" },
        { urlPattern: "*", requestStage: "Response" },
      ],
    });
    attachedTabs.add(tabId);
    await updateSession();
    console.log("Debugger attached to tab", tabId);
    return { success: true };
  } catch (err) {
    console.error("Failed to attach debugger", err);

    // Handle "Already attached" error gracefully
    if (
      err.message &&
      (err.message.includes("attached") || err.message.includes("debugging"))
    ) {
      attachedTabs.add(tabId);
      await updateSession();
      return { success: true };
    }

    // Return the actual error message
    return {
      success: false,
      error: err.message || "Unknown error occurred during debugger attachment",
    };
  }
}

async function detachDebugger(tabId) {
  const target = { tabId };
  try {
    await chrome.debugger.detach(target);
  } catch (err) {
    console.error("Failed to detach debugger", err);
  }
  attachedTabs.delete(tabId);
  await updateSession();
  console.log("Debugger detached from tab", tabId);
}

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  if (method === "Fetch.requestPaused") {
    const { requestId, request } = params;

    chrome.storage.local.get(["rules"], async (result) => {
      const rules = result.rules || [];
      const responseRules = rules.filter(
        (r) => r.type === "response" && r.enabled !== false,
      );

      const matchingRule = responseRules.find((rule) => {
        try {
          if (new RegExp(rule.urlPattern).test(request.url)) return true;
        } catch {
          return request.url.includes(rule.urlPattern);
        }
        return false;
      });

      if (matchingRule) {
        // Log interception
        const log = {
          timestamp: Date.now(),
          url: request.url,
          method: request.method,
          type: "debugger",
          originalResponse: { status: 200, statusText: "OK (Mocked)" },
          mockResponse: {
            bodyLength: matchingRule.responseBody.length,
            preview:
              matchingRule.responseBody.substring(0, 100) +
              (matchingRule.responseBody.length > 100 ? "..." : ""),
          },
        };
        requestLogs.unshift(log);
        if (requestLogs.length > MAX_LOGS) requestLogs.pop();

        // Fulfill request
        const responseHeaders = [
          { name: "Content-Type", value: "application/json" },
          { name: "Access-Control-Allow-Origin", value: "*" },
        ];

        // Body must be Base64 encoded
        // Use a safe base64 encoding for UTF-8 strings
        const body = btoa(
          unescape(encodeURIComponent(matchingRule.responseBody)),
        );

        try {
          await chrome.debugger.sendCommand(source, "Fetch.fulfillRequest", {
            requestId,
            responseCode: 200,
            responseHeaders,
            body,
          });
        } catch (e) {
          console.error("Failed to fulfill request", e);
          // Fallback to continue if fulfill fails
          chrome.debugger.sendCommand(source, "Fetch.continueRequest", {
            requestId,
          });
        }
      } else {
        // Continue normally
        chrome.debugger.sendCommand(source, "Fetch.continueRequest", {
          requestId,
        });
      }
    });
  }
});

chrome.debugger.onDetach.addListener((source) => {
  attachedTabs.delete(source.tabId);
  updateSession();

  // Notify content script that debugger is disabled (e.g. user closed banner)
  chrome.tabs
    .sendMessage(source.tabId, { type: "DEBUGGER_MODE_DISABLED" })
    .catch(() => {
      // Content script might not be available if tab was closed
    });
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.rules) {
    updateRules();
  }
});

// Initial load
chrome.runtime.onInstalled.addListener(() => {
  updateRules();
  // Cleanup old global flag
  chrome.storage.local.remove("debuggerEnabled");
});

chrome.runtime.onStartup.addListener(() => {
  updateRules();
});

// Handle messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOG_REQUEST") {
    requestLogs.unshift(message.payload);
    if (requestLogs.length > MAX_LOGS) {
      requestLogs.pop();
    }
  } else if (message.type === "GET_LOGS") {
    sendResponse({ logs: requestLogs });
  } else if (message.type === "CLEAR_LOGS") {
    requestLogs = [];
    sendResponse({ success: true });
  } else if (message.type === "ENABLE_DEBUGGER") {
    attachDebugger(message.tabId).then((result) => {
      if (result.success) {
        sendResponse({ success: true });
        // Notify content script to disable its own mocking
        chrome.tabs.sendMessage(message.tabId, {
          type: "DEBUGGER_MODE_ENABLED",
        });
      } else {
        sendResponse({ success: false, error: result.error });
      }
    });
    return true; // async response
  } else if (message.type === "DISABLE_DEBUGGER") {
    detachDebugger(message.tabId).then(() => {
      // Notify content script to re-enable its own mocking
      chrome.tabs.sendMessage(message.tabId, {
        type: "DEBUGGER_MODE_DISABLED",
      });
      sendResponse({ success: true });
    });
    return true; // async response
  } else if (message.type === "GET_DEBUGGER_STATUS") {
    // Check if the sender tab (or requested tabId) is attached
    const tabId = message.tabId || (sender.tab && sender.tab.id);
    if (tabId) {
      sendResponse({ enabled: attachedTabs.has(tabId) });
    } else {
      sendResponse({ enabled: false });
    }
  }
});
