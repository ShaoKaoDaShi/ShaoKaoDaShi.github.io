// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HeaderRuleForm from "./HeaderRuleForm";

afterEach(() => {
  cleanup();
});

describe("HeaderRuleForm", () => {
  it("shows an empty groupName field for new forms and normalizes on submit", () => {
    render(
      <HeaderRuleForm
        onSubmit={() => {}}
        onCancel={() => {}}
        isEditing={false}
      />,
    );

    expect(screen.getByLabelText("Group Name").value).toBe("");
  });

  it("submits Default when groupName is left blank", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <HeaderRuleForm
        onSubmit={onSubmit}
        onCancel={() => {}}
        isEditing={false}
      />,
    );

    await user.type(screen.getByLabelText("URL Pattern"), "example.com/api");
    await user.type(screen.getByLabelText("Header Name"), "Authorization");
    await user.type(screen.getByLabelText("Header Value"), "Bearer token123");
    await user.click(screen.getByRole("button", { name: "Create Rule" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        groupName: "Default",
      }),
    );
    expect(screen.queryByText("Please fill in all required fields")).toBeNull();
  });

  it("shows Default in edit mode when initialData groupName is blank", () => {
    render(
      <HeaderRuleForm
        initialData={{
          urlPattern: "example.com/api",
          actionType: "request",
          headerName: "Authorization",
          operation: "set",
          headerValue: "Bearer token123",
          groupName: "   ",
        }}
        onSubmit={() => {}}
        onCancel={() => {}}
        isEditing
      />,
    );

    expect(screen.getByLabelText("Group Name").value).toBe("Default");
  });

  it("submits an explicit selected match type", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <HeaderRuleForm
        onSubmit={onSubmit}
        onCancel={() => {}}
        isEditing={false}
      />,
    );

    await user.type(screen.getByLabelText("URL Pattern"), "^https://example");
    await user.selectOptions(screen.getByLabelText("Match Type"), "regex");
    await user.type(screen.getByLabelText("Header Name"), "X-Test");
    await user.type(screen.getByLabelText("Header Value"), "yes");
    await user.click(screen.getByRole("button", { name: "Create Rule" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ matchType: "regex" }),
    );
  });

  it("reports contract validation errors and focuses the first invalid field", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <HeaderRuleForm
        onSubmit={onSubmit}
        onCancel={() => {}}
        isEditing={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Match Type"), "regex");
    fireEvent.change(screen.getByLabelText("URL Pattern"), {
      target: { value: "[" },
    });
    await user.type(screen.getByLabelText("Header Name"), "Bad Header");
    await user.click(screen.getByRole("button", { name: "Create Rule" }));

    const url = screen.getByLabelText("URL Pattern");
    expect(url.required).toBe(true);
    expect(url.getAttribute("aria-invalid")).toBe("true");
    expect(url.getAttribute("aria-describedby")).toBe(
      "header-rule-url-pattern-error",
    );
    expect(document.activeElement).toBe(url);
    expect(
      screen
        .getByText("Enter a valid regular expression.")
        .getAttribute("role"),
    ).toBe("alert");
    expect(screen.getByText("Enter a valid HTTP header name.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("fills header fields from a common preset", async () => {
    const user = userEvent.setup();

    render(
      <HeaderRuleForm
        onSubmit={() => {}}
        onCancel={() => {}}
        isEditing={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Content-Type" }));

    expect(screen.getByLabelText("Header Name").value).toBe("Content-Type");
    expect(screen.getByLabelText("Header Value").value).toBe(
      "application/json",
    );
  });
});
