import { describe, expect, it } from "vitest";
import {
  getSessionStrategyLabel,
  normalizePositiveInteger,
  normalizeSessionStrategy,
} from "../extensions/config.ts";

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

  it("normalizes positive integers from numbers and strings", () => {
    expect(normalizePositiveInteger(12, 7)).toBe(12);
    expect(normalizePositiveInteger("24", 7)).toBe(24);
  });

  it("falls back for invalid numeric settings", () => {
    expect(normalizePositiveInteger(0, 7)).toBe(7);
    expect(normalizePositiveInteger(-1, 7)).toBe(7);
    expect(normalizePositiveInteger("abc", 7)).toBe(7);
    expect(normalizePositiveInteger("1.5", 7)).toBe(7);
    expect(normalizePositiveInteger(undefined, 7)).toBe(7);
  });
});
