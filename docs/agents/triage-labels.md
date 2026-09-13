# Triage labels

The engineering skills speak in terms of five canonical triage roles. This file maps those roles to the
label strings used in this repo's GitHub tracker (`PabloJustDevelops/strain-repo`).

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label
string from this table.

The five labels exist in the tracker; `gh label list` is the source of truth. `wontfix` is the only one
that predates this setup — the other four were created by `/setup-matt-pocock-skills`.
