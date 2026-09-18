# 11 · Plan para una app tipo Hevy (paridad funcional)

> Estado: **propuesta**, redactada el 19 sep 2026 tras verificación en dispositivo del port Lynx.
> No lleva número de decisión (`Dn`) todavía: las decisiones se registran en `docs/07-decisions.md`
> cuando Pablo las aprueba.
> Fuentes primarias usadas (leídas, no recordadas): el post propio de Hevy
> `https://www.hevyapp.com/how-we-built-hevy/`, sus fichas de App Store y Google Play, su centro de
> ayuda (`help.hevyapp.com`), y la documentación de Lynx (`lynxjs.org/llms.txt` y
> `lynxjs.org/llms-full.txt`). Todo lo que no viene de ahí está marcado como inferencia.

## 1. Qué es este documento

Cómo llevar **Strain** a una app del tipo de Hevy: misma **funcionalidad** y misma lógica de producto,
**sin copiar su diseño**. Strain conserva su identidad (oscuro, acento azul de marca) y su dominio ya
modelado en `CONTEXT.md`.

## 2. Cómo está montada Hevy (según sus propias fuentes)

Lo que ellos cuentan en "How We Built Hevy" (Guillem Ros, cocreador):

- **Punto de partida**: alguien que iba al gimnasio y quería registrar sus entrenamientos *y* ver qué
  hacían sus amigos. Nada de eso existía junto, según su investigación.
- **Validación**: encuesta a pie de gimnasio (16 respuestas) y conversaciones. Su propia conclusión a
  posteriori: con ideas nuevas, encuestar no sustituye a ver a la gente usarlo.
- **Los tres pilares, y ahí está toda la clave del producto**:
  1. **Registro de entrenamiento** (workout logging).
  2. **Analíticas** (progress tracking).
  3. **Social**.
  Todo lo demás es periférico. Su decisión explícita: el MVP es el conjunto mínimo de esos tres pilares,
  porque su competencia estaba hinchada intentando hacerlo todo mal.
- **Antes de programar**: planificaron la UI completa en Sketch, prototipos en Marvel, y prepararon
  **librería de componentes reutilizables, guía de estilo de texto y color, y librería de iconos**. Es
  decir: el sistema de diseño fue *primero*, no un refino posterior. (Esto es exactamente lo que a
  Strain le faltaba, y es lo que está en marcha ahora.)
- **Stack del MVP**: **React Native** (para iOS y Android con un solo código), **MobX** para estado,
  **React Navigation** para navegación y **Victory Native** para las gráficas. Equipo de dos personas.
  Modelo: gratis, para maximizar el alcance social.
- **Ojo con el dato**: esto describe el MVP de 2019-2021. No han publicado su stack actual; no afirmo
  que hoy sigan con esos mismos paquetes.

Lo que se ve desde fuera hoy (fichas de tienda + centro de ayuda), es decir, el **estado al que
queremos llegar en funcionalidad**:

- **Registro**: series con peso y reps, **tipos de serie** (calentamiento, normal, drop set, al fallo,
  superseries), **RPE**, notas, **temporizador de descanso automático por ejercicio**, calculadora de
  discos, calculadora de calentamiento, descartar/deshacer series, cambiar de ejercicio en caliente,
  sesión descartable.
- **Rutinas y planificación**: rutinas ilimitadas, **plantillas y programas** (splits, principiante,
  por equipamiento), **días programados** que aparecen en el calendario, carpetas de rutinas,
  reordenar y copiar rutinas de otros.
- **Biblioteca**: cientos de ejercicios con **instrucciones y vídeo**, **ejercicios propios**, filtros
  por músculo y equipamiento.
- **Progreso**: calendario de entrenos, detalle de cada sesión, **gráficas por ejercicio** (peso,
  volumen, **1RM estimado**), **volumen por grupo muscular**, tabla de **récords personales**,
  medidas corporales, peso corporal, racha.
- **Integraciones**: Apple Health / **Health Connect**, widgets, reloj, exportar a Strava, importar de
  otras apps.
- **Social**: perfil público o privado, seguir amigos, feed, compartir entrenos, copiar rutinas.
- **Sincronización** en la nube con la app gratis y suscripción de pago para extras.

## 3. Nuestro punto de partida (verificado, no supuesto)

- **Dominio ya modelado** en `CONTEXT.md`: `Exercise` (global o custom), `Routine`, `Routine Exercise`
  (con `targetSets`, `targetReps`, `targetWeight`, `restSeconds`, `orderIndex`, **`supersetGroup`**),
  `Session` (máquina de estados `active → completed | discarded` con agregados `totalVolume`,
  `totalSets`, `durationSeconds`) y `Session Exercise` con **snapshot** de los targets. Es un modelo de
  dominio más serio que el de muchas apps del sector: la parte de datos ya está pensada.
- **App Expo funcionando** con SQLite + Drizzle, semilla de 47 ejercicios, Health Connect con 11
  permisos, y una suite de tests propia.
- **Port Lynx** con 14 pantallas y 7 pestañas sobre una *seam* de almacenamiento, con un sistema de
  diseño de primera generación.
- **Los dos huecos que bloquean todo lo demás** (verificado en el emulador el 18-19 sep):
  1. **No hay almacenamiento durable**: la implantación de la seam es memoria + *session storage*, así
     que **cerrar la app borra lo registrado**. Documentado en `lynx/src/db/storage.ts`.
  2. **No hay app propia**: hoy se ejecuta dentro del **Lynx Explorer**. Sin host propio no hay
     notificaciones, ni Health Connect, ni widgets, ni almacenamiento nativo.
- Y un hueco de diseño: la UI de primera generación es plana, con tarjetas donde no tocan, títulos
  duplicados y cero densidad de datos. En corrección (parte A y B del rediseño, 19 sep).

## 4. El MVP honesto de Strain (los tres pilares, adaptados)

El equivalente a los tres pilares de Hevy para que esto sea una app de verdad, en este orden:

1. **Registro de entrenamiento** (el pilar sin el que no hay app).
2. **Analíticas** (lo que hace que la gente vuelva: ver progreso).
3. **Biblioteca** (lo que hace que el registro sea rápido).
4. **Social**: fuera del MVP. Depende de backend y de una cuenta; entra más tarde, si entra.

## 5. Arquitectura objetivo

```
Pantallas (ReactLynx + sistema de diseño v2)
        │  hooks y stores de sesión
        ▼
Repositorios  (interfaces que YA existen: exercises / routines / sessions / analytics)
        ▼
Seam de almacenamiento  ──►  Durable, sobre host propio (Room/SQLite o fichero)   ← pieza que falta
        ▼
Sincronización opcional (InsForge / Supabase)                                     ← fase tardía
        ▼
Nativo (notificaciones de descanso, Health Connect, widgets)                      ← fase tardía
```

Regla: la UI no habla con el almacenamiento, habla con repos. Esa frontera ya está bien puesta y es lo
que permite cambiar la implantación sin reescribir pantallas.

## 6. Fases, con entregable y criterio de aceptación

| Fase | Entregable | Criterio de aceptación |
|---|---|---|
| **F0 · Envolvente de desarrollo** | Preview web + DevTool enganchados; `pnpm dev` abre la app en el navegador | Ver `docs/12-entorno-desarrollo-lynx.md`: la app se ve en el navegador y en el móvil real; el emulador queda sólo para automatizar |
| **F1 · Sistema de diseño v2** *(en curso)* | Tokens, componentes e IA de 5 pestañas; pantallas reconstruidas | Contrastes medidos, tests verdes, capturas de las 6 pantallas clave |
| **F2 · Persistencia durable + host propio** | App Android propia con LynxView y almacenamiento que sobrevive al cierre | Cerrar y reabrir la app conserva rutinas, sesiones y ajustes; test de integración que lo demuestra |
| **F3 · Registro con paridad** | Sesión activa completa: valores de la vez anterior, tipos de serie, RPE, descanso automático, notas, PRs en vivo, resumen y descarte | Se puede entrenar de verdad con el móvil en la mano sin tocar la app Expo; los PRs se calculan y se ven |
| **F4 · Progreso** | Calendario, detalle de sesión, gráficas por ejercicio (peso/volumen/1RM), volumen por músculo, récords, medidas | Todas las gráficas se pintan con datos reales de sesiones propias; nada de datos inventados |
| **F5 · Biblioteca** | Catálogo con instrucciones y vídeo, ejercicios propios, filtros por músculo y equipo, historial por ejercicio | Se puede crear un ejercicio propio y entrenarlo; el filtro por equipo reduce el catálogo de verdad |
| **F6 · Integraciones nativas** | Notificación de descanso, Health Connect, widgets | El descanso avisa con la pantalla apagada; Health Connect recibe la sesión |
| **F7 · Cuenta, sync y social** | Registro de cuenta, sync entre dispositivos, compartir entrenos, seguir gente | Dos dispositivos ven el mismo historial tras iniciar sesión |

El orden no es negociable en dos puntos: **F2 antes de F3** (registrar sin persistir es teatro) y **F1
antes que el resto** (rediseñar pantallas que luego se reescriben es tirar dinero).

## 7. Coste y presupuesto

Cada fase es uno o varios runs de agente. A 19 sep 2026, el plan mensual de Command Code está al
**88,7%** ($133,10 de $150, quedan **$16,90**, ciclo que cierra el 21 sep). Con ese margen caben F0 y
lo que queda de F1; **F2 en adelante necesita el ciclo siguiente o recortar alcance**. Esto es un dato
del plan, no una opinión: conviene decidir F2 con el presupuesto delante.

## 8. Riesgos

- **Presupuesto**: ver arriba. Un run de 150 turnos con contexto grande puede costar varios dólares y
  ya han muerto dos por contexto (no por el modelo).
- **Lynx es joven**: por ejemplo `@lynx-js/lynx-ui` no publica el componente `tab-group`, y no hay
  `Intl`. Cada pieza nueva necesita comprobarse contra la documentación antes de prometerla.
- **Fidelidad web ≠ nativa**: el preview en navegador (F0) acelera la iteración, pero **no** sustituye
  la validación en dispositivo para táctil, rendimiento y nativo.
- **El host propio (F2) es trabajo nativo** (Kotlin + LynxView + módulo de almacenamiento). Es la fase
  con más incógnitas técnicas y la que más desbloquea.
- **Social** arrastra backend, cuentas, moderación y RGPD: no es una fase de fin de semana.

## 9. Lo que NO vamos a hacer

- Copiar el diseño de Hevy. Tomamos su **funcionalidad** y su criterio de producto (tres pilares), no su
  interfaz.
- Meter features nuevas sobre el almacenamiento de sesión: se perderían al cerrar la app.
- Rediseñar dos veces las mismas pantallas por adelantar fases.
