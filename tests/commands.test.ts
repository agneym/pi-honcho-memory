import { describe, expect, it } from "vitest";
import { isValidBaseURL } from "../extensions/commands.ts";

describe("command helpers", () => {
  it("accepts HTTP and HTTPS base URLs", () => {
    expect(isValidBaseURL("http://localhost:8000")).toBe(true);
    expect(isValidBaseURL("https://honcho.example.com/api")).toBe(true);
  });

  it("rejects invalid and unsupported base URLs", () => {
    expect(isValidBaseURL("honcho.example.com")).toBe(false);
    expect(isValidBaseURL("ftp://honcho.example.com")).toBe(false);
    expect(isValidBaseURL("not a url")).toBe(false);
  });
});
