import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_VERSION = "1.1.0";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const manifestPath = path.join(dist, "manifest.json");

const fail = (message) => {
  throw new Error(`Build verification failed: ${message}`);
};

const readManifest = async () => {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    fail(`cannot read dist/manifest.json (${error.message})`);
  }
};

const resolveAsset = (asset) => {
  const resolved = path.resolve(dist, asset);
  if (resolved !== dist && !resolved.startsWith(`${dist}${path.sep}`)) {
    fail(`asset path escapes dist: ${asset}`);
  }
  return resolved;
};

const addAsset = (assets, value, label) => {
  if (typeof value !== "string" || value.length === 0) {
    fail(`${label} must reference a non-empty path`);
  }
  assets.add(value);
};

const addWorkerImports = async (assets, serviceWorker) => {
  const pending = [serviceWorker];
  const inspected = new Set();

  while (pending.length > 0) {
    const worker = pending.pop();
    if (inspected.has(worker)) continue;
    inspected.add(worker);

    let source;
    try {
      source = await readFile(resolveAsset(worker), "utf8");
    } catch {
      continue;
    }

    const workerDirectory = path.posix.dirname(worker);
    for (const match of source.matchAll(/\bimportScripts\s*\(([^)]*)\)/g)) {
      for (const argument of match[1].split(",")) {
        const stringLiteral = argument.trim().match(/^(["'])([^"'\\]+)\1$/);
        if (!stringLiteral) continue;
        const importedWorker = path.posix.normalize(
          path.posix.join(workerDirectory, stringLiteral[2]),
        );
        assets.add(importedWorker);
        pending.push(importedWorker);
      }
    }
  }
};

const manifest = await readManifest();

if (manifest.version !== EXPECTED_VERSION) {
  fail(
    `manifest version must be ${EXPECTED_VERSION}, received ${manifest.version}`,
  );
}
if (!Array.isArray(manifest.permissions)) {
  fail("manifest permissions must be an array");
}
if (manifest.permissions.includes("scripting")) {
  fail('unused "scripting" permission must be absent');
}
if (!Array.isArray(manifest.content_scripts)) {
  fail("manifest content_scripts must be an array");
}

const isolatedScripts = ["ruleContract.js", "content.js"];
const mainScripts = [
  "ruleContract.js",
  "fetchMock.js",
  "xhrMock.js",
  "inject.js",
];
const isolatedEntry = manifest.content_scripts.find(
  (entry) => JSON.stringify(entry.js) === JSON.stringify(isolatedScripts),
);
const mainEntry = manifest.content_scripts.find(
  (entry) => JSON.stringify(entry.js) === JSON.stringify(mainScripts),
);

if (!isolatedEntry) {
  fail(
    `isolated content scripts must be ordered: ${isolatedScripts.join(", ")}`,
  );
}
if (!mainEntry || mainEntry.world !== "MAIN") {
  fail(`MAIN-world content scripts must be ordered: ${mainScripts.join(", ")}`);
}

const assets = new Set();
addAsset(assets, manifest.action?.default_popup, "action.default_popup");
addAsset(
  assets,
  manifest.background?.service_worker,
  "background.service_worker",
);

for (const [size, icon] of Object.entries(manifest.icons || {})) {
  addAsset(assets, icon, `icons.${size}`);
}
for (const [size, icon] of Object.entries(
  manifest.action?.default_icon || {},
)) {
  addAsset(assets, icon, `action.default_icon.${size}`);
}
for (const [index, entry] of manifest.content_scripts.entries()) {
  for (const [scriptIndex, script] of (entry.js || []).entries()) {
    addAsset(assets, script, `content_scripts.${index}.js.${scriptIndex}`);
  }
}
await addWorkerImports(assets, manifest.background.service_worker);

const missing = [];
for (const asset of assets) {
  try {
    await access(resolveAsset(asset));
  } catch {
    missing.push(asset);
  }
}

if (missing.length > 0) {
  fail(`missing referenced assets: ${missing.join(", ")}`);
}

console.log(
  `Verified extension build ${EXPECTED_VERSION}: ${assets.size} referenced assets exist.`,
);
