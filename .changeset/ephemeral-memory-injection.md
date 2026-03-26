---
"@agney/pi-honcho-memory": patch
---

Inject both user profile and project summary into the system prompt for maximum prompt cache stability. Memory is fetched once at session start and never re-fetched mid-session — conversation history provides all context within a session. Removes the `context` hook and ephemeral message injection in favor of a simpler, fully cacheable approach.
