import { describe, expect, it } from "vitest";
import {
  buildMemoryText,
  buildProjectSummaryText,
  buildUserProfileText,
  extractConversationalPairs,
} from "../extensions/memory.ts";

describe("extractConversationalPairs", () => {
  it("keeps user and assistant text messages in order", () => {
    const pairs = extractConversationalPairs(
      [
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
      ],
      8000,
    );

    expect(pairs).toEqual([
      { role: "user", text: "Hello" },
      { role: "assistant", text: "Hi\nHow can I help?" },
    ]);
  });

  it("skips empty and oversized messages", () => {
    const pairs = extractConversationalPairs(
      [
        { role: "user", content: [] },
        { role: "assistant", content: "x".repeat(8001) },
        { role: "assistant", content: "kept" },
      ],
      8000,
    );

    expect(pairs).toEqual([{ role: "assistant", text: "kept" }]);
  });
});

describe("buildMemoryText", () => {
  it("formats user profile and project summary for prompt injection", () => {
    const memoryText = buildMemoryText({
      peerRepresentation: "Prefers pnpm.",
      summary: { content: "Working on the Honcho extension." },
    });

    expect(memoryText).toBe(
      "[Persistent memory]\nUser profile:\nPrefers pnpm.\n\nProject summary:\nWorking on the Honcho extension.",
    );
  });

  it("returns null when there is no memory to inject", () => {
    expect(buildMemoryText({})).toBeNull();
  });
});

describe("split memory sections", () => {
  it("builds separate text blocks for stable user profile and project summary", () => {
    expect(buildUserProfileText("Prefers pnpm.")).toBe(
      "[Persistent memory]\nUser profile:\nPrefers pnpm.",
    );
    expect(buildProjectSummaryText("Working on the Honcho extension.")).toBe(
      "[Persistent memory]\nProject summary:\nWorking on the Honcho extension.",
    );
  });

  it("returns null for empty section values", () => {
    expect(buildUserProfileText(null)).toBeNull();
    expect(buildProjectSummaryText("")).toBeNull();
  });
});
