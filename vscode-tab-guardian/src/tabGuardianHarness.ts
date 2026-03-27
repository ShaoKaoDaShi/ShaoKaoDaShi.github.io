export type TabGuardianHarnessTab = { id: string };

export type TabGuardianHarnessConfig = {
  maxOpenTabs: number;
  initialTabs: TabGuardianHarnessTab[];
  initialActiveTab?: TabGuardianHarnessTab;
};

export type TabGuardianTestHarness = {
  openTab(tab: TabGuardianHarnessTab): void;
  setPendingActiveTab(tab: TabGuardianHarnessTab): void;
  setActiveTab(tab: TabGuardianHarnessTab): void;
  runDeferredCleanup(): Promise<void>;
  getScheduledCleanupCount(): number;
  getExecutedCleanupCount(): number;
  getClosedTabIds(): string[];
  getOpenTabIds(): string[];
};

type HarnessState = {
  tabs: TabGuardianHarnessTab[];
  activeTab?: TabGuardianHarnessTab;
  pendingActiveTab?: TabGuardianHarnessTab;
  closedTabIds: string[];
  scheduledCleanupCount: number;
  executedCleanupCount: number;
  cleanupScheduled: boolean;
};

function touchHarnessTab(
  lruMap: Map<string, number>,
  counter: { value: number },
  tab: TabGuardianHarnessTab,
): void {
  counter.value += 1;
  lruMap.set(tab.id, counter.value);
}

function createHarnessCleanupRunner(
  state: HarnessState,
  config: TabGuardianHarnessConfig,
  lruMap: Map<string, number>,
  counter: { value: number },
): () => Promise<void> {
  return async () => {
    if (!state.cleanupScheduled) {
      return;
    }

    state.cleanupScheduled = false;
    state.executedCleanupCount += 1;

    const activeTab = state.pendingActiveTab ?? state.activeTab;
    if (state.tabs.length <= config.maxOpenTabs) {
      return;
    }

    const candidates = state.tabs.filter((tab) => tab.id !== activeTab?.id);
    const needCloseCount = Math.min(
      state.tabs.length - config.maxOpenTabs,
      candidates.length,
    );

    const toClose = candidates
      .sort((a, b) => {
        const aScore = lruMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bScore = lruMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return aScore - bScore;
      })
      .slice(0, needCloseCount);

    if (toClose.length === 0) {
      return;
    }

    const toCloseIds = new Set(toClose.map((tab) => tab.id));
    state.tabs = state.tabs.filter((tab) => !toCloseIds.has(tab.id));
    state.closedTabIds.push(...toClose.map((tab) => tab.id));

    if (state.activeTab && toCloseIds.has(state.activeTab.id)) {
      state.activeTab = undefined;
    }

    if (state.pendingActiveTab && toCloseIds.has(state.pendingActiveTab.id)) {
      state.pendingActiveTab = undefined;
    }

    for (const tab of state.tabs) {
      if (!lruMap.has(tab.id)) {
        touchHarnessTab(lruMap, counter, tab);
      }
    }
  };
}

export function createTabGuardianTestHarness(
  config: TabGuardianHarnessConfig,
): TabGuardianTestHarness {
  const state: HarnessState = {
    tabs: [...config.initialTabs],
    activeTab: config.initialActiveTab,
    pendingActiveTab: undefined,
    closedTabIds: [],
    scheduledCleanupCount: 0,
    executedCleanupCount: 0,
    cleanupScheduled: false,
  };
  const lruMap = new Map<string, number>();
  const counter = { value: 0 };

  for (const tab of state.tabs) {
    touchHarnessTab(lruMap, counter, tab);
  }

  if (state.activeTab) {
    touchHarnessTab(lruMap, counter, state.activeTab);
  }

  const scheduleCleanup = () => {
    if (state.cleanupScheduled) {
      return;
    }

    state.cleanupScheduled = true;
    state.scheduledCleanupCount += 1;
  };

  const runDeferredCleanup = createHarnessCleanupRunner(
    state,
    config,
    lruMap,
    counter,
  );

  return {
    openTab(tab) {
      state.tabs.push(tab);
      if (!lruMap.has(tab.id)) {
        touchHarnessTab(lruMap, counter, tab);
      }
      scheduleCleanup();
    },
    setPendingActiveTab(tab) {
      state.pendingActiveTab = tab;
      touchHarnessTab(lruMap, counter, tab);
    },
    setActiveTab(tab) {
      state.activeTab = tab;
      if (state.pendingActiveTab?.id === tab.id) {
        state.pendingActiveTab = undefined;
      }
      touchHarnessTab(lruMap, counter, tab);
    },
    runDeferredCleanup,
    getScheduledCleanupCount() {
      return state.scheduledCleanupCount;
    },
    getExecutedCleanupCount() {
      return state.executedCleanupCount;
    },
    getClosedTabIds() {
      return [...state.closedTabIds];
    },
    getOpenTabIds() {
      return state.tabs.map((tab) => tab.id);
    },
  };
}
