import test from "node:test";
import assert from "node:assert/strict";
import Module from "node:module";

const moduleWithPrivateLoad = Module as typeof Module & {
  _load: (
    request: string,
    parent: NodeModule | null,
    isMain: boolean,
  ) => unknown;
};

function loadExtensionModule() {
  const originalLoad = moduleWithPrivateLoad._load;

  moduleWithPrivateLoad._load = function (
    request: string,
    parent: NodeModule | null,
    isMain: boolean,
  ) {
    if (request === "vscode") {
      return {};
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require("./tabGuardianHarness") as typeof import("./tabGuardianHarness");
  } finally {
    moduleWithPrivateLoad._load = originalLoad;
  }
}

test("opening a fresh tab over the limit eventually closes the old tab after active tab settles", async () => {
  const { createTabGuardianTestHarness } = loadExtensionModule();
  const oldTab = { id: "old" };
  const freshTab = { id: "fresh" };

  const harness = createTabGuardianTestHarness({
    maxOpenTabs: 1,
    initialTabs: [oldTab],
    initialActiveTab: oldTab,
  });

  harness.openTab(freshTab);
  harness.setPendingActiveTab(freshTab);

  await harness.runDeferredCleanup();

  harness.setActiveTab(freshTab);

  await harness.runDeferredCleanup();

  assert.deepEqual(harness.getClosedTabIds(), ["old"]);
  assert.deepEqual(harness.getOpenTabIds(), ["fresh"]);
});

test("multiple tab change events before cleanup only schedule one cleanup run", async () => {
  const { createTabGuardianTestHarness } = loadExtensionModule();
  const tabA = { id: "a" };
  const tabB = { id: "b" };
  const tabC = { id: "c" };

  const harness = createTabGuardianTestHarness({
    maxOpenTabs: 1,
    initialTabs: [tabA],
    initialActiveTab: tabA,
  });

  harness.openTab(tabB);
  harness.setPendingActiveTab(tabB);
  harness.openTab(tabC);
  harness.setPendingActiveTab(tabC);

  assert.equal(harness.getScheduledCleanupCount(), 1);

  harness.setActiveTab(tabC);

  await harness.runDeferredCleanup();

  assert.equal(harness.getExecutedCleanupCount(), 1);
  assert.deepEqual(harness.getClosedTabIds(), ["a", "b"]);
  assert.deepEqual(harness.getOpenTabIds(), ["c"]);
});
