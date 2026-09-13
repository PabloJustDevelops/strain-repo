# AGENTS.md

## Agent skills

### Issue tracker

Issues and specs for this repo live as GitHub issues in `PabloJustDevelops/strain-repo`,
managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical triage roles, one label each (`needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout. The domain glossary is `CONTEXT.md` at the repo root; decisions are recorded
in `docs/07-decisions.md` (ADR-light, `D1`…`Dn`) — there is no `docs/adr/`. See `docs/agents/domain.md`.

## Convenciones

- Para remontar un componente con `key`, usá `remountKey(namespace, id)` (`src/lib/reactKeys.ts`): la
  clave de reserva lleva el namespace, así dos hermanos cerrados no pueden colisionar (React avisa
  "two children with the same key"). No uses literales como `'none'` como clave.
