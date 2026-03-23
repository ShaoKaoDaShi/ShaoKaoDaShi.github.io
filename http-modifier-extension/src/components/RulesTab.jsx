import React, { useState, useCallback, useMemo, memo } from "react";
import { normalizeGroupName, useRules } from "../hooks/useRules";
import HeaderRuleForm from "./HeaderRuleForm";
import ResponseRuleForm from "./ResponseRuleForm";
import {
  ACTION_TYPES,
  OPERATIONS,
  OPERATION_LABELS,
  RULE_TYPES,
} from "../constants";
import { generateId } from "../utils";

const RuleItem = memo(({ rule, onEdit, onDelete, onCopy, onToggle }) => {
  const isDisabled = rule.enabled === false;

  const isHeaderRule =
    rule.type === RULE_TYPES.HEADER || rule.type === "header";
  const isResponseRule =
    rule.type === RULE_TYPES.RESPONSE || rule.type === "response";

  let label, labelColor;

  if (isHeaderRule) {
    label = rule.actionType === ACTION_TYPES.REQUEST ? "REQ" : "RES";
    labelColor =
      rule.actionType === ACTION_TYPES.REQUEST
        ? "bg-blue-100 text-blue-700"
        : "bg-purple-100 text-purple-700";
  } else if (isResponseRule) {
    label = "MOCK";
    labelColor = "bg-green-100 text-green-700";
  } else {
    label = "UNKNOWN";
    labelColor = "bg-gray-100 text-gray-700";
  }

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
                ${labelColor}
              `}
            >
              {label}
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

        {isHeaderRule && (
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
        )}

        {isResponseRule && (
          <>
            <div className="bg-gray-50 rounded p-2 border border-gray-100 font-mono text-[10px] text-gray-600 truncate">
              {rule.responseBody && rule.responseBody.substring(0, 100)}
              {rule.responseBody && rule.responseBody.length > 100 && "..."}
            </div>
            <div className="mt-1 text-[10px] text-gray-400 text-right">
              Size: {rule.responseBody ? rule.responseBody.length : 0} chars
            </div>
          </>
        )}
      </div>
    </div>
  );
});

const RulesTab = () => {
  const { rules, addRule, updateRule, deleteRule, toggleRule, disableGroup } =
    useRules();
  const [editingRule, setEditingRule] = useState(null);
  const [creationType, setCreationType] = useState(null); // 'header' | 'response' | null

  const handleFormSubmit = useCallback(
    (formData) => {
      if (editingRule) {
        updateRule({
          ...editingRule,
          ...formData,
          groupName: formData.groupName || editingRule.groupName,
        });
        setEditingRule(null);
      } else if (creationType) {
        addRule({
          id: generateId(),
          type: creationType,
          enabled: true,
          ...formData,
        });
        setCreationType(null);
      }
    },
    [addRule, updateRule, editingRule, creationType],
  );

  const handleEdit = useCallback((rule) => {
    setEditingRule(rule);
    setCreationType(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingRule(null);
    setCreationType(null);
  }, []);

  const handleCopy = useCallback(
    (rule) => {
      // Exclude id from copy, generate new one
      const { id: _id, ...rest } = rule;
      addRule({
        ...rest,
        id: generateId(),
      });
    },
    [addRule],
  );

  const handleDeleteWithCheck = useCallback(
    (id) => {
      if (editingRule && editingRule.id === id) {
        setEditingRule(null);
      }
      deleteRule(id);
    },
    [deleteRule, editingRule],
  );

  const isEditingHeader =
    (editingRule &&
      (editingRule.type === RULE_TYPES.HEADER ||
        editingRule.type === "header")) ||
    creationType === RULE_TYPES.HEADER;
  const isEditingResponse =
    (editingRule &&
      (editingRule.type === RULE_TYPES.RESPONSE ||
        editingRule.type === "response")) ||
    creationType === RULE_TYPES.RESPONSE;

  const groupedRules = useMemo(() => {
    const groups = new Map();

    rules.forEach((rule) => {
      const groupName = normalizeGroupName(rule.groupName);
      const existingGroup = groups.get(groupName);

      if (existingGroup) {
        existingGroup.rules.push(rule);
        if (rule.enabled !== false) {
          existingGroup.isActive = true;
        }
        return;
      }

      groups.set(groupName, {
        groupName,
        rules: [rule],
        isActive: rule.enabled !== false,
      });
    });

    return Array.from(groups.values());
  }, [rules]);

  return (
    <div className="space-y-6">
      {/* Creation Buttons */}
      {!editingRule && !creationType && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCreationType(RULE_TYPES.HEADER)}
            className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group shadow-sm"
          >
            <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </span>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">
                Header Rule
              </div>
              <div className="text-[10px] text-gray-500">
                Modify request/response headers
              </div>
            </div>
          </button>

          <button
            onClick={() => setCreationType(RULE_TYPES.RESPONSE)}
            className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all group shadow-sm"
          >
            <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </span>
            <div className="text-left">
              <div className="text-sm font-medium text-gray-900">Mock Rule</div>
              <div className="text-[10px] text-gray-500">
                Mock API response body
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Forms */}
      {isEditingHeader && (
        <HeaderRuleForm
          key={editingRule ? editingRule.id : "new-header"}
          initialData={editingRule}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelEdit}
          isEditing={!!editingRule}
        />
      )}

      {isEditingResponse && (
        <ResponseRuleForm
          key={editingRule ? editingRule.id : "new-response"}
          initialData={editingRule}
          onSubmit={handleFormSubmit}
          onCancel={handleCancelEdit}
          isEditing={!!editingRule}
        />
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
          All Rules ({rules.length})
        </h3>

        {rules.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-400 text-sm">No rules configured yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedRules.map((group) => (
              <section key={group.groupName} className="space-y-3">
                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {group.groupName}
                    </h4>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {group.rules.length}{" "}
                      {group.rules.length === 1 ? "rule" : "rules"}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                        group.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {group.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      disableGroup(normalizeGroupName(group.groupName))
                    }
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Disable Group
                  </button>
                </div>

                <div className="space-y-3">
                  {group.rules.map((rule) => (
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
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RulesTab;
