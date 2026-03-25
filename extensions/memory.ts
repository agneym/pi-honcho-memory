/* eslint-disable no-magic-numbers */
import type { HonchoHandles } from "./client.js";

// --- Cached memory text ---
let cachedMemoryText: string | null = null;

export const getCachedMemory = (): string | null => cachedMemoryText;

export const clearCachedMemory = (): void => {
  cachedMemoryText = null;
};

// --- Async save queue ---
let pendingSave: Promise<void> = Promise.resolve();

const enqueue = (fn: () => Promise<void>): Promise<void> => {
  pendingSave = pendingSave.then(fn, () => fn());
  return pendingSave;
};

export const flushPending = (): Promise<void> => pendingSave;

// --- Memory fetch ---

/**
 * Fetch context from Honcho and cache it for injection.
 * Non-blocking from the caller's perspective when used after save.
 */
export const refreshMemoryCache = async (handles: HonchoHandles): Promise<void> => {
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
};

// --- Message extraction helpers ---

interface ContentBlock {
  type?: string;
  text?: string;
}

const isTextBlock = (block: ContentBlock): block is ContentBlock & { text: string } =>
  block.type === "text" && typeof block.text === "string";

const extractText = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return (content as ContentBlock[])
    .filter(isTextBlock)
    .map((block) => block.text)
    .join("\n")
    .trim();
};

const MAX_MESSAGE_LENGTH = 8000;

interface AgentMessage {
  role?: string;
  content?: unknown;
}

/**
 * Extract user/assistant text pairs from agent_end messages.
 * Skips tool results, images, and oversized blobs.
 */
export const extractConversationalPairs = (
  messages: AgentMessage[],
): { role: "user" | "assistant"; text: string }[] => {
  const pairs: { role: "user" | "assistant"; text: string }[] = [];

  for (const msg of messages) {
    if (msg.role !== "user" && msg.role !== "assistant") {
      continue;
    }

    const text = extractText(msg.content);
    if (!text || text.length > MAX_MESSAGE_LENGTH) {
      continue;
    }

    pairs.push({ role: msg.role, text });
  }

  return pairs;
};

// --- Save + refresh pipeline ---

/**
 * Save conversational messages to Honcho then refresh the cache.
 * Enqueued so saves and refreshes happen in order without racing.
 */
export const saveAndRefresh = (handles: HonchoHandles, messages: AgentMessage[]): Promise<void> => {
  const pairs = extractConversationalPairs(messages);
  if (pairs.length === 0) {
    return Promise.resolve();
  }

  return enqueue(async () => {
    try {
      const honchoMessages = pairs.map((pair) => {
        if (pair.role === "user") {
          return handles.userPeer.message(pair.text);
        }
        return handles.aiPeer.message(pair.text);
      });
      await handles.session.addMessages(honchoMessages);
    } catch {
      // Non-fatal: message save failed, will retry on next turn
    }

    await refreshMemoryCache(handles);
  });
};
