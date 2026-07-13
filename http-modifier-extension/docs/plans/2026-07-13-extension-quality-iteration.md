# HTTP Modifier Quality Iteration Implementation Plan

## Overview

Implement the approved full quality iteration as vertical slices, proving rule semantics and no-network mocking first, then wiring MV3 runtimes, popup feedback, accessibility, security, metadata, and final build verification.

## Files to Create

- `public/ruleContract.js`: Single runtime rule schema, normalization, validation, matching, import parsing, and DNR conversion API.
- `src/rules/ruleContract.test.js`: Contract behavior and migration tests.
- `public/fetchMock.js`: Testable fetch interception adapter loaded by the MAIN-world runtime.
- `src/runtime/fetchMock.test.js`: No-network fetch tests.
- `public/xhrMock.js`: Testable XHR interception adapter loaded by the MAIN-world runtime.
- `src/runtime/xhrMock.test.js`: No-network XHR lifecycle tests.
- `public/backgroundCore.js`: Testable DNR conversion/application status and Debugger helpers loaded by the service worker.
- `src/background/ruleApplication.test.js`: DNR and Debugger terminal-outcome tests.
- `src/components/Layout.test.jsx`: Accessible tabs and keyboard navigation tests.
- `src/components/DataSyncTab.test.jsx`: Tools import/export/debugger tests.
- `scripts/verify-extension-build.js`: Built-manifest and referenced-asset verifier.

## Files to Modify

- `public/background.js`: Use the contract, serialized DNR updates, trusted messaging, request-stage Debugger fulfillment, and live attachment reconciliation.
- `public/content.js`: Remove DOM injection, validate normalized rules and page logs, and relay channel-scoped state.
- `public/inject.js`: Install fetch/XHR adapters and consume contract-normalized messages.
- `public/manifest.json`: Order shared scripts in isolated/MAIN worlds, remove `scripting`, and align version.
- `src/App.jsx`: Rename Sync navigation to Tools.
- `src/components/Layout.jsx`: Accessible tabs, keyboard behavior, focus, and version alignment.
- `src/components/RulesTab.jsx`: Validation/application status, confirmations, accessible controls, and focused component boundaries.
- `src/components/HeaderRuleForm.jsx`: Explicit match type and field-linked validation.
- `src/components/ResponseRuleForm.jsx`: Explicit match type and field-linked validation.
- `src/components/DataSyncTab.jsx`: Remove cloud auth/sync; retain hardened Debugger and versioned backup tools.
- `src/components/LogsTab.jsx`: Trusted tab metadata, stable keys, clear confirmation, and failure feedback.
- `src/hooks/useRules.js`: Contract normalization, storage errors, application status, and storage-change subscription.
- `src/constants.js`: Re-export or align contract constants without duplicate semantics.
- `src/index.css`: Focus, reduced-motion, and popup overflow support.
- `src/main.jsx`: Ensure contract is loaded before React APIs consume it.
- `index.html`: Load contract and align product metadata.
- `vite.config.js`: Preserve public runtime assets in output.
- `eslint.config.js`: Ignore archived legacy code and configure runtime/test globals.
- `package.json`: Align version and add build verification command.
- `package-lock.json`: Align package metadata.
- `README.md`: Replace Vite template with extension-specific setup, behavior, privacy, and limitations.
- `.gitignore`: Keep one npm-oriented package-manager policy.
- Existing tests under `src/**/*.test.{js,jsx}`: Update only for approved behavior changes.
- `yarn.lock`: Remove to establish npm as the single package manager.

## Step-by-Step Tasks

1. **Create the canonical rule contract**

   - Write one failing test for normalizing a valid legacy response rule and inferring regex mode.
   - Implement the smallest global `HttpModifierRules.normalizeRule` API.
   - Add one test at a time for invalid common fields, header fields, response JSON, absolute URL matching, first-rule precedence, versioned and legacy imports, conflicting IDs, and DNR conversion.
   - Run `npm test -- src/rules/ruleContract.test.js` after every red-green slice.
   - Expected outcome: all runtimes can consume one validated rule representation.

2. **Implement fetch no-network mocking**

   - Write a failing test showing a matching string URL returns a synthetic response while native fetch remains uncalled.
   - Implement `installFetchMock` with injected environment dependencies.
   - Add Request/URL/relative URL, unmatched fallback, debugger bypass, and logging tests one at a time.
   - Run `npm test -- src/runtime/fetchMock.test.js`.
   - Expected outcome: matching fetch rules never start native requests.

3. **Implement XHR no-network mocking**

   - Write a failing test showing matching XHR does not call native `send` and emits completion events.
   - Implement the adapter for text and JSON response types.
   - Add abort, unsupported response type, synchronous request, repeated send, unmatched fallback, and debugger bypass tests.
   - Run `npm test -- src/runtime/xhrMock.test.js`.
   - Expected outcome: supported matching XHRs complete synthetically without network work.

4. **Implement testable DNR and Debugger helpers**

   - Write a failing test for valid header-rule conversion and source-rule status mapping.
   - Implement candidate conversion and batch status generation.
   - Add invalid regex, global Chrome rejection, generation ordering, UTF-8 Base64, OPTIONS continuation, fulfillment failure fallback, and attachment verification tests.
   - Run `npm test -- src/background/ruleApplication.test.js`.
   - Expected outcome: background behavior is deterministic and failure-observable.

5. **Wire the contract and adapters into MV3 runtimes**

   - Update manifest script ordering for isolated and MAIN worlds.
   - Replace DOM injection in `content.js` with normalized channel-scoped state relay.
   - Replace monkey-patch implementation in `inject.js` with tested adapters.
   - Update `background.js` to import the contract, serialize DNR updates, persist application status, and use request-stage Debugger fulfillment.
   - Restrict each background message to exact sender and payload requirements.
   - Add focused source-level/runtime handler tests if wiring exposes untested behavior.
   - Run runtime-focused tests and `npm run build`.
   - Expected outcome: tested modules are the modules used by the shipped extension.

6. **Migrate popup rule state and forms**

   - Write failing hook/field tests for normalized migration, storage error exposure, explicit match mode, and invalid regex/header/JSON feedback.
   - Update `useRules`, constants, and forms through one behavior at a time.
   - Subscribe the popup to external storage and rule-application status changes.
   - Run hook and form test files.
   - Expected outcome: invalid rules cannot be newly saved and legacy failures remain visible/editable.

7. **Expose rule application and destructive-action feedback**

   - Write failing RulesTab tests for DNR errors, named controls, delete confirmation, and group-disable confirmation.
   - Split `RuleItem` or status display only where needed to keep responsibilities testable.
   - Implement pending/active/error presentation without claiming response-rule registration.
   - Run `npm test -- src/components/RulesTab.test.jsx`.
   - Expected outcome: stored state and effective Chrome state are distinguishable and destructive actions are recoverable.

8. **Replace Cloud Sync with local Tools**

   - Write failing tests for legacy credential cleanup, versioned export, legacy/versioned import, partial rejection summary, conflict re-ID, sensitive export confirmation, and Debugger errors.
   - Remove all API/login/token code.
   - Implement Backup & Restore with Blob URLs and shared contract validation.
   - Rename navigation label and keep Debugger controls.
   - Run `npm test -- src/components/DataSyncTab.test.jsx`.
   - Expected outcome: no insecure or misleading cloud feature remains; local data tools are safe and explicit.

9. **Improve navigation, forms, and logs accessibility**

   - Write failing Layout tests for tab semantics, arrow keys, selected state, and focus.
   - Add field names, autocomplete policy, required/invalid/described-by state, alert/live regions, icon labels, and decorative icon hiding.
   - Write/update LogsTab tests for trusted tab display, stable IDs, clear confirmation, and runtime failure state.
   - Add focus-visible and reduced-motion CSS.
   - Run all component tests.
   - Expected outcome: primary workflows are keyboard-operable, named, and understandable after failures.

10. **Align permissions, metadata, package policy, and documentation**

- Remove unused `scripting` permission.
- Set version `1.1.0` in manifest, package, and UI.
- Remove `yarn.lock`; keep npm lock data.
- Exclude `legacy/` from lint and fix all production lint findings.
- Replace index defaults and README template with extension-specific information.
- Expected outcome: release identity, permissions, package manager, and support documentation match shipped behavior.

11. **Add build artifact verification**

- Write the verifier to assert manifest validity, required permissions, script ordering, MAIN-world declaration, and existence of every referenced script/icon/popup asset.
- Add `verify:build` script.
- Run `npm run build && npm run verify:build`.
- Expected outcome: source tests cannot pass while the built extension omits required runtime files.

12. **Run full regression and final review**

- Run `npm test`.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run verify:build`.
- Inspect `git diff --check` and the final diff without reverting unrelated workspace changes.
- Attempt the unpacked-extension smoke matrix if available; otherwise record each unverified Chrome case.
- Compare final behavior against every approved success criterion and known limitation.

## Verification

- Contract: `npm test -- src/rules/ruleContract.test.js`
- Fetch: `npm test -- src/runtime/fetchMock.test.js`
- XHR: `npm test -- src/runtime/xhrMock.test.js`
- Background: `npm test -- src/background/ruleApplication.test.js`
- Popup components: `npm test -- src/components`
- Full suite: `npm test`
- Static checks: `npm run lint`
- Build: `npm run build`
- Artifact integration: `npm run verify:build`
- Final acceptance: all automated commands pass; matching fetch/XHR/Debugger mocks do not start real requests; invalid or rejected rules are visible and ineffective; cloud auth/sync is absent; primary popup controls are accessible; remaining Chrome-only cases are explicitly reported.
