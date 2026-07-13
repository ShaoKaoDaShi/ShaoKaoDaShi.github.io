(() => {
  const RESOURCE_TYPES = Object.freeze([
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
  ]);

  const errorMessage = (error) =>
    error instanceof Error
      ? error.message
      : String(error || "Unknown Chrome error");

  const escapeRegex = (value) => value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");

  const buildDnrCandidates = (rules) => {
    const contract = globalThis.HttpModifierRules;
    if (!contract) throw new Error("HttpModifierRules must be loaded first.");

    const candidates = [];
    const statuses = [];

    for (const sourceRule of Array.isArray(rules) ? rules : []) {
      if (sourceRule?.type !== "header" || sourceRule.enabled === false)
        continue;

      const rule = contract.normalizeRule(sourceRule);
      const validation = contract.validateRule(rule);
      if (!validation.valid) {
        statuses.push({
          sourceRuleId: rule.id || null,
          state: "invalid",
          errors: validation.errors,
        });
        continue;
      }

      const header = {
        header: rule.headerName,
        operation: rule.operation,
      };
      if (rule.operation !== "remove") header.value = rule.headerValue;

      const action = { type: "modifyHeaders" };
      if (rule.actionType === "request") action.requestHeaders = [header];
      else action.responseHeaders = [header];

      const condition = {
        resourceTypes: [...RESOURCE_TYPES],
        regexFilter:
          rule.matchType === contract.MATCH_TYPES.REGEX
            ? rule.urlPattern
            : escapeRegex(rule.urlPattern),
        isUrlFilterCaseSensitive: true,
      };

      const candidate = {
        sourceRuleId: rule.id,
        dnrRule: {
          id: candidates.length + 1,
          priority: 1,
          action,
          condition,
        },
      };
      candidates.push(candidate);
      statuses.push({
        sourceRuleId: rule.id,
        state: "ready",
        errors: {},
      });
    }

    return { candidates, statuses };
  };

  const applyDnrCandidates = async (
    { candidates = [], statuses = [] },
    updateDynamicRules,
    removeRuleIds = [],
  ) => {
    try {
      if (removeRuleIds.length > 0) {
        await updateDynamicRules({ removeRuleIds });
      }
    } catch (error) {
      return {
        globalError: errorMessage(error),
        existingRulesPreserved: true,
        statuses,
      };
    }

    try {
      await updateDynamicRules({
        addRules: candidates.map((candidate) => candidate.dnrRule),
      });

      return {
        globalError: null,
        existingRulesPreserved: false,
        statuses: statuses.map((status) =>
          status.state === "ready" ? { ...status, state: "applied" } : status,
        ),
      };
    } catch (error) {
      const globalError = errorMessage(error);
      return {
        globalError,
        existingRulesPreserved: false,
        statuses: statuses.map((status) =>
          status.state === "ready"
            ? { ...status, state: "failed", error: globalError }
            : status,
        ),
      };
    }
  };

  const encodeUtf8Base64 = (value) => {
    const bytes = new TextEncoder().encode(String(value));
    let binary = "";
    const chunkSize = 0x8000;

    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(
        ...bytes.subarray(offset, offset + chunkSize),
      );
    }

    return btoa(binary);
  };

  const handlePausedRequest = async ({
    source,
    params,
    rules,
    sendCommand,
    onMock = () => {},
  }) => {
    const requestId = params?.requestId;
    const request = params?.request;
    const continueRequest = () =>
      sendCommand(source, "Fetch.continueRequest", { requestId });

    if (!request || request.method === "OPTIONS") {
      await continueRequest();
      return { outcome: "continued" };
    }

    const isResponseStage =
      "responseStatusCode" in params || "responseErrorReason" in params;
    if (isResponseStage) {
      await continueRequest();
      return { outcome: "continued" };
    }

    let matchingRule;
    try {
      matchingRule = globalThis.HttpModifierRules.findMatchingResponseRule(
        Array.isArray(rules) ? rules : [],
        request.url,
      );
    } catch (error) {
      await continueRequest();
      return { outcome: "continued", error: errorMessage(error) };
    }

    if (!matchingRule) {
      await continueRequest();
      return { outcome: "continued" };
    }

    try {
      const body = encodeUtf8Base64(matchingRule.responseBody);
      await sendCommand(source, "Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders: [
          { name: "Content-Type", value: "application/json" },
          { name: "Cache-Control", value: "no-store" },
          { name: "Access-Control-Allow-Origin", value: "*" },
        ],
        body,
      });
      try {
        onMock({ rule: matchingRule, request });
      } catch (error) {
        console.error("HTTP Modifier: Failed to record debugger mock", error);
      }
      return { outcome: "fulfilled", sourceRuleId: matchingRule.id };
    } catch (fulfillError) {
      try {
        await continueRequest();
        return {
          outcome: "continued-after-fulfill-failure",
          error: errorMessage(fulfillError),
        };
      } catch (continueError) {
        return {
          outcome: "failed",
          errors: [errorMessage(fulfillError), errorMessage(continueError)],
        };
      }
    }
  };

  const verifyDebuggerAttachment = async (tabId, getTargets) => {
    const targets = await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      try {
        const result = getTargets(finish);
        if (result && typeof result.then === "function") {
          result.then(finish, reject);
        } else if (Array.isArray(result)) {
          finish(result);
        }
      } catch (error) {
        reject(error);
      }
    });

    return Array.isArray(targets)
      ? targets.some(
          (target) => target.tabId === tabId && target.attached === true,
        )
      : false;
  };

  globalThis.HttpModifierBackgroundCore = Object.freeze({
    buildDnrCandidates,
    applyDnrCandidates,
    encodeUtf8Base64,
    handlePausedRequest,
    verifyDebuggerAttachment,
  });
})();
