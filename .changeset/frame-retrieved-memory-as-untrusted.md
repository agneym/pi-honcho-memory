---
"@agney/pi-honcho-memory": patch
---

Fix a prompt-injection surface in memory handling:

- `before_agent_start` now wraps cached Honcho memory in an explicit untrusted-context notice and `<retrieved_memory>` delimiters before splicing it into the system prompt, instead of concatenating it as trusted text. This matters because pi's harness expands `/skill:name` invocations (and other constructs) into `role:"user"` message text with no marker distinguishing them from things the human actually typed, so retrieved memory can end up containing instructional/imperative content that previously looked indistinguishable from a live user request.
- `extractConversationalPairs` now recognizes pi's `<skill name="..." location="...">...</skill>` expansion wrapper and no longer persists that boilerplate to Honcho as user speech, keeping only genuine trailing text (if any) the user typed after invoking the skill. This closes the primary path by which skill/template bodies were getting echoed back into a user's Honcho peer representation and later re-injected into future sessions' system prompts.
