import { Honcho, type Peer, type Session } from "@honcho-ai/sdk";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { HonchoExtensionConfig } from "./config.js";
import { deriveSessionKey } from "./session-key.js";

export interface HonchoHandles {
  honcho: Honcho;
  userPeer: Peer;
  aiPeer: Peer;
  session: Session;
  sessionKey: string;
}

let cachedHandles: HonchoHandles | null = null;

export function getHandles(): HonchoHandles | null {
  return cachedHandles;
}

export function clearHandles(): void {
  cachedHandles = null;
}

/**
 * Bootstrap the Honcho client and resolve all handles.
 * Throws on failure — callers must catch and degrade gracefully.
 */
export async function bootstrap(
  pi: ExtensionAPI,
  config: HonchoExtensionConfig,
  cwd: string,
): Promise<HonchoHandles> {
  const honcho = new Honcho({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    workspaceId: config.workspaceId,
  });

  const sessionKey = await deriveSessionKey(pi, cwd);

  const [userPeer, aiPeer, session] = await Promise.all([
    honcho.peer(config.userPeerId),
    honcho.peer(config.aiPeerId),
    honcho.session(sessionKey),
  ]);

  await session.addPeers([userPeer, aiPeer]);

  cachedHandles = { honcho, userPeer, aiPeer, session, sessionKey };
  return cachedHandles;
}
