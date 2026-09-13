# 04 · Roadmap

Estado actual: **MVP funcional con features avanzadas**. Pendiente: pulir UX, tests, performance.

## ✅ Entregado (este dev session)

| Feature | Commit | Notas |
|---------|--------|-------|
| Assets regenerados (icon, splash, favicon) | `22667ef`, `a12caad` | Android-only, sin soporte iOS/Apple |
| Auth (login/signup/forgot) | `1f0ae07` | Supabase email/password |
| Import/Export JSON | `1f0ae07` | Backup completo del usuario |
| Analytics locales | `1f0ae07` | Tracking de eventos UI |
| **Supersets** | `a77b645` | Agrupar ejercicios en una serie |
| **RPE + notas por set** | `a77b645` | Escala RPE 1–10, notas libres |
| **Heatmap muscular** | `a77b645` | Visualización de volumen por grupo |
| **Notificaciones push** | `a77b645` | Canal Android, recordatorios |
| **Health Connect (lectura + escritura)** | `76f003c` | Android 14+ Health Connect |
| **Compartir workout** | `76f003c` | PNG vía `react-native-view-shot` + `expo-sharing` |
| **Migración a pnpm** | `76f003c` | Lockfile, `.npmrc`, `pnpm-workspace.yaml` |

## 🚧 En curso / próximo bloque

- [x] Pulir UX del sheet de detalles por set (drag handle + teclado) — issue #3
- [ ] Calcular 1RM estimado (Epley) en tiempo real al introducir peso/reps
- [ ] PRs automáticos: detectar nuevo PR al finalizar set
- [ ] Heatmap con más granularidad (filtrar por rango temporal)

## 🔮 Pendiente (post-MVP)

- [ ] Tests E2E con Playwright (login → workout → finish → ver en history)
- [ ] Tests unitarios del repositorio (Drizzle queries)
- [ ] Sincronización Supabase: backup automático al finalizar sesión
- [ ] Offline queue: queue de acciones cuando no hay red
- [ ] Versión iOS (descartado por ahora — ver [07](./07-decisions.md))
- [ ] Widget Android (1RM del ejercicio favorito en home)
- [ ] Watch companion (Wear OS): registrar serie desde el reloj

## ❌ Descartado / fuera de scope

- iOS nativo (coste de mantenimiento > valor para Android-first)
- Red social de workouts
- Integración con apps de running
- Marketplace de rutinas
- Plan gratuito / premium (todo gratis, sin monetización por ahora)

## Métricas de éxito (criterio MVP)

- [x] Registrar workout completo sin conexión
- [x] Ver histórico y métricas
- [x] Exportar/importar backup
- [x] Compartir resultado
- [x] Integrar con Health Connect
- [ ] Latencia de apertura de app < 1s en Pixel 6a
- [ ] Cobertura de tests > 60% en repos
- [ ] Build de release reproducible desde EAS