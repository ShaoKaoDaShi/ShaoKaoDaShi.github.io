import React, { useState, useMemo, memo } from "react";
import { ACTION_TYPES, OPERATIONS } from "../constants";
import { normalizeGroupName } from "../hooks/useRules";

const DEFAULT_GROUP_NAME = normalizeGroupName();

const FORM_DEFAULTS = {
  urlPattern: "",
  actionType: ACTION_TYPES.REQUEST,
  headerName: "",
  operation: OPERATIONS.SET,
  headerValue: "",
  groupName: "",
};

const HEADER_PRESETS = [
  { name: "Authorization", value: "Bearer " },
  { name: "Content-Type", value: "application/json" },
  { name: "X-Request-ID", value: "" },
];

const HeaderRuleForm = memo(
  ({ initialData, onSubmit, onCancel, isEditing }) => {
    const [formData, setFormData] = useState(() => {
      if (initialData) {
        return {
          urlPattern: initialData.urlPattern || "",
          actionType: initialData.actionType || ACTION_TYPES.REQUEST,
          headerName: initialData.headerName || "",
          operation: initialData.operation || OPERATIONS.SET,
          headerValue: initialData.headerValue || "",
          groupName: normalizeGroupName(initialData.groupName),
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
      onSubmit({
        ...formData,
        groupName: normalizeGroupName(formData.groupName),
      });
      // Reset form if not editing (if editing, parent handles closing/reset via initialData change)
      if (!isEditing) {
        setFormData(FORM_DEFAULTS);
      }
    };

    const applyPreset = (preset) => {
      setFormData((prev) => ({
        ...prev,
        headerName: preset.name,
        headerValue: preset.value,
        operation: OPERATIONS.SET,
      }));
      if (error) setError("");
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
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-medium text-gray-500">
                Common headers
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {HEADER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-2">
            <label
              htmlFor="header-rule-url-pattern"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              URL Pattern (contains or regex)
            </label>
            <input
              id="header-rule-url-pattern"
              type="text"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
              placeholder="e.g. example.com/api"
              value={formData.urlPattern}
              onChange={(e) => handleChange("urlPattern", e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="header-rule-action-type"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Type
            </label>
            <select
              id="header-rule-action-type"
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
            <label
              htmlFor="header-rule-operation"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Operation
            </label>
            <select
              id="header-rule-operation"
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
            <label
              htmlFor="header-rule-name"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Header Name
            </label>
            <input
              id="header-rule-name"
              type="text"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="e.g. Authorization"
              value={formData.headerName}
              onChange={(e) => handleChange("headerName", e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label
              htmlFor="header-rule-group-name"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Group Name
            </label>
            <input
              id="header-rule-group-name"
              type="text"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="e.g. Default"
              value={formData.groupName}
              onChange={(e) => handleChange("groupName", e.target.value)}
            />
          </div>

          {formData.operation !== OPERATIONS.REMOVE && (
            <div className="col-span-2">
              <label
                htmlFor="header-rule-value"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Header Value
              </label>
              <input
                id="header-rule-value"
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
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-all active:scale-95"
          >
            {isEditing ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </div>
    );
  },
);

export default HeaderRuleForm;
