import { describe, expect, it } from "vitest";
import { getSessionStrategyLabel, normalizeSessionStrategy } from "../extensions/config.ts";

describe("config helpers", () => {
  it("normalizes supported session strategies", () => {
    expect(normalizeSessionStrategy("repo")).toBe("repo");
    expect(normalizeSessionStrategy("git-branch")).toBe("git-branch");
    expect(normalizeSessionStrategy("directory")).toBe("directory");
  });

  it("falls back to repo for missing or invalid session strategies", () => {
    expect(normalizeSessionStrategy(undefined)).toBe("repo");
    expect(normalizeSessionStrategy(null)).toBe("repo");
    expect(normalizeSessionStrategy("invalid")).toBe("repo");
  });

  it("returns readable labels for session strategies", () => {
    expect(getSessionStrategyLabel("repo")).toBe("Repo");
    expect(getSessionStrategyLabel("git-branch")).toBe("Git branch");
    expect(getSessionStrategyLabel("directory")).toBe("Directory");
  });
});
