import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { bootstrap, clearHandles, getHandles } from "./client.js";
import { registerCommands } from "./commands.js";
import { resolveConfig } from "./config.js";
import {
  clearCachedMemory,
  flushPending,
  getCachedMemory,
  refreshMemoryCache,
  saveAndRefresh,
} from "./memory.js";
import {
  captureGitState,
  describeGitChange,
  describeGitState,
  extractAssistantWorklogSummary,
  formatWorklog,
  pushWorklogItem,
  restoreWorklog,
} from "./runtime-context.js";
// eslint-disable-next-line no-duplicate-imports
import type { GitState, WorklogItem } from "./runtime-context.js";
import { registerTools } from "./tools.js";

interface StatusContext {
  ui: {
    setStatus: (id: string, text: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    theme: any;
  };
}

interface SessionStateContext {
  cwd: string;
  sessionManager: {
    getBranch: () => unknown[];
  };
}

const setStatus = (
  ctx: StatusContext,
  state: "off" | "connected" | "syncing" | "offline" | "error",
): void => {
  const { theme } = ctx.ui;
  const labels: Record<string, string> = {
    off: theme.fg("dim", "🧠 Honcho off"),
    connected: theme.fg("success", "🧠 Connected"),
    syncing: theme.fg("warning", "🧠 Syncing"),
    offline: theme.fg("dim", "🧠 Offline"),
    error: theme.fg("error", "🧠 Error"),
  };
  ctx.ui.setStatus("honcho", labels[state]);
};

export default function honcho(pi: ExtensionAPI): void {
  // Track initialization state
  let initializing: Promise<void> | null = null;
  let lastGitState: GitState | null = null;
  let worklog: WorklogItem[] = [];

  // --- Register tools & commands (always, so they can show helpful errors if not connected) ---
  registerTools(pi);
  registerCommands(pi);

  const restoreSessionState = async (ctx: SessionStateContext): Promise<void> => {
    worklog = restoreWorklog(ctx.sessionManager.getBranch());
    lastGitState = await captureGitState(pi, ctx.cwd);
  };

  const buildLocalContext = async (cwd: string): Promise<string | null> => {
    const parts: string[] = [];
    const currentGitState = await captureGitState(pi, cwd);

    if (currentGitState) {
      parts.push(`Git state:\n${describeGitState(currentGitState).join("\n")}`);

      const changes = describeGitChange(lastGitState, currentGitState);
      if (changes.length > 0) {
        parts.push(`Git changes since last turn:\n${changes.join("\n")}`);
      }

      lastGitState = currentGitState;
    }

    const worklogText = formatWorklog(worklog);
    if (worklogText) {
      parts.push(`AI worklog:\n${worklogText}`);
    }

    if (parts.length === 0) {
      return null;
    }

    return `[Local session context]\n${parts.join("\n\n")}`;
  };

  /**
   * Non-blocking bootstrap: kicks off Honcho initialization in the background.
   * Sets status on completion. Never throws.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const backgroundInit = (ctx: { ui: any; cwd: string }): void => {
    initializing = (async () => {
      try {
        const config = await resolveConfig();
        if (!config.enabled || !config.apiKey) {
          setStatus(ctx, "off");
          return;
        }

        const handles = await bootstrap(pi, config, ctx.cwd);
        setStatus(ctx, "connected");

        // Prefetch memory context
        await refreshMemoryCache(handles);
      } catch {
        setStatus(ctx, "offline");
      } finally {
        initializing = null;
      }
    })();
  };

  // --- Lifecycle events ---

  pi.on("session_start", async (_event, ctx) => {
    clearHandles();
    clearCachedMemory();
    await restoreSessionState(ctx);
    backgroundInit(ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    // Flush pending saves for the old session
    await flushPending();
    clearHandles();
    clearCachedMemory();
    await restoreSessionState(ctx);
    backgroundInit(ctx);
  });

  pi.on("session_fork", async (_event, ctx) => {
    await flushPending();
    clearHandles();
    clearCachedMemory();
    await restoreSessionState(ctx);
    backgroundInit(ctx);
  });

  // --- Prompt path: inject cached memory (0ms network) ---

  pi.on("before_agent_start", async (_event, ctx) => {
    // Wait for initial bootstrap if it's still running on the very first prompt
    if (initializing) {
      await initializing;
    }

    const sections: string[] = [];
    const memoryText = getCachedMemory();
    if (memoryText) {
      sections.push(memoryText);
    }

    const localContext = await buildLocalContext(ctx.cwd);
    if (localContext) {
      sections.push(localContext);
    }

    if (sections.length === 0) {
      return;
    }

    return {
      message: {
        customType: "honcho-memory",
        content: sections.join("\n\n"),
        display: false,
      },
    };
  });

  // --- Post-response: save messages + refresh cache ---

  pi.on("agent_end", async (event, ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion
    const summary = extractAssistantWorklogSummary(event.messages as any[]);
    if (summary) {
      const entry = { timestamp: Date.now(), summary };
      worklog = pushWorklogItem(worklog, entry);
      pi.appendEntry("honcho-worklog", entry);
    }

    lastGitState = await captureGitState(pi, ctx.cwd);

    const handles = getHandles();
    if (!handles) {
      return;
    }

    setStatus(ctx, "syncing");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-type-assertion
    saveAndRefresh(handles, event.messages as any[])
      .then(() => setStatus(ctx, "connected"))
      .catch(() => setStatus(ctx, "offline"));
  });

  // --- Flush on lifecycle edges ---

  pi.on("session_before_compact", async () => {
    await flushPending();
  });

  pi.on("session_before_switch", async () => {
    await flushPending();
  });

  pi.on("session_before_fork", async () => {
    await flushPending();
  });

  pi.on("session_shutdown", async () => {
    await flushPending();
  });
}
