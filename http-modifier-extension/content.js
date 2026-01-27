// content.js

// Function to inject the script
function injectScript(file) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(file);
  script.onload = function () {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Function to send rules to the injected script
function sendRules() {
  chrome.storage.local.get(["rules"], (result) => {
    const rules = result.rules || [];
    const responseRules = rules.filter(
      (r) => r.type === "response" && r.enabled !== false,
    );

    // Send message to window (inject.js listens to this)
    window.postMessage(
      {
        type: "HTTP_MODIFIER_RULES_UPDATE",
        rules: responseRules,
      },
      "*",
    );
  });
}

function sendDebuggerStatus() {
  chrome.storage.local.get(["debuggerEnabled"], (result) => {
    window.postMessage(
      {
        type: "HTTP_MODIFIER_DEBUGGER_MODE",
        enabled: !!result.debuggerEnabled,
      },
      "*",
    );
  });
}

// Listen for messages from injected script
// Use specific target origin checking if possible, but '*' is acceptable for this context
// We need to ensure we don't process our own messages in an infinite loop if we were to send messages back
window.addEventListener("message", (event) => {
  // Only accept messages from the same window
  if (event.source !== window) return;

  if (event.data && event.data.type === "HTTP_MODIFIER_LOG") {
    // Relay log to background script
    // console.log("Content script received log:", event.data.log); // Debug log
    try {
      chrome.runtime.sendMessage({
        type: "LOG_REQUEST",
        payload: event.data.log,
      });
    } catch (e) {
      // Ignore "Extension context invalidated" errors that happen on reload
      console.warn("HTTP Modifier: Failed to send log to background", e);
    }
  }
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "DEBUGGER_MODE_ENABLED") {
    window.postMessage(
      { type: "HTTP_MODIFIER_DEBUGGER_MODE", enabled: true },
      "*",
    );
  } else if (message.type === "DEBUGGER_MODE_DISABLED") {
    window.postMessage(
      { type: "HTTP_MODIFIER_DEBUGGER_MODE", enabled: false },
      "*",
    );
  }
});

// Inject the interceptor
injectScript("inject.js");

// Send initial rules after a short delay to ensure script is loaded
setTimeout(() => {
  sendRules();
  sendDebuggerStatus();
}, 100);

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    if (changes.rules) {
      sendRules();
    }
    if (changes.debuggerEnabled) {
      sendDebuggerStatus();
    }
  }
});
