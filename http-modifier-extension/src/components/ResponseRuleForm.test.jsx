// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ResponseRuleForm from "./ResponseRuleForm";

afterEach(() => {
  cleanup();
});

describe("ResponseRuleForm", () => {
  it("submits groupName with the form data", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <ResponseRuleForm
        onSubmit={onSubmit}
        onCancel={() => {}}
        isEditing={false}
      />,
    );

    const urlPatternInput = screen.getByLabelText("URL Pattern");
    const groupNameInput = screen.getByLabelText("Group Name");
    const responseBodyInput = screen.getByLabelText("Response Body (JSON)");

    expect(groupNameInput.value).toBe("Default");

    await user.clear(urlPatternInput);
    await user.type(urlPatternInput, "example.com/api");
    await user.clear(groupNameInput);
    await user.type(groupNameInput, "Team A");
    fireEvent.change(responseBodyInput, {
      target: { value: '{"status":"ok"}' },
    });
    await user.click(screen.getByRole("button", { name: "Create Rule" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        groupName: "Team A",
      }),
    );
  });

  it("resets groupName to Default after creating a rule", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(
      <ResponseRuleForm
        onSubmit={onSubmit}
        onCancel={() => {}}
        isEditing={false}
      />,
    );

    const urlPatternInput = screen.getByLabelText("URL Pattern");
    const groupNameInput = screen.getByLabelText("Group Name");
    const responseBodyInput = screen.getByLabelText("Response Body (JSON)");

    await user.clear(urlPatternInput);
    await user.type(urlPatternInput, "example.com/api");
    await user.clear(groupNameInput);
    await user.type(groupNameInput, "Team A");
    fireEvent.change(responseBodyInput, {
      target: { value: '{"status":"ok"}' },
    });
    await user.click(screen.getByRole("button", { name: "Create Rule" }));

    expect(groupNameInput.value).toBe("Default");
  });

  it("submits an explicit selected match type", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <ResponseRuleForm
        onSubmit={onSubmit}
        onCancel={() => {}}
        isEditing={false}
      />,
    );

    await user.type(screen.getByLabelText("URL Pattern"), "example.com");
    await user.selectOptions(screen.getByLabelText("Match Type"), "contains");
    fireEvent.change(screen.getByLabelText("Response Body (JSON)"), {
      target: { value: "{}" },
    });
    await user.click(screen.getByRole("button", { name: "Create Rule" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ matchType: "contains" }),
    );
  });

  it("reports contract validation errors and focuses the first invalid field", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(
      <ResponseRuleForm
        onSubmit={onSubmit}
        onCancel={() => {}}
        isEditing={false}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Match Type"), "regex");
    fireEvent.change(screen.getByLabelText("URL Pattern"), {
      target: { value: "[" },
    });
    await user.type(screen.getByLabelText("Response Body (JSON)"), "invalid");
    await user.click(screen.getByRole("button", { name: "Create Rule" }));

    const url = screen.getByLabelText("URL Pattern");
    expect(url.required).toBe(true);
    expect(url.getAttribute("aria-invalid")).toBe("true");
    expect(url.getAttribute("aria-describedby")).toBe(
      "response-rule-url-pattern-error",
    );
    expect(document.activeElement).toBe(url);
    expect(
      screen
        .getByText("Enter a valid regular expression.")
        .getAttribute("role"),
    ).toBe("alert");
    expect(screen.getByText("Response body must be valid JSON.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("hydrates groupName from initialData", () => {
    render(
      <ResponseRuleForm
        initialData={{
          urlPattern: "example.com/api",
          groupName: "Custom Group",
          responseBody: '{"status":"ok"}',
        }}
        onSubmit={() => {}}
        onCancel={() => {}}
        isEditing
      />,
    );

    expect(screen.getByLabelText("Group Name").value).toBe("Custom Group");
  });

  it("shows Default in edit mode when initialData groupName is whitespace", () => {
    render(
      <ResponseRuleForm
        initialData={{
          urlPattern: "example.com/api",
          groupName: "   ",
          responseBody: '{"status":"ok"}',
        }}
        onSubmit={() => {}}
        onCancel={() => {}}
        isEditing
      />,
    );

    expect(screen.getByLabelText("Group Name").value).toBe("Default");
  });
});
