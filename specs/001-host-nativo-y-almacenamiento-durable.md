# 001 · Host nativo y almacenamiento durable

> Estado: **spec**, redactado el 19 sep 2026. No implementado: la implementación son los tickets del
> final. Vocabulario según `CONTEXT.md`; decisiones según `docs/07-decisions.md`.
> Este spec es la **puerta** del bloque: hasta que exista el host que describe, no se borra nada de
> la era Expo (ver `specs/004`).

## Problema

Hoy la app se ejecuta **dentro de Lynx Explorer**: no hay aplicación propia. Y la única persistencia
es una *seam* que escribe en memoria con un espejo en el *session storage* de Lynx, que se pierde al
cerrar la card. La consecuencia, desde el punto de vista del usuario, es la peor posible:

- Todo lo registrado —rutinas, sesiones, series, PRs y ajustes— **desaparece al cerrar la app**. No
  se puede entrenar en serio: un gimnasio no se hace en una sola sesión.
- Sin app propia tampoco hay notificaciones, Health Connect, widgets ni firma.

El requisito duro lo fija el brief: **la app no puede perder lo registrado al cerrarse**.

## Alcance

**Dentro**

- Una **app Android propia** que embebe el bundle Lynx en un `LynxView` (el *host*).
- Una capa de **almacenamiento durable** que sobrevive al cierre de la app, a la muerte del proceso
  y al reinicio del dispositivo.
- El adaptador que implementa la persistencia detrás de la *seam* que ya existe, de modo que las
  pantallas y los repositorios **no cambien**.

**Fuera**

- Notificaciones del descanso y Health Connect → `specs/002`.
- Cuenta, autenticación y sincronización → `specs/003`.
- Promoción del port Lynx a la raíz y borrado de Expo → `specs/004`.
- Diseño visual y sistema de componentes (ya cubierto por el sistema v2).

## Comparación de opciones (la decisión que este spec cierra)

| Opción | Qué es | Consecuencias |
|---|---|---|
| **(a) Módulo nativo con SQLite/Room** | Un módulo Kotlin que abre una base SQLite y la expone al runtime Lynx; los repositorios vuelven a consultar SQL | Conserva intacto el **modelo relacional** y las agregaciones de analytics; el coste es trabajo nativo y un módulo que mantener |
| **(b) Ficheros durables tras la *seam* KV** | Escribir el árbol KV actual a ficheros en el almacenamiento privado de la app, manteniendo los repos en memoria | Muy poco código nativo y desbloquea el requisito duro ya; pero las agregaciones de analytics hay que resolverlas **en memoria** sobre todo el histórico, y las migraciones de forma pasan a ser a mano |
| **(c) InsForge como fuente de verdad** | La base de datos vive en el servidor y la app solo cachea | Rompe el principio **offline-first**: sin red no hay app, y en un gimnasio sin cobertura la app deja de registrar |

### Decisión: (a) módulo nativo con SQLite, detrás de la *seam* actual

**Por qué**

- El dominio es **relacional** (Session → Session Exercise → Set, con PRs derivados). Sobre KV, cada
  lectura analítica obliga a traer el histórico completo a memoria; sobre SQLite, la agregación es
  una consulta. Es exactamente el problema que `lynx/README.md` ya había anotado como pendiente.
- El **offline-first es un principio de producto**, no un detalle: la nube es un extra, nunca la
  fuente de verdad. Esto descarta (c).
- La *seam* ya existe y ya aísla la decisión: el resto de la app solo conoce la interfaz de
  almacenamiento, así que cambiar la implementación **no toca ninguna pantalla**.

**Descartado**

- **(b) como solución final**: la agregación en memoria no escala y obliga a reimplementar lo que SQL
  ya resuelve. Se conserva, eso sí, como **stopgap** explícito si el módulo nativo se retrasa, porque
  satisface el requisito duro con mucho menos trabajo nativo.
- **(c)**: contradice el principio de producto.

**Decisiones de apoyo**

- **La *seam* se conserva como frontera.** Los consumidores (repos y pantallas) no cambian; lo que
  cambia es la implementación que hay detrás. Es la razón por la que esta fase puede ser incremental.
- **La migración de datos** desde el almacén actual se intenta; si el valor real no es recuperable con
  fidelidad (el almacén de sesión no es durable), se descarta explícitamente en vez de fabricar datos.
- **Ubicación del host**: dentro del árbol del proyecto Lynx (versionable), **no** en la carpeta
  `android/` de la raíz. Motivo: esa carpeta está en `.gitignore` y además es el *prebuild* de Expo,
  que el `specs/004` va a retirar. El host nuevo nace versionado.

## Superficie / API

**Módulo nativo de almacenamiento**, expuesto al runtime Lynx (el runtime no trae SQLite):

- `open(dbName)` / `close()` — ciclo de vida de la conexión.
- `execute(sql, params)` — sentencias que escriben, devuelven filas afectadas.
- `query(sql, params)` — sentencias que leen, devuelven filas.
- `transaction(fn)` — agrupa escrituras y las confirma o revierte en bloque.

**Adaptador durable** que implementa la interfaz de almacenamiento que ya consume la app, construido
sobre esa API. Es el único punto nuevo en la capa de datos.

**Host Android**: aplicación con una `Activity` que monta el `LynxView`, registra el módulo nativo y
carga el bundle; ciclo de vida alineado con el de la `Activity`.

## Criterios de aceptación (medibles)

- [ ] Cerrar la app **matando el proceso** y volver a abrirla conserva rutinas, sesiones, series, PRs
      y ajustes. Existe una prueba de integración que lo demuestra (no basta el paso por memoria).
- [ ] La app arranca **sin Lynx Explorer y sin servidor de desarrollo** (bundle embebido).
- [ ] `bun run typecheck`, `bun run test` y `bun run build` siguen en verde en el proyecto Lynx
      (punto de partida: 21 ficheros / 152 tests; `main.lynx.bundle` 549,9 kB).
- [ ] `./gradlew assembleDebug` produce un APK y arranca en un dispositivo o emulador real.
- [ ] La agregación de analytics responde en **< 100 ms** con un histórico de referencia de 50
      sesiones (sobre SQLite, no sobre memoria).
- [ ] Se documenta explícitamente si hubo migración de datos o si se partió de cero, y por qué.

## Riesgos

- Es la fase con **más incógnitas nativas** del bloque: Kotlin, `LynxView`, registro de módulos y
  empaquetado del bundle. Un error aquí bloquea 002 y 003.
- **Trampa de ubicación**: el `android/` de la raíz está ignorado por git; un host creado ahí no se
  versionaría.
- **Room vs SQLiteOpenHelper**: Room añade dependencia y anotaciones; el helper es más liviano pero
  más código propio. Decidirlo en el ticket 2.
- El almacén actual **no es durable**, así que puede no haber nada que migrar; conviene no prometer
  continuidad de datos.

## Preguntas abiertas (decisión de producto)

- ¿Se reutiliza el `applicationId` existente (`com.strain.app`) o el host estrena identidad?
- ¿`minSdk` objetivo? (Health Connect, del `specs/002`, condiciona el mínimo.)
- Firma y distribución: ¿debug interno, o se prepara release firmada ya?
- ¿El host se commitea desde el primer ticket, o al estabilizarse?

## Tickets

1. **Host mínimo que arranca** — app Android con `LynxView` que carga el bundle embebido y se abre sin
   Lynx Explorer. *Bloqueado por:* ninguna (puede empezar ya).
2. **Módulo nativo de almacenamiento** — SQLite abierto y expuesto al runtime Lynx con la API de
   arriba, registrado en el host. *Bloqueado por:* 1.
3. **Adaptador durable detrás de la seam** — implementar la interfaz de almacenamiento sobre el módulo
   nativo, sin tocar pantallas, y decidir la migración. *Bloqueado por:* 2.
4. **Prueba de durabilidad** — integración que mata el proceso, reabre y verifica que los datos
   siguen; se engancha a CI en `specs/005`. *Bloqueado por:* 3.
5. **Retirar el respaldo no durable** — quitar el espejo en memoria/session storage una vez el
   adaptador durable es el único camino. *Bloqueado por:* 3.
