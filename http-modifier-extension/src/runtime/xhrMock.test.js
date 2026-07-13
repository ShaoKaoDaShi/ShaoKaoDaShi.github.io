import { afterEach, describe, expect, it, vi } from "vitest";

const responseRule = {
  id: "response-1",
  type: "response",
  enabled: true,
  groupName: "Default",
  urlPattern: "example.com/api/users",
  matchType: "contains",
  responseBody: '{"mocked":true}',
};

class FakeNativeXhr extends EventTarget {
  static UNSENT = 0;
  static OPENED = 1;
  static HEADERS_RECEIVED = 2;
  static LOADING = 3;
  static DONE = 4;

  constructor() {
    super();
    this.readyState = 0;
    this.status = 0;
    this.statusText = "";
    this.responseURL = "";
    this.responseText = "";
    this.response = null;
    this.responseType = "";
    this.open = vi.fn((method, url, async = true) => {
      this.method = method;
      this.url = url;
      this.async = async;
      this.readyState = 1;
    });
    this.nativeSend = vi.fn();
    this.nativeAbort = vi.fn();
    this.send = this.nativeSend;
    this.abort = this.nativeAbort;
  }
}

const loadRuntime = async () => {
  delete globalThis.HttpModifierRules;
  delete globalThis.HttpModifierXhr;
  vi.resetModules();
  await import("../../public/ruleContract.js");
  await import("../../public/xhrMock.js");
  return globalThis.HttpModifierXhr;
};

const createEnvironment = (overrides = {}) => ({
  URL,
  Event,
  DOMException,
  baseUrl: "https://example.com/dashboard",
  getRules: () => [responseRule],
  isDebuggerEnabled: () => false,
  sendLog: vi.fn(),
  ...overrides,
});

afterEach(() => {
  delete globalThis.HttpModifierRules;
  delete globalThis.HttpModifierXhr;
});

describe("XHR mocking", () => {
  it("completes a matching text request without calling native send", async () => {
    const runtime = await loadRuntime();
    const environment = createEnvironment();
    const MockXhr = runtime.createXhrMock(FakeNativeXhr, environment);
    const xhr = new MockXhr();
    const events = [];
    ["readystatechange", "load", "loadend"].forEach((type) => {
      xhr.addEventListener(type, () => events.push(type));
    });

    xhr.open("POST", "/api/users");
    xhr.send("request body");

    expect(xhr.nativeSend).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    await Promise.resolve();

    expect(xhr.readyState).toBe(4);
    expect(xhr.status).toBe(200);
    expect(xhr.statusText).toBe("OK");
    expect(xhr.responseURL).toBe("https://example.com/api/users");
    expect(xhr.responseText).toBe(responseRule.responseBody);
    expect(xhr.response).toBe(responseRule.responseBody);
    expect(xhr.getResponseHeader("Content-Type")).toBe("application/json");
    expect(xhr.getResponseHeader("X-Unknown")).toBeNull();
    expect(xhr.getAllResponseHeaders()).toContain("cache-control: no-store");
    expect(events).toEqual(["readystatechange", "load", "loadend"]);
    expect(environment.sendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        ruleId: "response-1",
        type: "xhr",
        url: "https://example.com/api/users",
      }),
    );
  });

  it("completes a matching JSON request with a parsed response", async () => {
    const runtime = await loadRuntime();
    const MockXhr = runtime.createXhrMock(FakeNativeXhr, createEnvironment());
    const xhr = new MockXhr();
    const events = [];
    ["readystatechange", "load", "loadend"].forEach((type) => {
      xhr.addEventListener(type, () => events.push(type));
    });

    xhr.open("GET", "/api/users");
    xhr.responseType = "json";
    xhr.send();
    await Promise.resolve();

    expect(xhr.nativeSend).not.toHaveBeenCalled();
    expect(xhr.response).toEqual({ mocked: true });
    expect(xhr.responseText).toBe("");
    expect(events).toEqual(["readystatechange", "load", "loadend"]);
  });

  it("does nothing when aborted after synthetic completion", async () => {
    const runtime = await loadRuntime();
    const MockXhr = runtime.createXhrMock(FakeNativeXhr, createEnvironment());
    const xhr = new MockXhr();
    const events = [];
    ["abort", "loadend"].forEach((type) => {
      xhr.addEventListener(type, () => events.push(type));
    });

    xhr.open("GET", "/api/users");
    xhr.send();
    await Promise.resolve();
    events.length = 0;
    xhr.abort();

    expect(xhr.nativeAbort).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("resets state and emits readystatechange, abort, loadend when aborted before synthetic completion", async () => {
    const runtime = await loadRuntime();
    const MockXhr = runtime.createXhrMock(FakeNativeXhr, createEnvironment());
    const xhr = new MockXhr();
    const events = [];
    ["readystatechange", "load", "abort", "loadend"].forEach((type) => {
      xhr.addEventListener(type, () =>
        events.push([
          type,
          xhr.readyState,
          xhr.status,
          xhr.statusText,
          xhr.responseURL,
          xhr.responseText,
          xhr.response,
        ]),
      );
    });

    xhr.open("GET", "/api/users");
    xhr.send();
    xhr.abort();
    await Promise.resolve();

    expect(xhr.nativeSend).not.toHaveBeenCalled();
    expect(xhr.nativeAbort).not.toHaveBeenCalled();
    expect(events).toEqual([
      ["readystatechange", 0, 0, "", "", "", null],
      ["abort", 0, 0, "", "", "", null],
      ["loadend", 0, 0, "", "", "", null],
    ]);
  });

  it.each([
    ["unsupported response type", true, "arraybuffer"],
    ["synchronous request", false, ""],
  ])(
    "fails a matching %s without network",
    async (_name, async, responseType) => {
      const runtime = await loadRuntime();
      const MockXhr = runtime.createXhrMock(FakeNativeXhr, createEnvironment());
      const xhr = new MockXhr();
      const events = [];
      ["readystatechange", "error", "loadend"].forEach((type) => {
        xhr.addEventListener(type, () =>
          events.push([type, xhr.readyState, xhr.status]),
        );
      });

      xhr.open("GET", "/api/users", async);
      xhr.responseType = responseType;
      xhr.send();
      await Promise.resolve();

      expect(xhr.nativeSend).not.toHaveBeenCalled();
      expect(xhr.readyState).toBe(4);
      expect(xhr.status).toBe(0);
      expect(events).toEqual([
        ["readystatechange", 4, 0],
        ["error", 4, 0],
        ["loadend", 4, 0],
      ]);
    },
  );

  it("delegates unmatched and debugger-mode requests to native XHR", async () => {
    const runtime = await loadRuntime();
    let debuggerEnabled = false;
    const environment = createEnvironment({
      isDebuggerEnabled: () => debuggerEnabled,
    });
    const MockXhr = runtime.createXhrMock(FakeNativeXhr, environment);

    const unmatched = new MockXhr();
    unmatched.open("GET", "/native");
    unmatched.send("first");
    expect(unmatched.nativeSend).toHaveBeenCalledWith("first");

    debuggerEnabled = true;
    const debuggerRequest = new MockXhr();
    debuggerRequest.open("GET", "/api/users");
    debuggerRequest.send("second");
    expect(debuggerRequest.nativeSend).toHaveBeenCalledWith("second");
  });

  it("cancels pending synthetic completion when reopened", async () => {
    const runtime = await loadRuntime();
    const MockXhr = runtime.createXhrMock(FakeNativeXhr, createEnvironment());
    const xhr = new MockXhr();
    const events = [];
    ["readystatechange", "load", "loadend"].forEach((type) => {
      xhr.addEventListener(type, () => events.push(type));
    });

    xhr.open("GET", "/api/users");
    xhr.send();
    xhr.open("GET", "/native");
    await Promise.resolve();

    expect(events).toEqual([]);
    expect(xhr.readyState).toBe(1);
    xhr.send();
    expect(xhr.nativeSend).toHaveBeenCalledOnce();
  });

  it("throws InvalidStateError for a repeated synthetic send", async () => {
    const runtime = await loadRuntime();
    const MockXhr = runtime.createXhrMock(FakeNativeXhr, createEnvironment());
    const xhr = new MockXhr();

    xhr.open("GET", "/api/users");
    xhr.send();

    expect(() => xhr.send()).toThrowError(
      expect.objectContaining({ name: "InvalidStateError" }),
    );
    expect(xhr.nativeSend).not.toHaveBeenCalled();
    await Promise.resolve();
  });

  it("exposes a frozen API and preserves native constructor constants", async () => {
    const runtime = await loadRuntime();
    const MockXhr = runtime.createXhrMock(FakeNativeXhr, createEnvironment());

    expect(Object.isFrozen(runtime)).toBe(true);
    expect(MockXhr.DONE).toBe(FakeNativeXhr.DONE);
    expect(MockXhr.prototype).toBe(FakeNativeXhr.prototype);
  });
});
