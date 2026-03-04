type StackItem = {
  obj: unknown;
  key?: string;
  parent?: unknown;
};

export function parseJsonDeep(target: unknown): unknown {
  let parsedTarget: unknown;

  if (typeof target === 'string') {
    try {
      parsedTarget = JSON.parse(target);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return target;
    }
  } else if (isObject(target) || Array.isArray(target)) {
    parsedTarget = target;
  } else {
    return target;
  }

  const stack: StackItem[] = [];

  if (isObject(parsedTarget)) {
    stack.push({ obj: parsedTarget });
  }

  while (stack.length > 0) {
    const { obj, key, parent } = stack.pop()!;

    if (Array.isArray(obj)) {
      processArray(obj, stack);
    } else if (isObject(obj)) {
      processObject(obj, stack);
    }

    if (key && parent && isObject(parent)) {
      (parent as Record<string, unknown>)[key] = obj;
    }
  }

  return parsedTarget;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function processArray(arr: unknown[], stack: StackItem[]) {
  arr.forEach((item, i) => {
    const parsed = parseValue(item);
    arr[i] = parsed;
    if (isObject(parsed)) {
      stack.push({ obj: parsed });
    }
  });
}

function processObject(obj: Record<string, unknown>, stack: StackItem[]) {
  Object.keys(obj).forEach(key => {
    const parsed = parseValue(obj[key]);
    obj[key] = parsed;
    if (isObject(parsed)) {
      stack.push({ obj: parsed });
    }
  });
}

const parseValue = (value: string | unknown): unknown => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};
