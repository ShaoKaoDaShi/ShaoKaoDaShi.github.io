import { useState, useEffect, useCallback, useMemo, memo } from "react";

// --- Constants ---
const ACTION_TYPES = {
  REQUEST: "request",
  RESPONSE: "response",
};

const OPERATIONS = {
  SET: "set",
  REMOVE: "remove",
  APPEND: "append",
};

const OPERATION_LABELS = {
  [OPERATIONS.SET]: "=",
  [OPERATIONS.APPEND]: "+=",
};

const FORM_DEFAULTS = {
  urlPattern: "",
  actionType: ACTION_TYPES.REQUEST,
  headerName: "",
  operation: OPERATIONS.SET,
  headerValue: "",
};

const RULE_TYPE = "header";

// --- Utility Functions ---
const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// --- Custom Hooks ---
const useHeaderRules = () => {
  const [rules, setRules] = useState([]);

  // Load rules from storage
  const loadRules = useCallback(() => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["rules"], (result) => {
        setRules((result.rules || []).filter((r) => r.type === RULE_TYPE));
      });
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // Helper to save rules
  const saveRulesToStorage = useCallback((updatedRules) => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      chrome.storage.local.get(["rules"], (result) => {
        const otherRules = (result.rules || []).filter(
          (r) => r.type !== RULE_TYPE,
        );
        chrome.storage.local.set(
          { rules: [...otherRules, ...updatedRules] },
          () => {
            // Update local state after successful save to ensure sync
            // Re-loading from storage is safer but setting state directly is faster for UI
            setRules(updatedRules);
          },
        );
      });
    } else {
      // Fallback for dev mode
      setRules(updatedRules);
    }
  }, []);

  const addRule = useCallback(
    (newRule) => {
      // Functional update to ensure we have latest rules if multiple updates happen quickly
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

  // Specialized update for toggling to avoid full object passing
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
  };
};

// --- Components ---

const RuleForm = memo(({ initialData, onSubmit, onCancel, isEditing }) => {
  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        urlPattern: initialData.urlPattern || "",
        actionType: initialData.actionType || ACTION_TYPES.REQUEST,
        headerName: initialData.headerName || "",
        operation: initialData.operation || OPERATIONS.SET,
        headerValue: initialData.headerValue || "",
      };
    }
    return FORM_DEFAULTS;
  });
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  };

  const handleSubmit = () => {
    if (
      !formData.urlPattern ||
      !formData.headerName ||
      (formData.operation !== OPERATIONS.REMOVE && !formData.headerValue)
    ) {
      setError("Please fill in all required fields");
      return;
    }
    onSubmit(formData);
    // Reset form if not editing (if editing, parent handles closing/reset via initialData change)
    if (!isEditing) {
      setFormData(FORM_DEFAULTS);
    }
  };

  const actionTypeOptions = useMemo(
    () => [
      { value: ACTION_TYPES.REQUEST, label: "Request Header" },
      { value: ACTION_TYPES.RESPONSE, label: "Response Header" },
    ],
    [],
  );

  const operationOptions = useMemo(
    () => [
      { value: OPERATIONS.SET, label: "Set Value" },
      { value: OPERATIONS.REMOVE, label: "Remove Header" },
      { value: OPERATIONS.APPEND, label: "Append Value" },
    ],
    [],
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 transition-all duration-200 hover:shadow-md">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        {isEditing ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
            Edit Header Rule
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            New Header Rule
          </>
        )}
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            URL Pattern (contains or regex)
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            placeholder="e.g. example.com/api"
            value={formData.urlPattern}
            onChange={(e) => handleChange("urlPattern", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Type
          </label>
          <select
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            value={formData.actionType}
            onChange={(e) => handleChange("actionType", e.target.value)}
          >
            {actionTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Operation
          </label>
          <select
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            value={formData.operation}
            onChange={(e) => handleChange("operation", e.target.value)}
          >
            {operationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Header Name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="e.g. Authorization"
            value={formData.headerName}
            onChange={(e) => handleChange("headerName", e.target.value)}
          />
        </div>

        {formData.operation !== OPERATIONS.REMOVE && (
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Header Value
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="e.g. Bearer token123"
              value={formData.headerValue}
              onChange={(e) => handleChange("headerValue", e.target.value)}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-3 text-xs text-red-500 font-medium">{error}</div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
        {isEditing && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-all active:scale-95"
        >
          {isEditing ? "Save Changes" : "Create Rule"}
        </button>
      </div>
    </div>
  );
});

const RuleItem = memo(({ rule, onEdit, onDelete, onCopy, onToggle }) => {
  const isDisabled = rule.enabled === false;
  const actionTypeLabel =
    rule.actionType === ACTION_TYPES.REQUEST ? "REQ" : "RES";
  const actionTypeColor =
    rule.actionType === ACTION_TYPES.REQUEST
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";

  return (
    <div
      className={`
        group relative bg-white rounded-lg border transition-all duration-200
        ${
          !isDisabled
            ? "border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200"
            : "border-gray-100 bg-gray-50 opacity-75"
        }
      `}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`
                px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                ${actionTypeColor}
              `}
            >
              {actionTypeLabel}
            </span>
            <span
              className="text-xs font-medium text-gray-500 truncate max-w-[200px]"
              title={rule.urlPattern}
            >
              {rule.urlPattern}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!isDisabled}
                onChange={(e) => onToggle(rule.id, e.target.checked)}
              />
              <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
            </label>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onCopy(rule)}
                className="p-1 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors"
                title="Duplicate"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
              <button
                onClick={() => onEdit(rule)}
                className="p-1 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                title="Edit"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button
                onClick={() => onDelete(rule.id)}
                className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={`font-mono font-medium ${rule.operation === OPERATIONS.REMOVE ? "text-red-600 line-through" : "text-gray-700"}`}
          >
            {rule.headerName}
          </span>
          {rule.operation !== OPERATIONS.REMOVE && (
            <>
              <span className="text-gray-400 text-xs">
                {OPERATION_LABELS[rule.operation]}
              </span>
              <span
                className="font-mono text-gray-600 truncate max-w-[220px]"
                title={rule.headerValue}
              >
                {rule.headerValue}
              </span>
            </>
          )}
          {rule.operation === OPERATIONS.REMOVE && (
            <span className="text-xs text-red-500 bg-red-50 px-1.5 rounded">
              Removed
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// --- Main Component ---
const HeaderRuleTab = () => {
  const { rules, addRule, updateRule, deleteRule, toggleRule } =
    useHeaderRules();
  const [editingRule, setEditingRule] = useState(null);

  const handleFormSubmit = useCallback(
    (formData) => {
      if (editingRule) {
        updateRule({
          ...editingRule,
          ...formData,
        });
        setEditingRule(null);
      } else {
        addRule({
          id: generateId(),
          type: RULE_TYPE,
          enabled: true,
          ...formData,
        });
      }
    },
    [addRule, updateRule, editingRule],
  );

  const handleEdit = useCallback((rule) => {
    setEditingRule(rule);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingRule(null);
  }, []);

  const handleCopy = useCallback(
    (rule) => {
      // Exclude id from copy, generate new one
      // eslint-disable-next-line no-unused-vars
      const { id, ...rest } = rule;
      addRule({
        ...rest,
        id: generateId(),
      });
    },
    [addRule],
  );

  // Handle deleting the rule currently being edited
  const handleDeleteWithCheck = useCallback(
    (id) => {
      if (editingRule && editingRule.id === id) {
        setEditingRule(null);
      }
      deleteRule(id);
    },
    [deleteRule, editingRule],
  );

  return (
    <div className="space-y-6">
      <RuleForm
        key={editingRule ? editingRule.id : "new"}
        initialData={editingRule}
        onSubmit={handleFormSubmit}
        onCancel={handleCancelEdit}
        isEditing={!!editingRule}
      />

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
          Active Rules ({rules.length})
        </h3>

        {rules.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-400 text-sm">No rules configured yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <RuleItem
                key={rule.id}
                rule={rule}
                onEdit={handleEdit}
                onDelete={handleDeleteWithCheck}
                onCopy={handleCopy}
                onToggle={toggleRule}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HeaderRuleTab;
