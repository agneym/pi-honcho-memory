import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

export interface HonchoExtensionConfig {
  enabled: boolean;
  apiKey?: string;
  baseURL?: string;
  workspaceId: string;
  userPeerId: string;
  aiPeerId: string;
}

interface ConfigFileHost {
  workspace?: string;
  aiPeer?: string;
  endpoint?: string;
}

interface ConfigFile {
  apiKey?: string;
  peerName?: string;
  hosts?: {
    pi?: ConfigFileHost;
  };
}

const CONFIG_PATH = join(homedir(), ".honcho", "config.json");

async function readConfigFile(): Promise<ConfigFile | null> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as ConfigFile;
  } catch {
    return null;
  }
}

export async function resolveConfig(): Promise<HonchoExtensionConfig> {
  const file = await readConfigFile();
  const piHost = file?.hosts?.pi;

  // Enabled gate: explicit env var, otherwise true if API key is available
  const enabledEnv = process.env.HONCHO_ENABLED;
  const apiKey = process.env.HONCHO_API_KEY || file?.apiKey || undefined;
  const enabled = enabledEnv !== undefined ? enabledEnv === "true" : !!apiKey;

  const baseURL = process.env.HONCHO_URL || piHost?.endpoint || undefined;
  const workspaceId = process.env.HONCHO_WORKSPACE_ID || piHost?.workspace || "pi";
  const userPeerId = process.env.HONCHO_PEER_NAME || file?.peerName || process.env.USER || "user";
  const aiPeerId = process.env.HONCHO_AI_PEER || piHost?.aiPeer || "pi";

  return { enabled, apiKey, baseURL, workspaceId, userPeerId, aiPeerId };
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}
