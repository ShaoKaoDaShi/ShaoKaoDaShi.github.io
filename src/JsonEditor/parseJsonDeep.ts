export function parseJsonDeep(target: any) {
  let a: unknown;
  if (typeof target === "object" && target !== null) {
    Reflect.ownKeys(target).forEach((key) => {
      target[key] = parseJsonDeep(target[key]);
    });
  }
  if (Array.isArray(target)) {
    target.forEach((item, index) => {
      target[index] = parseJsonDeep(item);
    });
  }
  try {
    a = JSON.parse(target);
    console.log("🚀 ~ file: index1.html:16 ~ parseJsonDeep ~ a:", a);
  } catch (e) {
    console.log("🚀 ~ parseJsonDeep ~ e:", e);
    a = target;
    console.log("🚀 ~ file: index1.html:24 ~ parseJsonDeep ~ a:", a);
  }
  return a;
}
