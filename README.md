# Strain

App de seguimiento de entrenamientos de gimnasio, estilo Hevy, **Android-first y offline por
defecto**, construida sobre **Lynx** con **ReactLynx** y **Rspeedy**.

## Estado del proyecto

> **En transición**: el proyecto Lynx vive hoy en `lynx/` y es donde está el trabajo. La **app Expo**
> de la raíz es **legado**, no recibe features y se retira por el
> [`specs/004`](./specs/004-reestructura-del-repo-y-retirada-de-expo.md). Nada se borra hasta que
> exista el host nativo del [`specs/001`](./specs/001-host-nativo-y-almacenamiento-durable.md). La red
> de seguridad es la etiqueta **`expo-final`**.

Dos límites que conviene saber antes de tocar nada:

- **La persistencia todavía no es durable**: cerrar la app pierde lo registrado. Es el primer problema
  que resuelve el [`specs/001`](./specs/001-host-nativo-y-almacenamiento-durable.md).
- **No hay app propia**: hoy se ejecuta dentro de **Lynx Explorer**, así que las funciones nativas
  (notificaciones, Health Connect) y el build Android llegan con el host del mismo spec.

## Características (port Lynx)

- 💪 **Biblioteca de ejercicios** con categorización por grupo muscular y equipo (47 en el seed)
- 🏋️ **Rutinas**: crear, editar, añadir ejercicios y **reordenar arrastrando**
- ⏱️ **Modo workout activo** con cronómetro, descanso automático, calculadora de discos y RPE/notas
- 📈 **Progreso** con volumen semanal, PRs (1RM estimado), racha y heatmap
- 📅 **Historial** con detalle de cada sesión
- 🎨 **Sistema de diseño propio**: tokens por rol, contraste medido, tipografía y espaciado
- 📴 **Local-first**: funciona sin conexión

## Stack

| Capa | Tecnología |
|---|---|
| UI | **ReactLynx** (`@lynx-js/react`) sobre el motor **Lynx** |
| Build | **Rspeedy** con dos targets: `lynx` (nativo) y `web` (Lynx for Web) |
| Componentes | **`@lynx-js/lynx-ui`** |
| Estado | **Zustand** |
| Persistencia | *Seam* propia (**hoy no durable** → [`specs/001`](./specs/001-host-nativo-y-almacenamiento-durable.md)) |
| Cuenta / sync | **InsForge** (opcional → [`specs/003`](./specs/003-auth-y-cuenta-con-insforge.md)) |
| Testing | **Vitest** |
| Paquetes | **bun 1.4.2** |

Detalle en [`docs/02-stack.md`](./docs/02-stack.md) y [`docs/03-architecture.md`](./docs/03-architecture.md).

## Estructura del proyecto

```
strain-repo/
├── lynx/                  ← el proyecto (Lynx + ReactLynx + Rspeedy)
│   ├── src/screens/       # 14 pantallas
│   ├── src/components/    # UI compartida y shell
│   ├── src/db/            # repos, schema y la seam de almacenamiento
│   ├── src/stores/        # Zustand
│   └── src/lib/           # lógica pura de dominio, formato y tema
├── specs/                 ← specs (SDD), numerados y con tickets
├── docs/                  ← documentación del proyecto
├── .agents/skills/        ← skills de SDD y de Lynx
│
└── app/ src/ android/ app.json eas.json   ← app Expo (LEGADO, se retira)
```

## Primeros pasos

```bash
git clone https://github.com/PabloJustDevelops/strain-repo.git
cd strain-repo/lynx
bun install

bun run dev         # dev server (puerto 3000): target web + QR para Lynx Explorer
bun run typecheck   # tsc --noEmit
bun run test        # vitest run
bun run build       # dist/main.lynx.bundle + dist/main.web.bundle
```

El bucle de trabajo tiene tres niveles —navegador para iterar, móvil real para validar, emulador para
automatizar— y está explicado en
[`docs/12-entorno-desarrollo-lynx.md`](./docs/12-entorno-desarrollo-lynx.md). El setup completo, en
[`docs/08-setup.md`](./docs/08-setup.md).

## Documentación y specs

- **Documentación**: [`docs/README.md`](./docs/README.md) (índice).
- **Decisiones**: [`docs/07-decisions.md`](./docs/07-decisions.md) (`D1`…`D14`).
- **Specs (SDD)**: [`specs/`](./specs) — host y almacenamiento durable, nativas, auth/cuenta, retirada
  de Expo y CI/CD.
- **Glosario de dominio**: [`CONTEXT.md`](./CONTEXT.md).
- **Guía para agentes**: [`AGENTS.md`](./AGENTS.md).

## Licencia

MIT
