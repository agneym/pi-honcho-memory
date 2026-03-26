# pi-honcho-memory

Persistent memory extension for [pi](https://pi.dev) using [Honcho](https://honcho.dev).

![NPM Version](https://img.shields.io/npm/v/%40agney%2Fpi-honcho-memory)

## Features

- **Automatic memory injection** — cached user profile and project summary injected into the system prompt with zero network latency
- **Conversational persistence** — user/assistant messages saved to Honcho after each agent response
- **Flexible session strategies** — choose repo, git-branch, or directory scoped memory
- **LLM tools** — `honcho_search`, `honcho_chat`, `honcho_remember` for active memory operations
- **Commands** — `/honcho-status`, `/honcho-setup`
- **Graceful degradation** — pi works normally if Honcho is unavailable

## Install

```bash
pi install npm:@agney/pi-honcho-memory
```

Or try without installing:

```bash
pi -e npm:@agney/pi-honcho-memory
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

1. Environment variables: `HONCHO_API_KEY`, `HONCHO_URL`, `HONCHO_WORKSPACE_ID`, `HONCHO_PEER_NAME`, `HONCHO_AI_PEER`, `HONCHO_SESSION_STRATEGY`, `HONCHO_ENABLED`, `HONCHO_CONTEXT_TOKENS`, `HONCHO_MAX_MESSAGE_LENGTH`, `HONCHO_SEARCH_LIMIT`, `HONCHO_TOOL_PREVIEW_LENGTH`
2. Config file: `~/.honcho/config.json`

`HONCHO_SESSION_STRATEGY` / `hosts.pi.sessionStrategy` supports:

- `repo` — share memory across git worktrees of the same repo
- `git-branch` — keep separate memory per branch
- `directory` — keep separate memory per working directory

Config file properties (`~/.honcho/config.json`):

| Prop                         | Environment variable         | Description                                                            | Default            |
| ---------------------------- | ---------------------------- | ---------------------------------------------------------------------- | ------------------ |
| `apiKey`                     | `HONCHO_API_KEY`             | Honcho API key                                                         | none               |
| `peerName`                   | `HONCHO_PEER_NAME`           | User peer name                                                         | `$USER`            |
| `hosts.pi.workspace`         | `HONCHO_WORKSPACE_ID`        | Honcho workspace ID                                                    | `pi`               |
| `hosts.pi.aiPeer`            | `HONCHO_AI_PEER`             | AI peer name                                                           | `pi`               |
| `hosts.pi.endpoint`          | `HONCHO_URL`                 | Honcho API base URL                                                    | default Honcho API |
| `hosts.pi.sessionStrategy`   | `HONCHO_SESSION_STRATEGY`    | Session scope for memory sharing                                       | `repo`             |
| `hosts.pi.contextTokens`     | `HONCHO_CONTEXT_TOKENS`      | Token budget requested from Honcho for injected project memory         | `1200`             |
| `hosts.pi.maxMessageLength`  | `HONCHO_MAX_MESSAGE_LENGTH`  | Maximum length of a synced user/assistant message before it is skipped | `8000`             |
| `hosts.pi.searchLimit`       | `HONCHO_SEARCH_LIMIT`        | Maximum number of search results returned by `honcho_search`           | `8`                |
| `hosts.pi.toolPreviewLength` | `HONCHO_TOOL_PREVIEW_LENGTH` | Character preview length per search result returned by `honcho_search` | `500`              |

All numeric options must be positive integers. Invalid values fall back to defaults.

## Tools

| Tool              | Description                                                    |
| ----------------- | -------------------------------------------------------------- |
| `honcho_search`   | Search persistent memory for prior conversations and decisions |
| `honcho_chat`     | Ask Honcho to reason over memory for deeper questions          |
| `honcho_remember` | Save a durable fact, preference, or decision                   |

## Commands

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `/honcho-status` | Show connection status and config |
| `/honcho-setup`  | Interactive configuration wizard  |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
