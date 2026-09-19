# 02 · Stack tecnológico

> El proyecto es **Lynx + ReactLynx + Rspeedy** y vive en la **raíz del repositorio**.

## Core

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Motor | **Lynx** | Motor nativo multiplataforma (móvil y web) pensado para render rápido y arranque ligero |
| UI | **ReactLynx** (`@lynx-js/react`) | Se escribe React, pero los elementos son `page` / `view` / `text` / `scroll-view` / `input`, no DOM |
| Build | **Rspeedy** (`@lynx-js/rspeedy`) | Bundler oficial de Lynx; dos targets en un mismo proyecto: `lynx` (nativo) y `web` (Lynx for Web) |
| Lenguaje | **TypeScript** (strict) | Type safety en todo el dominio; `tsc --noEmit` como puerta |
| Estado | **Zustand** | Stores pequeños, sin boilerplate |

## Datos

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Almacenamiento | ***Seam* propia** (`Storage`) + módulo nativo SQLite | Lynx no trae base de datos; la seam aísla la decisión. El módulo nativo vive en el host (`host/android/`) y el [`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md) conecta la app a él |
| Repositorios | Factories sobre la seam (`exercises`, `routines`, `sessions`, `analytics`) | La UI nunca habla con el almacenamiento: habla con repos. Esa frontera permite cambiar la implementación sin tocar pantallas |
| Sincronización | **InsForge** (opcional, por demanda) | Cuenta y backup multi-dispositivo; la nube nunca es la fuente de verdad ([`specs/003`](../specs/003-auth-y-cuenta-con-insforge.md)) |

## UI

| Capa | Tecnología | Por qué |
|------|------------|---------|
| Estilos | **Tokens por rol** + CSS de Lynx | Sin Tailwind: el sistema de tokens cubre color, tipografía, espaciado, radios y movimiento |
| Componentes | **`@lynx-js/lynx-ui`** | Hoja, switch, input, sortable, overlay…; `lynx.config.ts` activa `enableNewGesture` |
| Iconos | **Set propio** (`Icon`) | SVG inline sobre caja de 24; los glifos de texto dependían de la fuente de cada plataforma |
| Gráficas | **Dibujadas a mano** (`view` + CSS) | Lynx no trae equivalente a las librerías de charts de React Native |

## Integraciones

| Feature | Tecnología | Estado |
|---------|------------|--------|
| Health Connect | API nativa en el host propio | Pendiente ([`specs/002`](../specs/002-nativas-notificaciones-y-health-connect.md)) |
| Notificaciones del descanso | Notificaciones locales + alarma exacta en el host | Pendiente ([`specs/002`](../specs/002-nativas-notificaciones-y-health-connect.md)) |
| Cuenta y sync | InsForge | Pendiente ([`specs/003`](../specs/003-auth-y-cuenta-con-insforge.md)) |
| Compartir workout | Captura en el host | Pendiente (nativo) |

## Tooling

| Herramienta | Uso |
|-------------|-----|
| **bun 1.4.2** | Gestor de paquetes y runtime de scripts (`bun.lock` en la raíz) |
| **Vitest** | Tests (`bun run test`), con arnés de JSX propio en `src/test/jsxCapture.ts` |
| **TypeScript `--noEmit`** | Typecheck en CI |
| **Lynx DevTool** | Paneles de consola, DOM/CSS, capturas y trazas (ver [12](./12-entorno-desarrollo-lynx.md)) |

## Lo que Lynx no trae (y por eso está portado a mano o pendiente)

| Pieza | Alternativa |
|-------|-------------|
| `Intl` (`toLocaleString`, `DateTimeFormat`) | `src/lib/format.ts` formatea a mano |
| SQLite | Módulo nativo propio ([`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md)) |
| Health Connect, notificaciones, hápticas, captura/compartir | Módulos nativos propios |
| `tab-group` | No existe en la versión actual de `lynx-ui`: la tab bar es propia |
| Librerías de gráficas | Heatmap y barras se dibujan con `view`/CSS |

## No usamos (deliberadamente)

- **Redux/MobX** → Zustand cubre todo con menos código.
- **Tailwind/NativeWind** → los tokens por rol y el CSS de Lynx son suficientes y más rápidos.
- **`Intl`** → no está implementado en Lynx; se formatea a mano en un único sitio.
- **Librerías de charts** → sin equivalente directo; se dibujan a mano.
