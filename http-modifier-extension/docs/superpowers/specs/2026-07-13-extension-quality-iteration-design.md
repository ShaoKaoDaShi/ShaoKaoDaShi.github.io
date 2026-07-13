# HTTP Modifier Quality Iteration Design

## Iteration Brief

Problem: The extension presents response rules as mocks, but the default fetch and XHR paths still execute the real request. Invalid rules can appear enabled while Chrome rejects them, and privileged runtime boundaries accept insufficiently validated data.

Target user: Developers who use the extension to modify request or response headers and safely mock HTTP responses while developing and testing web applications.

Current behavior:

- Fetch and XHR response rules replace data only after the real request is sent.
- Popup storage state is treated as proof that a header rule is active.
- Imported and synced rules receive only shallow validation.
- Cloud Sync targets a localhost HTTP service but is described as cross-device cloud sync.
- Runtime messages and logs lack strict shape and sender validation.
- Destructive actions, errors, keyboard focus, and tab semantics are inconsistent.

Desired outcome:

- A matching response rule never sends the real fetch or XHR request.
- Invalid rules cannot be saved or imported, and DNR application failures are visible in the popup.
- Runtime messages are accepted only from expected extension boundaries and validated before use.
- Cloud Sync is removed until a production service exists; local backup and debugger controls remain.
- Primary popup workflows are keyboard-operable, accessible, and recoverable.
- Runtime-critical behavior has automated regression coverage.

Success evidence:

- Focused tests prove matching fetch and XHR mocks do not invoke native network send methods.
- Rule contract tests reject malformed imports and unsupported patterns.
- Background tests prove DNR failure state and paused-request continuation behavior.
- Full test, lint, and build commands pass.

Constraints:

- Chrome Manifest V3.
- Existing stored rules must remain usable.
- Dynamic DNR IDs must remain integers.
- Debugger and page-level mocking remain separate runtime paths.
- No new runtime dependency is necessary.

Out of scope:

- Deploying or replacing the removed cloud sync server.
- Guaranteeing that page-main-world code cannot inspect or replace patched browser APIs.
- Supporting streaming, binary, or non-JSON response bodies in this iteration.
- Replacing the popup with a full-page application.

Verified facts:

- The project uses React 19, Vite, Tailwind, Vitest, and plain JavaScript MV3 scripts.
- Existing tests cover popup forms and grouping, not runtime interception.
- The production build passes, while the current lint command reports 17 errors.
- The manifest requests broad host, debugger, tabs, scripting, and storage access.

Open assumptions:

- Existing response bodies are JSON because the form already requires valid JSON.
- Legacy URL patterns without an explicit match mode should preserve current regex-first behavior.
- Confirmation dialogs are acceptable in this popup for destructive actions and sensitive exports.

## Product Decision

User value: Developers can trust that a mock is isolated from production-like side effects and can tell whether a rule actually became active.

Primary outcome: Applying a valid rule produces deterministic behavior, while invalid or rejected rules produce actionable feedback.

Essential scope:

- Correct fetch, XHR, and Debugger mocking behavior.
- A shared rule contract and match semantics.
- Rule application status and failure feedback.
- Import, messaging, logging, and debugger lifecycle hardening.
- Removal of misleading Cloud Sync.
- Accessibility and destructive-action recovery for primary popup flows.
- Runtime tests and clean project quality gates.

Deferred scope:

- Production synchronization.
- Full page-world tamper resistance.
- Advanced response customization such as status, headers, delay, binary bodies, and streaming.
- Visual redesign beyond changes required for feedback and accessibility.

Success criteria:

- No native fetch or XHR send occurs for a matching mock.
- Header rules are either active or shown with a specific application error.
- Malformed persisted or imported rules are excluded before runtime conversion.
- A failed Debugger action always resumes or fulfills a paused request.
- All supported controls have names, visible focus, and understandable failure states.

Decision: proceed.

## Experience Design

User goal: Create or import a rule, enable it, use the target application safely, and inspect what the extension changed.

Primary path:

1. The user creates a header or response rule with an explicit URL match mode.
2. The form validates required fields, URL matching syntax, headers, and JSON before storage.
3. The popup saves the rule and shows its application state.
4. A matching request is modified or mocked without executing unintended network work.
5. Logs identify the source tab, interception engine, method, URL, and mock result.

System feedback:

- Header rule cards show pending, active, or error state from background DNR application.
- Response rules show enabled state and interception logs because page-level mocks do not have a registration phase.
- Import reports accepted and rejected counts with reasons.
- Debugger controls report attachment conflicts rather than treating them as success.
- Empty and failure states explain the next useful action.

Error or edge path:

- Invalid form input remains in place, focuses the first invalid field, and announces an inline error.
- DNR rejection preserves the stored rule but marks it ineffective and displays Chrome's reason.
- A malformed import is rejected before storage; valid rules in a partially invalid file can be imported only after a summary confirmation.
- Debugger fulfillment failure falls back to continuing the paused request.
- Deleting a rule, disabling a group, clearing logs, and exporting potentially sensitive rules require confirmation.

Accessibility considerations:

- Navigation uses tablist, tab, and tabpanel semantics with selected state and keyboard activation.
- All controls have visible `focus-visible` treatment.
- Icon-only buttons use `aria-label`; decorative SVGs are hidden.
- Inputs have labels, names, autocomplete guidance, required state, and linked error descriptions.
- Async status and validation use polite or assertive live regions as appropriate.
- Motion-sensitive users do not receive unnecessary scale or transition effects.

UX risks:

- Introducing explicit match modes adds one field to existing forms, but removes ambiguous and failure-prone inference.
- Native confirmation dialogs are visually basic but reliable in a constrained popup and avoid introducing modal infrastructure.
- Legacy rules need a visible inferred mode so users can correct ambiguous patterns.

Decision: proceed.

## Engineering Design

### Invariants

- A matching response rule never starts a real request in page-level or Debugger mode.
- Every newly persisted rule has a unique string ID, supported type, normalized group, boolean enabled state, explicit match type, non-empty pattern, and valid type-specific fields.
- Invalid legacy rules remain visible and editable but are excluded from DNR and response-mocking runtime inputs.
- Header DNR conversion either returns a valid Chrome rule or a structured validation error tied to the source rule ID.
- Every Debugger pause reaches exactly one successful terminal outcome; fulfillment and fallback continuation may require more than one command attempt.
- Only the content script can relay page logs to the background, and only extension pages can perform control actions.
- Logs have a validated schema and are bounded to 50 entries.
- Legacy rules are normalized and persisted after load; new writes always include explicit `matchType`.

### Architecture

#### Canonical Rule Schema

All rules share these fields:

```js
{
  id: string,
  type: "header" | "response",
  enabled: boolean,
  groupName: string,
  urlPattern: string,
  matchType: "contains" | "regex"
}
```

Header rules additionally require `actionType: "request" | "response"`, `operation: "set" | "append" | "remove"`, a valid HTTP token `headerName`, and a string `headerValue` for non-remove operations. Response rules require a `responseBody` string containing valid JSON. Rules match every HTTP method; the first enabled response rule in storage order wins.

`contains` matches the normalized absolute URL with case-sensitive `String.includes`. `regex` compiles without flags and matches the normalized absolute URL. Header regexes must additionally pass `chrome.declarativeNetRequest.isRegexSupported` before application. Wildcard syntax has no special meaning; the form instructs users to select Contains or enter a valid regular expression.

Legacy migration is deterministic:

- response rules infer `regex` when the old pattern compiles in JavaScript and `contains` otherwise, preserving the old page/debugger behavior
- header rules infer `regex` when the old DNR character test selected `regexFilter`, and `contains` otherwise
- missing IDs receive a generated UUID, blank groups become `Default`, and missing enabled state becomes `true`
- normalized rules are written back once after a successful load; if persistence fails, the in-memory normalized rules remain available and the popup shows the storage error
- invalid legacy rules are retained unchanged apart from safe common-field normalization, shown with validation errors, and excluded from runtime application

No rollback format is needed because the migration only adds normalized common fields and `matchType`; import continues accepting both the legacy array and the new versioned backup.

#### Shared Rule Contract

`public/ruleContract.js` is the single browser-neutral source of truth and assigns a frozen API to `globalThis.HttpModifierRules`. It contains supported constants, normalization, validation, legacy inference, absolute-URL matching, DNR conversion inputs, import parsing, and duplicate comparison. It does not access React, Chrome APIs, DOM nodes, or storage.

The same file is loaded without generated duplicates:

- `background.js` calls `importScripts("ruleContract.js")`
- manifest content scripts load `ruleContract.js` before `content.js` in the isolated world
- a second manifest content-script entry loads `ruleContract.js` before `inject.js` with `world: "MAIN"`
- `index.html` loads `ruleContract.js` before the popup module
- Vitest imports `public/ruleContract.js` for its side effect and tests `globalThis.HttpModifierRules`

This removes DOM script injection, avoids page CSP dependence, and lets every runtime use exactly the same validation and matching implementation. The unused `scripting` permission can therefore be removed.

#### Popup State

`useRules` remains the popup source for local rule CRUD, but storage operations become promise-based and expose load/save errors. It subscribes to `chrome.storage.onChanged` so import and background normalization changes update an open popup.

Background serializes rule updates through one promise queue and assigns each update a monotonic generation. It validates each rule before DNR conversion and writes `ruleApplicationStatus` containing generation, timestamp, prevalidation outcomes by source rule ID, and a global Chrome error when batch application fails. A Chrome batch failure marks every otherwise-valid header candidate ineffective with the same global reason; it does not claim a fabricated per-rule Chrome diagnosis. On startup, background compares stored valid rules with `getDynamicRules()` and reapplies when they differ. Only the latest generation writes status.

#### Page-Level Mocking

For fetch:

- Accept string, `URL`, and `Request` input and normalize with `new URL(rawUrl, location.href)`.
- Resolve the first enabled matching response rule before any native call.
- Return a synthetic `Response` with status 200, status text `OK`, JSON content type, no-store cache header, and the configured body.
- Call native fetch only when no rule matches or debugger mode is active.

For XHR:

- Preserve the native constructor and use an instance adapter that captures `open` arguments.
- Reject synchronous matching XHR (`async === false`) with a visible console error and synthetic `error`/`loadend`; never fall through to a real request.
- Decide matching at `send` time and reject repeated `send` calls with `InvalidStateError` semantics.
- For a match, do not call native send.
- Expose readyState 4, status 200, statusText `OK`, responseURL, JSON content type, responseText for text mode, and parsed response for `responseType === "json"`.
- Support only `""`, `"text"`, and `"json"` for matching mocks. Unsupported response types emit synthetic `error` and `loadend` without a real request.
- Dispatch `readystatechange`, `load`, and `loadend` in a queued microtask. Timeout does not apply because completion is immediate and synthetic.
- Abort before completion cancels the task and emits `abort` then `loadend`; abort after completion has no effect.

#### Debugger Mocking

- Enable request-stage interception and fulfill matching non-OPTIONS requests before Chrome sends them.
- Always continue OPTIONS requests so normal preflight handling remains intact.
- Encode UTF-8 through `TextEncoder` bytes before Base64 conversion.
- Wrap matching, logging, encoding, fulfillment, and continuation so every paused request reaches a successful terminal command or records both failed terminal attempts.
- Verify attachment with `chrome.debugger.getTargets`; never infer success from error text.
- Reconcile session storage with live targets on service-worker startup and before reporting status.

#### Messaging Boundary

All runtime messages require `sender.id === chrome.runtime.id` and a known payload schema.

- `LOG_REQUEST` requires `sender.tab`, a content-script sender origin, and a valid bounded log payload; background discards page-provided tab metadata and adds trusted `tabId` and `sender.tab.url`.
- `ENABLE_DEBUGGER`, `DISABLE_DEBUGGER`, `GET_DEBUGGER_STATUS`, `GET_LOGS`, and `CLEAR_LOGS` require `sender.url` to start with the exact `chrome.runtime.getURL("")` extension origin.
- The MAIN-world script receives normalized rules and debugger state through `window.postMessage`. A per-frame random channel token is included and the content script validates same-window source, token, exact type, and payload shape before relaying logs.
- The token is defense in depth only: hostile page code can observe main-world messages. Background sender and payload validation remains the privilege boundary.

#### Data Tools

- Remove login, token storage, push, pull, and localhost API code.
- Rename Sync navigation to Tools.
- On first Tools load, delete legacy `user` and `debuggerEnabled` keys; never include them in backup data.
- Keep Debugger Mode and Backup & Restore.
- Export a versioned object `{ version: 1, exportedAt, rules }`; import accepts this object and the legacy bare array.
- Validate imported rules through the shared contract.
- On duplicate IDs, compare normalized content: skip exact duplicates and assign new IDs to conflicting rules after confirmation so data is not silently discarded.
- Export uses Blob and object URLs instead of a data URL.
- Require confirmation when an enabled header rule has a header name matching `/authorization|cookie|token|api[-_]?key|secret/i` or a non-empty value matching `/bearer\s+|basic\s+|token|secret|api[-_]?key/i`.

#### Accessibility and Recovery

- Add semantic tabs and arrow-key navigation in `Layout`.
- Add focus-visible rings throughout touched controls.
- Associate form errors with fields and focus the first invalid field.
- Confirm delete, group disable, clear logs, and sensitive exports.
- Use stable log IDs rather than array indexes.
- Report status updates with `aria-live="polite"`; validation and rule-application errors use `role="alert"`.

#### Permissions and Metadata

- Remove the unused `scripting` permission.
- Retain `tabs` because active-tab lookup and trusted tab metadata require it.
- Retain all-host access because rules can target arbitrary user-configured hosts and the content script must initialize interception there.
- Keep `debugger`, DNR, and storage permissions because they are core features.
- Use one `1.1.0` version across manifest, package, and UI.
- Keep npm as the package manager and remove `yarn.lock`.
- Replace the Vite README and index metadata with extension-specific content.
- Exclude `legacy/` from lint rather than modifying archived code.

### Affected Files

Expected existing files:

- `public/background.js`
- `public/content.js`
- `public/inject.js`
- `public/manifest.json`
- `src/App.jsx`
- `src/components/Layout.jsx`
- `src/components/RulesTab.jsx`
- `src/components/HeaderRuleForm.jsx`
- `src/components/ResponseRuleForm.jsx`
- `src/components/DataSyncTab.jsx`
- `src/components/LogsTab.jsx`
- `src/hooks/useRules.js`
- `src/constants.js`
- `src/index.css`
- `src/main.jsx`
- `index.html`
- `vite.config.js`
- `eslint.config.js`
- `package.json`
- `package-lock.json`
- `README.md`
- `.gitignore`

Expected new files:

- `public/ruleContract.js`
- `src/rules/ruleContract.test.js`
- `public/fetchMock.js`
- `src/runtime/fetchMock.test.js`
- `public/xhrMock.js`
- `src/runtime/xhrMock.test.js`
- `public/backgroundCore.js`
- `src/background/ruleApplication.test.js`
- `src/components/DataSyncTab.test.jsx`
- `src/components/Layout.test.jsx`
- `scripts/verify-extension-build.js`

Existing tests may be updated where behavior changes.

### Minimal Design

Use small pure modules only at proven boundaries: rule contracts, page interception adapters, and DNR application. Do not add state management, form, validation, modal, or networking dependencies. Keep native confirmation dialogs and existing storage shape.

### Reuse Decision

Use platform APIs already present: `URL`, `Response`, `Blob`, `crypto.randomUUID`, `TextEncoder`, Chrome DNR, Chrome Debugger, Chrome storage, and Vitest. No third-party package addresses these extension-specific invariants without introducing more integration surface.

### Failure Handling

- Validation returns field-level structured errors rather than throwing for expected invalid input.
- Chrome callback and promise errors are captured and persisted as application status.
- Runtime message handlers reject malformed or unauthorized messages without mutating state.
- Debugger errors include the actual Chrome message and never claim attachment without target verification.
- Storage errors remain visible in the popup and do not optimistically claim success.

### Complexity Considerations

Rule matching remains O(R) per request, where R is enabled response rules. The extension is bounded by user-managed rule counts and DNR quotas; indexing is unnecessary. Import validation and duplicate detection use a Set/Map for O(N) processing. Logs remain bounded at 50 entries.

### Verification Plan

1. Run focused contract and runtime tests while implementing.
2. Run component tests for forms, tabs, tools, rules, and logs.
3. Run background tests for DNR conversion, failure state, debugger lifecycle, and paused-request continuation.
4. Run `npm test`.
5. Run `npm run lint`.
6. Run `npm run build` and `node scripts/verify-extension-build.js` to assert the built manifest references ordered shared runtime scripts and every referenced asset exists.
7. Run a mandatory unpacked-extension Chrome smoke matrix when browser automation can load local extensions: page-level fetch/XHR, restrictive CSP page, DNR failure display, service-worker restart, Debugger attach/contention/detach, and OPTIONS pass-through. If the environment cannot automate extensions, mark each case unverified rather than claiming completion for Chrome integration.

Decision: proceed.

## Verification Matrix

| Assertion                                   | Method                                   | Expected                                                                                |
| ------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Matching fetch mock blocks native request   | Vitest fetch adapter test                | Native fetch call count remains zero; synthetic JSON response returned                  |
| Matching XHR mock blocks native request     | Vitest XHR adapter test                  | Native send call count remains zero; load lifecycle and response are correct            |
| Invalid rules cannot enter runtime          | Rule contract and import tests           | Structured validation errors; invalid entries excluded                                  |
| Header application failure is visible       | Background and RulesTab tests            | Stored status contains per-rule/global error rendered in UI                             |
| Debugger paused requests terminate          | Background tests                         | Fulfill or continue command occurs for success and failure paths                        |
| Unauthorized/malformed messages are ignored | Content/background tests                 | No log or state mutation                                                                |
| Primary popup controls are accessible       | Testing Library role/keyboard assertions | Tabs, labels, names, focus, and live errors work                                        |
| Regression safety                           | `npm test`                               | All tests pass                                                                          |
| Static quality                              | `npm run lint`                           | No errors                                                                               |
| Production integration                      | `npm run build` plus asset verifier      | Build succeeds; manifest ordering and referenced assets are valid                       |
| Chrome integration                          | Unpacked-extension smoke matrix          | Fetch/XHR, CSP, DNR, restart, Debugger, and OPTIONS cases pass or are marked unverified |

## Known Limitations

- Main-world patching is inherently observable and replaceable by page scripts.
- XHR emulation targets common text and JSON use; streaming and binary response modes remain unsupported.
- Header DNR behavior depends on Chrome's documented limits and restricted headers.
- Full Chrome integration, CSP, service-worker suspension, DevTools contention, and CORS behavior require manual or browser-driven extension tests beyond jsdom.
