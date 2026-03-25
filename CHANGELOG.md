# @agney/pi-honcho-memory

## 0.0.2

### Patch Changes

- 5c2dcb9: Fix `/honcho-setup` baking env-var-resolved values into config file

  `buildConfigFile` was unconditionally writing `existing.workspaceId` and
  `existing.aiPeerId` to `~/.honcho/config.json` even when those values were
  resolved from `HONCHO_WORKSPACE_ID` / `HONCHO_AI_PEER` environment variables.
  This caused the env-var value to be frozen in the file; if the env var later
  changed or was unset, the stale file value would silently take precedence.

  Since the setup wizard never collects `workspaceId` or `aiPeerId` from the
  user, these fields are no longer written by the wizard. Any value already
  present in the config file is preserved as before.

- 69be7e3: Fix `userPeerId` default to use portable `os.userInfo().username`

  `process.env.USER` is `undefined` on Windows, causing the peer ID to
  silently fall back to the string `"user"` instead of the actual system
  username. Replaced with `os.userInfo().username`, which works correctly
  on POSIX and Windows alike.

  Also fixed the `lefthook.yml` pre-commit hook to run `oxlint` on the
  full project rather than individual staged files, restoring proper
  `tsconfig.json` resolution and eliminating spurious TS2591 errors.
