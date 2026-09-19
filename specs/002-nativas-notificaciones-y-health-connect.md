# 002 · Nativas: notificaciones y Health Connect

> Estado: **spec**, redactado el 19 sep 2026. Depende del host del `specs/001`: sin app propia no hay
> API nativa que llamar.

## Problema

Desde el runtime Lynx no se puede ni **avisar del fin del descanso** con la app en segundo plano ni
**leer o escribir entrenamientos en Health Connect**. Hoy esas dos capacidades son puentes *stub*: la
pantalla de Salud muestra un estado, pero no hay notificación real ni registro en la plataforma de
salud. Para el usuario, el descanso no avisa si no está mirando la pantalla, y sus entrenamientos no
cuentan para su salud.

## Alcance

**Dentro**

- **Notificación local** del temporizador de descanso, disparada desde el host propio, que suene con
  la aplicación en segundo plano y la pantalla apagada.
- **Escritura** de la sesión terminada en Health Connect.
- **Lectura** del resumen diario de salud que la pantalla de Salud ya pinta.
- El **modelo de permisos** y de estados, incluido qué se degrada cuando el usuario los deniega.

**Fuera**

- Notificaciones *push* remotas (FCM) y recordatorios de entrenamiento programados por el servidor.
- Sincronización de datos (→ `specs/003`).
- Widgets y hápticas.
- Compartir el resumen del entrenamiento como imagen.

## Decisiones con motivos

### Notificaciones: locales, no push

El objeto es avisar del **fin de un descanso**, que es corto, local y ocurre siempre en el mismo
dispositivo. Se resuelve con la API de notificaciones de Android más una alarma exacta para el
instante de fin; no hace falta infraestructura de push ni un backend que la emita.

- **Permisos**: `POST_NOTIFICATIONS` (Android 13+) y el permiso de alarmas exactas para que el aviso
  no se desplace con el ahorro de energía.
- **Canal propio** para que el usuario pueda silenciarlo sin silenciar todo.
- El cronómetro se modela contra un **instante de fin**, no descontando tiempo en cada *tick*, que es
  el error que ya se corrigió en el port.

### Health Connect: SDK oficial, permiso por tipo de dato

Se usa el cliente oficial de Health Connect con los permisos de salud ya inventariados en la
configuración Android actual (lectura de pasos, frecuencia cardíaca y en reposo, calorías activas y
totales, distancia, sueño y peso; escritura de sesión de ejercicio, ruta y calorías). Los tipos de
registro que se escriben son la **sesión de ejercicio** (tipo levantamiento de pesas) y, si se
estiman, las calorías. Los que se leen son los que la pantalla de Salud ya muestra.

### Degradación: la feature nunca bloquea la app

El estado de salud tiene tres casos —no disponible / no instalado / no autorizado— y en todos la app
sigue siendo plenamente usable: la escritura y la lectura quedan en **no-op** y la pantalla muestra el
estado con la acción correspondiente (instalar Health Connect o abrir sus ajustes). Denegar un permiso
no puede impedir entrenar.

### Pregunta de diseño abierta

¿El cronómetro de descanso debe **sobrevivir a que el usuario cierre la app**? Si sí, la notificación
simple no alcanza y hace falta un servicio en primer plano; si no, la notificación programada es
suficiente y mucho más barata. Es una decisión de producto (relación entre coste y expectativa) y se
resuelve antes del ticket 2.

## Superficie / API

Un puente nativo que expone al runtime Lynx, como mínimo:

- **Notificaciones**: pedir permiso, programar el aviso de fin de descanso, cancelarlo, y un evento de
  «descanso terminado» para que la UI reaccione.
- **Health Connect**: consultar disponibilidad, inicializar, pedir permisos, consultar permisos
  concedidos, leer el resumen del día y escribir la sesión terminada.

Las firmas deben coincidir con las que ya consumen el port y la app Expo, para que las pantallas no
cambien: la superficie existe; lo que falta es la implementación nativa detrás.

## Criterios de aceptación (medibles)

- [ ] Terminado un descanso, la notificación aparece con la **pantalla apagada** y la app en segundo
      plano, con un margen de **±1 s** sobre el instante de fin.
- [ ] Al finalizar un entrenamiento, la sesión es **visible en Health Connect** como sesión de
      ejercicio de levantamiento.
- [ ] Con el permiso de salud **denegado**, la app completa el entrenamiento con normalidad y la
      pantalla muestra el estado no autorizado sin bloquear.
- [ ] Sin Health Connect instalado, la app muestra el estado «no instalado» y ofrece la vía para
      instalarlo; ninguna otra pantalla se degrada.
- [ ] `bun run typecheck`, `bun run test` y `bun run build` siguen en verde en el proyecto Lynx.
- [ ] Verificación hecha **en dispositivo físico**, no solo en emulador.

## Riesgos

- Las alarmas exactas tienen restricciones crecientes por versión de Android; puede hacer falta
  justificar el permiso o caer a una alarma inexacta.
- Health Connect cambia de versión y de tipos de registro con frecuencia; el tipo «entrenamiento de
  resistencia» ya obligó a usar «levantamiento de pesas» en el port anterior.
- Probar esto exige dispositivo real y la app de Health Connect instalada; el emulador no basta.
- Si se elige el servicio en primer plano, se multiplica el coste nativo y aparece una notificación
  persistente que el usuario puede rechazar.

## Preguntas abiertas (decisión de producto)

- ¿El descanso debe avisar con la app **cerrada**, o basta con segundo plano? (define ticket 2.)
- ¿Se escribe también la **ruta** del ejercicio, o solo la sesión?
- ¿Se guardan calorías estimadas cuando Health Connect no las aporta?
- ¿La lectura de salud es un resumen diario o se quiere histórico?

## Tickets

1. **Permisos y canal** — declarar permisos de salud y notificaciones en el host, crear el canal del
   descanso y comprobar el flujo de concesión. *Bloqueado por:* `specs/001` ticket 1.
2. **Aviso de fin de descanso** — programar y cancelar la notificación contra el instante de fin, con
   el evento para la UI. *Bloqueado por:* 1.
3. **Escritura en Health Connect** — escribir la sesión terminada (y calorías si aplica). *Bloqueado
   por:* 1.
4. **Lectura del resumen de salud** — leer los tipos del inventario y alimentar la pantalla de Salud.
   *Bloqueado por:* 1.
5. **Estados y degradación** — modelar no disponible / no instalado / no autorizado y las acciones de
   la UI, sin bloquear ninguna otra pantalla. *Bloqueado por:* 2, 3, 4.
6. **Verificación en dispositivo** — comprobar los criterios medibles en móvil real y dejar la
   evidencia. *Bloqueado por:* 5.
