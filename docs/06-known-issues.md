# 06 · Problemas conocidos y workarounds

Problemas **reales y abiertos** del proyecto. Los históricos están en
[05-changelog](./05-changelog.md); no se reproducen aquí.

## 1. La persistencia no es durable (el problema número uno)

**Síntoma**: cerrar la app borra lo registrado.

**Causa**: la app escribe sobre la *seam* de almacenamiento, cuya implementación actual es memoria +
el *session storage* de Lynx, pensado para compartir datos entre *cards*, no como base de datos. Lo
declara el propio fichero.

**Fix**: conectar la seam al **módulo nativo SQLite** que ya vive en el host
([`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md), ticket 3). Hasta entonces, **no
meter features nuevas sobre el almacén actual**: se perderían.

---

## 2. `analytics` sobre la seam KV no escala

**Síntoma**: las agregaciones (volumen por semana, racha, PRs, heatmap) obligan a traer el histórico
completo a memoria.

**Causa**: el almacén es clave-valor, no relacional.

**Fix**: la misma decisión del `specs/001`. Sobre SQLite, la agregación es una consulta.

---

## 3. Las piezas nativas aún no están

**Síntoma**: el host propio ya existe (`host/android/`), pero las notificaciones del descanso y Health
Connect no: el port las tiene como **puentes**.

**Fix**: [`specs/002`](../specs/002-nativas-notificaciones-y-health-connect.md).

---

## 4. Lynx no implementa `Intl`

**Síntoma**: cualquier `toLocaleString` o `Intl.DateTimeFormat` revienta en runtime.

**Fix**: `src/lib/format.ts` formatea a mano (fechas, número de miles, duración, mes corto). **No
uses `Intl`** ni para un caso trivial.

---

## 5. `tab-group` no existe en `lynx-ui`

**Síntoma**: no hay componente oficial de pestañas.

**Causa**: el paquete está sin publicar en la versión que se usa.

**Workaround**: la tab bar es propia (`Shell`). No es un pendiente: es la solución adoptada.

---

## 6. `Sortable` sin verificar en dispositivo

**Síntoma**: reordenar arrastrando funciona en el port, pero **no se ha probado en Lynx Explorer** con
el bucle de dispositivo activo; el gesto convive con el scroll de la pantalla.

**Workaround**: si no encaja, el fallback es subir/bajar con botones —`routineEditor.moveBy` ya lo
resuelve y tiene tests—.

---

## 7. Piezas que aún no están portadas

Health Connect, notificaciones, captura/compartir y hápticas dependen de un módulo nativo. En el port
están como **puentes**; su implementación son los specs
[`002`](../specs/002-nativas-notificaciones-y-health-connect.md) y
[`003`](../specs/003-auth-y-cuenta-con-insforge.md).

---

## 8. Límites de fidelidad del preview web

**Síntoma**: el preview en navegador (Lynx for Web) parece la app, pero no lo es.

**Causa**: los elementos de Lynx se mapean a elementos web.

**Regla**: el navegador sirve para composición, tipografía, color y navegación; **no** para dar por
bueno el táctil ni el rendimiento. Eso se valida en móvil real
([12](./12-entorno-desarrollo-lynx.md)).
