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
| `bun run build` | Build de producción: `dist/main.lynx.bundle` y `dist/main.web.bundle` |
| `bun run preview` | Preview del build |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run test` | `vitest run` |
| `bun run budget` | Comprueba que los dos *bundles* no superan el presupuesto de 650 kB (ver `specs/005` y D16) |

## Host nativo

El host vive en [`host/android`](../host/android) y monta el bundle desde `dist/`. Requiere JDK 17 y
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

## El bucle de trabajo (tres niveles)

El detalle está en [12-entorno-desarrollo-lynx](./12-entorno-desarrollo-lynx.md). Resumen:

1. **Navegador** — iterar en segundos. `bun run dev` y abrir la URL **∟ Preview** del dev server
   (`/__web_preview?casename=main.web.bundle`). En `/` no hay HTML (da 404): la página es la del
   preview. Sirve para composición, color y navegación; **no** para táctil ni rendimiento.
2. **Móvil real** — validar de verdad. Móvil y PC en la misma Wi-Fi, escanear el QR de la terminal con
   **Lynx Explorer**. Si el host no se anuncia solo: `bun run dev -- --host`.
3. **Emulador Android** — automatizar y sacar evidencia. Único entorno donde corre `adb`/Maestro; se
   expone el puerto con `adb reverse tcp:3000 tcp:3000`. Reservado a la comprobación final.

## Depuración

**Lynx DevTool Desktop** (`github.com/lynx-family/lynx-devtool/releases`) ofrece los paneles Elements,
Console, Sources y Layers, más Trace. Se engancha activando **Lynx Debug** y **Lynx DevTool** en los
ajustes de Lynx Explorer y conectándolo por cable. No se instala desde el repo.

La vía CLI/CDP existe como paquete (`@lynx-js/skill-lynx-devtool`) y **no está instalada** en este
entorno; queda documentada y a cargo del usuario.

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
| `GET /` da **404** en el dev server | En `/` no hay página; la de desarrollo es la del preview | Abrir la URL **∟ Preview** (`/__web_preview?casename=main.web.bundle`) |
| La longitud no se aplica | Longitud sin unidad | En Lynx toda longitud distinta de 0 necesita unidad; usa los tokens (`'16px'`) o `px()` |
| `Intl is not defined` / fechas raras | Se usó `toLocaleString` | Formatea con `src/lib/format.ts` |
| El QR no conecta | Móvil y PC en redes distintas | Misma Wi-Fi, o `bun run dev -- --host` |
| Los datos desaparecen al cerrar | Persistencia no durable (known-issue 1) | Es el pendiente del [`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md) |
