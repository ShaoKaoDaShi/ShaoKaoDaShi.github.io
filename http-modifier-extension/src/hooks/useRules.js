import { useState, useEffect, useCallback } from "react";

export const DEFAULT_GROUP_NAME = "Default";

export const normalizeGroupName = (groupName) => {
  const normalizedGroupName = groupName?.trim();

  return normalizedGroupName || DEFAULT_GROUP_NAME;
};

export const normalizeRule = (rule) => ({
  ...rule,
  groupName: normalizeGroupName(rule?.groupName),
});

export const disableRulesInGroup = (rules, groupName) => {
  const normalizedGroupName = normalizeGroupName(groupName);

  return rules.map((rule) => {
    const normalizedRule = normalizeRule(rule);

    if (normalizedRule.groupName !== normalizedGroupName) {
      return normalizedRule;
    }

    return { ...normalizedRule, enabled: false };
  });
};

export const useRules = () => {
  const [rules, setRules] = useState([]);

  const loadRules = useCallback(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["rules"], (result) => {
        setRules((result.rules || []).map(normalizeRule));
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
        const updatedRules = [...currentRules, normalizeRule(newRule)];
        saveRulesToStorage(updatedRules);
        return updatedRules;
      });
    },
    [saveRulesToStorage],
  );

  const updateRule = useCallback(
    (updatedRule) => {
      setRules((currentRules) => {
        const normalizedRule = normalizeRule(updatedRule);
        const updatedRules = currentRules.map((r) =>
          r.id === normalizedRule.id ? normalizedRule : r,
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

  return {
    rules,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    disableGroup,
    refreshRules: loadRules,
  };
};
