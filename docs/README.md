# Documentación de Strain

Bienvenido a la documentación del proyecto **Strain**. Aquí se recoge todo lo relativo al producto,
la arquitectura, las decisiones técnicas y el estado actual del desarrollo.

> La base del proyecto es **Lynx + ReactLynx + Rspeedy**. La **app Expo** de la raíz es **legado** y se
> retira por el [`specs/004`](../specs/004-reestructura-del-repo-y-retirada-de-expo.md); la red de
> seguridad es la etiqueta `expo-final`.

## Índice

| # | Documento | Contenido |
|---|-----------|-----------|
| 01 | [Visión general](./01-overview.md) | Qué es Strain, filosofía, público objetivo, principios |
| 02 | [Stack tecnológico](./02-stack.md) | Lynx, ReactLynx, Rspeedy, lynx-ui, Zustand y por qué |
| 03 | [Arquitectura](./03-architecture.md) | Capas, estructura de `lynx/`, rutas, *seam* de datos, sistema de diseño |
| 04 | [Roadmap](./04-roadmap.md) | Entregado, próximo bloque (specs) y descartado |
| 05 | [Changelog](./05-changelog.md) | Cronología. **Las entradas previas son la era Expo (histórico)** |
| 06 | [Problemas conocidos](./06-known-issues.md) | Problemas reales del port Lynx y sus workarounds |
| 07 | [Decisiones técnicas](./07-decisions.md) | `D1`…`D14`, incluida la retirada de Expo (D13) y el host durable (D14) |
| 08 | [Setup local](./08-setup.md) | Cómo arrancar el proyecto Lynx (bucle de desarrollo) |
| 09 | [Web de escritorio](./09-remodelacion-web-dashboard.md) | Dirección de producto del target `web` de Lynx |
| 10 | [C6: targets de rutina](./10-c6-targets-de-rutina.md) | **Histórico (era Expo)**: cierre de C6 |
| 11 | [Plan para una app tipo Hevy](./11-plan-app-tipo-hevy.md) | Cómo está montada Hevy, los tres pilares, arquitectura objetivo y fases F0–F7 |
| 12 | [Entornos de desarrollo y preview de Lynx](./12-entorno-desarrollo-lynx.md) | Navegador (Lynx for Web), móvil por QR, escritorio, emulador y DevTool |

### Specs (SDD)

| # | Spec | Qué resuelve |
|---|------|--------------|
| 001 | [Host nativo y almacenamiento durable](../specs/001-host-nativo-y-almacenamiento-durable.md) | App Android propia con `LynxView` y persistencia que sobrevive al cierre |
| 002 | [Nativas: notificaciones y Health Connect](../specs/002-nativas-notificaciones-y-health-connect.md) | Aviso del descanso y lectura/escritura en Health Connect |
| 003 | [Auth y cuenta con InsForge](../specs/003-auth-y-cuenta-con-insforge.md) | Login, registro, recuperación y cuenta/sync |
| 004 | [Reestructura del repo y retirada de Expo](../specs/004-reestructura-del-repo-y-retirada-de-expo.md) | Promoción de Lynx a la raíz y borrado de Expo, con su criterio |
| 005 | [CI/CD](../specs/005-ci-cd.md) | Qué corre en cada PR y en `main`, con porqué y coste |

### Otros

- [Remodelación web](./remodelacion-web/README.md) — requisitos y plan de la web de escritorio.
- [Remodelación mobile](./remodelacion-mobile/README.md) — pendiente de definición.
- [Guías para agentes](./agents/domain.md) — *issue tracker*, etiquetas de triaje y uso del dominio.

## Estado del proyecto (resumen rápido)

- **Plataforma objetivo**: Android (única). La web es el target `web` de Lynx, para desarrollo y para
  lectura/gestión en escritorio.
- **Base**: Lynx + ReactLynx + Rspeedy, en `lynx/` hasta que el [`specs/004`](../specs/004-reestructura-del-repo-y-retirada-de-expo.md)
  lo promueva a la raíz.
- **Package manager**: bun 1.4.2 (`bun.lock` en raíz y en `lynx/`).
- **Persistencia**: **no durable todavía** — es el primer problema que resuelve el
  [`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md).
- **App Expo**: legado. No recibe features. Etiqueta de referencia: `expo-final`.
- **Modo**: single-user offline-first, con sincronización opcional a InsForge (cuenta).
