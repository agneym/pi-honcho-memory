import { describe, expect, it } from "vitest";
import {
  describeGitChange,
  describeGitState,
  extractAssistantWorklogSummary,
  formatWorklog,
  pushWorklogItem,
  restoreWorklog,
} from "../extensions/runtime-context.ts";

describe("runtime context helpers", () => {
  it("describes git state and changes", () => {
    const previous = {
      root: "/repo",
      branch: "main",
      commit: "abc123",
      commitMessage: "Initial commit",
      isDirty: false,
      dirtyFiles: [],
    };

    const current = {
      root: "/repo",
      branch: "feature/tests",
      commit: "def456",
      commitMessage: "Add test setup",
      isDirty: true,
      dirtyFiles: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts", "f.ts"],
    };

    expect(describeGitState(current)).toEqual([
      "- branch: feature/tests",
      "- head: def456 — Add test setup",
      "- working tree: dirty (a.ts, b.ts, c.ts, d.ts, e.ts (+1 more))",
    ]);

    expect(describeGitChange(previous, current)).toEqual([
      "- branch switched: main → feature/tests",
      "- HEAD changed: abc123 → def456 — Add test setup",
      "- working tree is now dirty",
      "- new uncommitted files: a.ts, b.ts, c.ts, d.ts, e.ts",
    ]);
  });

  it("extracts and formats worklog data", () => {
    const summary = extractAssistantWorklogSummary([
      { role: "assistant", content: "short reply" },
      {
        role: "assistant",
        content: [
          {
            type: "text",
            text: "Implemented Vitest setup and added starter tests.\n\nExtra details are ignored.",
          },
        ],
      },
    ]);

    expect(summary).toBe("Implemented Vitest setup and added starter tests.");

    if (!summary) {
      throw new Error("expected a summary");
    }

    const items = pushWorklogItem([], {
      timestamp: Date.parse("2024-01-01T10:15:00.000Z"),
      summary,
    });

    expect(formatWorklog(items)).toBe("- 10:15 Implemented Vitest setup and added starter tests.");

    expect(
      restoreWorklog([
        {
          type: "custom",
          customType: "honcho-worklog",
          data: {
            timestamp: Date.parse("2024-01-01T10:15:00.000Z"),
            summary: "  Restored summary  ",
          },
        },
        { type: "custom", customType: "other", data: {} },
      ]),
    ).toEqual([
      {
        timestamp: Date.parse("2024-01-01T10:15:00.000Z"),
        summary: "Restored summary",
      },
    ]);
  });
});
