import { afterEach, describe, expect, it, vi } from "vitest";

const event = () => ({ addListener: vi.fn() });

const loadBackground = async (rules = []) => {
  vi.resetModules();
  delete globalThis.HttpModifierRules;
  delete globalThis.HttpModifierBackgroundCore;
  await import("../../public/ruleContract.js");
  await import("../../public/backgroundCore.js");

  const runtimeOnMessage = event();
  globalThis.importScripts = vi.fn();
  globalThis.chrome = {
    runtime: {
      id: "extension-id",
      lastError: null,
      getURL: (path) => `chrome-extension://extension-id/${path}`,
      onInstalled: event(),
      onStartup: event(),
      onMessage: runtimeOnMessage,
    },
    storage: {
      local: {
        get: vi.fn((_keys, callback) => callback({ rules })),
        set: vi.fn((_value, callback) => callback()),
        remove: vi.fn(),
      },
      session: {
        get: vi.fn((_keys, callback) => callback({ attachedTabIds: [] })),
        set: vi.fn((_value, callback) => callback()),
      },
      onChanged: event(),
    },
    declarativeNetRequest: {
      getDynamicRules: vi.fn((callback) => callback([])),
      updateDynamicRules: vi.fn((_options, callback) => callback()),
      isRegexSupported: vi.fn((_options, callback) =>
        callback({ isSupported: true }),
      ),
    },
    debugger: {
      getTargets: vi.fn((callback) => callback([])),
      attach: vi.fn((_target, _version, callback) => callback()),
      detach: vi.fn((_target, callback) => callback()),
      sendCommand: vi.fn((_target, _method, _params, callback) => callback()),
      onEvent: event(),
      onDetach: event(),
    },
    action: {
      setBadgeBackgroundColor: vi.fn(),
      setBadgeText: vi.fn(),
      setTitle: vi.fn(),
    },
    tabs: { sendMessage: vi.fn((_tabId, _message, callback) => callback()) },
  };

  await import("../../public/background.js");
  await Promise.resolve();
  await Promise.resolve();
  return {
    onMessage: runtimeOnMessage.addListener.mock.calls[0][0],
    chrome: globalThis.chrome,
  };
};

afterEach(() => {
  delete globalThis.importScripts;
  delete globalThis.chrome;
  delete globalThis.HttpModifierRules;
  delete globalThis.HttpModifierBackgroundCore;
});

describe("background rule wiring", () => {
  it("checks Chrome regex support for generated Contains and user regex patterns", async () => {
    const { chrome } = await loadBackground([
      {
        id: "contains",
        type: "header",
        enabled: true,
        groupName: "Default",
        urlPattern: "Example.com/a+b",
        matchType: "contains",
        actionType: "request",
        operation: "set",
        headerName: "X-Test",
        headerValue: "contains",
      },
      {
        id: "regex",
        type: "header",
        enabled: true,
        groupName: "Default",
        urlPattern: "^https://Example\\.com/",
        matchType: "regex",
        actionType: "request",
        operation: "set",
        headerName: "X-Test",
        headerValue: "regex",
      },
    ]);

    expect(
      chrome.declarativeNetRequest.isRegexSupported,
    ).toHaveBeenNthCalledWith(
      1,
      {
        regex: "Example\\.com/a\\+b",
        isCaseSensitive: true,
        requireCapturing: false,
      },
      expect.any(Function),
    );
    expect(
      chrome.declarativeNetRequest.isRegexSupported,
    ).toHaveBeenNthCalledWith(
      2,
      {
        regex: "^https://Example\\.com/",
        isCaseSensitive: true,
        requireCapturing: false,
      },
      expect.any(Function),
    );
  });
});

describe("background message boundary", () => {
  it("accepts canonical content logs and rejects injected metadata", async () => {
    const { onMessage } = await loadBackground();
    const sender = {
      id: "extension-id",
      url: "https://example.com/page",
      tab: { id: 7, url: "https://example.com/page" },
    };
    const payload = {
      method: "GET",
      ruleId: "response-1",
      type: "fetch",
      url: "https://example.com/api",
      mockResponse: { bodyLength: 11, preview: '{"ok":true}' },
    };

    onMessage({ type: "LOG_REQUEST", payload }, sender, vi.fn());
    onMessage(
      { type: "LOG_REQUEST", payload: { ...payload, tabId: 999 } },
      sender,
      vi.fn(),
    );
    const sendResponse = vi.fn();
    onMessage(
      { type: "GET_LOGS" },
      { id: "extension-id", url: "chrome-extension://extension-id/index.html" },
      sendResponse,
    );

    expect(sendResponse).toHaveBeenCalledWith({
      logs: [
        expect.objectContaining({
          ...payload,
          tabId: 7,
          tabUrl: "https://example.com/page",
        }),
      ],
    });
  });

  it("requires the exact extension origin for privileged controls", async () => {
    const { onMessage } = await loadBackground();
    const sendResponse = vi.fn();

    expect(
      onMessage(
        { type: "CLEAR_LOGS" },
        {
          id: "extension-id",
          url: "chrome-extension://extension-id.evil/index.html",
        },
        sendResponse,
      ),
    ).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });
});
