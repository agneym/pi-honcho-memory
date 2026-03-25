import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { getHandles, bootstrap, clearHandles } from "./client.js";
import { resolveConfig, getConfigPath } from "./config.js";
import { getCachedMemory, flushPending } from "./memory.js";

export function registerCommands(pi: ExtensionAPI): void {
  // --- /honcho-status ---
  pi.registerCommand("honcho-status", {
    description: "Show Honcho memory connection status",
    handler: async (_args, ctx) => {
      const config = await resolveConfig();
      const handles = getHandles();
      const cached = getCachedMemory();

      const lines: string[] = [];
      lines.push(`Enabled:      ${config.enabled ? "✅ yes" : "❌ no"}`);
      lines.push(`Connected:    ${handles ? "✅ yes" : "❌ no"}`);
      lines.push(`Workspace:    ${config.workspaceId}`);
      lines.push(`User peer:    ${config.userPeerId}`);
      lines.push(`AI peer:      ${config.aiPeerId}`);

      if (handles) {
        lines.push(`Session key:  ${handles.sessionKey}`);
      }

      lines.push(`Memory cache: ${cached ? `${cached.length} chars` : "empty"}`);

      if (config.baseURL) {
        lines.push(`Endpoint:     ${config.baseURL}`);
      }

      ctx.ui.notify(lines.join("\n"), "info");
    },
  });

  // --- /honcho-setup ---
  pi.registerCommand("honcho-setup", {
    description: "Configure Honcho memory integration",
    handler: async (_args, ctx) => {
      const existing = await resolveConfig();

      const apiKey = await ctx.ui.input(
        "Honcho API key:",
        existing.apiKey ? "••••••••" : "hch-...",
      );
      if (!apiKey || apiKey === "••••••••") {
        if (!existing.apiKey) {
          ctx.ui.notify("API key is required.", "error");
          return;
        }
        // Keep existing key
      }

      const peerName = await ctx.ui.input("Your peer name:", existing.userPeerId);

      const endpoint = await ctx.ui.input(
        "Honcho endpoint (leave blank for default):",
        existing.baseURL || "",
      );

      // Build config file
      const configPath = getConfigPath();
      let fileContents: Record<string, unknown> = {};
      try {
        const { readFile } = await import("node:fs/promises");
        const raw = await readFile(configPath, "utf-8");
        fileContents = JSON.parse(raw);
      } catch {
        // Start fresh
      }

      if (apiKey && apiKey !== "••••••••") {
        fileContents.apiKey = apiKey;
      }
      if (peerName) {
        fileContents.peerName = peerName;
      }

      // Ensure hosts.pi section
      const hosts = (fileContents.hosts as Record<string, unknown>) || {};
      const piHost = (hosts.pi as Record<string, unknown>) || {};
      piHost.workspace = existing.workspaceId;
      piHost.aiPeer = existing.aiPeerId;
      if (endpoint) {
        piHost.endpoint = endpoint;
      }
      hosts.pi = piHost;
      fileContents.hosts = hosts;

      await mkdir(dirname(configPath), { recursive: true });
      await writeFile(configPath, JSON.stringify(fileContents, null, 2) + "\n", "utf-8");

      ctx.ui.notify("Config saved to " + configPath, "info");

      // Test connection
      ctx.ui.notify("Testing connection...", "info");
      try {
        clearHandles();
        const newConfig = await resolveConfig();
        await bootstrap(pi, newConfig, ctx.cwd);
        ctx.ui.notify("✅ Connected to Honcho!", "info");
        ctx.ui.setStatus("honcho", ctx.ui.theme.fg("success", "🧠 Connected"));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`❌ Connection failed: ${msg}`, "error");
        ctx.ui.setStatus("honcho", ctx.ui.theme.fg("error", "🧠 Error"));
      }
    },
  });

  // --- /recall ---
  pi.registerCommand("recall", {
    description: "Search Honcho memory for a topic",
    handler: async (args, ctx) => {
      const query = args.trim();
      if (!query) {
        ctx.ui.notify("Usage: /recall <topic>", "warning");
        return;
      }

      const handles = getHandles();
      if (!handles) {
        ctx.ui.notify("Honcho is not connected. Run /honcho-setup first.", "error");
        return;
      }

      try {
        const results = await handles.session.search(query, {
          limit: 8,
        });

        if (results.length === 0) {
          ctx.ui.notify("No memories found for: " + query, "info");
          return;
        }

        const formatted = results
          .map((m, i) => `${i + 1}. [${m.peerId}] ${m.content.slice(0, 300)}`)
          .join("\n\n");

        ctx.ui.notify(formatted, "info");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`Search failed: ${msg}`, "error");
      }
    },
  });

  // --- /remember ---
  pi.registerCommand("remember", {
    description: "Save a fact to Honcho persistent memory",
    handler: async (args, ctx) => {
      const content = args.trim();
      if (!content) {
        ctx.ui.notify("Usage: /remember <fact>", "warning");
        return;
      }

      const handles = getHandles();
      if (!handles) {
        ctx.ui.notify("Honcho is not connected. Run /honcho-setup first.", "error");
        return;
      }

      try {
        await handles.aiPeer
          .conclusionsOf(handles.userPeer)
          .create({ content, sessionId: handles.session });
        ctx.ui.notify("✅ Remembered: " + content, "info");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui.notify(`Failed to save: ${msg}`, "error");
      }
    },
  });
}
