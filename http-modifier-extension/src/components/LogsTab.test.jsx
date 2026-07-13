// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LogsTab from "./LogsTab";

const validLog = {
  id: "log-1",
  timestamp: Date.parse("2026-07-13T12:34:56Z"),
  tabId: 42,
  tabUrl: "https://app.example.com/dashboard",
  method: "POST",
  type: "fetch",
  url: "https://api.example.com/items",
  mockResponse: {
    bodyLength: 11,
    preview: '{"ok":true}',
  },
};

const createChrome = (getLogsResponse = { logs: [validLog] }) => ({
  runtime: {
    lastError: null,
    sendMessage: vi.fn((message, callback) => {
      if (message.type === "GET_LOGS") callback(getLogsResponse);
      if (message.type === "CLEAR_LOGS") callback({ success: true });
    }),
  },
});

beforeEach(() => {
  vi.stubGlobal("chrome", createChrome());
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("LogsTab", () => {
  it("renders stable IDs and trusted source-tab context", async () => {
    render(<LogsTab />);

    const entry = await screen.findByTestId("log-log-1");
    expect(entry.textContent).toContain("Tab 42");
    expect(entry.textContent).toContain("https://app.example.com/dashboard");
    expect(entry.textContent).toContain("Client Script");
    expect(entry.textContent).toContain("https://api.example.com/items");
    expect(
      screen.getByRole("region", { name: "Intercept Logs" }).tabIndex,
    ).toBe(0);
    expect(
      screen.getByRole("button", { name: "Clear intercept logs" }).className,
    ).toContain("focus-visible:ring-2");
  });

  it("renders malformed entries with safe fallbacks", async () => {
    vi.stubGlobal(
      "chrome",
      createChrome({ logs: [null, { id: "partial", mockResponse: null }] }),
    );

    render(<LogsTab />);

    expect((await screen.findAllByText("Unknown URL")).length).toBe(2);
    expect(screen.getAllByText("Unknown method").length).toBe(2);
    expect(screen.getAllByText("Preview unavailable").length).toBe(2);
  });

  it("requires confirmation before clearing logs", async () => {
    confirm.mockReturnValue(false);
    const user = userEvent.setup();

    render(<LogsTab />);
    await screen.findByTestId("log-log-1");
    await user.click(
      screen.getByRole("button", { name: "Clear intercept logs" }),
    );

    expect(confirm).toHaveBeenCalledWith("Clear all intercept logs?");
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
      { type: "CLEAR_LOGS" },
      expect.any(Function),
    );
    expect(screen.getByTestId("log-log-1")).toBeTruthy();
  });

  it("keeps runtime failures visible", async () => {
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (message.type !== "GET_LOGS") return;
      chrome.runtime.lastError = { message: "Service worker unavailable" };
      callback();
      chrome.runtime.lastError = null;
    });

    render(<LogsTab />);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Service worker unavailable",
      );
    });
  });
});
