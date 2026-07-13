import { afterEach, describe, expect, it, vi } from "vitest";

const listeners = new Map();
const postedMessages = [];
const runtimeMessages = [];

const fakeWindow = {
  addEventListener: vi.fn((type, listener) => listeners.set(type, listener)),
  postMessage: vi.fn((message) => postedMessages.push(message)),
};

const emitWindowMessage = (data) => {
  listeners.get("message")?.({ source: fakeWindow, data });
};

const loadContent = async () => {
  vi.useFakeTimers();
  vi.resetModules();
  listeners.clear();
  postedMessages.length = 0;
  runtimeMessages.length = 0;
  globalThis.window = fakeWindow;
  globalThis.chrome = {
    runtime: {
      id: "extension-id",
      lastError: null,
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn((message, callback) => {
        runtimeMessages.push(message);
        if (message.type === "GET_DEBUGGER_STATUS")
          callback?.({ enabled: false });
        else callback?.();
      }),
    },
    storage: {
      local: {
        get: vi.fn((_keys, callback) => callback({ rules: [] })),
      },
      onChanged: { addListener: vi.fn() },
    },
  };
  delete globalThis.HttpModifierRules;
  await import("../../public/ruleContract.js");
  await import("../../public/content.js");
};

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  delete globalThis.window;
  delete globalThis.chrome;
  delete globalThis.HttpModifierRules;
});

describe("content runtime wiring", () => {
  it("retries the document-start handshake and sends state after ACK", async () => {
    await loadContent();
    const firstInit = postedMessages.find(
      (message) => message.type === "HTTP_MODIFIER_INIT",
    );

    expect(firstInit.channelToken).toEqual(expect.any(String));
    emitWindowMessage({ type: "HTTP_MODIFIER_READY" });
    emitWindowMessage({
      type: "HTTP_MODIFIER_ACK",
      channelToken: firstInit.channelToken,
    });

    expect(postedMessages).toContainEqual({
      type: "HTTP_MODIFIER_RULES_UPDATE",
      channelToken: firstInit.channelToken,
      rules: [],
    });
    expect(postedMessages).toContainEqual({
      type: "HTTP_MODIFIER_DEBUGGER_MODE",
      channelToken: firstInit.channelToken,
      enabled: false,
    });
  });

  it("relays only token-bound, bounded log payloads", async () => {
    await loadContent();
    const channelToken = postedMessages.find(
      (message) => message.type === "HTTP_MODIFIER_INIT",
    ).channelToken;
    emitWindowMessage({ type: "HTTP_MODIFIER_ACK", channelToken });
    runtimeMessages.length = 0;

    const validLog = {
      method: "GET",
      ruleId: "response-1",
      type: "fetch",
      url: "https://example.com/api",
      mockResponse: { bodyLength: 11, preview: '{"ok":true}' },
    };
    emitWindowMessage({
      type: "HTTP_MODIFIER_LOG",
      channelToken,
      log: validLog,
    });
    emitWindowMessage({
      type: "HTTP_MODIFIER_LOG",
      channelToken,
      log: { ...validLog, tabId: 99 },
    });
    emitWindowMessage({
      type: "HTTP_MODIFIER_LOG",
      channelToken: "wrong-token",
      log: validLog,
    });

    expect(runtimeMessages).toEqual([
      { type: "LOG_REQUEST", payload: validLog },
    ]);
  });
});
