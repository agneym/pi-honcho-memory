# pi-honcho-memory

Persistent memory extension for [pi](https://github.com/badlogic/pi-mono) using [Honcho](https://honcho.dev).

## Features

- **Automatic memory injection** — cached user profile and session context injected into every prompt with zero network latency
- **Conversational persistence** — user/assistant messages saved to Honcho after each agent response
- **Flexible session strategies** — choose repo, git-branch, or directory scoped memory
- **Git awareness** — current branch, HEAD, dirty tree state, and branch/commit changes are injected into context
- **AI self-context** — recent assistant worklog is persisted in the pi session and injected on future turns
- **LLM tools** — `honcho_search`, `honcho_chat`, `honcho_remember` for active memory operations
- **Commands** — `/honcho-status`, `/honcho-setup`, `/recall`, `/remember`
- **Graceful degradation** — pi works normally if Honcho is unavailable

## Install

```bash
pi install npm:pi-honcho-memory
```

Or try without installing:

```bash
pi -e npm:pi-honcho-memory
```

## Setup

1. Get an API key from [honcho.dev](https://honcho.dev)
2. Run `/honcho-setup` inside pi to configure interactively

Or set environment variables:

```bash
export HONCHO_API_KEY=hch-...
```

### Honcho agent skills

Honcho already ships its own installable agent skills. Install those separately from this pi extension with:

```bash
npx skills add plastic-labs/honcho
```

Docs: https://docs.honcho.dev/v3/documentation/introduction/vibecoding#agent-skills

### Configuration

Config is read from (highest priority first):

1. Environment variables: `HONCHO_API_KEY`, `HONCHO_URL`, `HONCHO_WORKSPACE_ID`, `HONCHO_PEER_NAME`, `HONCHO_AI_PEER`, `HONCHO_SESSION_STRATEGY`, `HONCHO_ENABLED`
2. Config file: `~/.honcho/config.json`
3. Defaults (workspace: `pi`, AI peer: `pi`, user peer: `$USER`, session strategy: `repo`)

`HONCHO_SESSION_STRATEGY` / `hosts.pi.sessionStrategy` supports:

- `repo` — share memory across git worktrees of the same repo
- `git-branch` — keep separate memory per branch
- `directory` — keep separate memory per working directory

## Tools

| Tool              | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `honcho_search`   | Search persistent memory for prior conversations and decisions |
| `honcho_chat`     | Ask Honcho to reason over memory for deeper questions          |
| `honcho_remember` | Save a durable fact, preference, or decision                   |

## Commands

| Command            | Description                       |
| ------------------ | --------------------------------- |
| `/honcho-status`   | Show connection status and config |
| `/honcho-setup`    | Interactive configuration wizard  |
| `/recall <topic>`  | Search memory for a topic         |
| `/remember <fact>` | Save a fact to memory             |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
