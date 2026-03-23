import React, { useState, useCallback, memo } from "react";
import { DEFAULT_GROUP_NAME, normalizeGroupName } from "../hooks/useRules";

const FORM_DEFAULTS = {
  urlPattern: "",
  groupName: DEFAULT_GROUP_NAME,
  responseBody: "",
};

const ResponseRuleForm = memo(
  ({ initialData, onSubmit, onCancel, isEditing }) => {
    const [formData, setFormData] = useState(() => {
      if (initialData) {
        return {
          urlPattern: initialData.urlPattern || "",
          groupName: normalizeGroupName(initialData.groupName),
          responseBody: initialData.responseBody || "",
        };
      }
      return FORM_DEFAULTS;
    });

    const [error, setError] = useState("");

    const handleChange = (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (error) setError("");
    };

    const handleSubmit = useCallback(() => {
      if (!formData.urlPattern || !formData.responseBody) {
        setError("Please fill in all required fields");
        return;
      }

      // Validate JSON
      try {
        JSON.parse(formData.responseBody);
      } catch (e) {
        setError("Invalid JSON in Response Body:\n" + e.message);
        return;
      }

      onSubmit({
        ...formData,
        groupName: normalizeGroupName(formData.groupName),
      });
      if (!isEditing) {
        setFormData(FORM_DEFAULTS);
      }
    }, [formData, onSubmit, isEditing]);

    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 transition-all duration-200 hover:shadow-md">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          {isEditing ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
              Edit Response Rule
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              New Response Rule
            </>
          )}
        </h3>

        <div className="space-y-3 mb-3">
          <div>
            <label
              htmlFor="response-rule-url-pattern"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              URL Pattern (regex)
            </label>
            <input
              id="response-rule-url-pattern"
              type="text"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
              placeholder="e.g. api/v1/user"
              value={formData.urlPattern}
              onChange={(e) => handleChange("urlPattern", e.target.value)}
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
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
              placeholder="e.g. Default"
              value={formData.groupName}
              onChange={(e) => handleChange("groupName", e.target.value)}
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
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono h-32 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors resize-y"
              placeholder='{"status": "ok", "data": {...}}'
              value={formData.responseBody}
              onChange={(e) => handleChange("responseBody", e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mb-3 text-xs text-red-500 font-medium whitespace-pre-wrap">
            {error}
          </div>
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
            className="px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 shadow-sm transition-all active:scale-95"
          >
            {isEditing ? "Save Changes" : "Create Rule"}
          </button>
        </div>
      </div>
    );
  },
);

export default ResponseRuleForm;
