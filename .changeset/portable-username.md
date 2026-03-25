---
"@agney/pi-honcho-memory": patch
---

Fix `userPeerId` default to use portable `os.userInfo().username`

`process.env.USER` is `undefined` on Windows, causing the peer ID to
silently fall back to the string `"user"` instead of the actual system
username. Replaced with `os.userInfo().username`, which works correctly
on POSIX and Windows alike.

Also fixed the `lefthook.yml` pre-commit hook to run `oxlint` on the
full project rather than individual staged files, restoring proper
`tsconfig.json` resolution and eliminating spurious TS2591 errors.
