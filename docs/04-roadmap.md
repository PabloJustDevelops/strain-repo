# 04 · Roadmap

## Estado actual

El **port a Lynx está funcional** en `lynx/`: 14 pantallas, 5 pestañas, sistema de diseño v2, capa de
datos con repos y una suite de tests propia. Lo que falta no es UI: son las piezas que exigen **host
nativo** y **persistencia durable**. El plan por fases completo está en
[11-plan-app-tipo-hevy](./11-plan-app-tipo-hevy.md); este documento sigue su numeración.

> La **app Expo** de la raíz es legado y no recibe features. Se retira por el
> [`specs/004`](../specs/004-reestructura-del-repo-y-retirada-de-expo.md).

## ✅ Entregado

| Fase | Qué | Notas |
|------|-----|-------|
| **F0 · Envolvente de desarrollo** | Preview web + target nativo; `bun run dev` sirve los dos | Ver [12](./12-entorno-desarrollo-lynx.md) |
| **F1 · Base del port** | Scaffold, theme, lógica de dominio pura, repos sobre la *seam*, semilla de 47 ejercicios | Paridad de dominio con la app original |
| **F2 · Shell y pantallas** | Registro de rutas, 7 pantallas iniciales con sus estados de carga/vacío/error | |
| **F3 · Flujo de entrenamiento** | Workout activo, resumen, detalle de ejercicio, detalle de sesión, heatmap | Descanso con dueño único |
| **F4 · Sistema de UI v2 (parte A)** | Tokens por rol, contraste medido, 8 componentes nuevos, 5 pestañas | |
| **F5 · Editor de rutinas** | `routines/new`, `routines/[id]`, añadir ejercicios, reordenar arrastrando | `Sortable` de `lynx-ui` |

## 🚧 Próximo bloque (specs aprobados)

El orden no es negociable en un punto: **el host antes que todo** (registrar sin persistir es teatro).

| Spec | Qué resuelve | Bloquea |
|------|--------------|---------|
| [`001`](../specs/001-host-nativo-y-almacenamiento-durable.md) | App Android propia con `LynxView` y almacenamiento durable | 002, 003 |
| [`002`](../specs/002-nativas-notificaciones-y-health-connect.md) | Notificación del descanso y Health Connect | |
| [`003`](../specs/003-auth-y-cuenta-con-insforge.md) | Las 3 pantallas de auth y cuenta/sync con InsForge | |
| [`004`](../specs/004-reestructura-del-repo-y-retirada-de-expo.md) | Promover Lynx a la raíz y retirar Expo | |
| [`005`](../specs/005-ci-cd.md) | CI del producto real + seguridad + release | |

## 🔮 Pendiente (post-MVP)

- **F3 (paridad de registro)**: valores de la vez anterior, tipos de serie, RPE, PRs en vivo.
- **F4 (progreso)**: calendario, gráficas por ejercicio (peso/volumen/1RM), volumen por músculo.
- **F5 (biblioteca)**: instrucciones y vídeo, ejercicios propios con imagen, historial por ejercicio.
- **F6 (integraciones)**: Health Connect, widgets.
- **F7 (cuenta, sync y social)**: registro de cuenta, sync multi-dispositivo, compartir entrenos.
- Tests de extremo a extremo con Maestro en emulador ([`specs/005`](../specs/005-ci-cd.md)).
- Compartir el resumen del entrenamiento como imagen (captura nativa).

## ❌ Descartado / fuera de scope

- iOS nativo (coste de mantenimiento > valor para Android-first).
- Red social de workouts.
- Integración con apps de running.
- Marketplace de rutinas.
- Plan gratuito / premium: todo gratis, sin monetización por ahora.

## Métricas de éxito (criterio MVP)

- [ ] **Cerrar y reabrir la app conserva lo registrado** (requisito duro del `specs/001`).
- [x] Registrar workout completo sin conexión.
- [x] Ver histórico y métricas.
- [x] Compartir resultado (en la app legado; pendiente en Lynx).
- [ ] Integrar con Health Connect desde el host propio.
- [ ] Latencia de apertura de la app < 1 s en un dispositivo de referencia.
- [ ] Presupuesto de *bundle* vigilado en CI (punto de partida: 549,9 kB nativo / 542,7 kB web).
