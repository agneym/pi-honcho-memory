import type { HonchoHandles } from "./client.js";

// --- Cached memory text ---
let cachedMemoryText: string | null = null;

export function getCachedMemory(): string | null {
  return cachedMemoryText;
}

export function clearCachedMemory(): void {
  cachedMemoryText = null;
}

// --- Async save queue ---
let pendingSave: Promise<void> = Promise.resolve();

function enqueue(fn: () => Promise<void>): Promise<void> {
  pendingSave = pendingSave.then(fn, () => fn());
  return pendingSave;
}

export function flushPending(): Promise<void> {
  return pendingSave;
}

// --- Memory fetch ---

/**
 * Fetch context from Honcho and cache it for injection.
 * Non-blocking from the caller's perspective when used after save.
 */
export async function refreshMemoryCache(handles: HonchoHandles): Promise<void> {
  try {
    const ctx = await handles.session.context({
      summary: true,
      peerPerspective: handles.aiPeer,
      peerTarget: handles.userPeer,
      tokens: 1200,
    });

    const parts: string[] = [];

    if (ctx.peerRepresentation) {
      parts.push(`User profile:\n${ctx.peerRepresentation}`);
    }

    if (ctx.summary?.content) {
      parts.push(`Session summary:\n${ctx.summary.content}`);
    }

    if (parts.length > 0) {
      cachedMemoryText = `[Persistent memory]\n${parts.join("\n\n")}`;
    } else {
      cachedMemoryText = null;
    }
  } catch {
    // Keep stale cache on failure rather than clearing it
  }
}

// --- Message extraction helpers ---

interface ContentBlock {
  type?: string;
  text?: string;
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return (content as ContentBlock[])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text!)
    .join("\n")
    .trim();
}

const MAX_MESSAGE_LENGTH = 8000;

interface AgentMessage {
  role?: string;
  content?: unknown;
}

/**
 * Extract user/assistant text pairs from agent_end messages.
 * Skips tool results, images, and oversized blobs.
 */
export function extractConversationalPairs(
  messages: AgentMessage[],
): Array<{ role: "user" | "assistant"; text: string }> {
  const pairs: Array<{ role: "user" | "assistant"; text: string }> = [];

  for (const msg of messages) {
    if (msg.role !== "user" && msg.role !== "assistant") continue;

    const text = extractText(msg.content);
    if (!text || text.length > MAX_MESSAGE_LENGTH) continue;

    pairs.push({ role: msg.role as "user" | "assistant", text });
  }

  return pairs;
}

// --- Save + refresh pipeline ---

/**
 * Save conversational messages to Honcho then refresh the cache.
 * Enqueued so saves and refreshes happen in order without racing.
 */
export function saveAndRefresh(handles: HonchoHandles, messages: AgentMessage[]): Promise<void> {
  const pairs = extractConversationalPairs(messages);
  if (pairs.length === 0) return Promise.resolve();

  return enqueue(async () => {
    try {
      const honchoMessages = pairs.map((p) =>
        p.role === "user" ? handles.userPeer.message(p.text) : handles.aiPeer.message(p.text),
      );
      await handles.session.addMessages(honchoMessages);
    } catch {
      // Non-fatal: message save failed, will retry on next turn
    }

    await refreshMemoryCache(handles);
  });
}
