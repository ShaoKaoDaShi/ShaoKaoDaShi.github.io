# Task Plan: HTTP Modifier Full Quality Iteration

## Goal

Make HTTP Modifier safe and trustworthy by correcting mock behavior, validating and reporting rule application, hardening runtime boundaries, removing unfinished cloud sync, improving accessibility, and establishing runtime regression coverage.

## Current Phase

Complete

## Phases

### Phase 1: Requirements & Discovery

- [x] Review product, UX, runtime, security, and engineering behavior
- [x] Run baseline tests, lint, and build
- [x] Confirm full-review scope with the user
- [x] Resolve Cloud Sync direction: remove until a production service exists
- [x] Approve shared-rule-kernel design
- **Status:** complete

### Phase 2: Specification & Implementation Planning

- [x] Write approved design specification
- [x] Self-review specification for ambiguity, contradictions, and scope
- [x] Obtain written-spec review approval
- [x] Write bite-sized implementation plan with exact file boundaries
- **Status:** complete

### Phase 3: Rule Contract & Runtime Correctness

- [x] Add shared rule normalization, validation, matching, and DNR conversion
- [x] Correct fetch mocks so matching requests never reach the network
- [x] Correct XHR mocks and synthetic event lifecycle
- [x] Harden debugger matching, encoding, continuation, and attachment state
- [x] Add focused runtime tests
- **Status:** complete

### Phase 4: Popup Feedback, Tools & Accessibility

- [x] Expose storage and DNR application failures
- [x] Replace Cloud Sync with local Tools
- [x] Harden import/export and duplicate handling
- [x] Add confirmations, accessible tabs, focus, labels, and live errors
- [x] Improve logs with trusted tab metadata and stable IDs
- [x] Add component tests
- **Status:** complete

### Phase 5: Security, Metadata & Maintainability

- [x] Validate runtime message boundaries and payloads
- [x] Remove unused permission and stale auth data
- [x] Align versions and extension metadata
- [x] Use one package manager and clean lint boundaries
- [x] Update project README
- [x] Split runtime responsibilities into tested focused modules
- **Status:** complete

### Phase 6: Verification & Delivery

- [x] Run focused tests after each implementation slice
- [x] Run `npm test`
- [x] Run `npm run lint`
- [x] Run `npm run build`
- [x] Inspect generated manifest and runtime assets
- [x] Record manual Chrome verification gaps
- [x] Final review against approved specification
- **Status:** complete

## Key Questions

1. Should Cloud Sync remain? Resolved: no; remove it until a production HTTPS service exists.
2. Should runtime use only Debugger mode? Resolved: no; preserve default and advanced engines while unifying semantics.
3. How should legacy patterns migrate? Preserve regex-first behavior through explicit normalization, while new writes store a match mode.
4. Can page-main-world messages be fully trusted? No; use channel and payload validation as defense in depth and document the platform limitation.

## Decisions Made

| Decision                                       | Rationale                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Implement all review findings in phased slices | User explicitly selected full iteration rather than P0-only scope                                       |
| Remove Cloud Sync                              | No production HTTPS API exists; keeping localhost login misrepresents the product and risks credentials |
| Keep dual mock engines                         | Default mode avoids debugger banners; advanced mode provides network-level visibility                   |
| Add a shared rule contract                     | Validation and matching are repeated across popup, DNR, debugger, and page interception boundaries      |
| New rules use explicit match mode              | Pattern inference makes common wildcard input invalid and behavior unpredictable                        |
| Preserve legacy rules through normalization    | Rules are persisted shipped data and require compatibility                                              |
| Use native confirmations                       | Smallest reliable recovery mechanism for the constrained popup                                          |
| No new runtime dependencies                    | Platform APIs cover the required behavior and reduce extension attack surface                           |

## Errors Encountered

| Error                                                              | Attempt | Resolution                                                                          |
| ------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------------------- |
| Baseline lint reports 17 errors                                    | 1       | Plan production fixes and exclude archived `legacy/` sources from active lint scope |
| Vitest rejected variable dynamic import in contract test           | 1       | Use fixed import path with `vi.resetModules()` for test isolation                   |
| Final review found stale DNR rules after failed atomic replacement | 1       | Remove prior dynamic rules before adding new candidates and test failure state      |
| DNR Contains semantics differ from documented literal matching     | 1       | Compile escaped case-sensitive regex filters for header rules                       |

## Scope Guard

- Do not deploy or invent a cloud backend.
- Do not add response status/header/delay configuration.
- Do not redesign the popup beyond feedback, clarity, accessibility, and necessary component boundaries.
- Do not modify unrelated workspace projects or existing unrelated worktree changes.
- Do not claim Chrome runtime behavior is verified without real browser evidence.
