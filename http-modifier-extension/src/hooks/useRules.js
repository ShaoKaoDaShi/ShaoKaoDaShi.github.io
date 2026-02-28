import { useState, useEffect, useCallback } from "react";

export const useRules = () => {
  const [rules, setRules] = useState([]);

  const loadRules = useCallback(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["rules"], (result) => {
        setRules(result.rules || []);
      });
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const saveRulesToStorage = useCallback((updatedRules) => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.set({ rules: updatedRules });
    }
  }, []);

  const addRule = useCallback(
    (newRule) => {
      setRules((currentRules) => {
        const updatedRules = [...currentRules, newRule];
        saveRulesToStorage(updatedRules);
        return updatedRules;
      });
    },
    [saveRulesToStorage],
  );

  const updateRule = useCallback(
    (updatedRule) => {
      setRules((currentRules) => {
        const updatedRules = currentRules.map((r) =>
          r.id === updatedRule.id ? updatedRule : r,
        );
        saveRulesToStorage(updatedRules);
        return updatedRules;
      });
    },
    [saveRulesToStorage],
  );

  const deleteRule = useCallback(
    (id) => {
      setRules((currentRules) => {
        const updatedRules = currentRules.filter((r) => r.id !== id);
        saveRulesToStorage(updatedRules);
        return updatedRules;
      });
    },
    [saveRulesToStorage],
  );

  const toggleRule = useCallback(
    (id, enabled) => {
      setRules((currentRules) => {
        const updatedRules = currentRules.map((r) =>
          r.id === id ? { ...r, enabled } : r,
        );
        saveRulesToStorage(updatedRules);
        return updatedRules;
      });
    },
    [saveRulesToStorage],
  );

  return {
    rules,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    refreshRules: loadRules,
  };
};
