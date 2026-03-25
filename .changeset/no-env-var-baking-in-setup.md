---
"@agney/pi-honcho-memory": patch
---

Fix `/honcho-setup` baking env-var-resolved values into config file

`buildConfigFile` was unconditionally writing `existing.workspaceId` and
`existing.aiPeerId` to `~/.honcho/config.json` even when those values were
resolved from `HONCHO_WORKSPACE_ID` / `HONCHO_AI_PEER` environment variables.
This caused the env-var value to be frozen in the file; if the env var later
changed or was unset, the stale file value would silently take precedence.

Since the setup wizard never collects `workspaceId` or `aiPeerId` from the
user, these fields are no longer written by the wizard. Any value already
present in the config file is preserved as before.
