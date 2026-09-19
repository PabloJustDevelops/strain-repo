# 01 · Visión general

## Qué es Strain

**Strain** es una app de seguimiento de entrenamiento de fuerza pensada para gente que levanta pesas en
serio y quiere datos sin rodeos. Nada de gamificación vacía, nada de redes sociales: un registro rápido
del workout, métricas claras y, opcionalmente, sincronización con Health Connect para que el
entrenamiento viva en el mismo sitio que el resto de tu salud.

## A quién va dirigida

- Personas que entrenan fuerza (powerlifting, hipertrofia, calistenia avanzado, CrossFit con foco en gym).
- Quien ya sabe poner pesas en una barra y no necesita que se lo explique la app.
- Gente que quiere **medir progreso**: volumen semanal, PRs, tendencias en heatmap.
- Usuarios de Android (la app no soporta iOS — ver [07-decisiones](./07-decisions.md)).

## Principios de producto

1. **Rapidez antes que estética**. Abrir la app → empezar a registrar series en menos de 5 segundos.
2. **Datos primero**. Heatmaps, gráficos, PRs. Cada workout deja un número detrás.
3. **Offline por defecto**. Toda la app funciona sin internet. La nube es opcional.
4. **Sin distracciones**. No hay feed, likes, ni notificaciones sociales. Solo el entrenamiento.
5. **Tuyo, no de la nube**. Export/import JSON. Tus datos son tuyos.

## Sobre qué se construye (estado actual)

La app se está construyendo sobre **Lynx con ReactLynx y Rspeedy** (ver [02-stack](./02-stack.md) y
[03-arquitectura](./03-architecture.md)). El port vive hoy en `lynx/` y es donde está el trabajo nuevo.

> **Nota de transición**: el repositorio todavía contiene la **app Expo original** en la raíz. Es
> **legado**: no se le añaden features y se retira por el
> [`specs/004`](../specs/004-reestructura-del-repo-y-retirada-de-expo.md). Nada se borra hasta que
> exista el host nativo del [`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md). La
> red de seguridad es la etiqueta `expo-final`.

Dos límites de la base actual que hay que tener presentes (detalle en
[06-problemas](./06-known-issues.md)):

- **La persistencia no es durable todavía**: la app funciona, pero cerrarla pierde lo registrado. Es
  el primer problema que resuelve el `specs/001`.
- **No hay app propia**: hoy se ejecuta dentro de Lynx Explorer, así que no hay notificaciones,
  Health Connect ni widgets hasta el host del `specs/001`.

## Visión a medio plazo

El plan por fases está en [11-plan-app-tipo-hevy](./11-plan-app-tipo-hevy.md) (F0–F7). En resumen:

- [x] Heatmap de grupos musculares para detectar desequilibrios
- [x] Cálculo automático de 1RM (Epley) y PRs por ejercicio
- [x] Fuente de 47 ejercicios y biblioteca con filtros
- [x] Editor de rutinas con reordenar arrastrando
- [x] Sistema de diseño v2 (tokens, componentes, 5 pestañas)
- [ ] **Host nativo y almacenamiento durable** ([`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md))
- [ ] Notificaciones del descanso y Health Connect ([`specs/002`](../specs/002-nativas-notificaciones-y-health-connect.md))
- [ ] Cuenta y sincronización con InsForge ([`specs/003`](../specs/003-auth-y-cuenta-con-insforge.md))
- [ ] Retirada de Expo y limpieza del repo ([`specs/004`](../specs/004-reestructura-del-repo-y-retirada-de-expo.md))
- [ ] CI/CD que cubra el producto real ([`specs/005`](../specs/005-ci-cd.md))

## Qué NO es Strain

- **No es** una red social de fitness.
- **No es** un tracker de running (para eso ya hay apps muy buenas).
- **No es** un coach con IA (puede añadirse más adelante, pero el MVP no lo incluye).
- **No es** multiplataforma: el objetivo es **Android** (la web es entorno de desarrollo y preview, ver
  [12-entorno-desarrollo-lynx](./12-entorno-desarrollo-lynx.md)).
