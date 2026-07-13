import { useState, useEffect, useCallback, useRef } from "react";
import { RULE_CONTRACT } from "../constants";

export const DEFAULT_GROUP_NAME = RULE_CONTRACT.DEFAULT_GROUP_NAME;
export const normalizeGroupName = RULE_CONTRACT.normalizeGroupName;
export const normalizeRule = RULE_CONTRACT.normalizeRule;

export const disableRulesInGroup = (rules, groupName) => {
  const normalizedGroupName = normalizeGroupName(groupName);

  return rules.map((rule) => {
    const normalizedRule = {
      ...rule,
      groupName: normalizeGroupName(rule?.groupName),
    };

    if (normalizedRule.groupName !== normalizedGroupName) {
      return normalizedRule;
    }

    return { ...normalizedRule, enabled: false };
  });
};

const rulesNeedMigration = (rules, normalizedRules) =>
  JSON.stringify(rules) !== JSON.stringify(normalizedRules);

export const useRules = () => {
  const [rules, setRules] = useState([]);
  const [storageError, setStorageError] = useState(null);
  const [ruleApplicationStatus, setRuleApplicationStatus] = useState(null);
  const rulesRef = useRef([]);
  const hasLocalChanges = useRef(false);
  const writeQueue = useRef([]);
  const expectedLocalChanges = useRef([]);
  const isWriting = useRef(false);

  const saveRulesToStorage = useCallback((updatedRules) => {
    if (typeof chrome === "undefined" || !chrome.storage) return;

    writeQueue.current.push(updatedRules);

    const writeNext = () => {
      if (isWriting.current || writeQueue.current.length === 0) return;

      isWriting.current = true;
      expectedLocalChanges.current.push(writeQueue.current[0]);
      chrome.storage.local.set({ rules: writeQueue.current[0] }, () => {
        setStorageError(chrome.runtime?.lastError?.message || null);
        writeQueue.current.shift();
        isWriting.current = false;
        writeNext();
      });
    };

    writeNext();
  }, []);

  const loadRules = useCallback(() => {
    if (typeof chrome === "undefined" || !chrome.storage) return;

    chrome.storage.local.get(
      ["rules", "ruleApplicationStatus"],
      (result = {}) => {
        const error = chrome.runtime?.lastError;
        if (error) {
          setStorageError(error.message);
          return;
        }

        const storedRules = Array.isArray(result.rules) ? result.rules : [];
        const normalizedRules = storedRules.map(normalizeRule);
        if (!hasLocalChanges.current) {
          rulesRef.current = normalizedRules;
          setRules(normalizedRules);
          if (rulesNeedMigration(storedRules, normalizedRules)) {
            saveRulesToStorage(normalizedRules);
          }
        }
        setRuleApplicationStatus(result.ruleApplicationStatus || null);
      },
    );
  }, [saveRulesToStorage]);

  useEffect(() => {
    loadRules();

    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
      return undefined;
    }

    const handleStorageChange = (changes, areaName) => {
      if (areaName !== "local") return;

      if (changes.rules) {
        const storedRules = Array.isArray(changes.rules.newValue)
          ? changes.rules.newValue
          : [];
        const localChangeIndex = expectedLocalChanges.current.findIndex(
          (expectedRules) => !rulesNeedMigration(storedRules, expectedRules),
        );
        if (localChangeIndex !== -1) {
          expectedLocalChanges.current.splice(localChangeIndex, 1);
        } else if (!isWriting.current && writeQueue.current.length === 0) {
          const normalizedRules = storedRules.map(normalizeRule);
          rulesRef.current = normalizedRules;
          setRules(normalizedRules);
        }
      }
      if (changes.ruleApplicationStatus) {
        setRuleApplicationStatus(
          changes.ruleApplicationStatus.newValue || null,
        );
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [loadRules]);

  const updateRules = useCallback(
    (updater) => {
      hasLocalChanges.current = true;
      const updatedRules = updater(rulesRef.current).map(normalizeRule);
      rulesRef.current = updatedRules;
      setRules(updatedRules);
      saveRulesToStorage(updatedRules);
    },
    [saveRulesToStorage],
  );

  const addRule = useCallback(
    (newRule) => updateRules((currentRules) => [...currentRules, newRule]),
    [updateRules],
  );

  const updateRule = useCallback(
    (updatedRule) =>
      updateRules((currentRules) =>
        currentRules.map((rule) =>
          rule.id === updatedRule.id ? updatedRule : rule,
        ),
      ),
    [updateRules],
  );

  const deleteRule = useCallback(
    (id) =>
      updateRules((currentRules) =>
        currentRules.filter((rule) => rule.id !== id),
      ),
    [updateRules],
  );

  const toggleRule = useCallback(
    (id, enabled) =>
      updateRules((currentRules) =>
        currentRules.map((rule) =>
          rule.id === id ? { ...rule, enabled } : rule,
        ),
      ),
    [updateRules],
  );

  const disableGroup = useCallback(
    (groupName) =>
      updateRules((currentRules) =>
        disableRulesInGroup(currentRules, groupName),
      ),
    [updateRules],
  );

  return {
    rules,
    storageError,
    ruleApplicationStatus,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    disableGroup,
    refreshRules: loadRules,
  };
};
