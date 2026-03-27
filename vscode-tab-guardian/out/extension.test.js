"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_module_1 = __importDefault(require("node:module"));
const moduleWithPrivateLoad = node_module_1.default;
function loadExtensionModule() {
    const originalLoad = moduleWithPrivateLoad._load;
    moduleWithPrivateLoad._load = function (request, parent, isMain) {
        if (request === "vscode") {
            return {};
        }
        return originalLoad.call(this, request, parent, isMain);
    };
    try {
        return require("./tabGuardianHarness");
    }
    finally {
        moduleWithPrivateLoad._load = originalLoad;
    }
}
(0, node_test_1.default)("opening a fresh tab over the limit eventually closes the old tab after active tab settles", async () => {
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
    strict_1.default.deepEqual(harness.getClosedTabIds(), ["old"]);
    strict_1.default.deepEqual(harness.getOpenTabIds(), ["fresh"]);
});
(0, node_test_1.default)("multiple tab change events before cleanup only schedule one cleanup run", async () => {
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
    strict_1.default.equal(harness.getScheduledCleanupCount(), 1);
    harness.setActiveTab(tabC);
    await harness.runDeferredCleanup();
    strict_1.default.equal(harness.getExecutedCleanupCount(), 1);
    strict_1.default.deepEqual(harness.getClosedTabIds(), ["a", "b"]);
    strict_1.default.deepEqual(harness.getOpenTabIds(), ["c"]);
});
//# sourceMappingURL=extension.test.js.map