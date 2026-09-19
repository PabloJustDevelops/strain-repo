package com.strain.app.storage

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.lynx.react.bridge.Callback
import com.lynx.react.bridge.JavaOnlyArray
import com.lynx.react.bridge.ReadableMap
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Durabilidad **entre procesos** (ticket 4 de `specs/001`).
 *
 * Una prueba que escribe y lee dentro del mismo proceso no demuestra que el dato
 * sobreviva a la muerte del proceso. Por eso hay **dos clases** que se ejecutan
 * en **invocaciones separadas**: la primera escribe y termina —y con ella muere
 * el proceso—; solo después la segunda abre la misma base y lee. Si el dato
 * viviera en memoria, la lectura no lo encontraría.
 *
 * Ninguna de las dos borra la base: el fichero tiene que sobrevivir de una
 * corrida a la otra. Los dos comandos están en `host/android/README.md`.
 */
internal object DurabilidadEntreProcesos {
    const val DB = "durabilidad-proceso.db"
    const val KEY = "routine:ticket4"
    const val VALUE = """{"id":"ticket4","name":"Durabilidad entre procesos"}"""

    // Misma forma de tabla y sentencias que emite el adaptador JS
    // (`src/db/nativeStorage.ts`).
    const val CREATE =
        "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)"
    const val UPSERT = "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)"
    const val SELECT_VALUE = "SELECT value FROM kv WHERE key = ? LIMIT 1"
}

/** Helpers comunes: hablan con el módulo como lo haría el runtime Lynx. */
abstract class DurabilidadEntreProcesosBase {

    protected val context: Context = ApplicationProvider.getApplicationContext()

    /**
     * Estas mitades solo corren cuando se pide su fase con `-e fase=<fase>` (ver
     * `host/android/README.md`). En una corrida suelta se saltan: si no, la mitad
     * que lee podría correr antes de la que escribe y el resultado dependería del
     * orden de descubrimiento de clases.
     */
    protected fun requiereFase(fase: String) {
        val actual = InstrumentationRegistry.getArguments().getString("fase")
        assumeTrue(
            "Esta mitad solo corre con `-e fase=$fase`; ver host/android/README.md.",
            actual == fase,
        )
    }

    /** Abre la base compartida, corre el bloque y cierra la conexión. */
    protected fun withModule(block: (StorageModule) -> Unit) {
        val module = StorageModule(context)
        try {
            success { module.open(DurabilidadEntreProcesos.DB, it) }
            block(module)
        } finally {
            rawResponse { module.close(it) }
            module.destroy()
        }
    }

    protected fun execute(module: StorageModule, sql: String, vararg params: Any?): Long =
        success { module.execute(sql, JavaOnlyArray.of(*params), it) }.getLong(FIELD_DATA)

    protected fun query(module: StorageModule, sql: String, vararg params: Any?): List<ReadableMap> {
        val data = success { module.query(sql, JavaOnlyArray.of(*params), it) }.getArray(FIELD_DATA)
        assertNotNull("query debería devolver filas", data)
        return (0 until data!!.size()).map { index -> data.getMap(index)!! }
    }

    /** Respuesta cruda del callback, sin exigir éxito (lo usa el cierre). */
    protected fun rawResponse(call: (Callback) -> Unit): ReadableMap {
        val latch = CountDownLatch(1)
        var response: ReadableMap? = null
        call(
            Callback { args ->
                response = args[0] as ReadableMap
                latch.countDown()
            },
        )
        assertTrue(
            "el módulo no contestó en $TIMEOUT_SECONDS s",
            latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS),
        )
        val answered = response
        assertNotNull("el callback llegó sin respuesta", answered)
        return answered!!
    }

    /** Como [rawResponse] pero exigiendo éxito. */
    protected fun success(call: (Callback) -> Unit): ReadableMap {
        val response = rawResponse(call)
        assertTrue("esperaba ok=true, llegó $response", response.getBoolean(FIELD_OK))
        return response
    }

    private companion object {
        const val TIMEOUT_SECONDS = 10L
        const val FIELD_OK = "ok"
        const val FIELD_DATA = "data"
    }
}

/**
 * Primera mitad: escribe y termina. Al acabar la instrumentación muere el
 * proceso, así que lo que quede tiene que estar en disco.
 */
@RunWith(AndroidJUnit4::class)
class DurabilidadEscribeTest : DurabilidadEntreProcesosBase() {

    @Before
    fun soloEnSuFase() = requiereFase("escribe")

    @Test
    fun deja_la_fila_del_adaptador_en_disco() {
        withModule { module ->
            execute(module, DurabilidadEntreProcesos.CREATE)
            val affected = execute(
                module,
                DurabilidadEntreProcesos.UPSERT,
                DurabilidadEntreProcesos.KEY,
                DurabilidadEntreProcesos.VALUE,
            )
            assertEquals(1L, affected)
        }
    }
}

/**
 * Segunda mitad: se ejecuta en OTRA invocación y solo lee. Si el proceso anterior
 * hubiera guardado en memoria, aquí no habría nada.
 */
@RunWith(AndroidJUnit4::class)
class DurabilidadLeeTest : DurabilidadEntreProcesosBase() {

    @Before
    fun soloEnSuFase() = requiereFase("lee")

    @Test
    fun lee_la_fila_que_dejo_el_proceso_anterior() {
        withModule { module ->
            val rows = query(
                module,
                DurabilidadEntreProcesos.SELECT_VALUE,
                DurabilidadEntreProcesos.KEY,
            )
            assertEquals(1, rows.size)
            assertEquals(DurabilidadEntreProcesos.VALUE, rows[0].getString("value"))
        }
    }
}
