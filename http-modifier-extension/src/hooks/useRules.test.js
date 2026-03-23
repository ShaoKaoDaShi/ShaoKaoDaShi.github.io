import { describe, expect, it } from "vitest";

import {
  DEFAULT_GROUP_NAME,
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
