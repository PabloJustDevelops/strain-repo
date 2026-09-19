# 003 · Auth y cuenta con InsForge

> Estado: **spec**, redactado el 19 sep 2026. Depende del host del `specs/001`.

## Problema

Las tres pantallas de autenticación —**login, registro y recuperación de contraseña**— solo existen
en la aplicación Expo. En el port Lynx no están: la app funciona, pero no hay forma de tener cuenta
ni de recuperarla. Y la cuenta y la sincronización tampoco existen en Lynx.

Además hay un cambio de backend decidido en este bloque: la aplicación Expo usaba **Supabase**; el
destino es **InsForge**. Eso obliga a redefinir qué se guarda, qué viaja y cómo encaja el aislamiento
de datos por usuario.

## Alcance

**Dentro**

- Las **tres pantallas** (login, registro, recuperación) portadas al host propio.
- La **cuenta**: perfil visible y cierre de sesión.
- La **sincronización** con InsForge, con su comportamiento sin conexión.
- El **aislamiento por usuario** (que cada cuenta solo vea sus datos).

**Fuera**

- Funciones sociales: seguir a gente, feed, compartir en red social.
- Notificaciones y Health Connect (→ `specs/002`).
- La retirada de los artefactos Expo y de `supabase/` (→ `specs/004`).

## Decisiones con motivos

- **InsForge sustituye a Supabase** como backend de cuentas y sincronización. La documentación, las
  decisiones y los specs hablan de InsForge; lo de Supabase queda como legado que retira el
  `specs/004`.
- **La app no exige cuenta.** Todo funciona sin sesión, en local; la cuenta añade respaldo y
  multi-dispositivo. Motivo: es offline-first, y pedir registro antes de entrenar rompe el principio
  de rapidez de producto.
- **El token de sesión se guarda en almacén seguro del sistema**, no en el almacén KV normal. Motivo:
  es una credencial; el almacén de la app es para datos de entrenamiento, no para secretos.
- **La sincronización es por demanda y con cola local.** Los cambios se encolan en local y se suben
  cuando hay red; el usuario no tiene que pensar en sincronizar. Motivo: no se puede perder una serie
  registrada en un gimnasio sin cobertura.
- **Qué se guarda local**: rutinas, sesiones, series, PRs y ajustes (ya existen). **Qué viaja**: la
  credencial y el perfil, y en sincronización las entidades de entrenamiento con su cola.
- **El aislamiento por usuario se apoya en las políticas del backend** (equivalente a RLS): cada fila
  pertenece a un usuario y solo ese usuario la ve. Es el punto a confirmar contra el contrato real de
  InsForge (ver preguntas abiertas).

## Superficie / API

- **Cliente de cuenta**: registro, inicio de sesión, cierre de sesión, recuperación de contraseña,
  sesión actual y usuario actual.
- **Almacén seguro** para el token, detrás de una interfaz propia para no acoplar la UI.
- **Estado de cuenta** en el cliente: sesión, usuario, estado de carga y si el backend está
  configurado, para que la UI pueda mostrar «no configurado» sin romper.
- **Cola de sincronización**: encolar cambios, subir pendientes y traer cambios remotos.

## Criterios de aceptación (medibles)

- [ ] Las tres pantallas funcionan en el host: registro, login y recuperación completan su flujo.
- [ ] **Sin red** la app sigue operativa: se puede entrenar y registrar sin sesión y sin conexión.
- [ ] El aislamiento por usuario está **verificado**: la cuenta A no puede leer datos de la cuenta B
      (prueba explícita, no una suposición sobre la configuración del backend).
- [ ] El cierre de sesión **limpia el token** y **no borra los datos locales** de entrenamiento.
- [ ] Con el backend sin configurar, la app arranca y muestra el estado «no configurado» en lugar de
      fallar.
- [ ] `bun run typecheck`, `bun run test` y `bun run build` siguen en verde en el proyecto Lynx.

## Riesgos

- **Contrato de InsForge sin verificar**: no está documentado en el repo cuál es su SDK, sus
  endpoints ni su equivalente a RLS. Es el mayor riesgo del spec; el ticket 1 lo cierra antes de
  invertir en pantallas.
- La **recuperación por correo** necesita un flujo de enlace profundo que devuelva a la app; en
  Android eso exige registrar el esquema de la app.
- La **sincronización con conflictos** es la parte que más se subestima: sin una política explícita,
  dos dispositivos pueden pisarse.
- Guardar credenciales mal (en el almacén normal) sería un fallo de seguridad, no un detalle.

## Preguntas abiertas (decisión de producto)

- ¿Qué proveedor de identidad y qué métodos se aceptan? El inicio con Google existía en la app Expo:
  ¿sobrevive?
- ¿Se conserva la **recuperación por correo** o se sustituye por otra vía?
- ¿InsForge ofrece aislamiento por usuario equivalente a RLS, o hay que implementarlo en la app?
- **Política de conflictos** de sincronización: ¿gana el último que escribe, gana el móvil, o se
  fusiona por campo?
- ¿Se borra la cuenta desde la app (acción destructiva) y qué pasa entonces con los datos locales?
- ¿Qué se hace con el esquema SQL y las migraciones de `supabase/`?

## Tickets

1. **Contrato de InsForge** — fijar SDK, endpoints, modelos y aislamiento por usuario; validar con una
   prueba mínima contra el backend real. *Bloqueado por:* ninguna (puede empezar ya).
2. **Almacén seguro del token** — interfaz de almacén seguro en el host y su integración con el
   cliente de cuenta. *Bloqueado por:* 1.
3. **Pantalla de login** — portada con el sistema v2, incluido el estado «no configurado». *Bloqueado
   por:* 2.
4. **Pantalla de registro** — alta de cuenta y su confirmación. *Bloqueado por:* 2.
5. **Pantalla de recuperación** — solicitud y vuelta a la app por enlace profundo. *Bloqueado por:* 2.
6. **Cuenta y cierre de sesión** — perfil visible y cierre, sin borrar datos locales. *Bloqueado por:*
   3.
7. **Cola y subida de cambios** — encolar en local y subir pendientes, con reintentos. *Bloqueado
   por:* 1.
8. **Descarga, conflictos y aislamiento** — traer cambios, aplicar la política de conflictos y probar
   que un usuario no ve datos de otro. *Bloqueado por:* 7.
9. **Borrado de cuenta** — acción destructiva y su efecto sobre los datos locales. *Bloqueado por:*
   6, 8.
