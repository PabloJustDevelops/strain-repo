# 004 · Reestructura del repo y retirada de Expo

> Estado: **spec**, redactado el 19 sep 2026. **Este spec gobierna el borrado.** Regla dura: no se
> borra nada hasta que exista el host del `specs/001`. La red de seguridad ya está creada:
> **`git tag expo-final`** (subida al remoto).

## Problema

El repositorio **sigue siendo el proyecto Expo**. La app Expo vive en la raíz (`app/`, `src/`,
`android/`, configuración, dependencias) y el port Lynx es un subdirectorio. La documentación, la
integración continua, las skills y los scripts apuntan al proyecto viejo, lo que hace que cualquier
lector —persona o agente— trabaje sobre la base equivocada. Y hay dos aplicaciones, una de las cuales
ya no se va a mantener.

## Alcance

**Dentro**

- El **inventario exacto** de lo que queda por migrar antes de poder borrar Expo.
- El **plan de borrado**, con su red de seguridad y su **orden de pasos**.
- La **promoción** del proyecto Lynx a la raíz del repositorio.
- La lista de **skills candidatas a retirada** (abajo), para que las decida el dueño.

**Fuera**

- Implementar el host, el almacenamiento, las nativas o el CI (→ specs 001, 002, 003 y 005).
- Cualquier refactor de código de producto.

## Inventario de lo que falta por migrar (ya medido)

Antes de borrar Expo, el port Lynx debe tener paridad en estas cinco piezas. Es la lista cerrada, no
una estimación abierta:

| # | Pieza | Spec que la resuelve |
|---|---|---|
| 1 | **Las 3 pantallas de auth** (login, registro, recuperación) | `specs/003` |
| 2 | **La capa durable** (hoy no sobrevive al cierre) | `specs/001` |
| 3 | **Health Connect** (lectura y escritura) | `specs/002` |
| 4 | **Notificaciones** (aviso del descanso) | `specs/002` |
| 5 | **La cuenta** (perfil, sesión y sincronización) | `specs/003` |

Todo lo demás —pantallas de entrenamiento, rutinas, historial, progreso, biblioteca, sistema de
diseño— **ya está migrado** en el port Lynx.

## Decisiones con motivos

### Estrategia: ampliar y luego contraer

Primero se construye lo nuevo **al lado** de lo viejo (el host y las cinco piezas, en el árbol del
proyecto Lynx) y solo cuando la paridad está cerrada se promueve Lynx a la raíz y se borra Expo. Es la
secuencia de un cambio cuyo alcance toca todo el repositorio: no se puede hacer de una vez y mantener
el trabajo en verde. Motivo: mientras la app Expo siga siendo funcional, el repositorio nunca queda
sin una aplicación que arranca.

### La etiqueta como red de seguridad

`expo-final` apunta al último estado con Expo intacta. Motivo: es el punto de retorno barato. **Pero**
hay una limitación que hay que decir en voz alta: la carpeta `android/` de la raíz está ignorada por
git, así que el *prebuild* nativo de Expo **no está versionado** y la etiqueta no lo restaura. Es una
razón añadida para no borrar nada hasta tener un host propio que funcione.

### El host no vive en `android/`

La carpeta `android/` de la raíz está ignorada y, además, es el *prebuild* de Expo. El host nuevo del
`specs/001` nace en el árbol del proyecto Lynx, que sí se versiona. Cuando el proyecto Lynx se promueva
a la raíz, la política de `.gitignore` se ajusta para que el host quede versionado: la regla genérica
que ignora `android/` deja de aplicar al host nuevo.

### Orden de promoción y borrado

El orden importa porque cada paso depende de que el anterior esté verde:

1. Host y capa durable funcionando (`specs/001`).
2. Nativas y auth/cuenta migradas y verificadas (`specs/002`, `specs/003`).
3. **Checklist de paridad cerrada** (ticket 1): ninguna pieza del inventario pendiente.
4. Promoción: el contenido del proyecto Lynx pasa a la raíz.
5. Reescritura de lo que apunta al proyecto viejo: scripts, configuración, integración continua,
   documentación e índices.
6. Borrado de los artefactos Expo: pantallas, capa de datos y utilidades de la app vieja, su *prebuild*
   `android/`, la configuración de Expo y de EAS, los ficheros de configuración de *bundler*, la
   configuración de la base de datos local de Expo, el esquema de Supabase y el tipado generado.
7. Retirada de las dependencias de Expo del manifiesto de paquetes.
8. Verificación final: instalación limpia, pruebas verdes, APK del host y documentación sin
   referencias obsoletas.

## Skills candidatas a retirada

No se borra ninguna en este bloque. Se listan con su motivo para que el dueño decida.

| Skill | Motivo | Recomendación |
|---|---|---|
| `nextjs`, `vercel-composition-patterns`, `vercel-react-best-practices` | La web deja de ser Next/Vercel: pasa a ser el target web de Lynx | Retirar |
| `tailwind-4-docs`, `tailwind-design-system` | Lynx usa su subconjunto de CSS y su propio sistema de tokens, no Tailwind | Retirar |
| `use-dom`, `building-native-ui`, `native-data-fetching` | Son específicas de Expo y su runtime | Retirar |
| `supabase-postgres-best-practices` | Supabase sale; la cuenta pasa a InsForge | Retirar o sustituir |
| `drizzle` | Drizzle solo sobrevive como fuga desde las dependencias de la raíz | Retirar al limpiar la fuga |
| `seo` | No hay producto web público que posicionar | Retirar |
| `nodejs-backend-patterns`, `nodejs-best-practices` | No hay backend en este repositorio | Dudoso |
| `sleek-design-mobile-apps`, `frontend-design`, `accessibility`, `typescript-advanced-types`, `zod` | Posiblemente aplicables | Conservar |
| Las de SDD y las 8 oficiales de Lynx | Base del flujo | Conservar |

## Criterios de aceptación (medibles)

- [ ] El **checklist de paridad** del inventario está 100 % cerrado y firmado antes de borrar nada.
- [ ] Tras la reestructura, `bun install` es limpio y las pruebas del proyecto Lynx están en verde
      desde la raíz.
- [ ] El APK del host se construye desde la nueva estructura.
- [ ] `git tag expo-final` sigue existiendo y permite volver al estado anterior.
- [ ] En la documentación no queda ninguna mención a Expo salvo las marcadas como históricas.
- [ ] Las cinco piezas del inventario funcionan en la app resultante.

## Riesgos

- **Borrar antes de tiempo** es el riesgo central; la regla dura y el checklist existen por eso.
- El *prebuild* `android/` de Expo **no es recuperable desde git**, así que el rollback nativo no
  existe: si el host nuevo falla después de borrar, no hay vuelta atrás por esa vía.
- La promoción a la raíz toca rutas en documentación, CI, configuración y *scripts*; es donde más
  fácil se cuela una referencia rota.
- Retirar dependencias de Expo puede arrastrar paquetes que el proyecto Lynx aún usa de forma
  indirecta (el caso conocido es la fuga de `drizzle-orm`): hay que limpiar antes de desinstalar.

## Preguntas abiertas (decisión de producto)

- ¿En qué momento exacto se promueve el proyecto Lynx a la raíz: al cerrar el `specs/001`, o al cerrar
  los tres specs?
- ¿Se conserva algún artefacto de Expo por valor histórico o se borra todo?
- ¿Qué destino tiene `supabase/` (borrar, archivar, o dejar solo como referencia)?
- Confirmación de la tabla de skills candidatas: ¿alguna se conserva?

## Tickets

1. **Checklist de paridad** — convertir el inventario en una lista verificable y cerrarla entera.
   *Bloqueado por:* `specs/001`, `specs/002`, `specs/003`.
2. **Promover Lynx a la raíz** — mover el proyecto y dejar el repositorio arrancando desde la raíz.
   *Bloqueado por:* 1.
3. **Reescribir rutas y configuración** — scripts, configuración de *bundler*, tipado, integración
   continua y `.gitignore` (incluido el host). *Bloqueado por:* 2.
4. **Borrar los artefactos Expo** — pantallas, capa de datos, *prebuild*, configuración de Expo y de
   EAS, *bundlers*, base de datos local y esquema de Supabase. *Bloqueado por:* 3.
5. **Retirar las dependencias de Expo** — limpiar primero la fuga de `drizzle-orm`, luego desinstalar.
   *Bloqueado por:* 4.
6. **Retirar las skills candidatas** — aplicar la decisión del dueño sobre la tabla. *Bloqueado por:*
   4.
7. **Verificación final** — instalación limpia, pruebas verdes, APK del host y documentación sin
   referencias obsoletas. *Bloqueado por:* 5, 6.
