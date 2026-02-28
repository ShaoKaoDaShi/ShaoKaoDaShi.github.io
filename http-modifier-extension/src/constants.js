export const ACTION_TYPES = {
  REQUEST: "request",
  RESPONSE: "response",
};

export const OPERATIONS = {
  SET: "set",
  REMOVE: "remove",
  APPEND: "append",
};

export const OPERATION_LABELS = {
  [OPERATIONS.SET]: "=",
  [OPERATIONS.APPEND]: "+=",
};

export const RULE_TYPES = {
  HEADER: "header",
  RESPONSE: "response",
};
