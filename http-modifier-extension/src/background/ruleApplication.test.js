import { afterEach, describe, expect, it, vi } from "vitest";

const loadCore = async () => {
  delete globalThis.HttpModifierRules;
  delete globalThis.HttpModifierBackgroundCore;
  vi.resetModules();
  await import("../../public/ruleContract.js");
  await import("../../public/backgroundCore.js");
  return globalThis.HttpModifierBackgroundCore;
};

const validHeaderRule = (overrides = {}) => ({
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
  ...overrides,
});

const validResponseRule = (overrides = {}) => ({
  id: "response-1",
  type: "response",
  enabled: true,
  groupName: "Default",
  urlPattern: "example.com/api",
  matchType: "contains",
  responseBody: '{"message":"你好"}',
  ...overrides,
});

afterEach(() => {
  delete globalThis.HttpModifierRules;
  delete globalThis.HttpModifierBackgroundCore;
});

describe("background rule application core", () => {
  it("exposes a frozen public API", async () => {
    const core = await loadCore();

    expect(Object.isFrozen(core)).toBe(true);
  });

  it("builds valid enabled header candidates with integer IDs and source statuses", async () => {
    const core = await loadCore();
    const result = core.buildDnrCandidates([
      validHeaderRule(),
      validHeaderRule({
        id: "header-2",
        matchType: "regex",
        urlPattern: "^https://example\\.com/",
        actionType: "response",
        operation: "remove",
        headerName: "Server",
      }),
      validHeaderRule({ id: "disabled", enabled: false }),
      validResponseRule(),
    ]);

    expect(result.candidates).toEqual([
      expect.objectContaining({
        sourceRuleId: "header-1",
        dnrRule: expect.objectContaining({
          id: 1,
          condition: expect.objectContaining({
            regexFilter: "example\\.com/api",
            isUrlFilterCaseSensitive: true,
          }),
        }),
      }),
      expect.objectContaining({
        sourceRuleId: "header-2",
        dnrRule: expect.objectContaining({
          id: 2,
          action: expect.objectContaining({
            responseHeaders: [{ header: "Server", operation: "remove" }],
          }),
          condition: expect.objectContaining({
            regexFilter: "^https://example\\.com/",
            isUrlFilterCaseSensitive: true,
          }),
        }),
      }),
    ]);
    expect(Number.isInteger(result.candidates[0].dnrRule.id)).toBe(true);
    expect(result.candidates[0].dnrRule.condition).not.toHaveProperty(
      "urlFilter",
    );
    expect(result.candidates[1].dnrRule.condition).not.toHaveProperty(
      "urlFilter",
    );
    expect(result.statuses).toEqual([
      { sourceRuleId: "header-1", state: "ready", errors: {} },
      { sourceRuleId: "header-2", state: "ready", errors: {} },
    ]);
  });

  it("returns validation errors per invalid source rule", async () => {
    const core = await loadCore();
    const result = core.buildDnrCandidates([
      validHeaderRule({
        id: "invalid-regex",
        matchType: "regex",
        urlPattern: "[",
      }),
      validHeaderRule({
        id: "invalid-header",
        headerName: "Bad Header",
      }),
    ]);

    expect(result.candidates).toEqual([]);
    expect(result.statuses).toEqual([
      {
        sourceRuleId: "invalid-regex",
        state: "invalid",
        errors: { urlPattern: "Enter a valid regular expression." },
      },
      {
        sourceRuleId: "invalid-header",
        state: "invalid",
        errors: { headerName: "Enter a valid HTTP header name." },
      },
    ]);
  });

  it("removes existing DNR rules before adding and reporting candidates applied", async () => {
    const core = await loadCore();
    const built = core.buildDnrCandidates([validHeaderRule()]);
    const updateDynamicRules = vi.fn().mockResolvedValue(undefined);

    await expect(
      core.applyDnrCandidates(built, updateDynamicRules, [9]),
    ).resolves.toEqual({
      globalError: null,
      existingRulesPreserved: false,
      statuses: [{ sourceRuleId: "header-1", state: "applied", errors: {} }],
    });
    expect(updateDynamicRules).toHaveBeenNthCalledWith(1, {
      removeRuleIds: [9],
    });
    expect(updateDynamicRules).toHaveBeenNthCalledWith(2, {
      addRules: [built.candidates[0].dnrRule],
    });
  });

  it("reports add failure after removal without leaving stale rules", async () => {
    const core = await loadCore();
    const built = core.buildDnrCandidates([validHeaderRule()]);
    const updateDynamicRules = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("DNR quota exceeded"));

    await expect(
      core.applyDnrCandidates(built, updateDynamicRules, [9]),
    ).resolves.toEqual({
      globalError: "DNR quota exceeded",
      existingRulesPreserved: false,
      statuses: [
        {
          sourceRuleId: "header-1",
          state: "failed",
          errors: {},
          error: "DNR quota exceeded",
        },
      ],
    });
    expect(updateDynamicRules).toHaveBeenNthCalledWith(1, {
      removeRuleIds: [9],
    });
    expect(updateDynamicRules).toHaveBeenNthCalledWith(2, {
      addRules: [built.candidates[0].dnrRule],
    });
  });

  it("preserves ready statuses when removal fails and old rules remain applied", async () => {
    const core = await loadCore();
    const built = core.buildDnrCandidates([validHeaderRule()]);
    const updateDynamicRules = vi
      .fn()
      .mockRejectedValueOnce(new Error("Removal failed"));

    await expect(
      core.applyDnrCandidates(built, updateDynamicRules, [9]),
    ).resolves.toEqual({
      globalError: "Removal failed",
      existingRulesPreserved: true,
      statuses: built.statuses,
    });
    expect(updateDynamicRules).toHaveBeenCalledTimes(1);
    expect(updateDynamicRules).toHaveBeenCalledWith({ removeRuleIds: [9] });
  });

  it("propagates one global Chrome error to otherwise-valid candidates", async () => {
    const core = await loadCore();
    const built = core.buildDnrCandidates([
      validHeaderRule(),
      validHeaderRule({ id: "invalid", headerName: "Bad Header" }),
    ]);
    const updateDynamicRules = vi
      .fn()
      .mockRejectedValue(new Error("DNR quota exceeded"));

    await expect(
      core.applyDnrCandidates(built, updateDynamicRules),
    ).resolves.toEqual({
      globalError: "DNR quota exceeded",
      existingRulesPreserved: false,
      statuses: [
        {
          sourceRuleId: "header-1",
          state: "failed",
          errors: {},
          error: "DNR quota exceeded",
        },
        {
          sourceRuleId: "invalid",
          state: "invalid",
          errors: { headerName: "Enter a valid HTTP header name." },
        },
      ],
    });
  });

  it("encodes Unicode and lone surrogates as UTF-8 base64 without throwing", async () => {
    const core = await loadCore();

    expect(core.encodeUtf8Base64("你好😀")).toBe("5L2g5aW98J+YgA==");
    expect(() => core.encodeUtf8Base64("x\ud800y")).not.toThrow();
    expect(core.encodeUtf8Base64("x\ud800y")).toBe("eO+/vXk=");
  });

  it("continues paused OPTIONS requests", async () => {
    const core = await loadCore();
    const sendCommand = vi.fn().mockResolvedValue(undefined);
    const source = { tabId: 4 };

    await expect(
      core.handlePausedRequest({
        source,
        params: {
          requestId: "options-1",
          request: { method: "OPTIONS", url: "https://example.com/api" },
        },
        rules: [validResponseRule()],
        sendCommand,
      }),
    ).resolves.toEqual({ outcome: "continued" });
    expect(sendCommand).toHaveBeenCalledWith(source, "Fetch.continueRequest", {
      requestId: "options-1",
    });
  });

  it("fulfills matching request-stage pauses with 200 JSON before network", async () => {
    const core = await loadCore();
    const sendCommand = vi.fn().mockResolvedValue(undefined);
    const source = { tabId: 4 };

    await expect(
      core.handlePausedRequest({
        source,
        params: {
          requestId: "request-1",
          request: { method: "GET", url: "https://example.com/api" },
        },
        rules: [validResponseRule()],
        sendCommand,
      }),
    ).resolves.toEqual({
      outcome: "fulfilled",
      sourceRuleId: "response-1",
    });
    expect(sendCommand).toHaveBeenCalledTimes(1);
    expect(sendCommand).toHaveBeenCalledWith(
      source,
      "Fetch.fulfillRequest",
      expect.objectContaining({
        requestId: "request-1",
        responseCode: 200,
        body: "eyJtZXNzYWdlIjoi5L2g5aW9In0=",
        responseHeaders: expect.arrayContaining([
          { name: "Content-Type", value: "application/json" },
        ]),
      }),
    );
  });

  it("continues when fulfillment fails and records both terminal failures", async () => {
    const core = await loadCore();
    const source = { tabId: 4 };
    const sendCommand = vi
      .fn()
      .mockRejectedValueOnce(new Error("fulfill failed"))
      .mockResolvedValueOnce(undefined);

    await expect(
      core.handlePausedRequest({
        source,
        params: {
          requestId: "request-1",
          request: { method: "GET", url: "https://example.com/api" },
        },
        rules: [validResponseRule()],
        sendCommand,
      }),
    ).resolves.toEqual({
      outcome: "continued-after-fulfill-failure",
      error: "fulfill failed",
    });
    expect(sendCommand).toHaveBeenNthCalledWith(
      2,
      source,
      "Fetch.continueRequest",
      { requestId: "request-1" },
    );

    sendCommand
      .mockReset()
      .mockRejectedValueOnce(new Error("fulfill failed"))
      .mockRejectedValueOnce(new Error("continue failed"));
    await expect(
      core.handlePausedRequest({
        source,
        params: {
          requestId: "request-2",
          request: { method: "GET", url: "https://example.com/api" },
        },
        rules: [validResponseRule()],
        sendCommand,
      }),
    ).resolves.toEqual({
      outcome: "failed",
      errors: ["fulfill failed", "continue failed"],
    });
  });

  it.each(["promise", "callback"])(
    "verifies debugger attachment only from %s getTargets results",
    async (apiStyle) => {
      const core = await loadCore();
      const targets = [
        { tabId: 7, attached: true },
        { tabId: 8, attached: false },
      ];
      const getTargets =
        apiStyle === "promise"
          ? vi.fn().mockResolvedValue(targets)
          : vi.fn((callback) => callback(targets));

      await expect(core.verifyDebuggerAttachment(7, getTargets)).resolves.toBe(
        true,
      );
      await expect(core.verifyDebuggerAttachment(8, getTargets)).resolves.toBe(
        false,
      );
      await expect(core.verifyDebuggerAttachment(9, getTargets)).resolves.toBe(
        false,
      );
      expect(getTargets).toHaveBeenCalledTimes(3);
    },
  );
});
