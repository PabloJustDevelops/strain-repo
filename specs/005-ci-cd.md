# 005 · CI/CD

> Estado: **spec**, redactado el 19 sep 2026. Aplica al repositorio completo y se va activando por
> etapas; no depende de que la reestructura del `specs/004` esté hecha.

## Problema

La integración continua **solo mira la app Expo**. El único trabajo que corre instala dependencias,
pasa el lint, comprueba tipos y ejecuta las pruebas de la aplicación vieja. El producto real —el
proyecto Lynx— **no se comprueba en absoluto**: nada impide subir un cambio que rompa su tipado, sus
pruebas o su tamaño de *bundle*. Y no hay ninguna capa de seguridad, de revisión de dependencias, de
*release* ni de verificación del host Android.

## Alcance

**Dentro**

- Definir **qué debe correr en cada propuesta de cambio** y **qué en cada envío a la rama principal**.
- El **conjunto recomendado** (lo que se activa ya) y el **conjunto de futuro**, cada uno con su
  porqué y su coste.

**Fuera**

- Implementar la promoción a la raíz (→ `specs/004`).
- Publicar la app en tiendas.

## Conjunto recomendado (activable ya)

En cada propuesta de cambio y en cada envío a la rama principal:

| Acción | Por qué | Coste |
|---|---|---|
| **Trabajo del proyecto Lynx**: comprobación de tipos, pruebas y build | Es el producto. Hoy no se comprueba nada de él | Minutos de máquina; es el trabajo que más aporta |
| **Presupuesto de tamaño de bundle** | El *bundle* ha crecido por fases (de 250 a 550 kB) y ninguna fase lo vigila. Un umbral convierte el crecimiento en una decisión, no en un accidente | Bajo: leer el tamaño de los dos artefactos y comparar con el umbral |
| **Mantener el trabajo de la raíz** (lint, tipos, pruebas) | Mientras la app Expo exista es la que se usa; retirarlo ahora dejaría el repositorio sin red | El coste actual |
| **Escaneo de secretos** | Es el fallo más caro y más fácil de cometer: un token de InsForge commiteado es una filtración | Bajo (y la protección de envío de GitHub es gratis) |
| **Revisión de dependencias (Dependabot)** | Las dependencias nativas y de Lynx se mueven rápido; enterarse por una alerta es tarde | Ruido de propuestas que hay que triar |
| **Comprobación de título y etiquetas de la propuesta** | Mantiene el vocabulario de triaje del repositorio coherente | Bajo |

## Conjunto de futuro (tras la reestructura)

| Acción | Por qué | Coste |
|---|---|---|
| **Análisis estático de seguridad (CodeQL)** sobre el JavaScript/TypeScript y sobre el Kotlin del host | El host nativo añade superficie nueva; el análisis estático encuentra clases de fallo que el lint no ve | Minutos por ejecución y configuración inicial |
| ***Release* por etiqueta** | Un artefacto por versión, generado de forma reproducible | Configuración de firma y de secretos |
| **Build del host Android** | Verifica que el binario que se distribuye compila, no solo que el código compila | Lento; necesita JDK y caché de Gradle |
| **Pruebas de extremo a extremo en emulador con Maestro** | Es el único entorno automatizable para flujos reales (arranque, entrenar, finalizar) | Lento y frágil; se reserva para la regresión, no para cada cambio |
| **Previsualización web del target Lynx** | Publicar el *bundle* web permite enseñar y revisar un cambio sin instalar nada | Publicar un artefacto por cambio |

## Decisiones con motivos

- **El presupuesto de *bundle* va en el conjunto recomendado, no en el futuro.** Es barato y ataca un
  problema que ya se está materializando. El umbral debe fijarse **por encima de la cifra actual**
  (549,9 kB nativo y 542,7 kB web) y subirse solo con una decisión explícita. **Decidido (19 sep 2026)**:
  **650 kB** para los dos targets, con margen sobre lo medido; la decisión es **D16** y el número vive
  en `lynx/scripts/check-bundle-size.mjs`.
- **El escaneo de secretos es lo primero de la capa de seguridad**: protege la credencial del backend
  antes de que exista, y no cuesta casi nada.
- **Las pruebas de extremo a extremo y el build del host se dejan para el futuro** porque son lentas y
  frágiles: ponerlas como puerta de cada cambio ralentizaría el desarrollo sin cubrir el riesgo
  principal, que hoy es «no se comprueba el producto». Se activan cuando exista el host.

## Criterios de aceptación (medibles)

- [x] Una propuesta de cambio de prueba pasa en verde con los trabajos nuevos. *(Pendiente de la
  ejecución real al empujar la rama; en local pasan los cinco: raíz, Lynx, presupuesto, secretos y
  comprobación de la propuesta.)*
- [x] Un cambio que rompe el tipado del proyecto Lynx **falla** la integración (prueba negativa).
- [x] Un cambio que engorda el *bundle* por encima del umbral **falla** la integración.
- [x] Un secreto de prueba introducido a propósito es **detectado**. *(PAT simulado en un directorio
  temporal: regla `github-pat`, con fichero y línea.)*
- [x] El trabajo de la raíz sigue en verde mientras la app Expo exista.

## Riesgos

- **Ruido y fatiga**: demasiados trabajos que fallan por motivos ajenos al cambio hacen que se ignoren.
  Conviene activarlos por etapas y con umbrales holgados al principio.
- **Coste de cómputo**: CodeQL, Gradle y Maestro juntos pueden consumir más que el trabajo actual;
  medirlo antes de ponerlo como puerta obligatoria.
- **Duplicidad transitoria**: mientras convivan Expo y Lynx, hay dos trabajos de pruebas; es temporal
  y desaparece con el `specs/004`.
- El presupuesto de *bundle* es un número que alguien tiene que mantener; sin dueño, se relaja hasta
  dejar de servir.

## Estado de implementación (19 sep 2026)

Este run implementa los tickets **1-5** (el conjunto recomendado, salvo el análisis estático, que es
futuro). Los tickets 6-10 quedan sin tocar.

| Ticket | Estado | Dónde |
|---|---|---|
| 1 · Trabajo de Lynx | **Hecho** | Trabajo `lynx` en `.github/workflows/ci.yml`: `bun install --frozen-lockfile` con caché de `~/.bun/install/cache`, `bun run typecheck`, `bun run test` (152/152) y `bun run build` |
| 2 · Presupuesto de bundle | **Hecho** | Trabajo `bundle-budget`, que descarga los artefactos del trabajo de Lynx y corre `lynx/scripts/check-bundle-size.mjs` (umbral 650 kB, D16) |
| 3 · Escaneo de secretos | **Hecho** | Trabajo `secret-scan` con `gitleaks/gitleaks-action@v2` (versión fijada 8.30.1) y `.gitleaks.toml`. Auditoría del historial: **117 commits, sin fugas** |
| 4 · Revisión de dependencias | **Hecho** | `.github/dependabot.yml`: npm (raíz y `lynx/`), gradle (`lynx/host/android`) y github-actions; semanal y con menores/parches agrupados |
| 5 · Comprobación de la propuesta | **Hecho, en modo aviso** | Trabajo `pr` con `.github/scripts/check-pr.mjs`: valida el título (Conventional Commits) y avisa de las etiquetas de triaje. **Avisa, no bloquea**: el repo todavía no tiene reglas de protección de rama; cuando las tenga, el script puede terminar en `exit 1` |
| 6-10 · Conjunto de futuro | **Pendiente** | CodeQL, *release* por etiqueta, build del host, Maestro y previsualización web |

**Pruebas negativas de este run**: romper un tipo en `lynx/src/lib/format.ts` hace fallar el trabajo
de Lynx (`tsc` → `exit 2`, `error TS2322`); bajar el umbral a 500 kB hace fallar el presupuesto
(`exit 1`, los dos artefactos por encima). Las dos pruebas se revirtieron.

## Preguntas abiertas (decisión de producto)

- ~~¿Qué umbral de *bundle* se acepta y quién lo sube?~~ **Resuelto**: 650 kB para los dos targets
  (D16). Lo sube quien registre una decisión nueva que la sustituya.
- ¿Se asume el coste de CodeQL y de las pruebas de extremo a extremo en cada cambio, o solo antes de
  una *release*?
- ¿La previsualización web se publica en cada cambio o solo en la rama principal?
- ¿Cuándo la comprobación de la propuesta pasa de avisar a bloquear (reglas de protección de rama)?

## Tickets

1. **Trabajo de Lynx** — comprobación de tipos, pruebas y build del proyecto Lynx en cada cambio.
   *Bloqueado por:* ninguna (puede empezar ya). **Hecho.**
2. **Presupuesto de bundle** — medir los dos artefactos y fallar por encima del umbral. *Bloqueado
   por:* 1. **Hecho** (650 kB, D16).
3. **Escaneo de secretos** — activar protección de envío y un trabajo de detección. *Bloqueado por:*
   ninguna (puede empezar ya). **Hecho.**
4. **Revisión de dependencias** — configurar Dependabot y su triaje. *Bloqueado por:* ninguna.
   **Hecho.**
5. **Comprobación de la propuesta** — título y etiquetas según el vocabulario del repositorio.
   *Bloqueado por:* ninguna. **Hecho, en modo aviso.**
6. **Análisis estático** — CodeQL sobre JavaScript/TypeScript y Kotlin. *Bloqueado por:* `specs/001`
   ticket 1.
7. ***Release* por etiqueta** — artefacto reproducible en cada etiqueta de versión. *Bloqueado por:*
   6.
8. **Build del host Android** — compilar el APK del host en integración continua. *Bloqueado por:*
   `specs/001` ticket 1.
9. **Extremo a extremo con Maestro** — flujo arranque → entrenar → finalizar en emulador.
   *Bloqueado por:* 8.
10. **Previsualización web** — publicar el *bundle* del target web. *Bloqueado por:* 1.
