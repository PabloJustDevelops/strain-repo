# 13 · Pendiente de migrar desde la app anterior

La app anterior se retiró del árbol en el [`specs/004`](../specs/004-reestructura-del-repo-y-retirada-de-expo.md)
y **no se ha perdido**: su último estado está en la etiqueta **`expo-final`**. Este documento es la
lista de lo que aún no tiene paridad en el proyecto Lynx, con su ruta exacta en esa etiqueta y el spec
que lo resuelve. Sin esta lista, el borrado sería arqueología.

Cómo leer un fichero de la etiqueta:

```bash
git show expo-final:src/lib/notifications.ts
```

## Inventario

| Pieza | Ruta en `expo-final` | Spec | Estado en el port |
|---|---|---|---|
| Pantallas de auth (login, registro, recuperación) | `app/auth/login.tsx`, `app/auth/signup.tsx`, `app/auth/forgot.tsx` | [`003`](../specs/003-auth-y-cuenta-con-insforge.md) | No existen; el registro de rutas no las incluye |
| Cliente de cuenta y sync | `src/lib/supabase.ts` | [`003`](../specs/003-auth-y-cuenta-con-insforge.md) | Puente portado en `src/lib/supabase.ts`, sin consumidor |
| Store de auth | `src/stores/authStore.ts` | [`003`](../specs/003-auth-y-cuenta-con-insforge.md) | Puente portado en `src/stores/authStore.ts` |
| Health Connect (lectura y escritura) | `src/lib/healthConnect.ts`, `src/stores/healthConnectStore.ts` | [`002`](../specs/002-nativas-notificaciones-y-health-connect.md) | Puentes portados (`src/lib/healthConnect.ts`, `src/stores/healthConnectStore.ts`); el nativo llega en `002` |
| Notificaciones del descanso | `src/lib/notifications.ts` | [`002`](../specs/002-nativas-notificaciones-y-health-connect.md) | Puente portado en `src/lib/notifications.ts`; el nativo llega en `002` |
| Capa durable (adaptador) | `src/db/` (schema, migrations y repos), `src/lib/storage.ts` | [`001`](../specs/001-host-nativo-y-almacenamiento-durable.md) | El módulo nativo SQLite ya vive en `host/android/`; falta el adaptador que lo conecta a la app (ticket 3) |
| Esquema relacional y migraciones | `supabase/schema.sql`, `supabase/migrations/*.sql` | [`001`](../specs/001-host-nativo-y-almacenamiento-durable.md) y [`003`](../specs/003-auth-y-cuenta-con-insforge.md) | Referencia para el esquema del módulo nativo y para el modelo de cuenta; `supabase/` se borró por eso, no por valor propio |

## Lo que no se migra

- **Configuración de EAS** (`eas.json`) y la de Expo (`app.json`): la distribución pasa por el host
  propio; no hay nada que portar.
- **Iconos y splash** (`assets/`): se rehacen con la identidad del host.
- **`expo-router`**: el port usa su propio registro de rutas (`src/app/routes.tsx`); no hay paridad
  que buscar.

## Por qué se borró `supabase/`

`schema.sql` y las migraciones eran el esquema de la app anterior sobre Postgres. El backend de cuenta
ya no es Supabase (`specs/003` usa InsForge), pero el esquema sigue siendo la mejor referencia del
modelo relacional (sesiones → ejercicios → sets → PRs) que el módulo nativo SQLite del `specs/001` va
a reproducir. Se conserva **en la etiqueta**, no en el árbol.

## Verificación

Con la etiqueta a mano, cada pieza se puede recuperar y comparar:

```bash
git diff expo-final -- src/lib/          # qué se portó y qué no
git show expo-final:src/db/schema.ts     # el esquema relacional original
```
