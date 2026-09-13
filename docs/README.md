# Documentación de Strain

Bienvenido a la documentación del proyecto **Strain**. Aquí se recoge todo lo relativo al producto, arquitectura, decisiones técnicas y estado actual del desarrollo.

## Índice

| # | Documento | Contenido |
|---|-----------|-----------|
| 01 | [Visión general](./01-overview.md) | Qué es Strain, filosofía, público objetivo, principios de diseño |
| 02 | [Stack tecnológico](./02-stack.md) | Frameworks, librerías, servicios y por qué se eligieron |
| 03 | [Arquitectura](./03-architecture.md) | Estructura de carpetas, capas, flujo de datos, base de datos |
| 04 | [Roadmap](./04-roadmap.md) | Features planeadas, en curso y descartadas |
| 05 | [Changelog](./05-changelog.md) | Cronología de features entregadas commit a commit |
| 06 | [Problemas conocidos](./06-known-issues.md) | Bugs abiertos, workarounds y notas de la sesión actual |
| 07 | [Decisiones técnicas](./07-decisions.md) | Android-only, pnpm, Health Connect, SQLite local, etc. |
| 08 | [Setup local](./08-setup.md) | Cómo arrancar el proyecto en dev (web y Android) |
| 09 | [Remodelación Web Dashboard](./09-remodelacion-web-dashboard.md) | Propuesta de arquitectura web + refinamiento mobile + sync |
| 10 | [C6: targets de rutina en la sesión](./10-c6-targets-de-rutina.md) | Spec pendiente de grilling: persistir los targets que hoy se descartan |

## Estado del proyecto (resumen rápido)

- **Plataforma objetivo**: Android (única). Web disponible solo para desarrollo/preview.
- **Package manager**: pnpm 11.5.1 (migrado en este bloque).
- **Última release funcional**: `76f003c` — Health Connect + compartir workout + migración a pnpm.
- **Modo**: single-user offline-first con sincronización opcional a Supabase (auth + backup).