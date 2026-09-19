# 08 · Setup local

## Requisitos

- **Node 20.x** (recomendado LTS).
- **bun 1.4.2** ([bun.sh](https://bun.sh) — `npm install -g bun` o el instalador oficial).
- **Android Studio + JDK 17** (solo para builds Android / testing de Health Connect).
- **Expo CLI** (se invoca vía `bun` sin instalar global).

## Instalación

```bash
# Clonar el repo
git clone https://github.com/PabloJustDevelops/strain-repo.git
cd strain-repo

# Instalar dependencias
bun install
```

> Si vienes de npm/pnpm/yarn: asegúrate de borrar `package-lock.json`, `pnpm-lock.yaml` o `yarn.lock` antes. El proyecto solo mantiene `bun.lock`.

## Scripts

| Comando | Qué hace |
|---------|----------|
| `bun run start` | Metro bundler en modo interactivo (elige plataforma) |
| `bun run android` | Build debug Android (necesita emulador o device) |
| `bun run web` | Build web (preview de desarrollo) |
| `bun run lint` | ESLint sobre todo el código |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run db:generate` | Genera SQL desde el schema Drizzle |
| `bun run db:migrate` | Aplica las migrations a la DB local |
| `bun run db:seed` | Puebla con ejercicios base |
| `bun run build:web` | Build de producción web (no soportado oficialmente, solo para preview) |

## Web (este dev session)

1. Asegúrate de tener `react-native-web` instalado:

   ```bash
   bun add react-native-web@~0.19.13
   ```

2. Levanta el servidor:

   ```bash
   bun run web
   ```

3. Abre `http://localhost:8081` en el navegador.

> Nota: la web es solo para **preview de desarrollo**. La app real es Android. Algunos flujos (Health Connect, ViewShot) no funcionan en web.

## Android (build real)

1. Instala Android Studio + un device/emulador con **Android 14+** (Health Connect requiere API 34).
2. Conecta el device por USB con depuración activada.
3. `bun run android` → Metro compila, instala y arranca en el device.

> Health Connect se testeable en device físico con la app "Health Connect" instalada (o el plugin en Pixel/Android 14+).

## Variables de entorno

Usa `docs/.env.example` como plantilla y crea `.env` en la raiz:

- `EXPO_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Anon key pública.

Sin estas variables, la app funciona en modo offline-only; el auth y el sync a la nube fallarán silenciosamente (UX controlada: banner de "no conectado").

## Estructura de migrations

Las migrations viven en `src/db/migrations.ts` como array numerado. Para añadir una nueva:

```ts
// src/db/migrations.ts
{
  id: '004_add_superset_to_routine_exercises',
  sql: `ALTER TABLE routine_exercises ADD COLUMN superset_id TEXT;`,
}
```

El runner las ejecuta en orden y registra las ya aplicadas en la tabla `_migrations`.

## Tests (pendiente)

Aún no hay suite configurada. Plan inmediato:

- **Vitest** para lógica pura (`format.ts`, `plateCalculator.ts`, helpers de repositories).
- **Playwright E2E** para el flow completo: signup → start workout → finish → ver en history → compartir.

Ver [06-problemas](./06-known-issues.md) para más detalle.

## Troubleshooting rápido

| Síntoma | Causa probable | Fix |
|---------|----------------|-----|
| `Unable to resolve module @babel/runtime/...` | Hoist incompleto (era un problema de pnpm con `node_modules` anidados) | Con bun la instalación es plana, así que ya no debería aparecer; si reaparece, comprobar que el paquete está instalado y correr `bun install` |
| `Maximum call stack size exceeded` en Metro | `resolveRequest` recursivo en `metro.config.js` | Usar `context.resolveRequest(context, module, platform)`, nunca `config.resolver.resolveRequest` |
| `It looks like you're trying to use web support...` | Falta `react-native-web` | `bun add react-native-web@~0.19.13` |
| `Health Connect not available` en device | Device sin la app / Android < 14 | Instalar Health Connect desde Play Store o usar device Pixel |
| Migraciones duplicadas | Re-editaste una ya aplicada | Borrar tabla `_migrations` o hacer downgrade manual |
