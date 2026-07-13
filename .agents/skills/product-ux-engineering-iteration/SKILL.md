---
name: product-ux-engineering-iteration
description: Drive product iterations end to end through Steve Jobs-inspired product focus, Don Norman-inspired human-centered UX, and Donald Knuth-inspired engineering rigor. Use for feature development, product iteration, UX changes, refactoring, or implementation decisions that must balance value, usability, and technical quality.
tags: [product, ux, engineering, iteration, workflow]
version: "1.0.0"
---

# Product, UX, and Engineering Iteration

Use three complementary lenses in strict sequence:

1. **Product focus, inspired by Steve Jobs**: decide whether the change deserves to exist and remove everything nonessential.
2. **Human-centered UX, inspired by Don Norman**: make the intended action understandable, discoverable, reversible, and accessible.
3. **Engineering rigor, inspired by Donald Knuth**: make behavior correct, explainable, maintainable, and verified with evidence.

This skill borrows publicly known principles. Do not impersonate these people, invent quotes, or treat personal taste as authority.

## Core Rule

Do not trade away one lens to satisfy another. A valuable feature that users cannot understand is incomplete. A delightful interaction built on incorrect behavior is incomplete. Excellent code for an unnecessary feature is waste.

Run the gates in order. If a critical gate fails, return to the previous gate instead of continuing implementation.

## Step 0: Establish Reality

Before proposing or changing anything:

- Read the relevant project instructions, existing implementation, tests, and recent local conventions.
- Identify the affected subproject and use its own tooling.
- State the observed current behavior, requested outcome, constraints, and exclusions.
- Separate verified facts from assumptions. Resolve consequential assumptions with code inspection or one concise user question.
- Search for existing project capabilities and established libraries before creating custom abstractions.

Required output:

```markdown
## Iteration Brief
Problem:
Target user:
Current behavior:
Desired outcome:
Success evidence:
Constraints:
Out of scope:
Verified facts:
Open assumptions:
```

Do not enter Gate 1 while the user problem or desired outcome remains materially ambiguous.

## Gate 1: Product Focus

Ask whether this is the smallest change that creates meaningful user value.

Evaluate:

- What user problem is being solved, not merely what feature was requested?
- What single outcome matters most?
- Which behavior is essential for the first useful version?
- What can be removed, deferred, or left unchanged?
- Does the change fit the product's existing purpose and interaction language?
- What observable evidence would show that the iteration worked?

Prefer one coherent experience over a collection of options. Do not add configuration, modes, abstractions, compatibility paths, or visual decoration without a concrete need.

Required output:

```markdown
## Product Decision
User value:
Primary outcome:
Essential scope:
Deferred scope:
Success criteria:
Decision: proceed | revise | stop
```

Gate passes only when the primary outcome and essential scope are explicit. If the decision is `revise` or `stop`, do not implement.

## Gate 2: Human-Centered UX

Model the task from the user's point of view rather than the system's internal structure.

Check:

- **Conceptual model**: labels and structure match how users think about the task.
- **Discoverability**: the next useful action is visible without instruction.
- **Signifiers and mapping**: controls communicate what they do and affect the expected target.
- **Feedback**: loading, success, empty, disabled, and error states are timely and specific.
- **Constraints**: prevent invalid actions where practical rather than explaining failures afterward.
- **Error recovery**: destructive actions are guarded; recoverable actions can be cancelled, retried, or undone.
- **Consistency**: reuse the project's established patterns unless they cause the problem.
- **Accessibility**: keyboard use, focus, semantics, contrast, readable text, and reduced-motion expectations are respected.
- **Responsive behavior**: critical flows remain usable at supported viewport sizes.

Trace at least the primary path and one failure or edge path.

Required output:

```markdown
## Experience Design
User goal:
Primary path:
System feedback:
Error or edge path:
Accessibility considerations:
UX risks:
Decision: proceed | revise
```

Gate passes only when users can understand what happened, what they can do next, and how to recover. If it fails, revise the scope or interaction before coding.

## Gate 3: Engineering Rigor

Choose the smallest design that is demonstrably correct.

Check:

- Preserve existing architecture and bounded responsibilities.
- Keep domain behavior separate from UI, framework, storage, and transport concerns.
- Prefer early returns and domain-specific names; avoid generic `utils`, `helpers`, or speculative layers.
- Reuse an existing dependency or platform capability when it is a better fit than custom code.
- Keep functions focused and normally under 50 lines, nesting at no more than three levels, and files normally under 200 lines.
- Define invariants, boundaries, invalid inputs, failure behavior, and state transitions before implementation.
- Select algorithms and data structures based on actual constraints; state relevant time or space costs when nontrivial.
- Optimize only after identifying a real bottleneck or a clear complexity risk.
- Add or update tests at the narrowest useful level. Never weaken tests merely to make them pass.
- Keep comments rare and explain why, invariants, or integration boundaries rather than restating code.

Required output:

```markdown
## Engineering Design
Invariants:
Affected files:
Minimal design:
Reuse decision:
Failure handling:
Complexity considerations:
Verification plan:
Decision: proceed | revise
```

Gate passes only when affected files and verification commands are known. If implementation requires an unlisted file or a broader abstraction, return to this gate and update the design explicitly.

## Step 4: Implement the Thin Slice

Implement only the approved essential scope:

1. Make the smallest coherent change that completes the primary user path.
2. Preserve unrelated local modifications and avoid broad cleanup.
3. Handle the agreed failure and edge path.
4. Add focused tests when the project has an applicable test harness.
5. Revisit an earlier gate if code reveals a false assumption or expanded scope.

Do not add backward compatibility unless persisted data, shipped behavior, external consumers, or an explicit requirement makes it necessary.

## Step 5: Verify With Evidence

Use the target subproject's existing commands. Run the smallest focused check first, then the relevant regression check or build.

Verification must cover:

- The primary user outcome works.
- At least one relevant error or boundary case behaves correctly.
- Existing lint, typecheck, tests, or build do not regress.
- For UI changes, inspect keyboard behavior and supported desktop/mobile layouts when feasible.
- Performance claims include measurements; otherwise label them as expectations, not results.

Required output:

```markdown
## Verification Matrix
| Assertion | Method | Expected | Actual |
|---|---|---|---|
| Primary outcome | ... | ... | ... |
| Error or edge path | ... | ... | ... |
| Regression safety | ... | ... | ... |

## Final Review
Product value:
UX quality:
Engineering quality:
Known limitations:
```

Never claim completion or success before commands or checks have actually run. Report skipped verification and its reason directly.

## Decision Priority

When principles conflict, decide in this order:

1. User safety, data integrity, privacy, and correctness.
2. Clear user value and successful task completion.
3. Understandability, accessibility, and recovery.
4. Simplicity and maintainability.
5. Performance supported by constraints or measurements.
6. Polish and optional flexibility.

## Anti-Patterns

Reject these patterns:

- Building the requested interface without identifying the user problem.
- Adding settings to avoid making a product decision.
- Hiding poor feedback behind documentation or tooltips.
- Using novelty as a substitute for usability.
- Introducing an abstraction before two concrete uses or a proven boundary require it.
- Optimizing code without a defined constraint or measurement.
- Treating a successful build as proof that the user workflow works.
- Invoking famous names as justification instead of presenting reasoning and evidence.

## Completion Standard

An iteration is complete only when:

- The essential user outcome is delivered and nonessential scope remains excluded.
- The primary path and a meaningful edge path are understandable and recoverable.
- The implementation preserves architectural boundaries and explicit invariants.
- Relevant project verification has passed with recorded evidence.
- Remaining limitations and unverified assumptions are disclosed.