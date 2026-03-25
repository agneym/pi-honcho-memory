import { describe, expect, it } from "vitest";
import { extractConversationalPairs } from "../extensions/memory.ts";

describe("extractConversationalPairs", () => {
  it("keeps user and assistant text messages in order", () => {
    const pairs = extractConversationalPairs([
      { role: "system", content: "ignore me" },
      { role: "user", content: "Hello" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Hi" },
          { type: "image", text: "ignored" },
          { type: "text", text: "How can I help?" },
        ],
      },
      { role: "tool", content: "ignore me too" },
    ]);

    expect(pairs).toEqual([
      { role: "user", text: "Hello" },
      { role: "assistant", text: "Hi\nHow can I help?" },
    ]);
  });

  it("skips empty and oversized messages", () => {
    const pairs = extractConversationalPairs([
      { role: "user", content: [] },
      { role: "assistant", content: "x".repeat(8001) },
      { role: "assistant", content: "kept" },
    ]);

    expect(pairs).toEqual([{ role: "assistant", text: "kept" }]);
  });
});
