/* eslint-disable no-magic-numbers */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export interface GitState {
  root: string;
  branch: string;
  commit: string;
  commitMessage: string;
  isDirty: boolean;
  dirtyFiles: string[];
}

export interface WorklogItem {
  timestamp: number;
  summary: string;
}

interface PiExecResult {
  code: number;
  stdout: string;
}

interface TextBlock {
  type?: string;
  text?: string;
}

interface AgentMessage {
  role?: string;
  content?: unknown;
}

const MAX_WORKLOG_ITEMS = 12;
const MAX_SUMMARY_LENGTH = 280;
const DIRTY_FILE_PREVIEW = 5;

const execGit = async (
  pi: ExtensionAPI,
  cwd: string,
  args: string[],
): Promise<PiExecResult | null> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return (await pi.exec("git", ["-C", cwd, ...args], {
      timeout: 3000,
    })) as PiExecResult;
  } catch {
    return null;
  }
};

const trim = (value: string): string => value.trim();

const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const formatTime = (timestamp: number): string => new Date(timestamp).toISOString().slice(11, 16);

export const captureGitState = async (pi: ExtensionAPI, cwd: string): Promise<GitState | null> => {
  const rootResult = await execGit(pi, cwd, ["rev-parse", "--show-toplevel"]);
  if (!rootResult || rootResult.code !== 0 || !rootResult.stdout.trim()) {
    return null;
  }

  const branchResult = await execGit(pi, cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const commitResult = await execGit(pi, cwd, ["rev-parse", "--short", "HEAD"]);
  const commitMessageResult = await execGit(pi, cwd, ["log", "-1", "--pretty=%s"]);
  const statusResult = await execGit(pi, cwd, ["status", "--short"]);

  const branch = trim(branchResult?.stdout || "");
  const commit = trim(commitResult?.stdout || "");
  const commitMessage = trim(commitMessageResult?.stdout || "");
  const dirtyFiles = (statusResult?.stdout || "")
    .split("\n")
    .map(trim)
    .filter(Boolean)
    .map((line) => line.replace(/^..\s+/, ""));

  return {
    root: trim(rootResult.stdout),
    branch: branch || "HEAD",
    commit: commit || "unknown",
    commitMessage: commitMessage || "",
    isDirty: dirtyFiles.length > 0,
    dirtyFiles,
  };
};

export const describeGitState = (state: GitState): string[] => {
  const lines = [`- branch: ${state.branch}`, `- head: ${state.commit}`];

  if (state.commitMessage) {
    lines[1] = `${lines[1]} — ${state.commitMessage}`;
  }

  if (state.isDirty) {
    const preview = state.dirtyFiles.slice(0, DIRTY_FILE_PREVIEW).join(", ");
    const suffix =
      state.dirtyFiles.length > DIRTY_FILE_PREVIEW
        ? ` (+${state.dirtyFiles.length - DIRTY_FILE_PREVIEW} more)`
        : "";
    lines.push(`- working tree: dirty (${preview}${suffix})`);
  } else {
    lines.push("- working tree: clean");
  }

  return lines;
};

export const describeGitChange = (previous: GitState | null, current: GitState): string[] => {
  if (!previous) {
    return [];
  }

  const changes: string[] = [];

  if (previous.branch !== current.branch) {
    changes.push(`- branch switched: ${previous.branch} → ${current.branch}`);
  }

  if (previous.commit !== current.commit) {
    const suffix = current.commitMessage ? ` — ${current.commitMessage}` : "";
    changes.push(`- HEAD changed: ${previous.commit} → ${current.commit}${suffix}`);
  }

  if (previous.isDirty !== current.isDirty) {
    changes.push(`- working tree is now ${current.isDirty ? "dirty" : "clean"}`);
  }

  if (current.isDirty) {
    const previousSet = new Set(previous.dirtyFiles);
    const added = current.dirtyFiles.filter((file) => !previousSet.has(file));
    if (added.length > 0) {
      changes.push(`- new uncommitted files: ${added.slice(0, DIRTY_FILE_PREVIEW).join(", ")}`);
    }
  }

  return changes;
};

const extractText = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return (content as TextBlock[])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
};

const cleanSummary = (text: string): string =>
  truncate(
    text
      .split(/\n\s*\n/)[0]
      .replace(/\s+/g, " ")
      .trim(),
    MAX_SUMMARY_LENGTH,
  );

export const extractAssistantWorklogSummary = (messages: AgentMessage[]): string | null => {
  const assistantTexts = messages
    .filter((message) => message.role === "assistant")
    .map((message) => extractText(message.content))
    .map(cleanSummary)
    .filter(Boolean);

  for (let index = assistantTexts.length - 1; index >= 0; index -= 1) {
    const candidate = assistantTexts[index];
    if (candidate.length >= 32) {
      return candidate;
    }
  }

  return assistantTexts.at(-1) || null;
};

export const pushWorklogItem = (items: WorklogItem[], item: WorklogItem): WorklogItem[] =>
  [...items, item].slice(-MAX_WORKLOG_ITEMS);

export const formatWorklog = (items: WorklogItem[]): string | null => {
  if (items.length === 0) {
    return null;
  }

  return items
    .slice(-6)
    .map((item) => `- ${formatTime(item.timestamp)} ${item.summary}`)
    .join("\n");
};

export const restoreWorklog = (entries: unknown[]): WorklogItem[] => {
  const restored: WorklogItem[] = [];

  for (const entry of entries) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion
    const candidate = entry as any;
    if (candidate?.type !== "custom" || candidate?.customType !== "honcho-worklog") {
      continue;
    }

    const timestamp = candidate?.data?.timestamp;
    const summary = candidate?.data?.summary;
    if (typeof timestamp === "number" && typeof summary === "string" && summary.trim()) {
      restored.push({ timestamp, summary: summary.trim() });
    }
  }

  return restored.slice(-MAX_WORKLOG_ITEMS);
};
