# Plan de la web de escritorio (target `web` de Lynx)

**Actualizado**: 19 sep 2026
**Ámbito**: la web de escritorio de Strain, que es el **target `web` de Lynx**.

## Qué cambió respecto del plan anterior

El plan anterior proponía una **app web separada** dentro de una carpeta `web/`, construida con
**Next.js + Tailwind + Vercel** y hablando directamente con **Supabase**. Esa dirección **quedó
descartada** al elegir Lynx como base única:

- **No hay carpeta `web/` ni segunda aplicación.** Rspeedy compila el target `web` desde el mismo
  código que el target `lynx`.
- **No hay Next.js, ni Tailwind, ni Vercel.** La UI usa ReactLynx y el sistema de tokens del proyecto.
- **No hay `supabase-js` ni `Supabase Auth`**: la cuenta y la sincronización pasan a **InsForge**
  ([`specs/003`](../../specs/003-auth-y-cuenta-con-insforge.md)).
- **No hay una capa de adaptadores de datos web**: la web consume **los mismos repos** que el móvil.

Motivo de fondo: mantener dos bases (una nativa y otra web) duplica modelo de datos, autenticación y
UI, y garantiza que se desincronicen. Con el target `web`, la web es una **salida más** del mismo
proyecto.

## Consecuencias prácticas

| Antes (descartado) | Ahora |
|---|---|
| Scaffold de `web/` con Next.js | Nada: el target `web` ya existe en `lynx.config.ts` |
| Tailwind + tokens web propios | El sistema de tokens por rol del proyecto |
| `supabase-js` + middleware de auth | InsForge, compartido con móvil (`specs/003`) |
| Adaptadores de datos web | Los repos existentes sobre la seam |
| Deploy en Vercel | Preview del bundle web (dev server) y, si se decide, publicación del bundle |

## Qué queda por hacer

Los requisitos funcionales siguen vigentes en
[`01-requisitos-web.md`](./01-requisitos-web.md). El trabajo es:

1. **Adaptar las pantallas al escritorio**: sidebar fija, contenido amplio, panel derecho contextual.
   Es la parte B del sistema de diseño, no una app nueva.
2. **Depender de lo durable**: sin almacenamiento durable
   ([`specs/001`](../../specs/001-host-nativo-y-almacenamiento-durable.md)) la web no tiene datos.
3. **Cuenta y sync**: [`specs/003`](../../specs/003-auth-y-cuenta-con-insforge.md) es lo que hace que
   la web lea lo que el móvil generó.
4. **Previsualización en CI**: [`specs/005`](../../specs/005-ci-cd.md).
5. **Decidir el alcance**: si la web también registra entrenamientos o es solo lectura y gestión.

## Riesgos

- **Fidelidad**: el target web no reproduce el comportamiento nativo. Sirve para composición, lectura
  y gestión, no para dar por bueno el táctil ni el rendimiento.
- **Funciones nativas ausentes en web**: salud, notificaciones y captura no existen en ese target; hay
  que decidir cómo se muestran (ocultas o deshabilitadas con su motivo).
- **Alcance ambiguo**: sin una decisión sobre si la web registra o solo lee, cualquier pantalla puede
  crecer de más.
