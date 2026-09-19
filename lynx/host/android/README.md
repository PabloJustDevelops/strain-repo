# Host nativo Android (ticket 1 de `specs/001`)

App Android propia que monta el bundle Lynx **sin Lynx Explorer y sin servidor
de desarrollo**: el bundle viaja embebido en los assets del APK.

Persistencia durable, notificaciones, Health Connect y auth **no** están aquí:
son los tickets 2+.

## Requisitos

- JDK 17+ (probado con Temurin 21).
- Android SDK con `platforms;android-36` y `build-tools;36.0.0`.
- `local.properties` con `sdk.dir` (no se versiona; ver `.gitignore`).

## De dónde sale el bundle

El bundle es un **artefacto de build**, no se versiona:

```bash
cd ../../          # lynx/
bun install
bun run build      # -> lynx/dist/main.lynx.bundle
```

La tarea Gradle `copyLynxBundle` (enganchada a `preBuild`) lo copia desde
`lynx/dist/main.lynx.bundle` a `app/src/main/assets/` antes de empaquetar. Si el
bundle no existe, la build **falla con un mensaje explicando que hay que correr
`bun run build`**. El archivo copiado está en `.gitignore`.

## Construir, instalar, arrancar

```bash
./gradlew assembleDebug            # Windows: .\gradlew.bat assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.strain.app/.MainActivity
```

Identidad (D15): `applicationId` `com.strain.app`, `minSdk` 26,
`compileSdk`/`targetSdk` 36. En un dispositivo donde ya esté la app Expo, esta
instalación la sustituye (firma distinta): hay que desinstalar antes.

## Estructura

| Fichero | Qué hace |
|---|---|
| `StrainApplication.kt` | `LynxEnv.init` una vez por proceso, antes de cualquier `LynxView` |
| `MainActivity.kt` | Monta el `LynxView` a pantalla completa y pide `main.lynx.bundle` |
| `AssetsTemplateProvider.kt` | Sirve el bundle desde `assets/` (sin red) |

## Dependencias que el ticket no listaba

Las tres fueron necesarias para que la UI se viera **completa** y cada una está
en su commit para poder soltarla por separado:

- **`androidx.core`**: Lynx 4.1.0 usa `androidx.core.util.Consumer` en runtime y
  **no lo declara en su POM**. Sin él el proceso moría con
  `NoClassDefFoundError` al construir el `LynxView`.
- **`xelement-svg`**: los iconos del bundle son `<svg>`, un XElement. Sin su
  behavior el motor avisaba `No BehaviorController defined for class svg` y la
  tab bar salía sin iconos.
- **`servalsvg` 0.2.4**: `xelement-svg` 4.1.0 pide la 0.0.2, que **no publica el
  `.so` para x86_64** (solo arm64/armv7/x86), así que en el emulador x86_64 daba
  `dlopen failed: library "libserval_svg.so" not found`. La 0.2.4 sí lo trae.

El resto de versiones del SDK están fijadas a las del motor 4.1.0
(`lynx`, `lynx-jssdk`, `lynx-trace`) y `primjs` 4.1.1.
