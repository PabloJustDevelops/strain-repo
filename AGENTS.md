# AGENTS.md

Guía para agentes que trabajan en este repositorio.

## Qué es este repo (estado actual)

**Strain** — app de seguimiento de entrenamiento de fuerza, Android-first y offline por defecto.

El proyecto está **en transición y esto importa**:

- El **proyecto Lynx** (ReactLynx + Rspeedy) es el destino y donde vive el trabajo nuevo. Hoy está en
  `lynx/`; el `specs/004` gobierna su promoción a la raíz.
- La **app Expo** de la raíz (`app/`, `src/`, `android/`, `app.json`, `eas.json` y sus dependencias)
  es legado: **no se le añaden features**. Se retira según el `specs/004`, y **nada se borra hasta que
  exista el host del `specs/001`**. La red de seguridad es la etiqueta `expo-final`.

Si dudas de en qué base trabajar, es el proyecto Lynx.

## Stack

| Capa | Tecnología |
|---|---|
| UI | **ReactLynx** (`@lynx-js/react`) sobre el motor **Lynx**; elementos `page/view/text/scroll-view/input`, no DOM |
| Build | **Rspeedy** (`@lynx-js/rspeedy`) con dos targets: `lynx` (nativo) y `web` (Lynx for Web) |
| Componentes | **`@lynx-js/lynx-ui`** (hoja, switch, input, sortable, overlay…). `lynx.config.ts` activa `enableNewGesture` |
| Estado | **Zustand** |
| Persistencia | *Seam* de almacenamiento propio. **Hoy no es durable** (memoria + session storage): el `specs/001` la sustituye por un módulo nativo SQLite |
| Testing | **Vitest** (`bun run test`), arnés de JSX propio en `src/test/jsxCapture.ts` |
| Paquetes | **bun 1.4.2** (`bun.lock` en raíz y en `lynx/`) |

Lo que **Lynx no trae** y por eso está portado a mano o pendiente: `Intl` (formateo propio), SQLite,
Health Connect, notificaciones, captura/compartir, y el componente `tab-group` (no existe en la
versión actual de `lynx-ui`).

## Skills

Las skills viven en `.agents/skills/` y **solo se versionan las que están en la allowlist explícita
de `.gitignore`**. Si añades una, hay que añadir su línea `!.agents/skills/<nombre>/` o no se
commitea.

### SDD e ingeniería (mattpocock/skills y otros)

El flujo del repo es **spec-driven**: `to-spec` → `to-tickets` → `implement`, con apoyo de
`grilling`, `domain-modeling`, `codebase-design`, `tdd`, `code-review`, `diagnosing-bugs`,
`wayfinder`, `triage`, `writing-for-agents`, `resolving-merge-conflicts` y
`setup-matt-pocock-skills`.

Los specs viven en **`specs/`**, numerados, con problema, alcance, decisiones, superficie, criterios
de aceptación medibles, riesgos, preguntas abiertas y **tickets con sus bloqueos**.

### Lynx (lynx-community/skills)

Ocho skills oficiales, copiadas tal cual (con sus ficheros de apoyo) desde
`github.com/lynx-community/skills`, rama `release`, commit `715f7406`:

`reactlynx-best-practices`, `lynx-ui`, `lynx-devtool`, `lynx-api-docs`, `lynx-check-css-support`,
`lynx-typescript`, `rspeedy-bundle-size`, `lynx-debug-info-remapping`.

Sus fuentes están registradas en `skills-lock.json`. **Úsalas antes de tocar Lynx**: para saber qué
CSS existe (`lynx-check-css-support`), qué componentes hay (`lynx-ui`), cómo depurar
(`lynx-devtool`) o por qué el *bundle* engorda (`rspeedy-bundle-size`).

## Convenciones

- **Para remontar un componente con `key`**, usá `remountKey(namespace, id)`
  (`lynx/src/lib/reactKeys.ts`): la clave de reserva lleva el namespace, así dos hermanos cerrados no
  pueden colisionar (React avisa "two children with the same key"). No uses literales como `'none'`
  como clave.
- **Toda longitud lleva unidad.** El motor Lynx rechaza toda longitud distinta de 0 sin unidad,
  también inline. Los tokens de longitud se exportan ya como `'16px'` y todo número pasa por `px()`.
- **Nada de `Intl`.** `lynx/src/lib/format.ts` formatea a mano; no uses `toLocaleString`.
- **Un solo dueño para el descanso**: lo arranca el store, no la pantalla.
- **Vocabulario**: usá los términos de `CONTEXT.md`. Si un concepto no está, puede que estés
  inventando lenguaje o que haya un hueco real.
- **Decisiones**: antes de proponer un cambio, leé `docs/07-decisions.md` (`D1`…`Dn`). Si tu propuesta
  contradice una decisión, decilo explícitamente (por ejemplo, la retirada de Expo es `D13`).

## Comandos

Raíz (app Expo, mientras exista):

```bash
bun install
bun run lint && bun run typecheck && bun run test
```

Proyecto Lynx:

```bash
cd lynx
bun install
bun run typecheck   # tsc --noEmit
bun run test        # vitest run
bun run build       # dist/main.lynx.bundle + dist/main.web.bundle
bun run dev         # dev server (puerto 3000): target web + QR para Lynx Explorer
```

El bucle de trabajo tiene tres niveles: **navegador** (iterar, vía la URL *Preview* del dev server),
**móvil real** con Lynx Explorer por QR (validar táctil y rendimiento) y **emulador** (automatizar y
sacar evidencia). Detalle en `docs/12-entorno-desarrollo-lynx.md`.

## Agent skills (documentación del proyecto)

### Issue tracker

Issues y specs para este repo son issues de GitHub en `PabloJustDevelops/strain-repo`, gestionados con
el CLI `gh`. Ver `docs/agents/issue-tracker.md`.

### Triage labels

Cinco roles canónicos de triaje, una etiqueta cada uno (`needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`). Ver `docs/agents/triage-labels.md`.

### Domain docs

Layout single-context. El glosario es `CONTEXT.md` en la raíz; las decisiones se registran en
`docs/07-decisions.md` (ADR-light, `D1`…`Dn`) — no hay `docs/adr/`. Ver `docs/agents/domain.md`.
