// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import "../../public/ruleContract.js";
import DataSyncTab from "./DataSyncTab";

const validHeaderRule = {
  id: "rule-1",
  type: "header",
  enabled: true,
  actionType: "request",
  operation: "set",
  matchType: "contains",
  urlPattern: "api.example.com",
  headerName: "X-Test",
  headerValue: "one",
  groupName: "Default",
};

const createChrome = (rules = [], debuggerResponse = { enabled: false }) => ({
  storage: {
    local: {
      get: vi.fn((keys, callback) => callback({ rules })),
      set: vi.fn((data, callback) => callback?.()),
      remove: vi.fn((keys, callback) => callback?.()),
    },
  },
  tabs: {
    query: vi.fn((query, callback) => callback([{ id: 7 }])),
  },
  runtime: {
    lastError: null,
    sendMessage: vi.fn((message, callback) => callback(debuggerResponse)),
  },
});

const readBlob = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

beforeEach(() => {
  vi.stubGlobal("chrome", createChrome());
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  URL.createObjectURL = vi.fn(() => "blob:backup");
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DataSyncTab", () => {
  it("removes legacy credentials and debugger storage without rendering cloud controls", async () => {
    render(<DataSyncTab />);

    await waitFor(() => {
      expect(chrome.storage.local.remove).toHaveBeenCalledWith(
        ["user", "debuggerEnabled"],
        expect.any(Function),
      );
    });

    expect(screen.queryByText(/Cloud Sync/i)).toBeNull();
    expect(screen.queryByRole("textbox", { name: /email/i })).toBeNull();
    expect(screen.getByText("Backup & Restore")).toBeTruthy();
  });

  it("exports a versioned backup through a Blob after sensitive-rule confirmation", async () => {
    const sensitiveRule = {
      ...validHeaderRule,
      headerName: "Authorization",
      headerValue: "Bearer private-token",
    };
    vi.stubGlobal("chrome", createChrome([sensitiveRule]));
    const user = userEvent.setup();

    render(<DataSyncTab />);
    await user.click(screen.getByRole("button", { name: "Export JSON" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/sensitive/i));
    expect(URL.createObjectURL).toHaveBeenCalledOnce();

    const backup = JSON.parse(
      await readBlob(URL.createObjectURL.mock.calls[0][0]),
    );
    expect(backup).toMatchObject({ version: 1, rules: [sensitiveRule] });
    expect(backup.exportedAt).toEqual(expect.any(String));
    expect(screen.getByRole("status").textContent).toMatch(/Exported 1 rule/i);
  });

  it("imports versioned backups", async () => {
    const user = userEvent.setup();

    render(<DataSyncTab />);
    await user.upload(
      screen.getByLabelText("Import JSON backup"),
      new File(
        [
          JSON.stringify({
            version: 1,
            exportedAt: "2026-07-13T00:00:00.000Z",
            rules: [validHeaderRule],
          }),
        ],
        "rules.json",
        { type: "application/json" },
      ),
    );

    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledOnce(),
    );
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { rules: [validHeaderRule] },
      expect.any(Function),
    );
    expect(screen.getByRole("status").textContent).toMatch(/Imported 1 rule/i);
  });

  it("reports storage get failures when exporting", async () => {
    const extensionChrome = createChrome();
    extensionChrome.storage.local.get.mockImplementation((_keys, callback) => {
      extensionChrome.runtime.lastError = { message: "Storage unavailable" };
      callback({});
      extensionChrome.runtime.lastError = null;
    });
    vi.stubGlobal("chrome", extensionChrome);
    const user = userEvent.setup();

    render(<DataSyncTab />);
    await user.click(screen.getByRole("button", { name: "Export JSON" }));

    expect((await screen.findByRole("status")).textContent).toContain(
      "Export failed: Storage unavailable",
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("reports import failure without success when storage set fails", async () => {
    const extensionChrome = createChrome();
    extensionChrome.storage.local.set.mockImplementation((_data, callback) => {
      extensionChrome.runtime.lastError = { message: "Storage write failed" };
      callback();
      extensionChrome.runtime.lastError = null;
    });
    vi.stubGlobal("chrome", extensionChrome);
    const user = userEvent.setup();

    render(<DataSyncTab />);
    await user.upload(
      screen.getByLabelText("Import JSON backup"),
      new File([JSON.stringify([validHeaderRule])], "rules.json", {
        type: "application/json",
      }),
    );

    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "Import failed: Storage write failed",
      ),
    );
    expect(screen.getByRole("status").textContent).not.toMatch(/Imported/i);
  });

  it("shows legacy cleanup failures without crashing", async () => {
    const extensionChrome = createChrome();
    extensionChrome.storage.local.remove.mockImplementation(
      (_keys, callback) => {
        extensionChrome.runtime.lastError = { message: "Cleanup blocked" };
        callback();
        extensionChrome.runtime.lastError = null;
      },
    );
    vi.stubGlobal("chrome", extensionChrome);

    render(<DataSyncTab />);

    expect((await screen.findByRole("status")).textContent).toContain(
      "Legacy cleanup failed: Cleanup blocked",
    );
    expect(screen.getByText("Backup & Restore")).toBeTruthy();
  });

  it("imports legacy backups, reports rejected rules, skips exact duplicates, and re-IDs conflicts", async () => {
    vi.stubGlobal("chrome", createChrome([validHeaderRule]));
    const randomUUID = vi.fn(() => "new-rule-id");
    vi.stubGlobal("crypto", { randomUUID });
    const user = userEvent.setup();
    const conflictingRule = { ...validHeaderRule, headerValue: "two" };
    const invalidRule = { id: "invalid" };

    render(<DataSyncTab />);
    await user.upload(
      screen.getByLabelText("Import JSON backup"),
      new File(
        [JSON.stringify([validHeaderRule, conflictingRule, invalidRule])],
        "rules.json",
        { type: "application/json" },
      ),
    );

    await waitFor(() =>
      expect(chrome.storage.local.set).toHaveBeenCalledOnce(),
    );
    expect(confirm).toHaveBeenCalledWith(
      expect.stringMatching(/conflicting ID/i),
    );
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      {
        rules: [
          validHeaderRule,
          expect.objectContaining({ id: "new-rule-id", headerValue: "two" }),
        ],
      },
      expect.any(Function),
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /Imported 1 rule.*skipped 1 duplicate.*rejected 1 invalid rule/i,
    );
  });

  it("keeps the debugger state stable while toggling and ignores stale initial status", async () => {
    const extensionChrome = createChrome();
    const callbacks = [];
    extensionChrome.runtime.sendMessage.mockImplementation(
      (message, callback) => {
        callbacks.push({ message, callback });
      },
    );
    vi.stubGlobal("chrome", extensionChrome);
    const user = userEvent.setup();

    render(<DataSyncTab />);
    await waitFor(() => expect(callbacks).toHaveLength(1));
    const checkbox = screen.getByRole("checkbox", { name: /Debugger Mode/i });

    await user.click(checkbox);
    expect(checkbox.checked).toBe(false);
    expect(checkbox.disabled).toBe(true);
    expect(callbacks.map(({ message }) => message.type)).toEqual([
      "GET_DEBUGGER_STATUS",
      "ENABLE_DEBUGGER",
    ]);

    await user.click(checkbox);
    expect(callbacks).toHaveLength(2);

    callbacks[1].callback({ success: true });
    await waitFor(() => expect(checkbox.checked).toBe(true));
    expect(checkbox.disabled).toBe(false);

    callbacks[0].callback({ enabled: false });
    await waitFor(() => expect(checkbox.checked).toBe(true));
  });

  it("refreshes actual debugger state after a failed detach", async () => {
    const extensionChrome = createChrome();
    const callbacks = [];
    extensionChrome.runtime.sendMessage.mockImplementation(
      (message, callback) => {
        callbacks.push({ message, callback });
      },
    );
    vi.stubGlobal("chrome", extensionChrome);
    const user = userEvent.setup();

    render(<DataSyncTab />);
    await waitFor(() => expect(callbacks).toHaveLength(1));
    callbacks[0].callback({ enabled: true });
    const checkbox = screen.getByRole("checkbox", { name: /Debugger Mode/i });
    await waitFor(() => expect(checkbox.checked).toBe(true));

    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);
    expect(checkbox.disabled).toBe(true);
    callbacks[1].callback({ success: false, error: "Detach failed" });

    await waitFor(() => expect(callbacks).toHaveLength(3));
    expect(callbacks[2].message.type).toBe("GET_DEBUGGER_STATUS");
    expect(checkbox.checked).toBe(true);
    callbacks[2].callback({ enabled: true });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Detach failed",
    );
    await waitFor(() => expect(checkbox.disabled).toBe(false));
    expect(checkbox.checked).toBe(true);
  });

  it("refreshes actual debugger state after a failed enable", async () => {
    const extensionChrome = createChrome();
    const responses = [
      { enabled: false },
      { success: false, error: "Debugger permission denied" },
      { enabled: false },
    ];
    extensionChrome.runtime.sendMessage.mockImplementation(
      (_message, callback) => callback(responses.shift()),
    );
    vi.stubGlobal("chrome", extensionChrome);
    const user = userEvent.setup();

    render(<DataSyncTab />);
    await user.click(screen.getByRole("checkbox", { name: /Debugger Mode/i }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Debugger permission denied",
    );
    expect(
      extensionChrome.runtime.sendMessage.mock.calls.map(
        ([message]) => message.type,
      ),
    ).toEqual([
      "GET_DEBUGGER_STATUS",
      "ENABLE_DEBUGGER",
      "GET_DEBUGGER_STATUS",
    ]);
    expect(
      screen.getByRole("checkbox", { name: /Debugger Mode/i }).checked,
    ).toBe(false);
  });
});
