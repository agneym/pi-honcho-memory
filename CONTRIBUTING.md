# Contributing

## Prerequisites

- [pnpm](https://pnpm.io/) (see `packageManager` in `package.json` for exact version)
- [Node.js](https://nodejs.org/)

## Setup

```bash
pnpm install
```

This also installs [lefthook](https://github.com/evilmartians/lefthook) git hooks automatically.

## Linting

Uses [oxlint](https://oxc.rs/docs/guide/usage/linter) for fast linting.

```bash
pnpm run lint          # check for issues
pnpm run lint:fix      # auto-fix issues
```

## Formatting

Uses [oxfmt](https://oxc.rs/docs/guide/usage/formatter) for formatting.

```bash
pnpm run fmt           # format all files in place
pnpm run fmt:check     # check formatting without writing
```

## Pre-commit Hooks

[Lefthook](https://github.com/evilmartians/lefthook) runs automatically on `git commit`:

1. **oxlint** — lints staged `.js/.ts/.jsx/.tsx/.mjs/.cjs` files
2. **oxfmt** — formats staged files and re-stages them

See `lefthook.yml` for configuration.
