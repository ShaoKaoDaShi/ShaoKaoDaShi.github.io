import { useCallback, useEffect, useRef, useState } from "react";

import "../../public/ruleContract.js";

const LEGACY_STORAGE_KEYS = ["user", "debuggerEnabled"];
const SENSITIVE_HEADER_NAME = /authorization|cookie|token|api[-_]?key|secret/i;
const SENSITIVE_HEADER_VALUE = /bearer\s+|basic\s+|token|secret|api[-_]?key/i;

const isChromeExtension = () =>
  typeof chrome !== "undefined" && chrome.storage && chrome.runtime;

const getStorage = (keys) =>
  new Promise((resolve, reject) => {
    if (!isChromeExtension()) {
      resolve({});
      return;
    }

    chrome.storage.local.get(keys, (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(data);
    });
  });

const setStorage = (data) =>
  new Promise((resolve, reject) => {
    if (!isChromeExtension()) {
      resolve();
      return;
    }

    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });

const removeStorage = (keys) =>
  new Promise((resolve, reject) => {
    if (!isChromeExtension()) {
      resolve();
      return;
    }

    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });

const sendMessageToActiveTab = (message) =>
  new Promise((resolve) => {
    if (!isChromeExtension()) {
      resolve(null);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        resolve(null);
        return;
      }

      chrome.runtime.sendMessage({ ...message, tabId: tabs[0].id }, resolve);
    });
  });

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const normalizeForComparison = (rule) => {
  const normalizedRule = globalThis.HttpModifierRules.normalizeRule(rule);
  return JSON.stringify(
    Object.fromEntries(
      Object.keys(normalizedRule)
        .sort()
        .map((key) => [key, normalizedRule[key]]),
    ),
  );
};

const hasSensitiveHeaders = (rules) =>
  rules.some(
    (rule) =>
      rule.enabled !== false &&
      rule.type === "header" &&
      (SENSITIVE_HEADER_NAME.test(rule.headerName || "") ||
        SENSITIVE_HEADER_VALUE.test(rule.headerValue || "")),
  );

const pluralize = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const DebuggerSection = ({ enabled, error, pending, onToggle }) => (
  <section className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 shadow-sm">
    <div className="flex items-start gap-3">
      <div
        className="p-2 bg-amber-100 rounded-lg text-amber-600"
        aria-hidden="true"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2v4M18 12h4M12 18v4M2 12h4" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-bold text-gray-800 mb-1">
          Debugger Mode (Advanced)
        </h3>
        <p className="text-xs text-gray-600 mb-3 leading-relaxed">
          Enables network-level mocking via Chrome Debugger API so mocked
          responses appear in the Network tab.
          <span className="block mt-1 text-amber-700 font-medium">
            Chrome will show a debugging banner while this is enabled.
          </span>
        </p>
        <label className="inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            aria-label="Debugger Mode"
            aria-describedby={error ? "debugger-error" : undefined}
            className="sr-only peer"
            checked={enabled}
            disabled={pending}
            onChange={(event) => onToggle(event.target.checked)}
          />
          <span className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-amber-500 peer-focus-visible:ring-offset-2 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
          <span className="ml-3 text-sm font-medium text-gray-700">
            {enabled ? "Enabled" : "Disabled"}
          </span>
        </label>
        {error ? (
          <p
            id="debugger-error"
            role="alert"
            className="mt-3 text-xs font-medium text-red-700"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  </section>
);

const BackupSection = ({ fileInputRef, onExport, onImport }) => (
  <section className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <h3 className="text-sm font-bold text-gray-800 mb-3">Backup & Restore</h3>
    <p className="text-xs text-gray-500 mb-4">
      Export a local JSON backup or merge rules from a previous backup.
    </p>
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onExport}
        className="flex-1 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
      >
        Export JSON
      </button>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex-1 px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-colors"
      >
        Import JSON
      </button>
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Import JSON backup"
        accept=".json,application/json"
        className="sr-only"
        onChange={onImport}
      />
    </div>
  </section>
);

const DataSyncTab = () => {
  const [debuggerEnabled, setDebuggerEnabled] = useState(false);
  const [debuggerError, setDebuggerError] = useState("");
  const [debuggerPending, setDebuggerPending] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef(null);
  const debuggerRequestGeneration = useRef(0);
  const debuggerPendingRef = useRef(false);

  const refreshDebuggerStatus = useCallback(async (generation) => {
    const response = await sendMessageToActiveTab({
      type: "GET_DEBUGGER_STATUS",
    });
    if (generation !== debuggerRequestGeneration.current) return response;

    setDebuggerEnabled(Boolean(response?.enabled));
    if (response?.error) {
      setDebuggerError(
        `Could not read Debugger Mode status: ${response.error}`,
      );
    }
    return response;
  }, []);

  useEffect(() => {
    removeStorage(LEGACY_STORAGE_KEYS).catch((error) => {
      setStatus(`Legacy cleanup failed: ${error.message}`);
    });

    refreshDebuggerStatus(debuggerRequestGeneration.current);
  }, [refreshDebuggerStatus]);

  const handleExport = async () => {
    try {
      const { rules = [] } = await getStorage(["rules"]);
      if (
        hasSensitiveHeaders(rules) &&
        !confirm(
          "This backup contains enabled rules with potentially sensitive headers. Export anyway?",
        )
      ) {
        setStatus("Export canceled. No backup file was created.");
        return;
      }

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        rules,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "http-modifier-rules.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setStatus(
        `Exported ${pluralize(rules.length, "rule")} to a JSON backup.`,
      );
    } catch (error) {
      setStatus(`Export failed: ${error.message}`);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backup = JSON.parse(await readFile(file));
      const { validRules, rejectedRules } =
        globalThis.HttpModifierRules.parseBackup(backup);
      const { rules: storedRules = [] } = await getStorage(["rules"]);
      const mergedRules = [...storedRules];
      const duplicates = [];
      const conflicts = [];
      const additions = [];

      validRules.forEach((rule) => {
        const sameIdRule = mergedRules.find(
          (existing) => existing.id === rule.id,
        );
        if (!sameIdRule) {
          additions.push(rule);
          mergedRules.push(rule);
        } else if (
          normalizeForComparison(sameIdRule) === normalizeForComparison(rule)
        ) {
          duplicates.push(rule);
        } else {
          conflicts.push(rule);
        }
      });

      let acceptedConflicts = [];
      if (
        conflicts.length > 0 &&
        confirm(
          `${pluralize(conflicts.length, "rule has", "rules have")} a conflicting ID. Import with new IDs?`,
        )
      ) {
        acceptedConflicts = conflicts.map((rule) => ({
          ...rule,
          id: crypto.randomUUID(),
        }));
        mergedRules.push(...acceptedConflicts);
      }

      const importedCount = additions.length + acceptedConflicts.length;
      if (importedCount > 0) {
        await setStorage({ rules: mergedRules });
      }

      const parts = [
        `Imported ${pluralize(importedCount, "rule")}`,
        `skipped ${pluralize(duplicates.length, "duplicate")}`,
        `rejected ${pluralize(rejectedRules.length, "invalid rule")}`,
      ];
      if (conflicts.length !== acceptedConflicts.length) {
        parts.push(
          `skipped ${pluralize(conflicts.length - acceptedConflicts.length, "ID conflict")}`,
        );
      }
      setStatus(`${parts.join(", ")}.`);
    } catch (error) {
      setStatus(`Import failed: ${error.message}. Select a valid JSON backup.`);
    } finally {
      event.target.value = "";
    }
  };

  const toggleDebugger = async (checked) => {
    if (debuggerPendingRef.current) return;

    debuggerPendingRef.current = true;
    setDebuggerPending(true);
    setDebuggerError("");
    const generation = ++debuggerRequestGeneration.current;
    const response = await sendMessageToActiveTab({
      type: checked ? "ENABLE_DEBUGGER" : "DISABLE_DEBUGGER",
    });

    if (response?.success) {
      if (generation === debuggerRequestGeneration.current) {
        setDebuggerEnabled(checked);
        setStatus(`Debugger Mode ${checked ? "enabled" : "disabled"}.`);
      }
    } else {
      setDebuggerError(
        `Could not ${checked ? "enable" : "disable"} Debugger Mode: ${response?.error || "No active tab responded."}`,
      );
      await refreshDebuggerStatus(generation);
    }

    if (generation === debuggerRequestGeneration.current) {
      debuggerPendingRef.current = false;
      setDebuggerPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <DebuggerSection
        enabled={debuggerEnabled}
        error={debuggerError}
        pending={debuggerPending}
        onToggle={toggleDebugger}
      />
      <BackupSection
        fileInputRef={fileInputRef}
        onExport={handleExport}
        onImport={handleImport}
      />
      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-xs text-gray-700"
      >
        {status}
      </p>
    </div>
  );
};

export default DataSyncTab;
