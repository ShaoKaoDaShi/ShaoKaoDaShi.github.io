# Findings & Decisions

## Requirements

- Iterate on all findings from the product/UX/engineering review.
- Remove Cloud Sync rather than bind the product to a production API in this iteration.
- Preserve both default page-level mocking and optional Debugger mode.
- Verify through the project's test, lint, and build scripts.

## Research Findings

### Product and Runtime

- Default fetch mocking calls native fetch before replacing the body (`public/inject.js:78-99`).
- Default XHR mocking overrides response accessors but still calls native send (`public/inject.js:113-155`).
- Debugger and page modes differ in URL input, status, headers, CORS, and failure behavior.
- DNR update failures are console-only while stored rules and the badge remain enabled.
- Imported rules receive only `id`, `type`, and `urlPattern` checks.
- Cloud Sync uses `http://localhost:3000/api` and stores user tokens in local extension storage.

### Security and Privacy

- Page messages can forge log payloads and injected rule/debugger updates.
- Background log messages are not restricted to content-script senders.
- Export and former cloud push can include credentials in rule headers without warning.
- Logs aggregate browser-wide URLs and response previews without trusted source-tab metadata.
- The manifest requests unused `scripting` permission.

### UX and Accessibility

- Popup navigation lacks tab semantics and removes visible focus.
- Icon-only actions depend on `title` instead of accessible names.
- Form errors are not linked to controls or announced.
- Delete, group disable, and clear logs are immediate and irreversible.
- Rule cards cannot tell users whether Chrome actually applied a stored header rule.

### Engineering and Verification

- Existing suite: 4 files, 18 tests, all passing at baseline.
- Baseline build passes.
- Baseline lint fails with 17 errors in production and archived legacy scripts.
- Runtime-critical background/content/inject paths have no automated tests.
- `RulesTab.jsx` and `DataSyncTab.jsx` combine too many responsibilities.
- Package, manifest, and UI versions disagree.
- Both npm and Yarn lockfiles exist.

## Technical Decisions

| Decision                              | Rationale                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Shared browser-neutral rule contract  | One source of truth across storage, forms, import, DNR, debugger, and page rules                                                      |
| Explicit match type on new writes     | Removes ambiguous regex/filter inference                                                                                              |
| Legacy normalization                  | Existing persisted rules are shipped behavior and must remain usable                                                                  |
| Synthetic fetch/XHR responses         | A mock must not execute the real request                                                                                              |
| Structured DNR application status     | Storage success and Chrome rule activation are different states                                                                       |
| Remove Cloud Sync UI and auth storage | No secure production service currently exists                                                                                         |
| Channel plus schema validation        | Improves message integrity while acknowledging main-world limitations                                                                 |
| Bounded pure runtime modules          | Enables Vitest coverage without loading real Chrome or DOM worlds                                                                     |
| Runtime adapters live in `public/`    | The exact tested classic scripts must be loaded by manifest/background; this avoids a tested `src` copy plus an untested runtime copy |
| Native confirmation dialogs           | Minimal recovery path without adding modal infrastructure                                                                             |

## Issues Encountered

| Issue                                                                                    | Resolution                                                                                 |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Review scope is too broad for one unstructured edit                                      | Split into contract/runtime, popup/UX, security/metadata, and verification phases          |
| Full main-world tamper resistance is impossible with injected monkey patches             | Use defense in depth and document residual risk                                            |
| Brainstorming design requires approval before implementation                             | User approved the shared-rule-kernel design; written specification is now awaiting review  |
| Initial spec allowed response-stage Debugger interception despite a no-network guarantee | Fixed the spec to use request-stage fulfillment                                            |
| Initial spec left the shared runtime build strategy open                                 | Fixed `public/ruleContract.js` as the single global runtime loaded in all extension worlds |

## Resources

- `AGENTS.md` workspace guidance
- `docs/plans/2026-03-23-grouped-rule-control-design.md`
- `docs/plans/2026-03-23-grouped-rule-control.md`
- `docs/superpowers/specs/2026-07-13-extension-quality-iteration-design.md`
- Chrome extension runtime files under `public/`
- Popup components and tests under `src/`

## Final Review Findings

- DNR atomic replace failure can leave prior header rules active while status reports all failed; change application to remove old rules first, then add new candidates.
- Header Contains must compile to an escaped, case-sensitive regex because DNR `urlFilter` has non-literal syntax and defaults to case-insensitive matching.
- Debugger toggle failures and overlapping requests can make the popup report disabled while Chrome remains attached; serialize UI operations and refresh actual status after failure.
- Tools storage wrappers must reject `chrome.runtime.lastError` rather than report successful imports.
- Rule writes must not occur inside React state updaters and need ordering protection.
- Fetch abort, XHR failure states, malformed persisted rules, and worker import assets need explicit coverage.

## Final Verification

| Command or check                 | Result                                                               |
| -------------------------------- | -------------------------------------------------------------------- |
| `npm test`                       | 14 files, 90 tests passed                                            |
| `npm run lint`                   | Passed with no errors                                                |
| `npm run build`                  | Passed; 39 modules transformed                                       |
| `npm run verify:build`           | 12 referenced and imported assets verified                           |
| `git diff --check`               | Passed                                                               |
| Browser preview                  | 680x600 layout, tabs, error focus, Tools, and Logs fallback verified |
| Unpacked Chrome MV3 smoke matrix | Not run; remains an explicit limitation                              |

## Baseline Verification

| Command         | Result                         |
| --------------- | ------------------------------ |
| `npm test`      | 4 files, 18 tests passed       |
| `npm run lint`  | Failed with 17 ESLint errors   |
| `npm run build` | Passed; 38 modules transformed |
