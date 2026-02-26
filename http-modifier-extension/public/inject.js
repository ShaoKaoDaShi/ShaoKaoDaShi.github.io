// inject.js
(function () {
  let rules = [];
  let debuggerEnabled = false;

  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "HTTP_MODIFIER_RULES_UPDATE") {
      rules = event.data.rules;
      console.log("HTTP Modifier: Rules updated", rules);
    } else if (
      event.data &&
      event.data.type === "HTTP_MODIFIER_DEBUGGER_MODE"
    ) {
      debuggerEnabled = event.data.enabled;
      console.log("HTTP Modifier: Debugger Mode changed to", debuggerEnabled);
    }
  });

  function getMatchingRule(url) {
    // If Debugger Mode is enabled, skip client-side mocking
    if (debuggerEnabled) return null;

    return rules.find((rule) => {
      try {
        if (new RegExp(rule.urlPattern).test(url)) return true;
      } catch (e) {
        return url.includes(rule.urlPattern);
      }
      return false;
    });
  }

  function sendLog(url, method, type, originalResponse, mockResponse) {
    window.postMessage(
      {
        type: "HTTP_MODIFIER_LOG",
        log: {
          timestamp: Date.now(),
          url,
          method: method || "GET", // Fetch/XHR default
          type, // 'fetch' or 'xhr'
          originalResponse: originalResponse
            ? {
                status: originalResponse.status,
                statusText: originalResponse.statusText,
              }
            : null,
          mockResponse: {
            bodyLength: mockResponse.length,
            preview:
              mockResponse.substring(0, 100) +
              (mockResponse.length > 100 ? "..." : ""),
          },
        },
      },
      "*",
    );
  }

  // Patch fetch
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    let url;
    let method = "GET";
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else if (input instanceof Request) {
      url = input.url;
      method = input.method;
    }

    if (init && init.method) {
      method = init.method;
    }

    const rule = getMatchingRule(url);

    try {
      const response = await originalFetch.apply(this, arguments);

      if (rule) {
        console.log(
          "HTTP Modifier: Intercepted fetch and modifying response",
          url,
        );
        sendLog(url, method, "fetch", response, rule.responseBody);

        return new Response(rule.responseBody, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }

      return response;
    } catch (err) {
      throw err;
    }
  };
  // Preserve toString to mimic native fetch
  window.fetch.toString = originalFetch.toString.bind(originalFetch);

  // Patch XMLHttpRequest
  const OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new OriginalXHR();
    let requestUrl = "";
    let requestMethod = "GET";
    let matchingRule = null;

    const originalOpen = xhr.open;
    xhr.open = function (method, url) {
      requestUrl = url;
      requestMethod = method || "GET";
      matchingRule = getMatchingRule(url);
      return originalOpen.apply(this, arguments);
    };

    const originalSend = xhr.send;
    xhr.send = function (body) {
      if (matchingRule) {
        console.log(
          "HTTP Modifier: Intercepted XHR and modifying response",
          requestUrl,
        );

        try {
          Object.defineProperty(xhr, "responseText", {
            get: () => matchingRule.responseBody,
            configurable: true,
          });

          Object.defineProperty(xhr, "response", {
            get: () => matchingRule.responseBody,
            configurable: true,
          });

          // Send log immediately upon send (or we could wait for onload)
          // For better visibility, let's send when we intercept
          sendLog(
            requestUrl,
            requestMethod,
            "xhr",
            null,
            matchingRule.responseBody,
          );
        } catch (e) {
          console.error("HTTP Modifier: Failed to override XHR properties", e);
        }
      }

      return originalSend.apply(this, arguments);
    };

    return xhr;
  };

  // Copy static properties and prototype from OriginalXHR
  // This is crucial for libraries that check XMLHttpRequest.DONE or access prototype methods
  for (const prop in OriginalXHR) {
    if (Object.prototype.hasOwnProperty.call(OriginalXHR, prop)) {
      window.XMLHttpRequest[prop] = OriginalXHR[prop];
    }
  }
  window.XMLHttpRequest.prototype = OriginalXHR.prototype;
  // Also preserve toString to mask the hook slightly better
  window.XMLHttpRequest.toString = OriginalXHR.toString.bind(OriginalXHR);

})();
