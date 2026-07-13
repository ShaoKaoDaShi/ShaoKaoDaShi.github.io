import React, { memo, useRef, useState } from "react";
import {
  ACTION_TYPES,
  MATCH_TYPES,
  OPERATIONS,
  RULE_CONTRACT,
  RULE_TYPES,
} from "../constants";
import { normalizeGroupName } from "../hooks/useRules";

const FORM_DEFAULTS = {
  urlPattern: "",
  matchType: MATCH_TYPES.CONTAINS,
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

const fieldClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-red-600">
      {message}
    </p>
  ) : null;

const HeaderRuleForm = memo(
  ({ initialData, onSubmit, onCancel, isEditing }) => {
    const [formData, setFormData] = useState(() =>
      initialData
        ? {
            urlPattern: initialData.urlPattern || "",
            matchType: initialData.matchType || MATCH_TYPES.CONTAINS,
            actionType: initialData.actionType || ACTION_TYPES.REQUEST,
            headerName: initialData.headerName || "",
            operation: initialData.operation || OPERATIONS.SET,
            headerValue: initialData.headerValue || "",
            groupName: normalizeGroupName(initialData.groupName),
          }
        : FORM_DEFAULTS,
    );
    const [errors, setErrors] = useState({});
    const fieldRefs = useRef({});

    const handleChange = (field, value) => {
      setFormData((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };

    const handleSubmit = () => {
      const submittedRule = {
        ...formData,
        id: initialData?.id || "new-rule",
        type: RULE_TYPES.HEADER,
        enabled: initialData?.enabled !== false,
        groupName: normalizeGroupName(formData.groupName),
      };
      const validation = RULE_CONTRACT.validateRule(submittedRule);
      if (!validation.valid) {
        setErrors(validation.errors);
        const firstInvalidField = [
          "urlPattern",
          "matchType",
          "actionType",
          "operation",
          "headerName",
          "headerValue",
        ].find((field) => validation.errors[field]);
        fieldRefs.current[firstInvalidField]?.focus();
        return;
      }

      const {
        id: _id,
        type: _type,
        enabled: _enabled,
        ...values
      } = submittedRule;
      onSubmit(values);
      if (!isEditing) setFormData(FORM_DEFAULTS);
    };

    const errorProps = (field, id) => ({
      "aria-invalid": errors[field] ? "true" : undefined,
      "aria-describedby": errors[field] ? `${id}-error` : undefined,
    });

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 transition-all duration-200 hover:shadow-md">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">
          {isEditing ? "Edit Header Rule" : "New Header Rule"}
        </h3>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="col-span-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-500">
              Common headers
            </span>
            <div className="flex flex-wrap justify-end gap-1">
              {HEADER_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    handleChange("headerName", preset.name);
                    handleChange("headerValue", preset.value);
                    handleChange("operation", OPERATIONS.SET);
                  }}
                  className="px-2 py-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="header-rule-match-type"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Match Type
            </label>
            <select
              id="header-rule-match-type"
              ref={(element) => (fieldRefs.current.matchType = element)}
              className={fieldClass}
              value={formData.matchType}
              onChange={(event) =>
                handleChange("matchType", event.target.value)
              }
              required
              {...errorProps("matchType", "header-rule-match-type")}
            >
              <option value={MATCH_TYPES.CONTAINS}>Contains</option>
              <option value={MATCH_TYPES.REGEX}>Regex</option>
            </select>
            <FieldError
              id="header-rule-match-type-error"
              message={errors.matchType}
            />
          </div>

          <div>
            <label
              htmlFor="header-rule-url-pattern"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              URL Pattern
            </label>
            <input
              id="header-rule-url-pattern"
              ref={(element) => (fieldRefs.current.urlPattern = element)}
              type="text"
              className={fieldClass}
              placeholder="e.g. example.com/api"
              value={formData.urlPattern}
              onChange={(event) =>
                handleChange("urlPattern", event.target.value)
              }
              required
              {...errorProps("urlPattern", "header-rule-url-pattern")}
            />
            <FieldError
              id="header-rule-url-pattern-error"
              message={errors.urlPattern}
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
              ref={(element) => (fieldRefs.current.actionType = element)}
              className={fieldClass}
              value={formData.actionType}
              onChange={(event) =>
                handleChange("actionType", event.target.value)
              }
              required
              {...errorProps("actionType", "header-rule-action-type")}
            >
              <option value={ACTION_TYPES.REQUEST}>Request Header</option>
              <option value={ACTION_TYPES.RESPONSE}>Response Header</option>
            </select>
            <FieldError
              id="header-rule-action-type-error"
              message={errors.actionType}
            />
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
              ref={(element) => (fieldRefs.current.operation = element)}
              className={fieldClass}
              value={formData.operation}
              onChange={(event) =>
                handleChange("operation", event.target.value)
              }
              required
              {...errorProps("operation", "header-rule-operation")}
            >
              <option value={OPERATIONS.SET}>Set Value</option>
              <option value={OPERATIONS.REMOVE}>Remove Header</option>
              <option value={OPERATIONS.APPEND}>Append Value</option>
            </select>
            <FieldError
              id="header-rule-operation-error"
              message={errors.operation}
            />
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
              ref={(element) => (fieldRefs.current.headerName = element)}
              type="text"
              className={fieldClass}
              placeholder="e.g. Authorization"
              value={formData.headerName}
              onChange={(event) =>
                handleChange("headerName", event.target.value)
              }
              required
              {...errorProps("headerName", "header-rule-name")}
            />
            <FieldError
              id="header-rule-name-error"
              message={errors.headerName}
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
              className={fieldClass}
              placeholder="e.g. Default"
              value={formData.groupName}
              onChange={(event) =>
                handleChange("groupName", event.target.value)
              }
            />
          </div>

          {formData.operation !== OPERATIONS.REMOVE ? (
            <div className="col-span-2">
              <label
                htmlFor="header-rule-value"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Header Value
              </label>
              <input
                id="header-rule-value"
                ref={(element) => (fieldRefs.current.headerValue = element)}
                type="text"
                className={fieldClass}
                placeholder="e.g. Bearer token123"
                value={formData.headerValue}
                onChange={(event) =>
                  handleChange("headerValue", event.target.value)
                }
                required
                {...errorProps("headerValue", "header-rule-value")}
              />
              <FieldError
                id="header-rule-value-error"
                message={errors.headerValue}
              />
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {isEditing ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </div>
    );
  },
);

export default HeaderRuleForm;
