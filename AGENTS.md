# AGENTS.md

Guía para agentes que trabajan en este repositorio.

## Qué es este repo (estado actual)

**Strain** — app de seguimiento de entrenamiento de fuerza, Android-first y offline por defecto.

El proyecto **Lynx** (ReactLynx + Rspeedy) **es la raíz del repositorio**: `src/`, `host/`, `scripts/`,
`lynx.config.ts`. La app que convivía aquí hasta el `specs/004` se retiró; su último estado está en la
etiqueta **`expo-final`**, y lo que aún no está migrado se lista en
`docs/13-pendiente-de-migrar-desde-expo.md`.

## Stack

| Capa | Tecnología |
|---|---|
| UI | **ReactLynx** (`@lynx-js/react`) sobre el motor **Lynx**; elementos `page/view/text/scroll-view/input`, no DOM |
| Build | **Rspeedy** (`@lynx-js/rspeedy`) con dos targets: `lynx` (nativo) y `web` (Lynx for Web) |
| Componentes | **`@lynx-js/lynx-ui`** (hoja, switch, input, sortable, overlay…). `lynx.config.ts` activa `enableNewGesture` |
| Estado | **Zustand** |
| Host | **`host/android/`**: app Android propia (`LynxView` + módulo nativo SQLite). El bundle lo copia una tarea de Gradle desde `dist/` |
| Persistencia | *Seam* de almacenamiento propio. **Hoy no es durable** (memoria + session storage): el `specs/001` la conecta al módulo nativo SQLite del host |
| Testing | **Vitest** (`bun run test`), arnés de JSX propio en `src/test/jsxCapture.ts` |
| Paquetes | **bun 1.4.2** (`bun.lock`) |

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
  (`src/lib/reactKeys.ts`): la clave de reserva lleva el namespace, así dos hermanos cerrados no
  pueden colisionar (React avisa "two children with the same key"). No uses literales como `'none'`
  como clave.
- **Toda longitud lleva unidad.** El motor Lynx rechaza toda longitud distinta de 0 sin unidad,
  también inline. Los tokens de longitud se exportan ya como `'16px'` y todo número pasa por `px()`.
- **Nada de `Intl`.** `src/lib/format.ts` formatea a mano; no uses `toLocaleString`.
- **Un solo dueño para el descanso**: lo arranca el store, no la pantalla.
- **El host no vive en `android/`.** El host nativo está en `host/android/` (versionado, D15); no
  crees una carpeta `android/` en la raíz.
- **Vocabulario**: usá los términos de `CONTEXT.md`. Si un concepto no está, puede que estés
  inventando lenguaje o que haya un hueco real.
- **Decisiones**: antes de proponer un cambio, leé `docs/07-decisions.md` (`D1`…`Dn`). Si tu propuesta
  contradice una decisión, decilo explícitamente (por ejemplo, la retirada de la app anterior es
  `D13`, y la promoción a la raíz con la etiqueta como red es `D17`).

## Comandos

Proyecto (raíz del repositorio):

```bash
bun install
bun run typecheck   # tsc --noEmit
bun run test        # vitest run
bun run build       # dist/main.lynx.bundle + dist/main.web.bundle
bun run dev         # dev server (puerto 3000): target web + QR para Lynx Explorer
```

Host nativo (`specs/001`):

```bash
bun run build
cd host/android
./gradlew assembleDebug   # Windows: .\gradlew.bat assembleDebug
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
