# 08 · Setup local

## Requisitos

- **Node 20.19+** (o 22.12+) — lo pide el tooling de Lynx.
- **bun 1.4.2** ([bun.sh](https://bun.sh) — `npm install -g bun` o el instalador oficial).
- Para validar en **móvil real**: **Lynx Explorer** en el teléfono (ver
  [12](./12-entorno-desarrollo-lynx.md)).
- Para construir el **host Android**: Android Studio y **JDK 17** (ver
  [`host/android/README.md`](../host/android/README.md)).

## Instalación

```bash
git clone https://github.com/PabloJustDevelops/strain-repo.git
cd strain-repo
bun install
```

## Scripts

| Comando | Qué hace |
|---------|----------|
| `bun run dev` | Dev server (puerto **3000**): compila los targets `web` y `lynx`, sirve la página de preview e imprime el QR para Lynx Explorer |
| `bun run preview:web` | Abre la página de preview en el navegador (necesita `bun run dev` en marcha); `--port` si cambiaste el puerto |
| `bun run build` | Build de producción: `dist/main.lynx.bundle` y `dist/main.web.bundle` |
| `bun run preview` | Preview del build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | `vitest run` |
| `bun run budget` | Comprueba que los dos *bundles* no superan el presupuesto de 650 kB (ver `specs/005` y D16) |

## Host nativo

El host vive en [`host/android`](../host/android) y monta el bundle desde `dist/`. Es el **artefacto de
distribución**, no el bucle de trabajo (ver [12](./12-entorno-desarrollo-lynx.md)). Requiere JDK 17 y
el Android SDK 36:

```bash
bun run build
cd host/android
./gradlew assembleDebug            # Windows: .\gradlew.bat assembleDebug
```

## Integración continua

Cada propuesta de cambio y cada envío a `main` corren cuatro trabajos (`.github/workflows/ci.yml`):
el proyecto (tipos, pruebas y build de los dos targets), el presupuesto de bundle sobre los dos
artefactos, el escaneo de secretos con gitleaks y, solo en propuestas, la comprobación del título y
del triaje. Detalle y umbrales en [`specs/005`](../specs/005-ci-cd.md); la decisión del presupuesto,
en D16 (`docs/07-decisions.md`).

## El bucle de trabajo

El detalle está en [12-entorno-desarrollo-lynx](./12-entorno-desarrollo-lynx.md). Resumen:

1. **Iterar** — en el navegador. `bun run dev` y abrir la página de preview con `bun run preview:web`
   (o directamente `http://localhost:3000/__web_preview?casename=main.web.bundle`). En `/` no hay HTML
   (da 404): la página la sirve la ruta del preview. Sirve para composición, color y navegación;
   **no** para táctil ni rendimiento.
2. **Inspeccionar** — las DevTools del navegador para el target web; **Lynx DevTool** para lo nativo
   (skill `.agents/skills/lynx-devtool`, CLI `agent-lynx`).
3. **Validar en real** — móvil y PC en la misma Wi-Fi, escanear el QR de `bun run dev` con **Lynx
   Explorer**. Si el host no se anuncia solo: `bun run dev -- --host`.

`adb` y el emulador quedan **fuera** del bucle. La única prueba que necesita un dispositivo es la de
**durabilidad entre procesos**, y se corre **a demanda** (comandos en
[`host/android/README.md`](../host/android/README.md), sección *Durabilidad*).

## Depuración

**Lynx DevTool** sirve a la app **nativa** (móvil, escritorio o host):

- La **aplicación de escritorio** (`github.com/lynx-family/lynx-devtool/releases`) ofrece los paneles
  Elements, Console, Sources y Layers, más Trace. Se engancha activando **Lynx Debug** y **Lynx DevTool**
  en los ajustes de Lynx Explorer y conectándolo por cable.
- La **vía CLI/CDP** es el CLI `agent-lynx`, documentado en la skill del repo
  [`.agents/skills/lynx-devtool`](../.agents/skills/lynx-devtool/SKILL.md) (`list-clients`, `cdp`,
  `evaluate`, `get-console`, `screenshot`, `trace`, `reactlynx tree`…). No se instala desde el repo.

Para el **target web** no hace falta: la página de preview se inspecciona con las DevTools del
navegador.

## Cuenta y backend (InsForge)

La sincronización es **opcional** y llega con el
[`specs/003`](../specs/003-auth-y-cuenta-con-insforge.md). Sin configurar, la app funciona en modo
local. Las variables de entorno concretas se fijan en ese spec.

## Estructura de datos y migraciones

Con la *seam* no durable no hay migraciones de SQL que ejecutar. El esquema y sus migraciones viven en
el módulo nativo del [`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md).

## Tests

`bun run test` (Vitest). El arnés de JSX propio (`src/test/jsxCapture.ts`) captura el árbol en lugar de
montarlo, porque el runtime de ReactLynx no carga en Node: los tests afirman sobre los nodos y las
props que cada componente escribió.

## Troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---------|----------------|-----|
| `GET /` da **404** en el dev server | En `/` no hay página; la de preview es la ruta `/__web_preview` | Abrir con `bun run preview:web` (o la URL `/__web_preview?casename=main.web.bundle`) |
| La longitud no se aplica | Longitud sin unidad | En Lynx toda longitud distinta de 0 necesita unidad; usa los tokens (`'16px'`) o `px()` |
| `Intl is not defined` / fechas raras | Se usó `toLocaleString` | Formatea con `src/lib/format.ts` |
| El QR no conecta | Móvil y PC en redes distintas | Misma Wi-Fi, o `bun run dev -- --host` |
| Los datos desaparecen al cerrar | Persistencia no durable (known-issue 1) | Es el pendiente del [`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md) |
