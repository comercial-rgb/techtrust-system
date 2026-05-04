import { normalizeClientPlan, pickClientPlan } from "../clientPlan";

describe("clientPlan", () => {
  it("normalizeClientPlan maps tiers", () => {
    expect(normalizeClientPlan("free")).toBe("FREE");
    expect(normalizeClientPlan("STARTER")).toBe("STARTER");
    expect(normalizeClientPlan("pro")).toBe("PRO");
    expect(normalizeClientPlan("starter")).toBe("STARTER");
  });

  it("pickClientPlan prefers first paid tier", () => {
    expect(pickClientPlan(undefined, "STARTER", "PRO")).toBe("STARTER");
  });

  it("pickClientPlan falls back to FREE", () => {
    expect(pickClientPlan(undefined, "", null)).toBe("FREE");
  });
});
