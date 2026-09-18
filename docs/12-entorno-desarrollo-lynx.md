# 12 · Entornos de desarrollo y preview de Lynx

> Redactado el 19 sep 2026 a partir de la documentación oficial de Lynx leída ese día
> (`lynxjs.org/guide/start/quick-start.md`, `lynxjs.org/llms.txt`, `lynxjs.org/llms-full.txt`) y de los
> activos publicados en `github.com/lynx-family/lynx/releases`. Todo lo que sigue está verificado en la
> fuente; lo que no, va marcado como pendiente de comprobar.
>
> Motivo: el bucle de trabajo actual pasa por un **emulador Android**, que es lento, pesado y frágil
> para iterar UI (los toques a ciegas del 18-19 sep aterrizaron en Chrome y en Ajustes en vez de en la
> app). Hay opciones mejores y la documentación las describe.

## 1. Las opciones, comparadas

| # | Entorno | Qué es | Ventaja | Límite |
|---|---|---|---|---|
| 1 | **Navegador (Lynx for Web)** | El motor Lynx implementado en el navegador | Iteración en segundos, inspeccionable (DOM/CSS), ideal para revisar diseño | No es fidelidad nativa: los elementos se mapean a elementos web |
| 2 | **Móvil real por QR** | Lynx Explorer en tu teléfono + servidor de desarrollo | Táctil y rendimiento reales; cero emulador y cero `adb` | Hay que tener el móvil a mano; no automatizable |
| 3 | **Escritorio Windows** | Lynx Explorer de escritorio | Ventana nativa en el PC, sin emulador | No representa el táctil |
| 4 | **Emulador Android** *(actual)* | Lynx Explorer en un AVD | Único donde se puede automatizar (adb/Maestro) y sacar capturas repetibles | Lento, pesado y frágil |
| 5 | iOS Simulator | Lynx Explorer precompilado | — | Sólo macOS: descartado en tu equipo |

## 2. Opción 1 · Navegador (Lynx for Web) — el bucle rápido

Es la novedad útil: Lynx tiene plataforma web y Rspeedy puede compilar a ella.

1. En `lynx.config.ts`, declarar los dos entornos:

```ts
import { defineConfig } from '@lynx-js/rspeedy';
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin';

export default defineConfig({
  plugins: [pluginReactLynx()],
  environments: {
    web: {},
    lynx: {},
  },
});
```

2. `pnpm dev` levanta el servidor y **la página de desarrollo se abre en el navegador** (textual de la
   doc: "You can now visit the development page locally").
3. `pnpm build` genera además `dist/main.web.bundle`, que se previsualiza en el **Web Explorer**
   (`https://www.unpkg.com/@lynx-js/web-explorer@latest/index.html`) o se incrusta en cualquier web con
   `@lynx-js/web-core` (`0.26.1`, "The Web Platform of Lynx / Lynx for Web").

Por qué importa aquí: con esto **yo puedo abrir la app en un navegador real, leer el DOM y el CSS,
pulsar por selector y sacar capturas** en vez de tocar coordenadas a ciegas en un emulador. Es
exactamente el hueco que hacía tan lenta la verificación de UI.

Aviso de fidelidad: el resultado web no es el nativo. Sirve para composición, tipografía, color,
navegación y estados; **no** para dar por bueno el táctil, el rendimiento ni nada nativo.

Nota práctica del repo: el `lynx/lynx.config.ts` del proyecto es de los agentes, y el preview local usa
una copia con su propia configuración. Al montar esto, tocar los dos.

## 3. Opción 2 · Móvil real por QR — la validación de verdad

1. Requisitos: Node.js **20.19+** (o 22.12+).
2. `pnpm dev` en el proyecto. La terminal imprime un **código QR**.
3. En el móvil, instalar **Lynx Explorer** (Android):
   - APK oficial: `https://github.com/lynx-family/lynx/releases/download/4.1.0/LynxExplorer-noasan-release.apk` (173 MB).
   - O desde Play Store: "Lynx Go Dev Explorer" (`com.funcs.io.lynx.go`) — versión de la comunidad, no del equipo de Lynx.
   - En iOS hay versión de la comunidad en el App Store (`id6743227790`), también no oficial.
4. Escanear el QR desde la app, o pegar la URL del bundle en **"Enter Card URL"** y pulsar **Go**.
5. Móvil y PC en la **misma red Wi-Fi** (el servidor de desarrollo escucha en todas las interfaces).

## 4. Opción 3 · Escritorio Windows

Existe `LynxExplorer-windows-x64.tar.gz` (19,0 MB) en la release 4.1.0, además del SDK nativo
(`lynx_sdk_windows_x64.zip`, 9,3 MB). Se descomprime, se abre la aplicación y se le da la misma URL de
bundle. Pendiente de comprobar en tu equipo: cómo se le pasa la URL exactamente (no está documentado en
la guía de inicio, que sólo cubre iOS Simulator, Android y HarmonyOS).

## 5. Opción 4 · Emulador Android (lo que seguimos teniendo)

Sigue siendo el único entorno donde se puede **automatizar**: `adb` para capturas y toques, Maestro para
flujos, y las capturas quedan como evidencia. Se queda, pero **sólo para la comprobación final y la
regresión**, no como bucle de iteración.
En la máquina: AVD `strain` (android-36, x86_64), Lynx Explorer instalado, `adb reverse tcp:3100` ya
hecho y el servidor en `0.0.0.0:3100`.

URL que se usa dentro del emulador: `http://localhost:3100/main.lynx.bundle`.

## 6. Depuración: el DevTool

- **Lynx DevTool Desktop Application** (`github.com/lynx-family/lynx-devtool/releases`): aplicación de
  escritorio con paneles **Elements, Console, Sources, Layers** y **Preact DevTools**, más Trace para
  rendimiento. Requiere activar los interruptores **Lynx Debug** y **Lynx DevTool** en la app Explorer, y
  se conecta por cable (daemon).
- **Vía CLI/CDP**: el paquete `@lynx-js/skill-lynx-devtool` da acceso a la misma información desde fuera
  (consola, DOM/CSS, capturas, árbol de componentes, toques). Está instalado como skill en Hermes, así que
  soy yo quien puede mirar dentro de la app corriendo sin depender de capturas de pantalla.

## 7. Decisión propuesta

Bucle de tres niveles, y montar los niveles 0 y 1 ya (fase **F0** del plan, `docs/11-plan-app-tipo-hevy.md`):

1. **Iterar** (segundos): navegador, con `environments.web` activado.
2. **Validar** (experiencia real): móvil por QR, cuando algo tiene que sentirse bien de verdad.
3. **Automatizar y regresión** (evidencia): emulador Android con `adb`/Maestro.

Coste estimado de montarlo: un run corto (tocar la configuración de Rspeedy, añadir el script de
preview, comprobar que la app arranca en el navegador y documentarlo). Con el presupuesto del plan al
88,7% el 19 sep, entra sin problema; no entra si se convierte en un rediseño.

## 8. Fuentes

- Quick start y Explorer: `https://lynxjs.org/guide/start/quick-start.md`
- Lynx for Web: `https://lynxjs.org/llms-full.txt` (sección "Lynx for Web" de la doc completa)
- Índice de documentación para agentes: `https://lynxjs.org/llms.txt`
- Activos y versiones del Explorer: `https://github.com/lynx-family/lynx/releases`
- DevTool de escritorio: `https://github.com/lynx-family/lynx-devtool/releases`
