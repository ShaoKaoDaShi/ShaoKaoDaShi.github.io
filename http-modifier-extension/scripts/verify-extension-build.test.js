import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const verifierPath = path.join(scriptDirectory, "verify-extension-build.js");
const temporaryDirectories = [];

const createBuildFixture = async () => {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "extension-build-verifier-"),
  );
  const scripts = path.join(root, "scripts");
  const dist = path.join(root, "dist");
  temporaryDirectories.push(root);
  await mkdir(scripts);
  await mkdir(dist);
  await writeFile(
    path.join(scripts, "verify-extension-build.js"),
    await readFile(verifierPath, "utf8"),
  );

  const manifest = {
    manifest_version: 3,
    version: "1.1.0",
    permissions: [],
    background: { service_worker: "background.js" },
    action: { default_popup: "index.html" },
    content_scripts: [
      { js: ["ruleContract.js", "content.js"] },
      {
        js: ["ruleContract.js", "fetchMock.js", "xhrMock.js", "inject.js"],
        world: "MAIN",
      },
    ],
  };
  await writeFile(path.join(dist, "manifest.json"), JSON.stringify(manifest));
  await Promise.all(
    [
      ["index.html", ""],
      [
        "background.js",
        'importScripts("ruleContract.js", "backgroundCore.js");',
      ],
      ["ruleContract.js", ""],
      ["content.js", ""],
      ["fetchMock.js", ""],
      ["xhrMock.js", ""],
      ["inject.js", ""],
    ].map(([file, content]) => writeFile(path.join(dist, file), content)),
  );

  return root;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("extension build verifier", () => {
  it("fails when a statically imported service worker dependency is missing", async () => {
    const root = await createBuildFixture();
    const result = spawnSync(
      process.execPath,
      [path.join(root, "scripts", "verify-extension-build.js")],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("backgroundCore.js");
  });
});
