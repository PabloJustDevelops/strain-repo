# Host nativo Android (`specs/001`)

App Android propia que monta el bundle Lynx **sin Lynx Explorer y sin servidor
de desarrollo**: el bundle viaja embebido en los assets del APK.

Lo que hay hecho aquí son los tickets 1 y 2 de `specs/001`: el host y el módulo
nativo de almacenamiento. El adaptador durable que lo consume (ticket 3), las
notificaciones y Health Connect (`specs/002`) y la cuenta (`specs/003`) **no**
están aquí.

## Requisitos

- JDK 17+ (probado con Temurin 21).
- Android SDK con `platforms;android-36` y `build-tools;36.0.0`.
- `local.properties` con `sdk.dir` (no se versiona; ver `.gitignore`).

## De dónde sale el bundle

El bundle es un **artefacto de build**, no se versiona:

```bash
cd ../../          # raíz del repo
bun install
bun run build      # -> dist/main.lynx.bundle
```

La tarea Gradle `copyLynxBundle` (enganchada a `preBuild`) lo copia desde
`dist/main.lynx.bundle` a `app/src/main/assets/` antes de empaquetar. Si el
bundle no existe, la build **falla con un mensaje explicando que hay que correr
`bun run build`**. El archivo copiado está en `.gitignore`.

## Construir, instalar, arrancar

```bash
./gradlew assembleDebug            # Windows: .\gradlew.bat assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.strain.app/.MainActivity
```

Identidad (D15): `applicationId` `com.strain.app`, `minSdk` 26,
`compileSdk`/`targetSdk` 36. En un dispositivo donde ya esté instalada la app
anterior, esta instalación la sustituye (firma distinta): hay que desinstalar
antes.

## Estructura

| Fichero | Qué hace |
|---|---|
| `StrainApplication.kt` | `LynxEnv.init` + registro de `StorageModule`, una vez por proceso |
| `MainActivity.kt` | Monta el `LynxView` a pantalla completa y pide `main.lynx.bundle` |
| `AssetsTemplateProvider.kt` | Sirve el bundle desde `assets/` (sin red) |
| `storage/StorageModule.kt` | Módulo nativo: superficie Lynx, hilos y envelope de respuesta |
| `storage/SqliteConnection.kt` | La conexión SQLite (WAL, sentencias, transacciones) |
| `androidTest/.../StorageModuleTest.kt` | Prueba instrumentada de durabilidad y transacciones |

## Almacenamiento (ticket 2 de `specs/001`)

El host registra en `LynxEnv` un módulo nativo SQLite que el bundle resuelve por
el nombre **`StorageModule`**. Su superficie es la del spec, toda parametrizada:

| Método | Para qué | Llega en `data` |
|---|---|---|
| `open(dbName)` | Abre (o crea) la base en el directorio privado de la app | `null` |
| `close()` | Cierra la conexión; idempotente | `null` |
| `execute(sql, params)` | Sentencias de escritura | filas afectadas |
| `query(sql, params)` | Sentencias de lectura | array de filas |
| `transaction(operations)` | Array de `{ sql, params }`, en un solo bloque | filas afectadas, por operación |

Los cinco son **asíncronos** (son `@LynxMethod`): no devuelven nada, contestan por
un `callback` que se invoca **una sola vez**, con `{ ok: true, data }` o
`{ ok: false, error: { code, message } }`.

- **Motor**: `SQLiteOpenHelper`, no Room. Aquí solo hace falta SQL directo —el
  esquema y las migraciones son del adaptador del ticket 3—, así que Room
  costaría una dependencia, su procesador de anotaciones y su modelo de sesión a
  cambio de nada.
- **Hilos**: una única conexión de escritura, serializada en un executor de un
  solo hilo (`strain-storage`). Ningún método bloquea el hilo de UI ni el de JS;
  el cuerpo de cada método y el `callback` corren en ese hilo.
- **WAL**: se activa antes de abrir la base y la prueba lo comprueba.
- **Errores**: no se traga ninguno. Llegan con código estable (`DB_NOT_OPEN`,
  `DB_ALREADY_OPEN`, `DB_OPEN_FAILED`, `SQLITE_CONSTRAINT`, `SQLITE_LOCKED`,
  `SQLITE_DISK_IO`, `SQLITE_FULL`, `SQLITE_ERROR`, `INVALID_ARGUMENT`, `UNKNOWN`)
  y el mensaje original.
- **Límite conocido**: `query` apoya en `SQLiteDatabase.rawQuery`, que solo acepta
  argumentos `String`. Los valores de `params` viajan como texto y SQLite los
  convierte aplicando la afinidad de la columna, así que `WHERE id = ?` contra un
  `INTEGER` sigue comparando contra un entero. `execute` sí ata los tipos reales.

### Prueba instrumentada

```bash
./gradlew connectedDebugAndroidTest   # con un emulador o dispositivo conectado
```

Demuestra la durabilidad a nivel de módulo: crear tabla, insertar filas,
**cerrar** la base, **volver a abrirla** y que sigan ahí; que una transacción
revertida no deja rastro (ni la operación válida anterior a la que falla); que
los errores llegan con código y mensaje; que la conexión está en WAL; y que el
trabajo corre en el hilo del módulo y no en el del test.

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
