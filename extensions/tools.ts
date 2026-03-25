/* eslint-disable no-magic-numbers */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import { getHandles } from "./client.js";

const SEARCH_LIMIT = 8;
const PREVIEW_LENGTH = 500;

const ensureConnected = (): ReturnType<typeof getHandles> => {
  const handles = getHandles();
  if (!handles) {
    throw new Error("Honcho is not connected. Run /honcho-setup to configure.");
  }
  return handles;
};

const formatResults = (results: { peerId: string; content: string }[]): string =>
  results
    .map((mem, idx) => `${idx + 1}. [${mem.peerId}] ${mem.content.slice(0, PREVIEW_LENGTH)}`)
    .join("\n\n");

// eslint-disable-next-line import/prefer-default-export
export const registerTools = (pi: ExtensionAPI): void => {
  // --- honcho_search ---
  pi.registerTool({
    name: "honcho_search",
    label: "Honcho Search",
    description:
      "Search persistent memory for prior conversations, decisions, and historical context",
    promptSnippet:
      "Search persistent memory for prior conversations, decisions, and historical context",
    promptGuidelines: [
      "Use honcho_search for factual recall of past conversations or decisions.",
      "Do not save secrets, tokens, or transient debugging details to Honcho.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Search query" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const handles = ensureConnected();
      if (!handles) {
        throw new Error("Honcho is not connected. Run /honcho-setup to configure.");
      }

      const results = await handles.session.search(params.query, {
        limit: SEARCH_LIMIT,
      });

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No relevant memory found for this query.",
            },
          ],
          details: {},
        };
      }

      return {
        content: [{ type: "text" as const, text: formatResults(results) }],
        details: { count: results.length },
      };
    },
  });

  // --- honcho_chat ---
  pi.registerTool({
    name: "honcho_chat",
    label: "Honcho Chat",
    description:
      "Ask Honcho to reason over memory — for deeper questions about user preferences, patterns, and history",
    promptSnippet:
      "Reason over persistent memory for deeper questions about user preferences and patterns",
    promptGuidelines: ["Use honcho_chat for reasoning over memory, not simple lookup."],
    parameters: Type.Object({
      query: Type.String({ description: "Question to reason over" }),
      // eslint-disable-next-line new-cap
      reasoningLevel: Type.Optional(
        StringEnum(["minimal", "low", "medium", "high", "max"] as const), // eslint-disable-line new-cap
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const handles = ensureConnected();
      if (!handles) {
        throw new Error("Honcho is not connected. Run /honcho-setup to configure.");
      }

      const result = await handles.aiPeer.chat(params.query, {
        target: handles.userPeer,
        session: handles.session,
        reasoningLevel: params.reasoningLevel ?? "low",
      });

      if (result === null) {
        return {
          content: [
            {
              type: "text" as const,
              text: "No relevant memory found for this query.",
            },
          ],
          details: {},
        };
      }

      return {
        content: [{ type: "text" as const, text: result }],
        details: {},
      };
    },
  });

  // --- honcho_remember ---
  pi.registerTool({
    name: "honcho_remember",
    label: "Honcho Remember",
    description: "Write an explicit durable fact, preference, or decision to persistent memory",
    promptSnippet: "Save a durable fact, preference, or decision to persistent memory",
    promptGuidelines: [
      "Use honcho_remember only for durable preferences, conventions, or decisions worth persisting.",
      "Do not save secrets, tokens, or transient debugging details to Honcho.",
    ],
    parameters: Type.Object({
      content: Type.String({
        description: "The fact, preference, or decision to remember",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const handles = ensureConnected();
      if (!handles) {
        throw new Error("Honcho is not connected. Run /honcho-setup to configure.");
      }

      await handles.aiPeer.conclusionsOf(handles.userPeer).create({
        content: params.content,
        sessionId: handles.session,
      });

      return {
        content: [{ type: "text" as const, text: `Remembered: ${params.content}` }],
        details: {},
      };
    },
  });
};
