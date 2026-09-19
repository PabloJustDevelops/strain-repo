# Host nativo Android (`specs/001`)

App Android propia que monta el bundle Lynx **sin Lynx Explorer y sin servidor
de desarrollo**: el bundle viaja embebido en los assets del APK.

Lo que hay hecho aquí son los tickets 1 y 2 de `specs/001`: el host y el módulo
nativo de almacenamiento. El adaptador durable que lo consume (ticket 3) vive en
el bundle (`src/db/nativeStorage.ts`), no en el host. Las pruebas de durabilidad
del ticket 4 incluyen dos mitades instrumentadas que se ejecutan en invocaciones
separadas (ver **Durabilidad** abajo). Las notificaciones y Health Connect
(`specs/002`) y la cuenta (`specs/003`) **no** están aquí.

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

### Adaptador durable y migración (ticket 3)

El bundle implementa la seam `Storage` sobre este módulo en
`src/db/nativeStorage.ts`: una tabla `kv` (`key` primaria, `value` con el JSON que
ya guardaba cada entidad) y `keys(prefix)` con `LIKE ?` sobre la clave. La seam es
**asíncrona** porque el puente también lo es; los repos ya devolvían promesas, así
que el cambio no toca ninguna pantalla. Un fallo de escritura rechaza con el
código y el mensaje del módulo: no se traga.

**Migración: no hay nada que migrar.** El almacén anterior (memoria + *session
storage*) no era durable y se pierde al cerrar la card, así que no puede contener
datos de continuidad. La tabla `kv` nace vacía y el catálogo de ejercicios se
vuelve a sembrar. No se fabrican datos de continuidad.

## Durabilidad (ticket 4 de `specs/001`)

El requisito duro del spec es que lo registrado sobreviva a la **muerte del
proceso**. Se demuestra en tres capas, de menos a más real; cada prueba lleva el
nombre de lo que demuestra.

### 1 · Lógica (vitest, va al CI)

`src/db/durabilidad.test.ts`, en la raíz del repo:

```bash
bun run test                                      # o solo este fichero:
bunx vitest run src/db/durabilidad.test.ts
```

Un doble del módulo guarda las claves en un disco **externo a la instancia**, así
que abrir un **segundo storage sobre el mismo disco** demuestra que los repos y
el *kv* releen del almacenamiento y no de una caché en memoria (rutinas,
ejercicios, ajustes y una sesión terminada con su PR siguen ahí). Un tercer caso
escribe directamente en el disco y comprueba que la **misma** instancia lo ve: el
camino de lectura no cachea.

### 2 · Módulo (instrumentado)

```bash
./gradlew connectedDebugAndroidTest   # Windows: .\gradlew.bat
```

`StorageModuleTest` prueba la durabilidad a nivel de módulo: crear tabla,
insertar, **cerrar** la conexión, **reabrir** y que las filas sigan; un caso usa
**la forma de tabla y las claves del adaptador JS** (`kv`, sentencias
`INSERT OR REPLACE` y `SELECT ... LIKE`), cierra y las relee con una **instancia
nueva** del módulo. Cubre además que la transacción revertida no deja rastro, que
los errores llegan con código y mensaje, que la conexión está en WAL y que el
trabajo corre en el hilo del módulo.

### 3 · Entre procesos (instrumentado, dos invocaciones)

Una prueba que escribe y lee en el **mismo** proceso no demuestra que el dato
sobreviva a la muerte del proceso. Para eso hay **dos clases** que se ejecutan en
**invocaciones separadas**, con el proceso matándose en medio:

- `DurabilidadEscribeTest` — crea la tabla con la forma del adaptador y deja la
  clave `routine:ticket4`.
- `DurabilidadLeeTest` — en otra corrida, abre la misma base y exige esa fila.

`connectedDebugAndroidTest` **no** sirve aquí: al terminar **desinstala** la app y
con ella borra `databases/`, así que la segunda corrida no vería nada. Se usan los
mismos APKs instalados a mano y `am instrument`, que sí conserva los datos:

```bash
./gradlew installDebug installDebugAndroidTest

ADB="$ANDROID_HOME/platform-tools/adb"   # Windows: el adb.exe del SDK
RUNNER=com.strain.app.test/androidx.test.runner.AndroidJUnitRunner

# 1) escribe y termina (al acabar muere el proceso de instrumentación)
"$ADB" shell am instrument -w -e fase escribe \
  -e class com.strain.app.storage.DurabilidadEscribeTest "$RUNNER"

# 2) mata el proceso de la app (explícito)
"$ADB" shell am force-stop com.strain.app

# 3) comprueba que la base quedó en disco
"$ADB" shell run-as com.strain.app ls -l databases/

# 4) lee desde un proceso nuevo
"$ADB" shell am instrument -w -e fase lee \
  -e class com.strain.app.storage.DurabilidadLeeTest "$RUNNER"
```

`-e fase escribe` / `-e fase lee` es obligatorio: sin la fase cada mitad se
**salta** (`assumeTrue`), de modo que una corrida suelta no depende del orden en
que se descubran las clases. Ojo con la sintaxis de `am`: es `-e NOMBRE VALOR`,
con el nombre y el valor en **dos** argumentos.

**Salida real en el emulador `strain`** (19 sep 2026, x86_64):

```
$ adb shell am instrument -w -e fase escribe -e class ...DurabilidadEscribeTest ...
com.strain.app.storage.DurabilidadEscribeTest:.
Time: 0.145
OK (1 test)

$ adb shell am force-stop com.strain.app
$ adb shell run-as com.strain.app ls -l databases/
total 24
-rw-rw---- 1 u0_a230 u0_a230 20480 2026-09-19 12:17 durabilidad-proceso.db

$ adb shell am instrument -w -e fase lee -e class ...DurabilidadLeeTest ...
com.strain.app.storage.DurabilidadLeeTest:.
Time: 0.087
OK (1 test)
```

El fichero bajado con
`adb exec-out run-as com.strain.app cat databases/durabilidad-proceso.db` empieza
por la cabecera `SQLite format 3` y dentro está la fila
`{"id":"ticket4","name":"Durabilidad entre procesos"}`.

**Control negativo**: con `adb shell pm clear com.strain.app` (que borra la base)
la mitad que lee **falla** con `SQLITE_ERROR: no such table: kv`; así se ve que la
prueba no es vacua.

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
