# Strain

App de seguimiento de entrenamientos de gimnasio, estilo Hevy, **Android-first y offline por
defecto**, construida sobre **Lynx** con **ReactLynx** y **Rspeedy**, con un **host Android propio**
que embebe el bundle.

## Estado del proyecto

- **El proyecto Lynx es la raíz del repositorio**: `src/`, `host/`, `scripts/`, `lynx.config.ts`.
  La app antigua que convivía aquí se retiró siguiendo el
  [`specs/004`](./specs/004-reestructura-del-repo-y-retirada-de-expo.md); su versión intacta queda en
  la etiqueta de respaldo, y lo que aún no está migrado se lista en
  [`docs/13-pendiente-de-migrar-desde-expo.md`](./docs/13-pendiente-de-migrar-desde-expo.md).
- **La persistencia todavía no es durable**: cerrar la app pierde lo registrado. El host y el módulo
  nativo SQLite ya existen; falta el adaptador que los conecta (ticket 3 del
  [`specs/001`](./specs/001-host-nativo-y-almacenamiento-durable.md)).
- **Faltan tres piezas de producto**: las pantallas de auth y la cuenta ([`specs/003`](./specs/003-auth-y-cuenta-con-insforge.md)),
  y Health Connect y las notificaciones ([`specs/002`](./specs/002-nativas-notificaciones-y-health-connect.md)).

## Características

- 💪 **Biblioteca de ejercicios** con categorización por grupo muscular y equipo (47 en el seed)
- 🏋️ **Rutinas**: crear, editar, añadir ejercicios y **reordenar arrastrando**
- ⏱️ **Modo workout activo** con cronómetro, descanso automático, calculadora de discos y RPE/notas
- 📈 **Progreso** con volumen semanal, PRs (1RM estimado), racha y heatmap
- 📅 **Historial** con detalle de cada sesión
- 🎨 **Sistema de diseño propio**: tokens por rol, contraste medido, tipografía y espaciado
- 📴 **Local-first**: funciona sin conexión

## Stack

| Capa | Tecnología |
|---|---|
| UI | **ReactLynx** (`@lynx-js/react`) sobre el motor **Lynx**; elementos `page/view/text/scroll-view/input`, no DOM |
| Build | **Rspeedy** (`@lynx-js/rspeedy`) con dos targets: `lynx` (nativo) y `web` (Lynx for Web) |
| Componentes | **`@lynx-js/lynx-ui`** (hoja, switch, input, sortable, overlay…). `lynx.config.ts` activa `enableNewGesture` |
| Estado | **Zustand** |
| Persistencia | *Seam* propia + **módulo nativo SQLite** en el host ([`specs/001`](./specs/001-host-nativo-y-almacenamiento-durable.md)) |
| Cuenta / sync | **InsForge** (opcional → [`specs/003`](./specs/003-auth-y-cuenta-con-insforge.md)) |
| Testing | **Vitest** (`bun run test`) |
| Paquetes | **bun 1.4.2** (`bun.lock`) |

Detalle en [`docs/02-stack.md`](./docs/02-stack.md) y [`docs/03-architecture.md`](./docs/03-architecture.md).

## Estructura del proyecto

```
strain-repo/
├── src/                  # el port Lynx: pantallas, componentes, stores, db y lib
│   ├── screens/          # 14 pantallas
│   ├── components/       # UI compartida y shell
│   ├── db/               # repos, schema y la seam de almacenamiento
│   ├── stores/           # Zustand
│   └── lib/              # lógica pura de dominio, formato y tema
├── host/android/         # host nativo: LynxView + módulo SQLite (se versiona)
├── scripts/              # check-bundle-size.mjs (presupuesto de bundle)
├── lynx.config.ts        # Rspeedy: plugins, targets y alias
├── specs/                # specs (SDD), numerados y con tickets
├── docs/                 # documentación del proyecto
└── .agents/skills/       # skills de SDD y de Lynx
```

## Primeros pasos

```bash
git clone https://github.com/PabloJustDevelops/strain-repo.git
cd strain-repo
bun install

bun run dev         # dev server (puerto 3000): target web + QR para Lynx Explorer
bun run typecheck   # tsc --noEmit
bun run test        # vitest run
bun run build       # dist/main.lynx.bundle + dist/main.web.bundle
```

El bucle de trabajo tiene tres niveles —navegador para iterar, móvil real para validar, emulador para
automatizar— y está explicado en
[`docs/12-entorno-desarrollo-lynx.md`](./docs/12-entorno-desarrollo-lynx.md). El setup completo, en
[`docs/08-setup.md`](./docs/08-setup.md).

## Host nativo Android

El host vive en [`host/android`](./host/android) y monta el bundle **sin Lynx Explorer ni servidor de
desarrollo**: una tarea de Gradle lo copia desde `dist/` a los assets del APK. Se construye con
`./gradlew assembleDebug` (JDK 17+, Android SDK 36). Detalles en
[`host/android/README.md`](./host/android/README.md).

## Integración continua

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) corre, en cada propuesta y en `main`, tipos,
pruebas y build de los dos targets, el **presupuesto de bundle** (650 kB, ver D16), el escaneo de
secretos y la comprobación de título y triaje. El porque y los umbrales están en
[`specs/005`](./specs/005-ci-cd.md).

## Documentación y specs

- **Documentación**: [`docs/README.md`](./docs/README.md) (índice).
- **Decisiones**: [`docs/07-decisions.md`](./docs/07-decisions.md) (`D1`…`Dn`).
- **Pendiente de migrar**: [`docs/13-pendiente-de-migrar-desde-expo.md`](./docs/13-pendiente-de-migrar-desde-expo.md).
- **Specs (SDD)**: [`specs/`](./specs) — host y almacenamiento durable, nativas, auth/cuenta, retirada
  de la app antigua y CI/CD.
- **Glosario de dominio**: [`CONTEXT.md`](./CONTEXT.md).
- **Guía para agentes**: [`AGENTS.md`](./AGENTS.md).

## Licencia

MIT
