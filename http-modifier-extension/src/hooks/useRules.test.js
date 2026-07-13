// @vitest-environment jsdom
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_GROUP_NAME,
  disableRulesInGroup,
  normalizeGroupName,
  normalizeRule,
  useRules,
} from "./useRules";

const createChromeMock = () => {
  const changeListeners = new Set();
  const get = vi.fn();
  const set = vi.fn((_value, callback) => callback?.());

  globalThis.chrome = {
    runtime: { lastError: null },
    storage: {
      local: { get, set },
      onChanged: {
        addListener: vi.fn((listener) => changeListeners.add(listener)),
        removeListener: vi.fn((listener) => changeListeners.delete(listener)),
      },
    },
  };

  return { changeListeners, get, set };
};

beforeEach(async () => {
  delete globalThis.HttpModifierRules;
  vi.resetModules();
  await import("../../public/ruleContract.js");
});

afterEach(() => {
  delete globalThis.chrome;
  delete globalThis.HttpModifierRules;
});

describe("useRules normalization", () => {
  it("normalizes blank group names to the default", () => {
    expect(normalizeGroupName()).toBe(DEFAULT_GROUP_NAME);
    expect(normalizeGroupName("   ")).toBe(DEFAULT_GROUP_NAME);
  });

  it("trims provided group names", () => {
    expect(normalizeGroupName("  Team A  ")).toBe("Team A");
  });

  it("normalizes legacy common fields through the shared contract", () => {
    expect(
      normalizeRule({
        id: "1",
        type: "header",
        enabled: true,
        urlPattern: "example.com",
        groupName: "  ",
      }),
    ).toEqual(
      expect.objectContaining({
        id: "1",
        enabled: true,
        groupName: DEFAULT_GROUP_NAME,
        matchType: "contains",
      }),
    );

    expect(
      normalizeRule({
        id: "2",
        type: "response",
        enabled: false,
        urlPattern: "example.com$",
        groupName: "  Custom Group  ",
      }),
    ).toEqual(
      expect.objectContaining({
        id: "2",
        enabled: false,
        groupName: "Custom Group",
        matchType: "regex",
      }),
    );
  });
});

describe("useRules storage", () => {
  it("renders safely when extension storage is unavailable", () => {
    const { result } = renderHook(() => useRules());

    expect(result.current.rules).toEqual([]);
    expect(result.current.storageError).toBeNull();
  });

  it("normalizes legacy rules and persists the migration once", async () => {
    const { get, set } = createChromeMock();
    get.mockImplementation((_keys, callback) =>
      callback({
        rules: [
          {
            id: "legacy",
            type: "header",
            urlPattern: "example.com/api",
            actionType: "request",
            operation: "set",
            headerName: "X-Test",
            headerValue: "yes",
          },
        ],
        ruleApplicationStatus: { generation: 1, statuses: [] },
      }),
    );

    const { result } = renderHook(() => useRules());

    await waitFor(() => expect(result.current.rules).toHaveLength(1));
    expect(result.current.rules[0]).toEqual(
      expect.objectContaining({
        id: "legacy",
        enabled: true,
        groupName: "Default",
        matchType: "contains",
      }),
    );
    expect(result.current.ruleApplicationStatus).toEqual({
      generation: 1,
      statuses: [],
    });
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(
      { rules: result.current.rules },
      expect.any(Function),
    );
  });

  it("exposes migration and later storage errors", async () => {
    const { get, set } = createChromeMock();
    get.mockImplementation((_keys, callback) => callback({ rules: [{}] }));
    set.mockImplementation((_value, callback) => {
      globalThis.chrome.runtime.lastError = { message: "Storage unavailable" };
      callback();
      globalThis.chrome.runtime.lastError = null;
    });

    const { result } = renderHook(() => useRules());

    await waitFor(() =>
      expect(result.current.storageError).toBe("Storage unavailable"),
    );

    act(() => result.current.addRule({ id: "new", type: "response" }));
    expect(result.current.storageError).toBe("Storage unavailable");
  });

  it("subscribes to rule and application status storage changes", async () => {
    const { changeListeners, get } = createChromeMock();
    get.mockImplementation((_keys, callback) => callback({ rules: [] }));
    const { result, unmount } = renderHook(() => useRules());

    await waitFor(() => expect(get).toHaveBeenCalled());
    act(() => {
      for (const listener of changeListeners) {
        listener(
          {
            rules: {
              newValue: [
                {
                  id: "external",
                  type: "response",
                  urlPattern: "example.com",
                  responseBody: "{}",
                },
              ],
            },
            ruleApplicationStatus: {
              newValue: { generation: 2, globalError: "DNR failed" },
            },
          },
          "local",
        );
      }
    });

    expect(result.current.rules[0]).toEqual(
      expect.objectContaining({ id: "external", matchType: "regex" }),
    );
    expect(result.current.ruleApplicationStatus).toEqual({
      generation: 2,
      globalError: "DNR failed",
    });

    unmount();
    expect(
      globalThis.chrome.storage.onChanged.removeListener,
    ).toHaveBeenCalled();
  });

  it("does not let a delayed initial load overwrite local edits", async () => {
    const { get } = createChromeMock();
    let finishLoad;
    get.mockImplementation(
      (_keys, callback) =>
        new Promise((resolve) => {
          finishLoad = (value) => {
            callback(value);
            resolve();
          };
        }),
    );
    const { result } = renderHook(() => useRules());

    act(() => {
      result.current.addRule({
        id: "local",
        type: "response",
        urlPattern: "local",
        matchType: "contains",
        responseBody: "{}",
      });
    });
    act(() => finishLoad({ rules: [] }));

    await waitFor(() => expect(result.current.rules[0]?.id).toBe("local"));
  });

  it("persists once when React replays updater logic in StrictMode", async () => {
    const { get, set } = createChromeMock();
    get.mockImplementation((_keys, callback) => callback({ rules: [] }));
    const wrapper = ({ children }) =>
      React.createElement(React.StrictMode, null, children);
    const { result } = renderHook(() => useRules(), { wrapper });
    await waitFor(() => expect(get).toHaveBeenCalled());

    act(() => result.current.addRule({ id: "once", type: "response" }));

    expect(set).toHaveBeenCalledTimes(1);
  });

  it("serializes whole-array writes from immediate local edits", async () => {
    const { get, set } = createChromeMock();
    const writeCallbacks = [];
    get.mockImplementation((_keys, callback) => callback({ rules: [] }));
    set.mockImplementation((_value, callback) => writeCallbacks.push(callback));
    const { result } = renderHook(() => useRules());
    await waitFor(() => expect(get).toHaveBeenCalled());

    act(() => {
      result.current.addRule({ id: "first", type: "response" });
      result.current.addRule({ id: "second", type: "response" });
    });

    expect(result.current.rules.map(({ id }) => id)).toEqual([
      "first",
      "second",
    ]);
    expect(set).toHaveBeenCalledTimes(1);
    expect(set.mock.calls[0][0].rules.map(({ id }) => id)).toEqual(["first"]);

    act(() => writeCallbacks.shift()());

    expect(set).toHaveBeenCalledTimes(2);
    expect(set.mock.calls[1][0].rules.map(({ id }) => id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("ignores delayed local write echoes but accepts settled external imports", async () => {
    const { changeListeners, get, set } = createChromeMock();
    const writeCallbacks = [];
    get.mockImplementation((_keys, callback) => callback({ rules: [] }));
    set.mockImplementation((_value, callback) => writeCallbacks.push(callback));
    const { result } = renderHook(() => useRules());
    await waitFor(() => expect(get).toHaveBeenCalled());

    act(() => {
      result.current.addRule({ id: "first", type: "response" });
      result.current.addRule({ id: "second", type: "response" });
    });
    act(() => writeCallbacks.shift()());
    act(() => writeCallbacks.shift()());

    act(() => {
      for (const listener of changeListeners) {
        listener({ rules: { newValue: set.mock.calls[0][0].rules } }, "local");
      }
    });
    expect(result.current.rules.map(({ id }) => id)).toEqual([
      "first",
      "second",
    ]);

    act(() => {
      for (const listener of changeListeners) {
        listener(
          { rules: { newValue: [{ id: "imported", type: "response" }] } },
          "local",
        );
      }
    });
    expect(result.current.rules.map(({ id }) => id)).toEqual(["imported"]);
  });
});

describe("disableRulesInGroup", () => {
  it("disables only rules in the requested group", () => {
    expect(
      disableRulesInGroup(
        [
          { id: 1, name: "Rule 1", enabled: true, groupName: "Team A" },
          { id: 2, name: "Rule 2", enabled: true, groupName: "Team B" },
          { id: 3, name: "Rule 3", enabled: false, groupName: "Team A" },
        ],
        "Team A",
      ),
    ).toEqual([
      { id: 1, name: "Rule 1", enabled: false, groupName: "Team A" },
      { id: 2, name: "Rule 2", enabled: true, groupName: "Team B" },
      { id: 3, name: "Rule 3", enabled: false, groupName: "Team A" },
    ]);
  });

  it("normalizes blank group names while disabling the default group", () => {
    expect(
      disableRulesInGroup(
        [
          { id: 1, name: "Rule 1", enabled: true, groupName: "   " },
          { id: 2, name: "Rule 2", enabled: true, groupName: "Team B" },
          { id: 3, name: "Rule 3", enabled: true },
        ],
        DEFAULT_GROUP_NAME,
      ),
    ).toEqual([
      { id: 1, name: "Rule 1", enabled: false, groupName: DEFAULT_GROUP_NAME },
      { id: 2, name: "Rule 2", enabled: true, groupName: "Team B" },
      { id: 3, name: "Rule 3", enabled: false, groupName: DEFAULT_GROUP_NAME },
    ]);
  });
});
