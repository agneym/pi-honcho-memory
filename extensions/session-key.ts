/* eslint-disable no-magic-numbers */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { createHash } from "node:crypto"; // eslint-disable-line import/no-nodejs-modules

const HASH_LENGTH = 8;
const SSH_MATCH_INDEX = 1;

const shortHash = (input: string): string =>
  createHash("sha256").update(input).digest("hex").slice(0, HASH_LENGTH);

/** Replace any character not in [a-zA-Z0-9_-] with an underscore. */
const sanitize = (input: string): string => input.replace(/[^a-zA-Z0-9_-]/g, "_");

/**
 * Normalize a git remote URL to owner/repo form.
 *
 * Handles:
 *   git@github.com:owner/repo.git
 *   https://github.com/owner/repo.git
 *   ssh://git@github.com/owner/repo.git
 */
const normalizeGitUrl = (url: string): string | null => {
  // SSH style: git@host:owner/repo.git
  const sshMatch = url.match(/^[^@]+@[^:]+:(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return sshMatch[SSH_MATCH_INDEX];
  }

  // HTTPS / SSH protocol style
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, "").replace(/\.git$/, "");
    if (path) {
      return path;
    }
  } catch {
    // Not a valid URL
  }

  return null;
};

const tryGitRemote = async (pi: ExtensionAPI): Promise<string | null> => {
  try {
    const result = await pi.exec("git", ["remote", "get-url", "origin"], {
      timeout: 3000,
    });
    if (result.code === 0 && result.stdout.trim()) {
      const url = result.stdout.trim();
      const normalized = normalizeGitUrl(url);
      if (normalized) {
        return sanitize(`repo_${normalized}`);
      }
    }
  } catch {
    // Fall through
  }
  return null;
};

const tryGitRoot = async (pi: ExtensionAPI): Promise<string | null> => {
  try {
    const result = await pi.exec("git", ["rev-parse", "--show-toplevel"], { timeout: 3000 });
    if (result.code === 0 && result.stdout.trim()) {
      const root = result.stdout.trim();
      const basename = root.split("/").pop() || "repo";
      return sanitize(`local_${basename}_${shortHash(root)}`);
    }
  } catch {
    // Fall through
  }
  return null;
};

/**
 * Derive a stable Honcho session key from the current working directory.
 *
 * Strategy chain:
 *   1. git remote get-url origin → normalized repo:owner/repo
 *   2. git rev-parse --show-toplevel → local:<basename>:<hash>
 *   3. cwd → cwd:<basename>:<hash>
 */
const deriveSessionKey = async (pi: ExtensionAPI, cwd: string): Promise<string> => {
  // Strategy 1: git remote
  const remoteKey = await tryGitRemote(pi);
  if (remoteKey) {
    return remoteKey;
  }

  // Strategy 2: git repo root
  const rootKey = await tryGitRoot(pi);
  if (rootKey) {
    return rootKey;
  }

  // Strategy 3: cwd fallback
  const basename = cwd.split("/").pop() || "project";
  return sanitize(`cwd_${basename}_${shortHash(cwd)}`);
};

// eslint-disable-next-line import/prefer-default-export, import/no-named-export
export { deriveSessionKey };
