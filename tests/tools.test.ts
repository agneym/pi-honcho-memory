import { describe, expect, it } from "vitest";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerTools } from "../extensions/tools.ts";
import { HonchoToolOutput, renderHonchoToolOutput } from "../extensions/tool-output-renderer.ts";

const fakeTheme = {
  fg: (_color: "dim" | "muted", text: string) => text,
};

interface RegisteredToolView {
  name: string;
  renderResult: unknown;
}

const collectTools = (): RegisteredToolView[] => {
  const tools: RegisteredToolView[] = [];
  const pi = {
    registerTool(tool) {
      tools.push({ name: tool.name, renderResult: tool.renderResult });
    },
  } satisfies Pick<ExtensionAPI, "registerTool">;

  registerTools(pi);
  return tools;
};

describe("Honcho tools", () => {
  it("register all tools with the normalized folding renderer", () => {
    const tools = collectTools();

    expect(tools.map((tool) => tool.name)).toEqual([
      "honcho_search",
      "honcho_chat",
      "honcho_remember",
    ]);

    for (const tool of tools) {
      expect(tool.renderResult).toBe(renderHonchoToolOutput);
    }
  });

  it("routes short output through the shared HonchoToolOutput class", () => {
    const tools = collectTools();

    for (const tool of tools) {
      expect(tool.renderResult).toBe(renderHonchoToolOutput);

      const component = renderHonchoToolOutput(
        { content: [{ type: "text", text: "short output" }] },
        { expanded: false },
        fakeTheme,
        { lastComponent: undefined },
      );
      expect(component).toBeInstanceOf(HonchoToolOutput);
      expect(component.render(80)).toEqual(["short output"]);
    }
  });
});
