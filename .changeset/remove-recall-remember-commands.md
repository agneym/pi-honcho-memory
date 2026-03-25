---
"@agney/pi-honcho-memory": minor
---

Remove the `/recall` and `/remember` commands and keep the equivalent `honcho_search` and `honcho_remember` tools.

The extension still provides `/honcho-status` and `/honcho-setup` for visibility and configuration.

Also remove the unused `HONCHO_COMMAND_PREVIEW_LENGTH` / `hosts.pi.commandPreviewLength` config option that only applied to `/recall`.
