# 12 · El bucle de desarrollo de Lynx

> Reescrito el 19 sep 2026. El bucle diario es **navegador (preview) → DevTool → móvil real por QR**.
> `adb` y el emulador **no** forman parte de él: el host Android es un **artefacto de distribución**, y
> la única prueba que necesita un dispositivo (durabilidad entre procesos) va aparte y **a demanda**.
>
> Lo que sigue está verificado en este repo; las comprobaciones y su salida real están en §7.

## 1 · El bucle, de un vistazo

| Nivel | Cuándo | Cómo | Coste |
|---|---|---|---|
| **Iterar** | casi siempre | `bun run dev` + la página de preview en el navegador (§2) | segundos |
| **Inspeccionar** | cuando algo no se ve | DevTools del navegador (web) o **Lynx DevTool** (nativo) (§3) | — |
| **Validar en real** | antes de dar algo por bueno | el **QR** de `bun run dev` + **Lynx Explorer** (§4) | hace falta el móvil |
| **Artefacto** | sólo para distribuir | `bun run build` + el host Android (§5) | lento |

`adb` y el emulador quedan **fuera** del bucle: sólo aparecen en §6, la prueba de durabilidad entre
procesos, que es la única que necesita un dispositivo.

## 2 · Iterar · la página de preview en el navegador

`bun run dev` (= `rspeedy dev`) levanta el servidor en el puerto **3000** y compila los dos targets
(`lynx` y `web`). La app se abre en el navegador en:

```
http://localhost:3000/__web_preview?casename=main.web.bundle
```

Detalles que importan:

- **La raíz `/` no es una página** (devuelve **404**): Rspeedy sirve *bundles*, no un `index.html`. La
  única página la sirve la ruta del shell de Lynx for Web, `/__web_preview`.
- Esa ruta construye un `<lynx-view>`, le pasa el parámetro **`casename`** como URL del bundle, y
  responde con `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Embedder-Policy: require-corp`.
  Ese **aislamiento cross-origin** es lo que habilita `SharedArrayBuffer`, que el runtime web necesita.
- El bundle que carga es **`/main.web.bundle`**, compilado y recompilado por el propio dev server (no el
  de `dist/`, que es el artefacto de build). Así se itera sin reconstruir.

Para abrirlo de un comando, con el dev server en marcha:

```bash
bun run preview:web                # abre la URL de arriba en el navegador por defecto
bun run preview:web --port 3100    # si cambiaste el puerto del dev server
```

Qué se puede hacer aquí y qué no. Sirve para composición, tipografía, color, espaciado, navegación y
estados, con la consola y el inspector del navegador a mano. **No** sirve para dar por bueno el táctil
ni el rendimiento: en web los elementos de Lynx se mapean a elementos web.

## 3 · Inspeccionar

### 3.1 · En el navegador (target web)

Las DevTools del navegador inspeccionan la preview sin más: el motor Lynx for Web construye un DOM real
(`<lynx-view>`, `x-view`, `x-text`…), así que Elements, Console y Network funcionan tal cual sobre la
URL de §2.

### 3.2 · En nativo · Lynx DevTool

Para la app **nativa** (Lynx Explorer en el móvil, escritorio o el host) está **Lynx DevTool**:

- **Aplicación de escritorio** (`github.com/lynx-family/lynx-devtool/releases`): paneles **Elements,
  Console, Sources, Layers**, Preact DevTools y Trace. Se engancha activando **Lynx Debug** y **Lynx
  DevTool** en los ajustes de Lynx Explorer y conectándolo por cable (daemon).
- **Vía CLI / CDP**: la skill del repo **`.agents/skills/lynx-devtool`** documenta el CLI
  **`agent-lynx`** (paquete `agent-lynx`): `list-clients`, `list-sessions`, `cdp`, `evaluate`,
  `get-console`, `get-sources`, `screenshot`, `trace` y el árbol de componentes (`reactlynx tree`). Es
  la vía buena para inspeccionar sin clics y para leer la consola del dispositivo. La skill cubre
  requisitos y ejemplos; el CLI **no** se instala desde este repo.

## 4 · Validar en real · el QR y Lynx Explorer

1. `bun run dev`. En una terminal interactiva imprime un **código QR** y las URLs del servidor,
   incluida la línea de preview (`∟ Preview`).
2. En el móvil, instalar **Lynx Explorer** (Android):
   - APK oficial:
     `https://github.com/lynx-family/lynx/releases/download/4.1.0/LynxExplorer-noasan-release.apk` (173 MB).
   - O desde Play Store: "Lynx Go Dev Explorer" (`com.funcs.io.lynx.go`) — versión de la comunidad, no
     del equipo de Lynx. En iOS hay versión de la comunidad (`id6743227790`), tampoco oficial.
3. Escanear el QR desde la app, o pegar la URL del bundle en **"Enter Card URL"** y pulsar **Go**.
4. Móvil y PC en la **misma red Wi-Fi** (el servidor escucha en todas las interfaces). Si no se anuncia
   solo: `bun run dev -- --host`.

Esto sí valida lo que el navegador no puede: el **táctil**, los gestos y el **rendimiento**. Nada de
`adb`.

## 5 · El artefacto · construir el host (esto no es el bucle)

El host Android **no** participa en el bucle: es el **artefacto de distribución**. Monta el bundle
**embebido** (sin Lynx Explorer y sin dev server), y lo construye una tarea de Gradle:

```bash
bun run build                       # dist/main.lynx.bundle (+ dist/main.web.bundle)
cd host/android
./gradlew assembleDebug             # Windows: .\gradlew.bat assembleDebug
```

Identidad, módulo nativo SQLite y dependencias, en [`host/android/README.md`](../host/android/README.md).

## 6 · A demanda · durabilidad entre procesos (el único caso con dispositivo)

**Por qué es el único.** La persistencia durable es un requisito duro, y su prueba definitiva es que el
dato sobreviva a la **muerte del proceso**: ningún target de escritorio emula eso. Por eso esta prueba
—y sólo esta— necesita un dispositivo, y se corre **a demanda**, cuando se toca el almacén, no en cada
iteración.

Los comandos viven en la sección **Durabilidad** (capa 3) de
[`host/android/README.md`](../host/android/README.md). Usan `adb` + `am instrument` porque
`connectedDebugAndroidTest` **desinstala** la app entre corridas y se llevaría por delante la base. Es
el **único** uso de `adb` en el bucle.

## 7 · Verificado en este repo (19 sep 2026)

Dev server arrancado con `bun run dev` (puerto 3000). Rutas y estados reales:

```
$ curl -s -o NUL -w "%{http_code}  %{content_type}\n" "http://localhost:3000/__web_preview?casename=main.web.bundle"
200  text/html; charset=utf-8
$ curl ... /__web_preview/static/js/index.js
200  application/javascript; charset=utf-8
$ curl ... /__web_preview/static/css/index.css
200  text/css; charset=utf-8
$ curl ... /main.web.bundle
200
$ curl ... /main.lynx.bundle
200
$ curl ... /
404
```

Cabeceras de la página de preview (el aislamiento cross-origin que necesita el runtime web):

```
$ curl -s -D - -o NUL "http://localhost:3000/__web_preview?casename=main.web.bundle"
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`bun run build` emite `dist/main.lynx.bundle` y `dist/main.web.bundle`. El servidor se mata al acabar
(`kill_shell` / `Ctrl+C`); ningún proceso queda escuchando en el 3000.

## 8 · Fuentes

- Quick start y Explorer: `https://lynxjs.org/guide/start/quick-start.md`
- Lynx for Web: `https://lynxjs.org/llms-full.txt` (sección "Lynx for Web")
- Índice de documentación para agentes: `https://lynxjs.org/llms.txt`
- Activos y versiones del Explorer: `https://github.com/lynx-family/lynx/releases`
- DevTool de escritorio: `https://github.com/lynx-family/lynx-devtool/releases`
- Skill de DevTool en el repo: `.agents/skills/lynx-devtool`
