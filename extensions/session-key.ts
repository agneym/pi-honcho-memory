import { createHash } from "node:crypto";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 8);
}

/** Replace any character not in [a-zA-Z0-9_-] with an underscore. */
function sanitize(input: string): string {
  return input.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * Derive a stable Honcho session key from the current working directory.
 *
 * Strategy chain:
 *   1. git remote get-url origin → normalized repo:owner/repo
 *   2. git rev-parse --show-toplevel → local:<basename>:<hash>
 *   3. cwd → cwd:<basename>:<hash>
 */
export async function deriveSessionKey(pi: ExtensionAPI, cwd: string): Promise<string> {
  // Strategy 1: git remote
  try {
    const result = await pi.exec("git", ["remote", "get-url", "origin"], {
      timeout: 3000,
    });
    if (result.code === 0 && result.stdout.trim()) {
      const url = result.stdout.trim();
      const normalized = normalizeGitUrl(url);
      if (normalized) return sanitize(`repo_${normalized}`);
    }
  } catch {
    // fall through
  }

  // Strategy 2: git repo root
  try {
    const result = await pi.exec("git", ["rev-parse", "--show-toplevel"], { timeout: 3000 });
    if (result.code === 0 && result.stdout.trim()) {
      const root = result.stdout.trim();
      const basename = root.split("/").pop() || "repo";
      return sanitize(`local_${basename}_${shortHash(root)}`);
    }
  } catch {
    // fall through
  }

  // Strategy 3: cwd fallback
  const basename = cwd.split("/").pop() || "project";
  return sanitize(`cwd_${basename}_${shortHash(cwd)}`);
}

/**
 * Normalize a git remote URL to owner/repo form.
 *
 * Handles:
 *   git@github.com:owner/repo.git
 *   https://github.com/owner/repo.git
 *   ssh://git@github.com/owner/repo.git
 */
function normalizeGitUrl(url: string): string | null {
  // SSH style: git@host:owner/repo.git
  const sshMatch = url.match(/^[^@]+@[^:]+:(.+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[1];

  // HTTPS / SSH protocol style
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, "").replace(/\.git$/, "");
    if (path) return path;
  } catch {
    // not a valid URL
  }

  return null;
}
