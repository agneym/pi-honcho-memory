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

## Releases

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog generation.

### Add a changeset

For any PR that should ship in a release, add a changeset:

```bash
pnpm changeset
```

This creates a file in `.changeset/` describing the version bump and release note.

### Version packages locally

To apply pending changesets locally:

```bash
pnpm version-packages
```

This updates `package.json` and `CHANGELOG.md`.

### Publish

To publish manually:

```bash
pnpm release
```

### GitHub automation

`.github/workflows/release.yml` uses `changesets/action` on pushes to `main`.
If there are pending changesets, it opens or updates a release PR. Once merged, the next run publishes to npm.

Required repository secret:

- `NPM_TOKEN`
