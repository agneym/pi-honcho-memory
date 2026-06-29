# Honcho tool output rendering

## Goal

Normalize all Honcho memory tool outputs through Pi's tool `renderResult` API so interactive TUI output uses a compact collapsed view with `Ctrl+O` expansion, without changing schemas, execution, or model-visible tool content.

## Scope

- `honcho_search`
- `honcho_chat`
- `honcho_remember`

## Acceptance

- [x] Shared text-output renderer exists and can collapse/expand long text.
- [x] All Honcho tools register the shared renderer, including short outputs.
- [x] Execute return values remain unchanged.
- [x] Focused tests cover renderer behavior and tool wiring.
- [x] Relevant checks run, or blocked environment is documented.

## Notes

- User clarified `honcho_search` also has a serious issue; apply normalized folding to every output even if small output normally will not visibly fold.
