// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

    await user.type(
      screen.getByLabelText("URL Pattern (contains or regex)"),
      "example.com/api",
    );
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
