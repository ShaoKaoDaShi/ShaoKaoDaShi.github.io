import { afterEach, describe, expect, it, vi } from "vitest";

const loadContract = async () => {
  delete globalThis.HttpModifierRules;
  vi.resetModules();
  await import("../../public/ruleContract.js");
  return globalThis.HttpModifierRules;
};

afterEach(() => {
  delete globalThis.HttpModifierRules;
});

describe("rule contract", () => {
  it("normalizes a legacy response rule without changing its regex semantics", async () => {
    const contract = await loadContract();

    const result = contract.normalizeRule({
      id: "response-1",
      type: "response",
      enabled: true,
      urlPattern: "api/v1/users$",
      responseBody: '{"ok":true}',
    });

    expect(result).toEqual({
      id: "response-1",
      type: "response",
      enabled: true,
      groupName: "Default",
      urlPattern: "api/v1/users$",
      matchType: "regex",
      responseBody: '{"ok":true}',
    });
  });

  it("migrates legacy header match modes and missing IDs", async () => {
    const contract = await loadContract();

    const containsRule = contract.normalizeRule({
      type: "header",
      urlPattern: "example.com/api",
    });
    const regexRule = contract.normalizeRule({
      type: "header",
      urlPattern: "*://*.example.com/*",
    });

    expect(containsRule.id).toEqual(expect.any(String));
    expect(containsRule.matchType).toBe("contains");
    expect(regexRule.matchType).toBe("regex");
  });

  it("normalizes malformed non-object input without throwing", async () => {
    const contract = await loadContract();

    expect(() => contract.normalizeRule(null)).not.toThrow();
    expect(() => contract.normalizeRule("invalid")).not.toThrow();
    expect(contract.normalizeRule(null)).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        enabled: true,
        groupName: "Default",
      }),
    );
  });

  it("validates rule-specific fields without throwing", async () => {
    const contract = await loadContract();

    expect(
      contract.validateRule({
        id: "header-1",
        type: "header",
        enabled: true,
        groupName: "Default",
        urlPattern: "example.com/api",
        matchType: "contains",
        actionType: "request",
        operation: "set",
        headerName: "Authorization",
        headerValue: "Bearer test",
      }),
    ).toEqual({ valid: true, errors: {} });

    expect(
      contract.validateRule({
        id: "response-1",
        type: "response",
        enabled: true,
        groupName: "Default",
        urlPattern: "[",
        matchType: "regex",
        responseBody: "not-json",
      }),
    ).toEqual({
      valid: false,
      errors: {
        urlPattern: "Enter a valid regular expression.",
        responseBody: "Response body must be valid JSON.",
      },
    });

    expect(
      contract.validateRule({
        id: "header-2",
        type: "header",
        enabled: true,
        groupName: "Default",
        urlPattern: "example.com",
        matchType: "contains",
        actionType: "request",
        operation: "set",
        headerName: "Bad Header",
        headerValue: "",
      }),
    ).toEqual({
      valid: false,
      errors: {
        headerName: "Enter a valid HTTP header name.",
        headerValue: "Enter a header value.",
      },
    });
  });

  it("matches the first valid enabled response rule against an absolute URL", async () => {
    const contract = await loadContract();
    const rules = [
      {
        id: "disabled",
        type: "response",
        enabled: false,
        groupName: "Default",
        urlPattern: "example.com/api",
        matchType: "contains",
        responseBody: '{"source":"disabled"}',
      },
      {
        id: "first",
        type: "response",
        enabled: true,
        groupName: "Default",
        urlPattern: "^https://example\\.com/api/users$",
        matchType: "regex",
        responseBody: '{"source":"first"}',
      },
      {
        id: "second",
        type: "response",
        enabled: true,
        groupName: "Default",
        urlPattern: "example.com/api",
        matchType: "contains",
        responseBody: '{"source":"second"}',
      },
    ];

    expect(
      contract.findMatchingResponseRule(
        rules,
        "/api/users",
        "https://example.com/dashboard",
      )?.id,
    ).toBe("first");
    expect(
      contract.findMatchingResponseRule(
        rules,
        "/other",
        "https://example.com/dashboard",
      ),
    ).toBeNull();
  });

  it("skips malformed response-rule entries before a later valid match", async () => {
    const contract = await loadContract();
    const matchingRule = {
      id: "valid",
      type: "response",
      enabled: true,
      groupName: "Default",
      urlPattern: "example.com/api",
      matchType: "contains",
      responseBody: '{"ok":true}',
    };

    expect(
      contract.findMatchingResponseRule(
        [null, "malformed", matchingRule],
        "https://example.com/api",
      ),
    ).toBe(matchingRule);
  });

  it("parses versioned and legacy backups while isolating invalid rules", async () => {
    const contract = await loadContract();
    const validRule = {
      id: "valid",
      type: "response",
      enabled: true,
      groupName: "Default",
      urlPattern: "example.com",
      matchType: "contains",
      responseBody: '{"ok":true}',
    };
    const invalidRule = {
      id: "invalid",
      type: "response",
      enabled: true,
      urlPattern: "example.com",
      matchType: "contains",
      responseBody: "invalid",
    };

    expect(contract.parseBackup([validRule, invalidRule])).toEqual({
      version: 0,
      validRules: [validRule],
      rejectedRules: [
        expect.objectContaining({
          index: 1,
          rule: expect.objectContaining({ id: "invalid" }),
          errors: expect.objectContaining({
            responseBody: "Response body must be valid JSON.",
          }),
        }),
      ],
    });

    expect(
      contract.parseBackup({ version: 1, rules: [validRule] }).validRules,
    ).toEqual([validRule]);
  });
});
