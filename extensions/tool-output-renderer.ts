import { keyText } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";

export const COLLAPSED_TOOL_OUTPUT_VISUAL_LINES = 12;

export interface ToolTextContent {
  type: string;
  text?: string;
}

export interface TextToolResult {
  content: ToolTextContent[];
}

interface HonchoToolTheme {
  fg(color: "dim" | "muted", text: string): string;
}

interface HonchoToolRenderOptions {
  expanded: boolean;
}

interface HonchoToolRenderContext {
  lastComponent?: unknown;
}

export const extractToolResultText = (result: TextToolResult): string =>
  result.content
    .filter(
      (part): part is ToolTextContent & { text: string } =>
        part.type === "text" && typeof part.text === "string",
    )
    .map((part) => part.text)
    .join("\n");

export class HonchoToolOutput {
  private text = "";
  private expanded = false;
  private theme: HonchoToolTheme | null = null;
  private maxCollapsedVisualLines = COLLAPSED_TOOL_OUTPUT_VISUAL_LINES;
  private cachedWidth: number | undefined;
  private cachedLines: string[] | undefined;

  update(
    text: string,
    expanded: boolean,
    theme: HonchoToolTheme,
    maxCollapsedVisualLines = COLLAPSED_TOOL_OUTPUT_VISUAL_LINES,
  ): void {
    if (
      this.text === text &&
      this.expanded === expanded &&
      this.theme === theme &&
      this.maxCollapsedVisualLines === maxCollapsedVisualLines
    ) {
      return;
    }

    this.text = text;
    this.expanded = expanded;
    this.theme = theme;
    this.maxCollapsedVisualLines = maxCollapsedVisualLines;
    this.invalidate();
  }

  render(width: number): string[] {
    if (this.cachedLines !== undefined && this.cachedWidth === width) {
      return this.cachedLines;
    }

    const { theme } = this;
    const rawText = this.text || theme?.fg("dim", "(no text output)") || "(no text output)";
    const renderedLines = wrapTextWithAnsi(rawText, width);
    const shouldCollapse = !this.expanded && renderedLines.length > this.maxCollapsedVisualLines;

    if (shouldCollapse) {
      const hiddenLineCount = renderedLines.length - this.maxCollapsedVisualLines;
      this.cachedLines = [
        ...renderedLines.slice(0, this.maxCollapsedVisualLines),
        this.hintLine(width, hiddenLineCount, "expand"),
      ];
      this.cachedWidth = width;
      return this.cachedLines;
    }

    this.cachedLines = [...renderedLines];
    if (this.expanded && renderedLines.length > this.maxCollapsedVisualLines) {
      this.cachedLines.push(this.hintLine(width, 0, "collapse"));
    }
    this.cachedWidth = width;
    return this.cachedLines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }

  private hintLine(width: number, hiddenLineCount: number, action: "expand" | "collapse"): string {
    const { theme } = this;
    const shortcut = keyText("app.tools.expand");
    const actionHint = shortcut ? `${shortcut} to ${action}` : `to ${action}`;
    const text =
      action === "expand"
        ? `... ${hiddenLineCount} more visual line${hiddenLineCount === 1 ? "" : "s"} (${actionHint})`
        : `(${actionHint})`;
    return truncateToWidth(theme?.fg("muted", text) || text, width);
  }
}

export const renderHonchoToolOutput = (
  result: TextToolResult,
  options: HonchoToolRenderOptions,
  theme: HonchoToolTheme,
  context?: HonchoToolRenderContext,
): HonchoToolOutput => {
  const component =
    context?.lastComponent instanceof HonchoToolOutput
      ? context.lastComponent
      : new HonchoToolOutput();
  component.update(extractToolResultText(result), options.expanded, theme);
  return component;
};
