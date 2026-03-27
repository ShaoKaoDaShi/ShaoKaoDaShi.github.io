"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const MIN_TABS = 1;
const MAX_TABS = 50;
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
class TabGuardian {
    constructor(context) {
        this.context = context;
        this.lruCounter = 0;
        this.lruMap = new WeakMap();
        this.isCleaning = false;
        this.cleanupScheduled = false;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = "tabManager.cleanNow";
        this.statusBarItem.show();
        this.config = this.loadConfig();
        this.initializeLru();
        this.updateStatusBar();
        this.registerListeners();
    }
    registerListeners() {
        const subscriptions = this.context.subscriptions;
        subscriptions.push(this.statusBarItem);
        subscriptions.push(vscode.window.tabGroups.onDidChangeTabs(() => {
            this.onTabsChanged();
        }));
        subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
            this.onActiveEditorChanged();
        }));
        subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("tabManager")) {
                this.config = this.loadConfig();
                this.updateStatusBar();
                if (this.config.autoCloseEnabled) {
                    void this.ensureLimit(false);
                }
            }
        }));
        subscriptions.push(vscode.commands.registerCommand("tabManager.cleanNow", async () => {
            await this.ensureLimit(true);
        }));
    }
    loadConfig() {
        const cfg = vscode.workspace.getConfiguration("tabManager");
        const rawMax = cfg.get("maxOpenTabs", 6);
        const maxOpenTabs = clamp(rawMax, MIN_TABS, MAX_TABS);
        return {
            maxOpenTabs,
            autoCloseEnabled: cfg.get("autoCloseEnabled", true),
            respectPinned: cfg.get("respectPinned", true),
            respectDirty: cfg.get("respectDirty", true),
        };
    }
    initializeLru() {
        for (const group of vscode.window.tabGroups.all) {
            for (const tab of group.tabs) {
                this.touchTab(tab);
            }
        }
        const active = vscode.window.tabGroups.activeTabGroup?.activeTab;
        if (active) {
            this.touchTab(active);
        }
    }
    onTabsChanged() {
        // 确保所有新打开的 Tab 都有初始 LRU 分数，防止被误判为最久未使用而关闭
        const allTabs = this.getAllTabs();
        for (const tab of allTabs) {
            if (!this.lruMap.has(tab)) {
                this.touchTab(tab);
            }
        }
        this.updateActiveTabUsage();
        this.updateStatusBar();
        if (!this.config.autoCloseEnabled) {
            return;
        }
        this.scheduleCleanup();
    }
    onActiveEditorChanged() {
        this.updateActiveTabUsage();
        this.updateStatusBar();
        if (!this.config.autoCloseEnabled) {
            return;
        }
        void this.ensureLimit(false);
    }
    scheduleCleanup() {
        if (this.cleanupScheduled) {
            return;
        }
        this.cleanupScheduled = true;
        queueMicrotask(() => {
            this.cleanupScheduled = false;
            void this.ensureLimit(false);
        });
    }
    updateActiveTabUsage() {
        const activeGroup = vscode.window.tabGroups.activeTabGroup;
        const activeTab = activeGroup?.activeTab;
        if (activeTab) {
            this.touchTab(activeTab);
        }
    }
    touchTab(tab) {
        this.lruCounter += 1;
        this.lruMap.set(tab, this.lruCounter);
    }
    countAllTabs() {
        return vscode.window.tabGroups.all.reduce((acc, group) => acc + group.tabs.length, 0);
    }
    updateStatusBar() {
        const current = this.countAllTabs();
        const max = this.config.maxOpenTabs;
        const modeLabel = this.config.autoCloseEnabled ? "自动" : "手动";
        this.statusBarItem.text = `Tabs ${current}/${max}`;
        this.statusBarItem.tooltip = `当前标签页：${current}/${max}（${modeLabel}清理）`;
    }
    getAllTabs() {
        return vscode.window.tabGroups.all.flatMap((group) => group.tabs);
    }
    isTextTab(tab) {
        const input = tab.input;
        if (!input) {
            return false;
        }
        return (input instanceof vscode.TabInputText ||
            input instanceof vscode.TabInputTextDiff);
    }
    isTabDirtyCompat(tab) {
        // 兼容旧版 @types/vscode：优先尝试从 Tab 对象本身读取 isDirty
        const maybeDirty = tab.isDirty;
        if (typeof maybeDirty === "boolean") {
            return maybeDirty;
        }
        const input = tab.input;
        if (!input) {
            return false;
        }
        const docs = vscode.workspace.textDocuments;
        if (input instanceof vscode.TabInputText) {
            const targetUri = input.uri;
            const doc = docs.find((d) => d.uri.toString() === targetUri.toString());
            return !!doc && doc.isDirty;
        }
        if (input instanceof vscode.TabInputTextDiff) {
            const originalUri = input.original;
            const modifiedUri = input.modified;
            const originalDoc = docs.find((d) => d.uri.toString() === originalUri.toString());
            const modifiedDoc = docs.find((d) => d.uri.toString() === modifiedUri.toString());
            return !!(originalDoc?.isDirty || modifiedDoc?.isDirty);
        }
        return false;
    }
    isClosableTab(tab, active) {
        if (tab === active) {
            return false;
        }
        if (this.config.respectPinned && tab.isPinned) {
            return false;
        }
        if (this.config.respectDirty && this.isTabDirtyCompat(tab)) {
            return false;
        }
        // 仅关闭文本类标签；设置页、Notebook 等保守不处理
        if (!this.isTextTab(tab)) {
            return false;
        }
        return true;
    }
    ensureLimit(force) {
        if (!force && !this.config.autoCloseEnabled) {
            return Promise.resolve();
        }
        if (this.isCleaning) {
            return Promise.resolve();
        }
        this.isCleaning = true;
        return this.doEnsureLimit(force).finally(() => {
            this.isCleaning = false;
            this.updateStatusBar();
        });
    }
    async doEnsureLimit(force) {
        const allTabs = this.getAllTabs();
        const total = allTabs.length;
        const max = this.config.maxOpenTabs;
        if (total <= max) {
            return;
        }
        const activeTab = vscode.window.tabGroups.activeTabGroup?.activeTab;
        const candidates = allTabs.filter((tab) => this.isClosableTab(tab, activeTab));
        if (candidates.length === 0) {
            return;
        }
        const needCloseCount = Math.min(total - max, candidates.length);
        const sortedByLru = candidates.sort((a, b) => {
            const aScore = this.lruMap.get(a) ?? Number.MAX_SAFE_INTEGER;
            const bScore = this.lruMap.get(b) ?? Number.MAX_SAFE_INTEGER;
            return aScore - bScore;
        });
        const toClose = sortedByLru.slice(0, needCloseCount);
        if (toClose.length > 0) {
            await vscode.window.tabGroups.close(toClose);
        }
    }
}
let _tabGuardian;
function activate(context) {
    _tabGuardian = new TabGuardian(context);
}
function deactivate() {
    if (_tabGuardian) {
        console.log("TabGuardian deactivated");
        _tabGuardian = undefined;
    }
}
//# sourceMappingURL=extension.js.map