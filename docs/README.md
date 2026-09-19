# Documentación de Strain

Bienvenido a la documentación del proyecto **Strain**. Aquí se recoge todo lo relativo al producto,
la arquitectura, las decisiones técnicas y el estado actual del desarrollo.

> La base del proyecto es **Lynx + ReactLynx + Rspeedy**, que vive en la **raíz del repositorio**.

## Índice

| # | Documento | Contenido |
|---|-----------|-----------|
| 01 | [Visión general](./01-overview.md) | Qué es Strain, filosofía, público objetivo, principios |
| 02 | [Stack tecnológico](./02-stack.md) | Lynx, ReactLynx, Rspeedy, lynx-ui, Zustand y por qué |
| 03 | [Arquitectura](./03-architecture.md) | Capas, estructura del proyecto, rutas, *seam* de datos, sistema de diseño |
| 04 | [Roadmap](./04-roadmap.md) | Entregado, próximo bloque (specs) y descartado |
| 05 | [Changelog](./05-changelog.md) | Cronología. **Las entradas previas son históricas** |
| 06 | [Problemas conocidos](./06-known-issues.md) | Problemas reales del port Lynx y sus workarounds |
| 07 | [Decisiones técnicas](./07-decisions.md) | `D1`…`D17`, incluida la retirada de la app anterior (D13) y el host durable (D14) |
| 08 | [Setup local](./08-setup.md) | Cómo arrancar el proyecto (bucle de desarrollo) |
| 09 | [Web de escritorio](./09-remodelacion-web-dashboard.md) | Dirección de producto del target `web` de Lynx |
| 10 | [C6: targets de rutina](./10-c6-targets-de-rutina.md) | **Histórico**: cierre de C6 |
| 11 | [Plan para una app tipo Hevy](./11-plan-app-tipo-hevy.md) | Cómo está montada Hevy, los tres pilares, arquitectura objetivo y fases F0–F7 |
| 12 | [Entornos de desarrollo y preview de Lynx](./12-entorno-desarrollo-lynx.md) | Navegador (Lynx for Web), móvil por QR, escritorio, emulador y DevTool |
| 13 | [Pendiente de migrar](./13-pendiente-de-migrar-desde-expo.md) | Lo que aún no está migrado, con su ruta en la etiqueta de respaldo y su spec |

### Specs (SDD)

| # | Spec | Qué resuelve |
|---|------|--------------|
| 001 | [Host nativo y almacenamiento durable](../specs/001-host-nativo-y-almacenamiento-durable.md) | App Android propia con `LynxView` y persistencia que sobrevive al cierre |
| 002 | [Nativas: notificaciones y Health Connect](../specs/002-nativas-notificaciones-y-health-connect.md) | Aviso del descanso y lectura/escritura en Health Connect |
| 003 | [Auth y cuenta con InsForge](../specs/003-auth-y-cuenta-con-insforge.md) | Login, registro, recuperación y cuenta/sync |
| 004 | [Reestructura del repo y retirada de la app anterior](../specs/004-reestructura-del-repo-y-retirada-de-expo.md) | Promoción de Lynx a la raíz y borrado de la app anterior, con su criterio |
| 005 | [CI/CD](../specs/005-ci-cd.md) | Qué corre en cada PR y en `main`, con porqué y coste |

### Otros

- [Remodelación web](./remodelacion-web/README.md) — requisitos y plan de la web de escritorio.
- [Remodelación mobile](./remodelacion-mobile/README.md) — pendiente de definición.
- [Guías para agentes](./agents/domain.md) — *issue tracker*, etiquetas de triaje y uso del dominio.

## Estado del proyecto (resumen rápido)

- **Plataforma objetivo**: Android (única). La web es el target `web` de Lynx, para desarrollo y para
  lectura/gestión en escritorio.
- **Base**: Lynx + ReactLynx + Rspeedy, en la **raíz del repositorio**.
- **Package manager**: bun 1.4.2 (`bun.lock`).
- **Persistencia**: **no durable todavía** — el host y su módulo SQLite ya existen; falta conectarlos
  a la app (`specs/001`, ticket 3).
- **Modo**: single-user offline-first, con sincronización opcional a InsForge (cuenta).
