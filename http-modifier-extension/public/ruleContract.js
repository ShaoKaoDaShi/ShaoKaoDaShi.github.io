(() => {
  const DEFAULT_GROUP_NAME = "Default";
  const MATCH_TYPES = Object.freeze({
    CONTAINS: "contains",
    REGEX: "regex",
  });

  const normalizeGroupName = (groupName) => {
    const normalizedGroupName =
      typeof groupName === "string" ? groupName.trim() : "";

    return normalizedGroupName || DEFAULT_GROUP_NAME;
  };

  const inferResponseMatchType = (urlPattern) => {
    try {
      new RegExp(urlPattern);
      return MATCH_TYPES.REGEX;
    } catch {
      return MATCH_TYPES.CONTAINS;
    }
  };

  const generateRuleId = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  };

  const inferHeaderMatchType = (urlPattern) =>
    /[^a-zA-Z0-9/._:?-]/.test(urlPattern || "")
      ? MATCH_TYPES.REGEX
      : MATCH_TYPES.CONTAINS;

  const normalizeRule = (rule = {}) => {
    const source = rule && typeof rule === "object" ? rule : {};

    return {
      ...source,
      id:
        typeof source.id === "string" && source.id.trim()
          ? source.id
          : generateRuleId(),
      enabled: source.enabled !== false,
      groupName: normalizeGroupName(source.groupName),
      matchType:
        source.matchType ||
        (source.type === "header"
          ? inferHeaderMatchType(source.urlPattern)
          : inferResponseMatchType(source.urlPattern)),
    };
  };

  const HEADER_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

  const isValidRegex = (pattern) => {
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  };

  const validateRule = (rule) => {
    const errors = {};

    if (typeof rule?.id !== "string" || !rule.id.trim()) {
      errors.id = "Rule ID is required.";
    }
    if (rule?.type !== "header" && rule?.type !== "response") {
      errors.type = "Select a supported rule type.";
    }
    if (typeof rule?.urlPattern !== "string" || !rule.urlPattern.trim()) {
      errors.urlPattern = "Enter a URL pattern.";
    } else if (
      rule.matchType === MATCH_TYPES.REGEX &&
      !isValidRegex(rule.urlPattern)
    ) {
      errors.urlPattern = "Enter a valid regular expression.";
    }
    if (!Object.values(MATCH_TYPES).includes(rule?.matchType)) {
      errors.matchType = "Select a URL match type.";
    }

    if (rule?.type === "header") {
      if (rule.actionType !== "request" && rule.actionType !== "response") {
        errors.actionType = "Select a header target.";
      }
      if (!["set", "append", "remove"].includes(rule.operation)) {
        errors.operation = "Select a header operation.";
      }
      if (
        typeof rule.headerName !== "string" ||
        !HEADER_NAME_PATTERN.test(rule.headerName)
      ) {
        errors.headerName = "Enter a valid HTTP header name.";
      }
      if (
        rule.operation !== "remove" &&
        (typeof rule.headerValue !== "string" || !rule.headerValue)
      ) {
        errors.headerValue = "Enter a header value.";
      }
    }

    if (rule?.type === "response") {
      try {
        if (typeof rule.responseBody !== "string") throw new Error();
        JSON.parse(rule.responseBody);
      } catch {
        errors.responseBody = "Response body must be valid JSON.";
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  };

  const toAbsoluteUrl = (url, baseUrl) => {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return String(url || "");
    }
  };

  const matchesUrl = (rule, url, baseUrl) => {
    const absoluteUrl = toAbsoluteUrl(url, baseUrl);

    if (rule.matchType === MATCH_TYPES.REGEX) {
      return isValidRegex(rule.urlPattern)
        ? new RegExp(rule.urlPattern).test(absoluteUrl)
        : false;
    }

    return absoluteUrl.includes(rule.urlPattern);
  };

  const findMatchingResponseRule = (rules, url, baseUrl) => {
    const matchingRule = (Array.isArray(rules) ? rules : []).find((rule) => {
      if (!rule || typeof rule !== "object" || Array.isArray(rule))
        return false;
      if (rule.type !== "response" || rule.enabled === false) return false;
      if (!validateRule(rule).valid) return false;
      return matchesUrl(rule, url, baseUrl);
    });

    return matchingRule || null;
  };

  const parseBackup = (backup) => {
    const version = Array.isArray(backup) ? 0 : backup?.version;
    const rules = Array.isArray(backup) ? backup : backup?.rules;

    if ((version !== 0 && version !== 1) || !Array.isArray(rules)) {
      return {
        version: version ?? null,
        validRules: [],
        rejectedRules: [
          {
            index: -1,
            rule: backup,
            errors: { backup: "Select a supported HTTP Modifier backup." },
          },
        ],
      };
    }

    const validRules = [];
    const rejectedRules = [];

    rules.forEach((rule, index) => {
      const normalizedRule = normalizeRule(rule || {});
      const validation = validateRule(normalizedRule);

      if (validation.valid) {
        validRules.push(normalizedRule);
        return;
      }

      rejectedRules.push({
        index,
        rule: normalizedRule,
        errors: validation.errors,
      });
    });

    return { version, validRules, rejectedRules };
  };

  globalThis.HttpModifierRules = Object.freeze({
    DEFAULT_GROUP_NAME,
    MATCH_TYPES,
    normalizeGroupName,
    normalizeRule,
    generateRuleId,
    validateRule,
    matchesUrl,
    findMatchingResponseRule,
    parseBackup,
  });
})();
