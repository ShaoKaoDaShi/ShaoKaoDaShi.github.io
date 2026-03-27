# Grouped Rule Control Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `groupName`-based rule grouping so popup users can manage rules by group, with individual enable behavior and whole-group disable behavior.

**Architecture:** Keep the persisted `rules` array as the single source of truth and extend each rule with `groupName`. Implement normalization and group-disable behavior in `src/hooks/useRules.js`, then update `src/components/RulesTab.jsx` and both rule forms to collect, render, and act on grouped data. Runtime consumers in `public/background.js` and `public/content.js` continue reading only per-rule `enabled` state, so they do not need feature changes.

**Tech Stack:** React 19, Vite, chrome.storage.local, ESLint

---

### Task 1: Add rule normalization utilities in the hook

**Files:**

- Modify: `src/hooks/useRules.js`
- Test: `src/hooks/useRules.test.js`

**Step 1: Write the failing test**

Create `src/hooks/useRules.test.js` with focused tests for normalization helpers extracted from the hook:

```js
import { describe, expect, it } from "vitest";
import { normalizeGroupName, normalizeRule } from "./useRules";

describe("normalizeGroupName", () => {
  it("returns Default for missing group names", () => {
    expect(normalizeGroupName()).toBe("Default");
    expect(normalizeGroupName("")).toBe("Default");
    expect(normalizeGroupName("   ")).toBe("Default");
  });

  it("trims non-empty group names", () => {
    expect(normalizeGroupName("  Auth  ")).toBe("Auth");
  });
});

describe("normalizeRule", () => {
  it("adds Default groupName to legacy rules", () => {
    expect(normalizeRule({ id: "1", enabled: true })).toEqual({
      id: "1",
      enabled: true,
      groupName: "Default",
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useRules.test.js`
Expected: FAIL because `vitest` is not installed yet or because the exported helpers do not exist.

**Step 3: Write minimal implementation**

Update `src/hooks/useRules.js` to export these helpers before wiring them into the hook:

```js
export const DEFAULT_GROUP_NAME = "Default";

export const normalizeGroupName = (groupName) => {
  const normalized = typeof groupName === "string" ? groupName.trim() : "";
  return normalized || DEFAULT_GROUP_NAME;
};

export const normalizeRule = (rule) => ({
  ...rule,
  groupName: normalizeGroupName(rule.groupName),
});
```

Use `normalizeRule` inside `loadRules`, `addRule`, and `updateRule` so persisted data stays consistent.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useRules.test.js`
Expected: PASS for the normalization cases.

**Step 5: Commit**

```bash
git add src/hooks/useRules.js src/hooks/useRules.test.js package.json package-lock.json
git commit -m "test: add rule group normalization coverage"
```

### Task 2: Add a group-disable helper in the hook

**Files:**

- Modify: `src/hooks/useRules.js`
- Test: `src/hooks/useRules.test.js`

**Step 1: Write the failing test**

Extend `src/hooks/useRules.test.js` with a pure helper test for group disabling:

```js
import { disableRulesInGroup } from "./useRules";

it("disables all rules in one group only", () => {
  const rules = [
    { id: "1", groupName: "Auth", enabled: true },
    { id: "2", groupName: "Auth", enabled: true },
    { id: "3", groupName: "Mock", enabled: true },
  ];

  expect(disableRulesInGroup(rules, "Auth")).toEqual([
    { id: "1", groupName: "Auth", enabled: false },
    { id: "2", groupName: "Auth", enabled: false },
    { id: "3", groupName: "Mock", enabled: true },
  ]);
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useRules.test.js`
Expected: FAIL because `disableRulesInGroup` does not exist yet.

**Step 3: Write minimal implementation**

Add and export a pure helper plus hook method:

```js
export const disableRulesInGroup = (rules, groupName) => {
  const targetGroup = normalizeGroupName(groupName);

  return rules.map((rule) =>
    normalizeGroupName(rule.groupName) === targetGroup
      ? { ...normalizeRule(rule), enabled: false }
      : normalizeRule(rule),
  );
};
```

Then expose this hook API:

```js
const disableGroup = useCallback(
  (groupName) => {
    setRules((currentRules) => {
      const updatedRules = disableRulesInGroup(currentRules, groupName);
      saveRulesToStorage(updatedRules);
      return updatedRules;
    });
  },
  [saveRulesToStorage],
);
```

Return `disableGroup` from `useRules`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useRules.test.js`
Expected: PASS for both normalization and group-disable tests.

**Step 5: Commit**

```bash
git add src/hooks/useRules.js src/hooks/useRules.test.js
git commit -m "feat: add group disable rule helpers"
```

### Task 3: Add a test runner for popup unit tests

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Write the failing test**

No new source test is needed in this step. The failure is environment-level: the tests from Tasks 1-2 cannot run cleanly without installing Vitest.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useRules.test.js`
Expected: FAIL with a missing package or transient install warning, confirming the project lacks a stable test runner setup.

**Step 3: Write minimal implementation**

Install Vitest as a dev dependency and add a script:

```json
{
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

Use `npm install -D vitest` so `package-lock.json` updates consistently.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/hooks/useRules.test.js`
Expected: PASS with Vitest running through the new script.

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "test: add vitest runner for popup logic"
```

### Task 4: Add groupName to the header rule form

**Files:**

- Modify: `src/components/HeaderRuleForm.jsx`
- Test: `src/components/HeaderRuleForm.test.jsx`

**Step 1: Write the failing test**

Create `src/components/HeaderRuleForm.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import HeaderRuleForm from "./HeaderRuleForm";

describe("HeaderRuleForm", () => {
  it("submits groupName with the rule data", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSubmit = vi.fn();

    await act(async () => {
      root.render(
        <HeaderRuleForm
          onSubmit={onSubmit}
          onCancel={() => {}}
          isEditing={false}
        />,
      );
    });

    const inputs = container.querySelectorAll("input");
    inputs[0].value = "example.com";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "Auth";
    inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[2].value = "Authorization";
    inputs[2].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[3].value = "Bearer token";
    inputs[3].dispatchEvent(new Event("input", { bubbles: true }));

    const buttons = container.querySelectorAll("button");
    await act(async () => {
      buttons[1].click();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ groupName: "Auth" }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/HeaderRuleForm.test.jsx`
Expected: FAIL because the form does not yet render or submit `groupName`.

**Step 3: Write minimal implementation**

Update `src/components/HeaderRuleForm.jsx`:

- add `groupName` to `FORM_DEFAULTS`
- include `groupName` in the `initialData` mapping
- render a new input under URL Pattern
- pass it through `handleChange`
- keep validation permissive and rely on normalization to convert blank values to `Default`

Use this shape in the form state:

```js
const FORM_DEFAULTS = {
  urlPattern: "",
  groupName: "Default",
  actionType: ACTION_TYPES.REQUEST,
  headerName: "",
  operation: OPERATIONS.SET,
  headerValue: "",
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/HeaderRuleForm.test.jsx`
Expected: PASS and `onSubmit` receives `groupName`.

**Step 5: Commit**

```bash
git add src/components/HeaderRuleForm.jsx src/components/HeaderRuleForm.test.jsx
git commit -m "feat: add rule group input to header form"
```

### Task 5: Add groupName to the response rule form

**Files:**

- Modify: `src/components/ResponseRuleForm.jsx`
- Test: `src/components/ResponseRuleForm.test.jsx`

**Step 1: Write the failing test**

Create `src/components/ResponseRuleForm.test.jsx`:

```jsx
import { describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import ResponseRuleForm from "./ResponseRuleForm";

describe("ResponseRuleForm", () => {
  it("submits groupName with the response rule", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const onSubmit = vi.fn();

    await act(async () => {
      root.render(
        <ResponseRuleForm
          onSubmit={onSubmit}
          onCancel={() => {}}
          isEditing={false}
        />,
      );
    });

    const inputs = container.querySelectorAll("input");
    inputs[0].value = "api/user";
    inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
    inputs[1].value = "Mock";
    inputs[1].dispatchEvent(new Event("input", { bubbles: true }));

    const textarea = container.querySelector("textarea");
    textarea.value = '{"ok":true}';
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    const buttons = container.querySelectorAll("button");
    await act(async () => {
      buttons[1].click();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ groupName: "Mock" }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ResponseRuleForm.test.jsx`
Expected: FAIL because the form has no group field yet.

**Step 3: Write minimal implementation**

Update `src/components/ResponseRuleForm.jsx`:

- extend initial state with `groupName: "Default"`
- hydrate `groupName` from `initialData`
- add a text input for group name between URL Pattern and Response Body
- reset `groupName` back to `Default` after successful create mode submit

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ResponseRuleForm.test.jsx`
Expected: PASS and `onSubmit` includes `groupName`.

**Step 5: Commit**

```bash
git add src/components/ResponseRuleForm.jsx src/components/ResponseRuleForm.test.jsx
git commit -m "feat: add rule group input to response form"
```

### Task 6: Group rules in the popup list

**Files:**

- Modify: `src/components/RulesTab.jsx`
- Test: `src/components/RulesTab.test.jsx`

**Step 1: Write the failing test**

Create `src/components/RulesTab.test.jsx` and mock the hook:

```jsx
import { describe, expect, it, vi } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";

const disableGroup = vi.fn();

vi.mock("../hooks/useRules", () => ({
  useRules: () => ({
    rules: [
      {
        id: "1",
        type: "header",
        urlPattern: "a",
        headerName: "x",
        headerValue: "1",
        operation: "set",
        actionType: "request",
        enabled: true,
        groupName: "Auth",
      },
      {
        id: "2",
        type: "response",
        urlPattern: "b",
        responseBody: "{}",
        enabled: false,
        groupName: "Mock",
      },
    ],
    addRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    toggleRule: vi.fn(),
    disableGroup,
  }),
}));

import RulesTab from "./RulesTab";

describe("RulesTab", () => {
  it("renders grouped sections and disables one group", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<RulesTab />);
    });

    expect(container.textContent).toContain("Auth");
    expect(container.textContent).toContain("Mock");
    expect(container.textContent).toContain("Disable Group");

    const button = Array.from(container.querySelectorAll("button")).find(
      (node) => node.textContent?.includes("Disable Group"),
    );

    await act(async () => {
      button.click();
    });

    expect(disableGroup).toHaveBeenCalledWith("Auth");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/RulesTab.test.jsx`
Expected: FAIL because `RulesTab` still renders a flat list and has no group control.

**Step 3: Write minimal implementation**

Update `src/components/RulesTab.jsx` to:

- import `DEFAULT_GROUP_NAME` or `normalizeGroupName` from `src/hooks/useRules.js`
- derive grouped data with `useMemo`
- render sections per group
- add a group header containing group name, count, active/inactive label, and a `Disable Group` button
- keep `RuleItem` unchanged except for being rendered inside each group

Suggested grouping logic:

```js
const groupedRules = useMemo(() => {
  return rules.reduce((groups, rule) => {
    const groupName = rule.groupName || DEFAULT_GROUP_NAME;
    if (!groups[groupName]) groups[groupName] = [];
    groups[groupName].push(rule);
    return groups;
  }, {});
}, [rules]);
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/RulesTab.test.jsx`
Expected: PASS and the group button calls `disableGroup` with the correct name.

**Step 5: Commit**

```bash
git add src/components/RulesTab.jsx src/components/RulesTab.test.jsx
git commit -m "feat: render grouped rules with disable action"
```

### Task 7: Preserve groupName in create, edit, and copy flows

**Files:**

- Modify: `src/components/RulesTab.jsx`
- Test: `src/components/RulesTab.test.jsx`

**Step 1: Write the failing test**

Extend `src/components/RulesTab.test.jsx` with a copy behavior test:

```jsx
it("preserves groupName when copying a rule", async () => {
  const addRule = vi.fn();

  vi.doMock("../hooks/useRules", () => ({
    useRules: () => ({
      rules: [
        {
          id: "1",
          type: "header",
          urlPattern: "a",
          headerName: "x",
          headerValue: "1",
          operation: "set",
          actionType: "request",
          enabled: true,
          groupName: "Auth",
        },
      ],
      addRule,
      updateRule: vi.fn(),
      deleteRule: vi.fn(),
      toggleRule: vi.fn(),
      disableGroup: vi.fn(),
    }),
  }));
});
```

If the existing test structure makes dynamic re-mocking awkward, split copy behavior into `src/components/RulesTab.copy.test.jsx` or instead extract and test a pure helper from `RulesTab.jsx`.

The actual assertion should confirm the copied rule still carries `groupName: "Auth"`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/RulesTab.test.jsx`
Expected: FAIL if copy drops or mutates `groupName` unexpectedly.

**Step 3: Write minimal implementation**

Verify and, if needed, adjust these paths in `src/components/RulesTab.jsx`:

- `handleFormSubmit` keeps `groupName` on create and edit
- `handleCopy` preserves `groupName` because it already spreads `rest`
- if there is any path creating an item without `groupName`, pass it through unchanged and rely on hook normalization only as fallback

If copy already preserves the field, keep the production code minimal and only add the confirming test.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/RulesTab.test.jsx`
Expected: PASS for copy and submit flows.

**Step 5: Commit**

```bash
git add src/components/RulesTab.jsx src/components/RulesTab.test.jsx
git commit -m "test: cover grouped rule create and copy flows"
```

### Task 8: Run full verification and fix any fallout

**Files:**

- Modify: `src/components/RulesTab.jsx` if verification finds issues
- Modify: `src/components/HeaderRuleForm.jsx` if verification finds issues
- Modify: `src/components/ResponseRuleForm.jsx` if verification finds issues
- Modify: `src/hooks/useRules.js` if verification finds issues
- Test: `src/**/*.test.{js,jsx}`

**Step 1: Write the failing test**

No new test file is required before verification. This task is about running the accumulated suite and treating any failing test or lint issue as the next red step.

**Step 2: Run test to verify current failures**

Run: `npm test`
Expected: PASS if all targeted tests are green. If any fail, stop and treat the first failure as the next TDD cycle.

Run: `npm run lint`
Expected: PASS. If lint fails, fix only the reported issues.

**Step 3: Write minimal implementation**

Apply only the smallest fixes required by the failing verification command. Do not refactor unrelated code.

**Step 4: Run test to verify it passes**

Run: `npm test && npm run lint && npm run build`
Expected: all commands PASS with clean output.

**Step 5: Commit**

```bash
git add src/components/RulesTab.jsx src/components/HeaderRuleForm.jsx src/components/ResponseRuleForm.jsx src/hooks/useRules.js src/**/*.test.js src/**/*.test.jsx package.json package-lock.json
git commit -m "feat: add grouped rule disable controls"
```

## Notes for the Implementer

- Use @superpowers:test-driven-development for every behavior change.
- Keep the rule runtime in `public/background.js` and `public/content.js` untouched unless verification proves otherwise.
- Do not introduce separate group persistence like `groupEnabled`; derive group status from child rules.
- Normalize blank group names to `Default` rather than blocking form submission.
- Prefer extracting tiny pure helpers from `src/hooks/useRules.js` or `src/components/RulesTab.jsx` when a behavior is hard to test through components alone.
