# 09 · Web de escritorio (target `web` de Lynx)

> **Estado**: dirección de producto. Los requisitos detallados, pantalla a pantalla, están en
> [`remodelacion-web/01-requisitos-web.md`](./remodelacion-web/01-requisitos-web.md).
> **Decisión de stack**: la web **no es una aplicación aparte**. Es el **target `web` de Lynx** sobre
> el mismo código de la app móvil. No hay Next.js, ni Tailwind, ni Vercel.

## 1. Qué es Strain Web

Una **aplicación privada de escritorio** para gestionar y entender el entrenamiento, centrada en el
propio usuario. No es una red social fitness, ni un producto freemium.

El móvil sigue siendo el lugar más rápido para **entrenar y registrar**. La web es el espacio cómodo
para **revisar, organizar y analizar**:

- revisar actividad reciente,
- consultar estadísticas,
- organizar rutinas,
- explorar ejercicios,
- gestionar la cuenta.

## 2. Cómo se construye (y por qué no hay una app web separada)

Rspeedy compila **dos targets del mismo proyecto**: `lynx` (nativo) y `web` (Lynx for Web). El bundle
web se previsualiza con el dev server y se puede servir en cualquier web. Eso da la web de escritorio
**sin duplicar producto**:

| Ventaja | Consecuencia |
|---|---|
| Un solo código para móvil y web | No hay dos modelos de datos ni dos UIs que se desincronicen |
| Los mismos repos y la misma *seam* de almacenamiento | Lo que funciona en móvil funciona en web |
| El mismo sistema de diseño (tokens por rol) | La web hereda color, tipografía y componentes |
| `bun run dev` sirve los dos targets a la vez | El bucle de iteración es el de [12](../12-entorno-desarrollo-lynx.md) |

La contrapartida es honesta y hay que asumirla: **el resultado web no es fidelidad nativa** (los
elementos de Lynx se mapean a elementos web) y algunas piezas no funcionan en web (nada nativo:
Health Connect, notificaciones, captura). La web es un entorno de **lectura y gestión**, no de
registro en el gimnasio.

## 3. Principios

1. **Privado antes que social**. Todo gira alrededor de los datos del usuario autenticado.
2. **Escritorio primero en la web**. La prioridad es una experiencia cómoda en pantallas grandes.
3. **Inspiración visual, no clon funcional**. Se toma el lenguaje de layout, no las features ajenas.
4. **Menos ruido**. Cada bloque aporta utilidad real al entrenamiento.
5. **Mobile para registrar, web para revisar y organizar**.

## 4. Arquitectura de información

| Sección | Propósito |
|---------|-----------|
| `Inicio` | Gráfico superior de actividad y entrenamientos recientes del usuario |
| `Rutinas` | Gestión de carpetas, rutinas y acciones rápidas |
| `Ejercicios` | Biblioteca con filtros y detalle |
| `Historial` | Lista cronológica de sesiones completadas y consulta por rangos |
| `Perfil` | Vista privada con calendario de entrenos y estadísticas resumidas |
| `Estadísticas` | Vistas analíticas agregadas |
| `Ajustes` | Cuenta, preferencias y opciones esenciales |

El layout de escritorio es: **sidebar fija**, **contenido amplio al centro** y **panel derecho
contextual** cuando la pantalla lo necesita. En el shell táctil esto se resuelve con las 5 pestañas
actuales; la adaptación a escritorio es trabajo de la parte B del sistema de diseño.

## 5. Relación entre móvil y web

| Dominio | Móvil | Web |
|---------|-------|-----|
| Workout activo | Sí, principal | No prioritario |
| Crear/editar rutinas | Sí | Sí |
| Consultar histórico | Básico | Sí, principal |
| Analítica | Básica | Sí, principal |
| Ajustes de cuenta | Sí | Sí |
| Exploración de ejercicios | Sí | Sí |

## 6. Sincronización

El modelo no cambia respecto del móvil (ver [`specs/003`](../specs/003-auth-y-cuenta-con-insforge.md)):

1. El dispositivo registra primero en local.
2. Los cambios se encolan.
3. **InsForge** centraliza los datos compartidos.
4. La web consume esos datos autenticados.

Principios: sin conexión todo sigue funcionando, la nube nunca es la fuente de verdad y el usuario no
tiene que pensar en sincronizar. **El aislamiento por usuario** (cada cuenta ve solo lo suyo) es
requisito, no detalle.

## 7. Exclusiones explícitas

Fuera: premium, suscripciones, paywalls, seguidores, siguiendo, comentarios, likes, feed social,
perfil público, enlaces a redes, atletas sugeridos y cualquier elemento de comunidad.

Traducción práctica: si una tarjeta existe solo para monetizar, se elimina; si una pantalla existe
solo para interacción social, se elimina.

## 8. Fases

No hay fases propias de la web: se apoya en las del proyecto Lynx
([11](../11-plan-app-tipo-hevy.md)) y en los specs aprobados. El orden útil es:

1. **Sistema de diseño, parte B**: adaptar las pantallas a escritorio (sidebar, panel contextual).
2. **Host y persistencia** ([`specs/001`](../specs/001-host-nativo-y-almacenamiento-durable.md)): sin
   datos durables, la web no tiene nada que leer.
3. **Cuenta y sync** ([`specs/003`](../specs/003-auth-y-cuenta-con-insforge.md)): es lo que hace que
   la web tenga datos que el móvil generó.
4. **Previsualización web en CI** ([`specs/005`](../specs/005-ci-cd.md)): publicar el bundle web para
   enseñar y revisar cambios.

## 9. Preguntas abiertas (decisión de producto)

- ¿La web es **solo lectura y gestión**, o también permite registrar entrenamientos?
- ¿Se publica en una URL propia o se queda como preview de desarrollo?
- ¿Qué pasa en web con las funciones nativas (salud, notificaciones, compartir): se ocultan o se
  muestran deshabilitadas con su motivo?
