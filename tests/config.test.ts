import { describe, expect, it } from "vitest";
import {
  getSessionStrategyLabel,
  normalizePositiveInteger,
  normalizeSessionStrategy,
  parseHeaders,
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

  it("parses headers from an object", () => {
    expect(parseHeaders({ "X-Custom": "value" })).toEqual({ "X-Custom": "value" });
    expect(
      parseHeaders({
        "CF-Access-Client-Id": "abc",
        "CF-Access-Client-Secret": "xyz",
      }),
    ).toEqual({
      "CF-Access-Client-Id": "abc",
      "CF-Access-Client-Secret": "xyz",
    });
  });

  it("parses headers from a JSON string", () => {
    expect(parseHeaders('{"X-Custom":"value"}')).toEqual({ "X-Custom": "value" });
  });

  it("returns undefined for missing or empty input", () => {
    expect(parseHeaders(undefined)).toBeUndefined();
    expect(parseHeaders(null)).toBeUndefined();
    expect(parseHeaders({})).toBeUndefined();
    expect(parseHeaders("")).toBeUndefined();
    expect(parseHeaders("  ")).toBeUndefined();
  });

  it("returns undefined for invalid JSON", () => {
    expect(parseHeaders("not json")).toBeUndefined();
    expect(parseHeaders("[1,2,3]")).toBeUndefined();
  });

  it("returns undefined when JSON values are not all strings", () => {
    expect(parseHeaders('{"X-Custom":123}')).toBeUndefined();
    expect(parseHeaders('{"X-Custom":true}')).toBeUndefined();
    expect(parseHeaders('{"X-Custom":null}')).toBeUndefined();
  });
});
