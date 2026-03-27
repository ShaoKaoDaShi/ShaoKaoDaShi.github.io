# AGENTS.md

Agent execution guide for `/Users/bytedance/projects/skds/reactJsonView`.
This repository is a multi-project workspace. Treat each top-level app or extension as an independent project unless code clearly proves otherwise.

## Rule Files

- No `.cursor/rules/*` files were found.
- No `.cursorrules` file was found.
- No `.github/copilot-instructions.md` file was found.
- No additional agent rule files were found under the repo root during inspection.

## Repository Map

### Root web app: `./`

- Stack: React + TypeScript + Vite.
- Main app entry: `src/App.tsx`.
- Build config: `vite.config.ts`.
- Output directory: `docs/`.
- Local data layer: `src/Database/jsonParseHistory.ts` uses Dexie.

### Chrome extension: `http-modifier-extension/`

- Stack: React + Tailwind for popup, plain JS for MV3 runtime scripts.
- Manifest: `http-modifier-extension/public/manifest.json`.
- Popup app entry: `http-modifier-extension/src/App.jsx`.
- Runtime scripts: `http-modifier-extension/public/background.js`, `http-modifier-extension/public/content.js`, `http-modifier-extension/public/inject.js`.
- Build config: `http-modifier-extension/vite.config.js`.
- Output directory: `http-modifier-extension/dist/`.

### Sync server: `http-modifier-server/`

- Stack: TypeScript + Express + Bun + SQLite.
- Main server entry: `http-modifier-server/server.ts`.
- Database setup: `http-modifier-server/database.ts`.
- Runtime package manager: Bun, not Node.

### PDF/image app: `pdf-image-converter/`

- Stack: React + TypeScript + Vite.
- Build config: `pdf-image-converter/vite.config.ts`.
- Path alias: `@ -> ./src`.
- Special note: keep `CodeInspectorPlugin`; code comments indicate it should not be removed.

### VS Code extension: `vscode-tab-guardian/`

- Stack: TypeScript + VS Code Extension API.
- Main extension entry: `vscode-tab-guardian/src/extension.ts`.
- Package config: `vscode-tab-guardian/package.json`.
- Compiled output: `vscode-tab-guardian/out/`.
- Tests currently compile to `vscode-tab-guardian/out/*.test.js`.

## General Working Rules

- First identify which subproject you are changing.
- Run commands from that subproject directory unless the command clearly belongs at repo root.
- Do not assume tooling is shared across subprojects.
- Prefer the smallest verification command that proves your change.
- If a project has no formal tests, say so directly and use build/lint/typecheck instead.
- Do not remove generated files if that subproject normally checks them in.
- Do not overwrite unrelated user changes in other subprojects.

## Build, Lint, and Test Commands

### Root web app: `./`

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview build: `npm run preview`
- Full verification: `npm run lint && npm run build`
- Single test: no formal test runner was found.
- Smallest useful validation: `npm run lint` or `npm run build`

### Chrome extension: `http-modifier-extension/`

- Install: `npm install`
- Dev server for popup UI: `npm run dev`
- Build extension bundle: `npm run build`
- Lint: `npm run lint`
- Generate icons: `npm run generate-icons`
- Full verification: `npm run lint && npm run build`
- Single test: no formal test runner was found.
- Smallest useful validation: `npm run lint` for JS/JSX changes, `npm run build` for integration changes

### Sync server: `http-modifier-server/`

- Install: `npm install`
- Start server: `npm run start`
- Dev server: `npm run dev`
- Typecheck: `npm run typecheck`
- Full verification: `npm run typecheck`
- Single test: no formal test runner was found.
- Smallest useful validation: `npm run typecheck`
- Runtime note: scripts use Bun; do not replace with `node server.ts`

### PDF/image app: `pdf-image-converter/`

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview: `npm run preview`
- Full verification: `npm run lint && npm run build`
- Single test: no formal test runner was found.
- Smallest useful validation: `npm run lint` or `npm run build`

### VS Code extension: `vscode-tab-guardian/`

- Install: `npm install`
- Compile: `npm run compile`
- Watch compile: `npm run watch`
- Prepublish compile: `npm run vscode:prepublish`
- Test suite: `npm test`
- Verify alias: `npm run verify`
- Full verification: `npm test && npm run compile`
- Single compiled test file: `node --test out/extension.test.js`
- All compiled tests: `node --test out/*.test.js`
- Important: compile first if `out/` is stale
- Smallest useful validation for source change: `npm run compile`

## How To Run One Test

Use these rules when an agent wants the smallest possible test scope.

- Root web app: no single-test command available; use lint or build.
- Chrome extension: no single-test command available; use lint or build.
- Sync server: no single-test command available; use `npm run typecheck`.
- PDF/image app: no single-test command available; use lint or build.
- VS Code extension: run `npm run compile && node --test out/extension.test.js`.
- If more test files are added later in `vscode-tab-guardian/out/`, prefer `node --test path/to/file.test.js` for one file.

## Code Style Guidelines

### Imports

- Follow the style already used in the target subproject.
- Keep Node built-in imports separate from local imports when files already do that.
- Prefer direct relative imports over introducing new alias systems unless the subproject already has them.
- Do not leave unused imports behind; ESLint is configured to catch some of them.
- In React files, keep component imports grouped and stable.

### Formatting

- Match existing whitespace, quote style, semicolon usage, and trailing comma behavior in the file you edit.
- Do not introduce a new formatter or reformat unrelated files.
- Keep diffs narrow; avoid cleanup-only edits unless required for correctness.
- Prefer ASCII in new content unless the file already uses non-ASCII text or the text is user-facing.

### Types

- In TypeScript, prefer explicit types for public APIs, config objects, return values, and compatibility wrappers.
- Avoid `any` when a narrower type, union, or type guard is possible.
- When working around runtime API differences, isolate the compatibility logic in a helper.
- Preserve strictness assumptions from `tsconfig.json`; do not weaken compiler settings casually.

### Naming

- Components, classes, and React pages: `PascalCase`.
- Functions, methods, variables, and hooks: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` only when the file already uses constant-style naming.
- File names should follow local conventions instead of forcing one naming style repo-wide.
- Keep command IDs, storage keys, and config keys stable unless migration is intentional.

### Error Handling

- Do not silently swallow errors in async code.
- Surface enough context to debug failures, especially in server code and extension runtime code.
- Prefer returning or logging structured error information over vague messages.
- In browser and extension code, guard boundary conditions before mutating shared state.
- In multi-step flows, fail early when configuration is missing or invalid.

### Comments

- Add comments only when a rule, workaround, or integration boundary is not obvious from code.
- Prefer short comments explaining why, not restating what the code does.
- Keep existing useful comments unless they are now inaccurate.

## Project-Specific Implementation Notes

### Root web app

- `vite.config.ts` builds into `docs/`; be careful because this affects deploy artifacts.
- Routing uses `HashRouter`; do not switch routing mode casually.
- IndexedDB behavior is part of user-visible state, so changes around Dexie should be validated carefully.

### Chrome extension

- Keep popup React code separate from MV3 runtime scripts in `public/`.
- `manifest.json` references runtime script paths directly; preserve file names and locations.
- Dynamic DNR rule IDs in `background.js` must remain integers.
- Debugger-mode response mocking and injected-page mocking are intentionally separate paths.
- Be careful with `window.postMessage` boundaries; validate message shape conservatively.

### Sync server

- Server runtime is Bun-based; SQLite usage relies on `bun:sqlite`.
- Authentication and token handling are simplistic; avoid accidental auth changes while making unrelated edits.
- Treat stored rule JSON as potentially sensitive.

### PDF/image app

- Preserve the Vite alias and the inspector plugin.
- Avoid removing plugin code or config marked as required by comments.

### VS Code extension

- Source of truth is `src/`; `out/` is generated output.
- If you change `src/extension.ts`, run `npm run compile` before claiming success.
- Deferred cleanup and tab-closing behavior now has regression coverage; keep tests updated with behavior changes.
- If you add new tests, ensure `npm test` still works against compiled output.

## Validation Strategy

- For logic-only TypeScript changes, prefer lint/typecheck/compile first.
- For runtime or integration changes, run the smallest command plus a full project build when available.
- For the VS Code extension, prefer `npm test` after behavior changes.
- When no tests exist, explicitly report which command you used as a substitute and why.

## Security and Config Notes

- Never commit secrets from `.env`, tokens, or local database files.
- Be cautious editing files that carry credentials, auth tokens, or sync data.
- Avoid changing CORS, auth, or extension permissions unless the task explicitly requires it.
- Do not assume generated deploy files in `docs/` are disposable without checking repo context.
