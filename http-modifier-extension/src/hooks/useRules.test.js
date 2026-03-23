import { describe, expect, it } from "vitest";

import {
  DEFAULT_GROUP_NAME,
  disableRulesInGroup,
  normalizeGroupName,
  normalizeRule,
} from "./useRules";

describe("useRules normalization", () => {
  it("normalizes blank group names to the default", () => {
    expect(normalizeGroupName()).toBe(DEFAULT_GROUP_NAME);
    expect(normalizeGroupName("   ")).toBe(DEFAULT_GROUP_NAME);
  });

  it("trims provided group names", () => {
    expect(normalizeGroupName("  Team A  ")).toBe("Team A");
  });

  it("normalizes rule group names while preserving other fields", () => {
    expect(
      normalizeRule({
        id: 1,
        name: "Rule 1",
        enabled: true,
        groupName: "  ",
      }),
    ).toEqual({
      id: 1,
      name: "Rule 1",
      enabled: true,
      groupName: DEFAULT_GROUP_NAME,
    });

    expect(
      normalizeRule({
        id: 2,
        name: "Rule 2",
        enabled: false,
        groupName: "  Custom Group  ",
      }),
    ).toEqual({
      id: 2,
      name: "Rule 2",
      enabled: false,
      groupName: "Custom Group",
    });
  });
});

describe("disableRulesInGroup", () => {
  it("disables only rules in the requested group", () => {
    expect(
      disableRulesInGroup(
        [
          { id: 1, name: "Rule 1", enabled: true, groupName: "Team A" },
          { id: 2, name: "Rule 2", enabled: true, groupName: "Team B" },
          { id: 3, name: "Rule 3", enabled: false, groupName: "Team A" },
        ],
        "Team A",
      ),
    ).toEqual([
      { id: 1, name: "Rule 1", enabled: false, groupName: "Team A" },
      { id: 2, name: "Rule 2", enabled: true, groupName: "Team B" },
      { id: 3, name: "Rule 3", enabled: false, groupName: "Team A" },
    ]);
  });

  it("normalizes blank group names while disabling the default group", () => {
    expect(
      disableRulesInGroup(
        [
          { id: 1, name: "Rule 1", enabled: true, groupName: "   " },
          { id: 2, name: "Rule 2", enabled: true, groupName: "Team B" },
          { id: 3, name: "Rule 3", enabled: true },
        ],
        DEFAULT_GROUP_NAME,
      ),
    ).toEqual([
      { id: 1, name: "Rule 1", enabled: false, groupName: DEFAULT_GROUP_NAME },
      { id: 2, name: "Rule 2", enabled: true, groupName: "Team B" },
      { id: 3, name: "Rule 3", enabled: false, groupName: DEFAULT_GROUP_NAME },
    ]);
  });
});
