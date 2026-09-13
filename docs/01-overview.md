# 01 · Visión general

## Qué es Strain

**Strain** es una app de seguimiento de entrenamiento de fuerza pensada para gente que levanta pesas en serio y quiere datos sin rodeos. Nada de gamificación vacía, nada de redes sociales: un registro rápido del workout, métricas claras y, opcionalmente, sincronización con Health Connect para que el entrenamiento viva en el mismo sitio que el resto de tu salud.

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

## Visión a medio plazo

- [ ] Heatmap de grupos musculares para detectar desequilibrios
- [ ] Cálculo automático de 1RM (Epley/Brzycki) y PRs por ejercicio
- [ ] Integración con Health Connect (lectura de pasos/FC, escritura de workouts) ✅
- [ ] Compartir workout como imagen ✅
- [ ] Sincronización opcional a Supabase (ya integrada a nivel de schema, falta pulir UX)
- [ ] Tests E2E con Playwright
- [ ] Versión iOS si la base de usuarios lo justifica (hoy descartado por coste)

## Qué NO es Strain

- **No es** una red social de fitness.
- **No es** un tracker de running (para eso ya hay apps muy buenas).
- **No es** un coach con IA (puede añadirse más adelante, pero el MVP no lo incluye).
- **No es** multiplataforma (no iOS, no web de producción — solo dev).