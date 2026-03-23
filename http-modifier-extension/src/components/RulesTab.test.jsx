// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RulesTab from "./RulesTab";

const headerRuleFormMock = vi.fn();
const responseRuleFormMock = vi.fn();

const useRulesMock = vi.fn();

vi.mock("../hooks/useRules", async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    useRules: () => useRulesMock(),
  };
});

vi.mock("./HeaderRuleForm", () => ({
  default: (props) => {
    headerRuleFormMock(props);
    return null;
  },
}));

vi.mock("./ResponseRuleForm", () => ({
  default: (props) => {
    responseRuleFormMock(props);
    return null;
  },
}));

afterEach(() => {
  cleanup();
  useRulesMock.mockReset();
  headerRuleFormMock.mockReset();
  responseRuleFormMock.mockReset();
});

describe("RulesTab", () => {
  it("renders grouped sections and disables the selected group", async () => {
    const disableGroup = vi.fn();
    const user = userEvent.setup();

    useRulesMock.mockReturnValue({
      rules: [
        {
          id: "1",
          type: "header",
          enabled: true,
          actionType: "request",
          operation: "set",
          urlPattern: "api.example.com",
          headerName: "Authorization",
          headerValue: "Bearer one",
          groupName: "Team A",
        },
        {
          id: "2",
          type: "response",
          enabled: false,
          urlPattern: "mock.example.com",
          responseBody: '{"ok":true}',
          groupName: "Team A",
        },
        {
          id: "3",
          type: "header",
          enabled: false,
          actionType: "request",
          operation: "remove",
          urlPattern: "other.example.com",
          headerName: "X-Test",
          headerValue: "",
          groupName: "Team B",
        },
      ],
      addRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      toggleRule: vi.fn(),
      disableGroup,
    });

    render(<RulesTab />);

    expect(screen.getByText("Team A")).toBeTruthy();
    expect(screen.getByText("2 rules")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();

    expect(screen.getByText("Team B")).toBeTruthy();
    expect(screen.getByText("1 rule")).toBeTruthy();
    expect(screen.getByText("Inactive")).toBeTruthy();

    const disableButtons = screen.getAllByRole("button", {
      name: "Disable Group",
    });
    await user.click(disableButtons[0]);

    expect(disableGroup).toHaveBeenCalledWith("Team A");
  });

  it("renders blank and whitespace group names as Default and disables that group", async () => {
    const disableGroup = vi.fn();
    const user = userEvent.setup();

    useRulesMock.mockReturnValue({
      rules: [
        {
          id: "1",
          type: "header",
          enabled: true,
          actionType: "request",
          operation: "set",
          urlPattern: "api.example.com",
          headerName: "Authorization",
          headerValue: "Bearer one",
          groupName: "",
        },
        {
          id: "2",
          type: "response",
          enabled: false,
          urlPattern: "mock.example.com",
          responseBody: '{"ok":true}',
          groupName: "   ",
        },
      ],
      addRule: vi.fn(),
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      toggleRule: vi.fn(),
      disableGroup,
    });

    render(<RulesTab />);

    expect(screen.getByText("Default")).toBeTruthy();
    expect(screen.getByText("2 rules")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Disable Group" }));

    expect(disableGroup).toHaveBeenCalledWith("Default");
  });

  it("preserves groupName when copying a rule", async () => {
    const addRule = vi.fn();
    const user = userEvent.setup();

    useRulesMock.mockReturnValue({
      rules: [
        {
          id: "1",
          type: "header",
          enabled: true,
          actionType: "request",
          operation: "set",
          urlPattern: "api.example.com",
          headerName: "Authorization",
          headerValue: "Bearer one",
          groupName: "Team A",
        },
      ],
      addRule,
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      toggleRule: vi.fn(),
      disableGroup: vi.fn(),
    });

    render(<RulesTab />);

    await user.click(screen.getByTitle("Duplicate"));

    expect(addRule).toHaveBeenCalledWith(
      expect.objectContaining({
        groupName: "Team A",
      }),
    );
  });

  it("passes the selected groupName through header rule creation submit", async () => {
    const addRule = vi.fn();
    const user = userEvent.setup();

    useRulesMock.mockReturnValue({
      rules: [],
      addRule,
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      toggleRule: vi.fn(),
      disableGroup: vi.fn(),
    });

    render(<RulesTab />);

    await user.click(screen.getByRole("button", { name: /Header Rule/i }));

    expect(headerRuleFormMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialData: null,
        isEditing: false,
        onSubmit: expect.any(Function),
      }),
    );

    const { onSubmit } = headerRuleFormMock.mock.lastCall[0];
    onSubmit({
      urlPattern: "api.example.com",
      actionType: "request",
      headerName: "Authorization",
      operation: "set",
      headerValue: "Bearer one",
      groupName: "Team A",
    });

    expect(addRule).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "header",
        groupName: "Team A",
      }),
    );
  });

  it("preserves groupName when an edited response rule submits a blank groupName", async () => {
    const updateRule = vi.fn();
    const user = userEvent.setup();
    const existingRule = {
      id: "2",
      type: "response",
      enabled: true,
      urlPattern: "mock.example.com",
      responseBody: '{"ok":true}',
      groupName: "Team A",
    };

    useRulesMock.mockReturnValue({
      rules: [existingRule],
      addRule: vi.fn(),
      updateRule,
      deleteRule: vi.fn(),
      toggleRule: vi.fn(),
      disableGroup: vi.fn(),
    });

    render(<RulesTab />);

    await user.click(screen.getByTitle("Edit"));

    expect(responseRuleFormMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialData: existingRule,
        isEditing: true,
        onSubmit: expect.any(Function),
      }),
    );

    const { onSubmit } = responseRuleFormMock.mock.lastCall[0];
    onSubmit({
      urlPattern: "mock.example.com/v2",
      responseBody: '{"ok":false}',
      groupName: "",
    });

    expect(updateRule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "2",
        groupName: "Team A",
      }),
    );
  });
});
