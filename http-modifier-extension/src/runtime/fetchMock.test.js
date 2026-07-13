import { afterEach, describe, expect, it, vi } from "vitest";

const loadRuntime = async () => {
  delete globalThis.HttpModifierRules;
  delete globalThis.HttpModifierFetch;
  vi.resetModules();
  await import("../../public/ruleContract.js");
  await import("../../public/fetchMock.js");
  return globalThis.HttpModifierFetch;
};

afterEach(() => {
  delete globalThis.HttpModifierRules;
  delete globalThis.HttpModifierFetch;
});

describe("fetch mocking", () => {
  it("returns a synthetic response without calling native fetch", async () => {
    const runtime = await loadRuntime();
    const nativeFetch = vi.fn();
    const sendLog = vi.fn();
    const rules = [
      {
        id: "response-1",
        type: "response",
        enabled: true,
        groupName: "Default",
        urlPattern: "example.com/api/users",
        matchType: "contains",
        responseBody: '{"mocked":true}',
      },
    ];
    const environment = {
      Response,
      Request,
      URL,
      baseUrl: "https://example.com/dashboard",
      getRules: () => rules,
      isDebuggerEnabled: () => false,
      sendLog,
    };

    const mockedFetch = runtime.createFetchMock(nativeFetch, environment);
    const response = await mockedFetch("/api/users", { method: "POST" });

    expect(nativeFetch).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    await expect(response.json()).resolves.toEqual({ mocked: true });
    expect(sendLog).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        ruleId: "response-1",
        type: "fetch",
        url: "https://example.com/api/users",
      }),
    );
  });

  it.each([
    [
      "Request signal",
      (controller) => [
        new Request("https://example.com/api/users", {
          signal: controller.signal,
        }),
      ],
    ],
    [
      "init signal",
      (controller) => ["/api/users", { signal: controller.signal }],
    ],
  ])(
    "rejects a matching request with an already-aborted %s",
    async (_name, createArguments) => {
      const runtime = await loadRuntime();
      const nativeFetch = vi.fn();
      const sendLog = vi.fn();
      const controller = new AbortController();
      controller.abort();
      const environment = {
        Response,
        Request,
        URL,
        DOMException,
        baseUrl: "https://example.com/dashboard",
        getRules: () => [
          {
            id: "response-1",
            type: "response",
            enabled: true,
            groupName: "Default",
            urlPattern: "example.com/api/users",
            matchType: "contains",
            responseBody: '{"mocked":true}',
          },
        ],
        isDebuggerEnabled: () => false,
        sendLog,
      };
      const mockedFetch = runtime.createFetchMock(nativeFetch, environment);

      await expect(
        mockedFetch(...createArguments(controller)),
      ).rejects.toMatchObject({
        name: "AbortError",
      });
      expect(nativeFetch).not.toHaveBeenCalled();
      expect(sendLog).not.toHaveBeenCalled();
    },
  );

  it("rejects when aborted before queued synthetic completion", async () => {
    const runtime = await loadRuntime();
    const nativeFetch = vi.fn();
    const sendLog = vi.fn();
    const controller = new AbortController();
    const environment = {
      Response,
      Request,
      URL,
      DOMException,
      baseUrl: "https://example.com/dashboard",
      getRules: () => [
        {
          id: "response-1",
          type: "response",
          enabled: true,
          groupName: "Default",
          urlPattern: "example.com/api/users",
          matchType: "contains",
          responseBody: '{"mocked":true}',
        },
      ],
      isDebuggerEnabled: () => false,
      sendLog,
    };
    const mockedFetch = runtime.createFetchMock(nativeFetch, environment);

    const result = mockedFetch("/api/users", { signal: controller.signal });
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: "AbortError" });
    expect(nativeFetch).not.toHaveBeenCalled();
    expect(sendLog).not.toHaveBeenCalled();
  });

  it("delegates unmatched and debugger-mode requests to native fetch", async () => {
    const runtime = await loadRuntime();
    const nativeResponse = new Response("native");
    const nativeFetch = vi.fn().mockResolvedValue(nativeResponse);
    let debuggerEnabled = false;
    const environment = {
      Response,
      Request,
      URL,
      baseUrl: "https://example.com/",
      getRules: () => [
        {
          id: "response-1",
          type: "response",
          enabled: true,
          groupName: "Default",
          urlPattern: "/mocked",
          matchType: "contains",
          responseBody: '{"mocked":true}',
        },
      ],
      isDebuggerEnabled: () => debuggerEnabled,
      sendLog: vi.fn(),
    };
    const mockedFetch = runtime.createFetchMock(nativeFetch, environment);

    await expect(mockedFetch("/native")).resolves.toBe(nativeResponse);
    debuggerEnabled = true;
    await expect(mockedFetch("/mocked")).resolves.toBe(nativeResponse);

    expect(nativeFetch).toHaveBeenCalledTimes(2);
  });
});
