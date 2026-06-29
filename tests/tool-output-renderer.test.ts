import { describe, expect, it } from "vitest";
import {
  COLLAPSED_TOOL_OUTPUT_VISUAL_LINES,
  extractToolResultText,
  HonchoToolOutput,
  renderHonchoToolOutput,
} from "../extensions/tool-output-renderer.ts";

const fakeTheme = {
  fg: (_color: "dim" | "muted", text: string) => text,
};

describe("HonchoToolOutput", () => {
  it("renders short text through the normalized output component", () => {
    const component = renderHonchoToolOutput(
      { content: [{ type: "text", text: "Remembered: short fact" }] },
      { expanded: false },
      fakeTheme,
    );

    expect(component).toBeInstanceOf(HonchoToolOutput);
    expect(component.render(120)).toEqual(["Remembered: short fact"]);
  });

  it("collapses long output with an expansion hint", () => {
    const text = Array.from(
      { length: COLLAPSED_TOOL_OUTPUT_VISUAL_LINES + 1 },
      (_, index) => `line ${index + 1}`,
    ).join("\n");

    const component = renderHonchoToolOutput(
      { content: [{ type: "text", text }] },
      { expanded: false },
      fakeTheme,
    );
    const rendered = component.render(120);

    expect(rendered).toHaveLength(COLLAPSED_TOOL_OUTPUT_VISUAL_LINES + 1);
    expect(rendered[0]).toBe("line 1");
    expect(rendered[COLLAPSED_TOOL_OUTPUT_VISUAL_LINES - 1]).toBe(
      `line ${COLLAPSED_TOOL_OUTPUT_VISUAL_LINES}`,
    );
    expect(rendered.at(-1)).toContain("... 1 more visual line");
    expect(rendered.at(-1)).toContain("to expand");
  });

  it("wraps long single-line output before collapse", () => {
    const component = renderHonchoToolOutput(
      { content: [{ type: "text", text: "word ".repeat(160) }] },
      { expanded: false },
      fakeTheme,
    );
    const rendered = component.render(60);

    expect(rendered).toHaveLength(COLLAPSED_TOOL_OUTPUT_VISUAL_LINES + 1);
    expect(rendered.at(-1)).toContain("more visual lines");
  });

  it("expands long output with a collapse hint", () => {
    const text = Array.from(
      { length: COLLAPSED_TOOL_OUTPUT_VISUAL_LINES + 1 },
      (_, index) => `line ${index + 1}`,
    ).join("\n");

    const component = renderHonchoToolOutput(
      { content: [{ type: "text", text }] },
      { expanded: true },
      fakeTheme,
    );
    const rendered = component.render(120);

    expect(rendered).toHaveLength(COLLAPSED_TOOL_OUTPUT_VISUAL_LINES + 2);
    expect(rendered[COLLAPSED_TOOL_OUTPUT_VISUAL_LINES]).toBe(
      `line ${COLLAPSED_TOOL_OUTPUT_VISUAL_LINES + 1}`,
    );
    expect(rendered.at(-1)).toContain("to collapse");
  });

  it("reuses the normalized component across renders", () => {
    const existing = new HonchoToolOutput();
    const component = renderHonchoToolOutput(
      { content: [{ type: "text", text: "updated" }] },
      { expanded: false },
      fakeTheme,
      { lastComponent: existing },
    );

    expect(component).toBe(existing);
    expect(component.render(80)).toEqual(["updated"]);
  });

  it("extracts all text parts and ignores non-text parts", () => {
    expect(
      extractToolResultText({
        content: [
          { type: "text", text: "first" },
          { type: "image" },
          { type: "text", text: "second" },
        ],
      }),
    ).toBe("first\nsecond");
  });
});
