# Tab Guardian Deferred Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent newly opened VS Code tabs from being closed before they become the stable active tab.

**Architecture:** Keep `onDidChangeTabs` responsible for syncing LRU metadata and UI state, but move auto-close execution onto a deferred scheduler that runs in the next macrotask. The scheduler coalesces duplicate requests, re-reads the active tab at execution time, and keeps the existing LRU-based closing logic intact.

**Tech Stack:** TypeScript, VS Code Extension API, Node.js timers, `tsc`

---

### Task 1: Add a failing reproduction test harness

**Files:**

- Create: `vscode-tab-guardian/src/extension.test.ts`
- Modify: `vscode-tab-guardian/package.json`
- Test: `vscode-tab-guardian/src/extension.test.ts`

**Step 1: Write the failing test**

```ts
import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTabGuardianTestHarness } from "./extension";

describe("TabGuardian deferred cleanup", () => {
  it("does not close the newly opened tab before active tab settles", async () => {
    const harness = createTabGuardianTestHarness({
      maxOpenTabs: 2,
      autoCloseEnabled: true,
      respectPinned: true,
      respectDirty: true,
    });

    const oldA = harness.createTextTab("old-a", { active: false, lru: 1 });
    const oldB = harness.createTextTab("old-b", { active: true, lru: 2 });

    harness.setTabs([oldA, oldB]);

    const fresh = harness.createTextTab("fresh", { active: false });
    harness.setTabs([oldA, oldB, fresh]);

    harness.onTabsChanged();
    harness.setActiveTab(fresh);
    await harness.flushScheduledCleanup();

    assert.deepEqual(harness.closedTabIds(), ["old-a"]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test src/extension.test.ts`
Expected: FAIL because `createTabGuardianTestHarness` does not exist yet.

**Step 3: Write minimal implementation surface for the harness export**

```ts
export function createTabGuardianTestHarness() {
  throw new Error("not implemented");
}
```

**Step 4: Run test to verify it still fails for the expected behavior**

Run: `node --test src/extension.test.ts`
Expected: FAIL with assertion or "not implemented", proving the test reaches the new API.

**Step 5: Commit**

```bash
git add vscode-tab-guardian/src/extension.test.ts vscode-tab-guardian/package.json vscode-tab-guardian/src/extension.ts
git commit -m "test: add deferred cleanup regression harness"
```

### Task 2: Implement deferred cleanup scheduling in the core logic

**Files:**

- Modify: `vscode-tab-guardian/src/extension.ts`
- Test: `vscode-tab-guardian/src/extension.test.ts`

**Step 1: Write the next failing test**

```ts
it("coalesces multiple tab change events into one cleanup run", async () => {
  const harness = createTabGuardianTestHarness({
    maxOpenTabs: 1,
    autoCloseEnabled: true,
    respectPinned: true,
    respectDirty: true,
  });

  const first = harness.createTextTab("first", { active: true, lru: 1 });
  const second = harness.createTextTab("second", { active: false, lru: 2 });
  const third = harness.createTextTab("third", { active: false });

  harness.setTabs([first, second, third]);
  harness.onTabsChanged();
  harness.onTabsChanged();
  harness.setActiveTab(third);

  await harness.flushScheduledCleanup();

  assert.equal(harness.cleanupRunCount(), 1);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test src/extension.test.ts`
Expected: FAIL because scheduling is not coalesced yet.

**Step 3: Write minimal implementation**

```ts
private cleanupTimer: NodeJS.Timeout | undefined;

private scheduleEnsureLimit(): void {
  if (!this.config.autoCloseEnabled || this.cleanupTimer) {
    return;
  }

  this.cleanupTimer = setTimeout(() => {
    this.cleanupTimer = undefined;
    void this.ensureLimit(false);
  }, 0);
}

private onTabsChanged(): void {
  // keep LRU sync
  this.scheduleEnsureLimit();
}
```

Also extract a small core/test harness layer so tests can drive:

- current tab list
- current active tab
- close results
- scheduled cleanup flushing

Keep `doEnsureLimit()` behavior unchanged except that it now runs after scheduling and therefore sees the latest active tab.

**Step 4: Run test to verify it passes**

Run: `node --test src/extension.test.ts`
Expected: PASS for both regression cases.

**Step 5: Commit**

```bash
git add vscode-tab-guardian/src/extension.ts vscode-tab-guardian/src/extension.test.ts
git commit -m "fix: defer tab cleanup until active tab stabilizes"
```

### Task 3: Wire package scripts and verify compile

**Files:**

- Modify: `vscode-tab-guardian/package.json`
- Test: `vscode-tab-guardian/src/extension.test.ts`

**Step 1: Write the failing script expectation**

Add a test script that runs the Node test file through TypeScript compilation output, then verify it fails before the script is updated.

```json
{
  "scripts": {
    "test": "npm run compile && node --test out/extension.test.js"
  }
}
```

**Step 2: Run verification before finalizing**

Run: `npm test`
Expected: FAIL before `tsconfig.json` or sources are updated to emit the test file correctly.

**Step 3: Write minimal implementation**

Ensure `src/extension.test.ts` is included by `tsconfig.json` via the existing `include: ["src"]`, and update `package.json` script:

```json
{
  "scripts": {
    "test": "npm run compile && node --test out/extension.test.js"
  }
}
```

If the compiled path differs, adjust the script to the exact emitted file name in `out/`.

**Step 4: Run full verification**

Run: `npm test && npm run compile`
Expected: PASS with no TypeScript errors.

**Step 5: Commit**

```bash
git add vscode-tab-guardian/package.json vscode-tab-guardian/src/extension.ts vscode-tab-guardian/src/extension.test.ts
git commit -m "test: verify deferred cleanup regression"
```
