# Grouped Rule Control Design

## Background

The extension currently stores all rules as a flat array in `chrome.storage.local` under the `rules` key. Each rule only has per-rule `enabled` state, and the popup renders rules in a single list without grouping.

The requested behavior is grouped control for all rules:

- rules belong to groups identified by `groupName`
- enabling should still happen at the individual rule level
- disabling should support turning off an entire group at once

## Goals

- Add group-level organization for all rules in the popup UI
- Preserve existing runtime behavior in `background.js` and `content.js`
- Keep compatibility with existing stored rules that do not yet have a group field
- Make group disable easy and predictable

## Non-Goals

- No background or content-script rewrite
- No separate persisted `groupEnabled` state
- No migration script for old storage data
- No bulk enable-all behavior at the group level

## Recommended Approach

Use a soft grouping model based on a new `groupName` field stored on each rule.

Why this approach:

- minimal data model change
- easy backward compatibility
- no changes required in the runtime rule consumers
- directly matches the requested behavior: individual enable, group disable

## Alternatives Considered

### 1. Add `groupEnabled` plus per-rule `enabled`

This gives a more explicit two-level model, but it increases complexity because effective state becomes a combination of group and item state. It also adds more UI and storage sync edge cases.

### 2. UI-only grouping without persisted group data

This is simpler in the short term, but it does not satisfy the requirement to organize rules by an explicit group name.

## Data Model

Each rule gains a new optional field:

```js
{
  id: string,
  type: "header" | "response",
  enabled: boolean,
  groupName: string,
  ...otherFields
}
```

Compatibility handling:

- if `groupName` is missing, treat the rule as belonging to `Default`
- this fallback happens during read/render and during save paths that touch a rule

## Behavior Design

### Rule-Level Behavior

Per-rule toggles continue to work as they do now:

- turning a single rule on affects only that rule
- turning a single rule off affects only that rule

### Group-Level Behavior

Each group gets a group header control.

Behavior:

- if the user disables a group, all rules in that group are set to `enabled: false`
- there is no bulk enable-all action at the group level
- re-enabling happens by turning on individual rules inside the group

This preserves the requested rule that enabling is individual, while disabling can be done for the whole group.

### Group Status

The group status is derived from child rules:

- if any rule in the group is enabled, the group is shown as active
- if all rules in the group are disabled, the group is shown as inactive

Because group activation is derived rather than separately stored, the UI should avoid implying that the group header can bulk-enable all rules.

## UI Design

### Rules List

Replace the flat list with a grouped list in `RulesTab.jsx`.

Each group section shows:

- group name
- number of rules in the group
- a status indicator
- a `Disable Group` action
- optional expand/collapse if needed during implementation

### Rule Forms

Add a `groupName` field to:

- `src/components/HeaderRuleForm.jsx`
- `src/components/ResponseRuleForm.jsx`

Defaults:

- use the last used group if convenient
- otherwise default to `Default`

### Group Control Presentation

Prefer a status label plus a `Disable Group` button over a normal two-way switch.

Reason:

- a switch usually implies both bulk-on and bulk-off behavior
- the requested interaction is asymmetric
- explicit wording reduces confusion

## Implementation Plan Shape

### `src/hooks/useRules.js`

Add:

- normalization for missing `groupName`
- a `disableGroup(groupName)` helper

Keep:

- existing per-rule add, update, delete, toggle behavior

### `src/components/RulesTab.jsx`

Add:

- grouping logic by normalized `groupName`
- grouped rendering
- group header action wired to `disableGroup(groupName)`

Keep:

- existing `RuleItem` interactions

### Form Components

Update both rule form components to collect and submit `groupName`.

## Error Handling and Edge Cases

- blank `groupName` should be normalized to `Default`
- disabling one group must not affect other groups
- deleting the last rule in a group should remove that group from the UI automatically
- duplicated rule copy should preserve `groupName`
- old imported or synced rules without `groupName` should still render correctly under `Default`

## Testing Strategy

Follow TDD for the implementation.

Suggested coverage:

- normalization assigns `Default` to missing or blank `groupName`
- per-rule toggle only changes one rule
- `disableGroup(groupName)` disables all and only rules in that group
- copied rules preserve group membership
- grouped rendering shows old rules in `Default`

Manual verification:

- create rules in two groups
- enable one rule in a group and confirm no sibling rules auto-enable
- disable the group and confirm all rules in that group become disabled
- reload the popup and confirm persisted state remains correct

## Files Expected to Change

- `src/components/RulesTab.jsx`
- `src/components/HeaderRuleForm.jsx`
- `src/components/ResponseRuleForm.jsx`
- `src/hooks/useRules.js`
- tests added where the current setup best supports TDD

## Open Decisions Resolved

- grouping key: `groupName`
- old rules fallback group: `Default`
- group enable behavior: individual only
- group disable behavior: bulk disable entire group
- group UI control: status plus `Disable Group` action
