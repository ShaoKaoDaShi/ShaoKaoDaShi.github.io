// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Layout from "./Layout";

afterEach(cleanup);

const renderLayout = () =>
  render(
    <Layout>
      <div label="Rules">Rules content</div>
      <div label="Tools">Tools content</div>
      <div label="Logs">Logs content</div>
    </Layout>,
  );

describe("Layout", () => {
  it("renders linked tab and tabpanel semantics with version 1.1.0", () => {
    renderLayout();

    const rulesTab = screen.getByRole("tab", { name: "Rules" });
    const toolsTab = screen.getByRole("tab", { name: "Tools" });
    expect(
      screen.getByRole("tablist", { name: "HTTP Modifier sections" }),
    ).toBeTruthy();
    expect(rulesTab.getAttribute("aria-selected")).toBe("true");
    expect(toolsTab.getAttribute("aria-selected")).toBe("false");
    expect(rulesTab.getAttribute("aria-controls")).toBe("panel-rules");
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
      "tab-rules",
    );
    expect(screen.getByText("v1.1.0")).toBeTruthy();
  });

  it("supports arrow, Home, and End navigation while moving focus", async () => {
    const user = userEvent.setup();
    renderLayout();

    const rulesTab = screen.getByRole("tab", { name: "Rules" });
    rulesTab.focus();

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Tools" }),
    );
    expect(screen.getByText("Tools content")).toBeTruthy();

    await user.keyboard("{End}");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Logs" }),
    );

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(rulesTab);

    await user.keyboard("{ArrowLeft}");
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "Logs" }),
    );

    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(rulesTab);
    expect(rulesTab.className).toContain("focus-visible:ring-2");
  });
});
