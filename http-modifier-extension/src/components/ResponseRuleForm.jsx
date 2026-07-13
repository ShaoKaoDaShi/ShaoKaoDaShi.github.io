import React, { memo, useRef, useState } from "react";
import { MATCH_TYPES, RULE_CONTRACT, RULE_TYPES } from "../constants";
import { DEFAULT_GROUP_NAME, normalizeGroupName } from "../hooks/useRules";

const FORM_DEFAULTS = {
  urlPattern: "",
  matchType: MATCH_TYPES.CONTAINS,
  groupName: DEFAULT_GROUP_NAME,
  responseBody: "",
};

const fieldClass =
  "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors";

const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} role="alert" className="mt-1 text-xs font-medium text-red-600">
      {message}
    </p>
  ) : null;

const ResponseRuleForm = memo(
  ({ initialData, onSubmit, onCancel, isEditing }) => {
    const [formData, setFormData] = useState(() =>
      initialData
        ? {
            urlPattern: initialData.urlPattern || "",
            matchType: initialData.matchType || MATCH_TYPES.CONTAINS,
            groupName: normalizeGroupName(initialData.groupName),
            responseBody: initialData.responseBody || "",
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
        type: RULE_TYPES.RESPONSE,
        enabled: initialData?.enabled !== false,
        groupName: normalizeGroupName(formData.groupName),
      };
      const validation = RULE_CONTRACT.validateRule(submittedRule);
      if (!validation.valid) {
        setErrors(validation.errors);
        const firstInvalidField = [
          "urlPattern",
          "matchType",
          "responseBody",
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
          {isEditing ? "Edit Response Rule" : "New Response Rule"}
        </h3>

        <div className="space-y-3 mb-3">
          <div>
            <label
              htmlFor="response-rule-match-type"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Match Type
            </label>
            <select
              id="response-rule-match-type"
              ref={(element) => (fieldRefs.current.matchType = element)}
              className={fieldClass}
              value={formData.matchType}
              onChange={(event) =>
                handleChange("matchType", event.target.value)
              }
              required
              {...errorProps("matchType", "response-rule-match-type")}
            >
              <option value={MATCH_TYPES.CONTAINS}>Contains</option>
              <option value={MATCH_TYPES.REGEX}>Regex</option>
            </select>
            <FieldError
              id="response-rule-match-type-error"
              message={errors.matchType}
            />
          </div>

          <div>
            <label
              htmlFor="response-rule-url-pattern"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              URL Pattern
            </label>
            <input
              id="response-rule-url-pattern"
              ref={(element) => (fieldRefs.current.urlPattern = element)}
              type="text"
              className={fieldClass}
              placeholder="e.g. api/v1/user"
              value={formData.urlPattern}
              onChange={(event) =>
                handleChange("urlPattern", event.target.value)
              }
              required
              {...errorProps("urlPattern", "response-rule-url-pattern")}
            />
            <FieldError
              id="response-rule-url-pattern-error"
              message={errors.urlPattern}
            />
          </div>

          <div>
            <label
              htmlFor="response-rule-group-name"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Group Name
            </label>
            <input
              id="response-rule-group-name"
              type="text"
              className={fieldClass}
              placeholder="e.g. Default"
              value={formData.groupName}
              onChange={(event) =>
                handleChange("groupName", event.target.value)
              }
            />
          </div>

          <div>
            <label
              htmlFor="response-rule-body"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              Response Body (JSON)
            </label>
            <textarea
              id="response-rule-body"
              ref={(element) => (fieldRefs.current.responseBody = element)}
              className={`${fieldClass} font-mono h-32 resize-y`}
              placeholder='{"status": "ok"}'
              value={formData.responseBody}
              onChange={(event) =>
                handleChange("responseBody", event.target.value)
              }
              required
              {...errorProps("responseBody", "response-rule-body")}
            />
            <FieldError
              id="response-rule-body-error"
              message={errors.responseBody}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            {isEditing ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </div>
    );
  },
);

export default ResponseRuleForm;
