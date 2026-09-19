package com.strain.app.storage

import android.content.Context
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.lynx.react.bridge.Callback
import com.lynx.react.bridge.JavaOnlyArray
import com.lynx.react.bridge.JavaOnlyMap
import com.lynx.react.bridge.ReadableMap
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Prueba instrumentada del módulo de almacenamiento (ticket 2 de `specs/001`).
 *
 * Llama al módulo como lo llamaría el runtime Lynx —los `@LynxMethod` con su
 * `Callback`— pero desde el proceso de test y sin motor: lo que se demuestra
 * aquí es la durabilidad de la base, no el puente.
 *
 * El callback es asíncrono (el módulo contesta en su hilo de almacenamiento),
 * así que cada llamada espera en un [CountDownLatch].
 */
@RunWith(AndroidJUnit4::class)
class StorageModuleTest {

    private val context: Context = ApplicationProvider.getApplicationContext()
    private lateinit var module: StorageModule

    @Before
    fun setUp() {
        // Cada test parte de cero: si no, "reabrir conserva las filas" podría
        // leer restos del test anterior.
        context.deleteDatabase(TEST_DB)
        module = StorageModule(context)
    }

    @After
    fun tearDown() {
        rawResponse { module.close(it) }
        module.destroy()
        context.deleteDatabase(TEST_DB)
    }

    @Test
    fun cerrar_la_base_y_reabrirla_conserva_las_filas() {
        success { module.open(TEST_DB, it) }
        execute("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)")
        assertEquals(1L, execute("INSERT INTO notes (id, body) VALUES (?, ?)", 1, "primera"))
        assertEquals(1L, execute("INSERT INTO notes (id, body) VALUES (?, ?)", 2, "segunda"))
        assertEquals(2, query("SELECT id, body FROM notes").size)

        // Cerrar de verdad la conexión: lo que solo viviera en memoria se
        // perdería aquí.
        success { module.close(it) }

        // Y volver a abrirla: las filas siguen en disco.
        success { module.open(TEST_DB, it) }
        val rows = query("SELECT id, body FROM notes ORDER BY id")
        assertEquals(2, rows.size)
        assertEquals(1L, rows[0].getLong("id"))
        assertEquals("primera", rows[0].getString("body"))
        assertEquals(2L, rows[1].getLong("id"))
        assertEquals("segunda", rows[1].getString("body"))
    }

    @Test
    fun el_kv_del_adaptador_reabre_con_una_instancia_nueva_y_conserva_las_claves() {
        // Misma forma de tabla y mismas sentencias que emite el adaptador JS
        // (`src/db/nativeStorage.ts`), no una tabla de juguete: si el adaptador
        // cambia de esquema, esta prueba deja de cubrirlo.
        success { module.open(TEST_DB, it) }
        execute(KV_CREATE)
        execute(KV_UPSERT, "routine:abc", KV_ROW)
        execute(KV_UPSERT, "exercise:1", """{"id":"1"}""")
        assertEquals(KV_ROW, query(KV_SELECT_VALUE, "routine:abc")[0].getString("value"))
        assertEquals(1, query(KV_SELECT_KEYS, "routine:%").size)
        assertEquals(1, query(KV_SELECT_KEYS, "exercise:%").size)
        assertEquals(2, query(KV_SELECT_KEYS, "%").size)

        // Muerte del proceso: se tira la instancia y se abre una NUEVA sobre el
        // mismo fichero. Lo que sobreviva tiene que estar en disco, no en el objeto.
        success { module.close(it) }
        val reopened = StorageModule(context)
        try {
            success { reopened.open(TEST_DB, it) }
            val rows = queryOn(reopened, KV_SELECT_VALUE, "routine:abc")
            assertEquals(1, rows.size)
            assertEquals(KV_ROW, rows[0].getString("value"))
            assertEquals(1, queryOn(reopened, KV_SELECT_KEYS, "routine:%").size)
            assertEquals(0, queryOn(reopened, KV_SELECT_KEYS, "session:%").size)
        } finally {
            rawResponse { reopened.close(it) }
            reopened.destroy()
        }
    }

    @Test
    fun la_transaccion_confirmada_persiste_y_la_revertida_no_deja_rastro() {
        success { module.open(TEST_DB, it) }
        execute("CREATE TABLE counter (id INTEGER PRIMARY KEY, label TEXT NOT NULL)")

        val committed = success {
            module.transaction(
                JavaOnlyArray.of(
                    operation("INSERT INTO counter (id, label) VALUES (?, ?)", 1, "uno"),
                    operation("INSERT INTO counter (id, label) VALUES (?, ?)", 2, "dos"),
                ),
                it,
            )
        }
        assertEquals(2, committed.getArray(FIELD_DATA)!!.size())
        assertEquals(2, query("SELECT id FROM counter").size)

        // La segunda operación viola el NOT NULL: revierte el bloque entero.
        val failed = rawResponse {
            module.transaction(
                JavaOnlyArray.of(
                    operation("INSERT INTO counter (id, label) VALUES (?, ?)", 3, "tres"),
                    operation("INSERT INTO counter (id, label) VALUES (?, ?)", 4, null),
                ),
                it,
            )
        }
        assertFalse("esperaba ok=false, llegó $failed", failed.getBoolean(FIELD_OK))
        assertEquals("SQLITE_CONSTRAINT", failed.getMap(FIELD_ERROR)!!.getString(FIELD_CODE))

        // No queda rastro: ni la fila 3, que era válida, ni la 4.
        assertEquals(2, query("SELECT id FROM counter").size)
        assertEquals(0, query("SELECT id FROM counter WHERE id IN (3, 4)").size)
    }

    @Test
    fun los_errores_llegan_con_codigo_y_mensaje() {
        // Sin base abierta el módulo contesta un error explícito; no traga nada.
        assertEquals("DB_NOT_OPEN", errorCode { module.query("SELECT 1", JavaOnlyArray(), it) })

        success { module.open(TEST_DB, it) }

        val failed = rawResponse { module.execute("esto no es sql", JavaOnlyArray(), it) }
        assertFalse("esperaba ok=false, llegó $failed", failed.getBoolean(FIELD_OK))
        val error = failed.getMap(FIELD_ERROR)
        assertNotNull("el error debería traer detalle", error)
        assertEquals("SQLITE_ERROR", error!!.getString(FIELD_CODE))
        assertTrue(
            "el mensaje de SQLite debería viajar, llegó: ${error.getString(FIELD_MESSAGE)}",
            !error.getString(FIELD_MESSAGE).isNullOrBlank(),
        )

        // Cerrar sin haber abierto no es un error: el ciclo de vida no falla.
        success { module.close(it) }
    }

    @Test
    fun la_conexion_usa_wal() {
        success { module.open(TEST_DB, it) }
        assertEquals("wal", query("PRAGMA journal_mode")[0].getString("journal_mode"))
    }

    @Test
    fun el_acceso_a_sqlite_corre_en_el_hilo_del_modulo() {
        // Ni el hilo de UI ni el de JS: el módulo mueve todo a su hilo único.
        assertEquals(STORAGE_THREAD, answeredOnThread { module.open(TEST_DB, it) })
    }

    /** Invoca una función del módulo y devuelve la respuesta cruda del callback. */
    private fun rawResponse(call: (Callback) -> Unit): ReadableMap {
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
    private fun success(call: (Callback) -> Unit): ReadableMap {
        val response = rawResponse(call)
        assertTrue("esperaba ok=true, llegó $response", response.getBoolean(FIELD_OK))
        return response
    }

    private fun errorCode(call: (Callback) -> Unit): String {
        val response = rawResponse(call)
        assertFalse("esperaba ok=false, llegó $response", response.getBoolean(FIELD_OK))
        val error = response.getMap(FIELD_ERROR)
        assertNotNull("el error debería traer detalle", error)
        return error!!.getString(FIELD_CODE)!!
    }

    private fun answeredOnThread(call: (Callback) -> Unit): String {
        val latch = CountDownLatch(1)
        var thread = ""
        call(
            Callback {
                thread = Thread.currentThread().name
                latch.countDown()
            },
        )
        assertTrue(latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS))
        return thread
    }

    private fun execute(sql: String, vararg params: Any?): Long = executeOn(module, sql, *params)

    private fun query(sql: String, vararg params: Any?): List<ReadableMap> = queryOn(module, sql, *params)

    private fun executeOn(target: StorageModule, sql: String, vararg params: Any?): Long =
        success { target.execute(sql, JavaOnlyArray.of(*params), it) }.getLong(FIELD_DATA)

    private fun queryOn(target: StorageModule, sql: String, vararg params: Any?): List<ReadableMap> {
        val data = success { target.query(sql, JavaOnlyArray.of(*params), it) }.getArray(FIELD_DATA)
        assertNotNull("query debería devolver filas", data)
        return (0 until data!!.size()).map { index -> data.getMap(index)!! }
    }

    private fun operation(sql: String, vararg params: Any?): JavaOnlyMap = JavaOnlyMap().apply {
        putString(FIELD_SQL, sql)
        putArray(FIELD_PARAMS, JavaOnlyArray.of(*params))
    }

    private companion object {
        const val TEST_DB = "storage-module-test.db"
        const val STORAGE_THREAD = "strain-storage"
        const val TIMEOUT_SECONDS = 10L

        const val FIELD_OK = "ok"
        const val FIELD_DATA = "data"
        const val FIELD_ERROR = "error"
        const val FIELD_CODE = "code"
        const val FIELD_MESSAGE = "message"
        const val FIELD_SQL = "sql"
        const val FIELD_PARAMS = "params"

        // Tabla y sentencias del adaptador JS (`src/db/nativeStorage.ts`).
        const val KV_CREATE =
            "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)"
        const val KV_UPSERT = "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)"
        const val KV_SELECT_VALUE = "SELECT value FROM kv WHERE key = ? LIMIT 1"
        const val KV_SELECT_KEYS = "SELECT key FROM kv WHERE key LIKE ? ESCAPE '\\'"
        const val KV_ROW = """{"id":"abc","name":"Durabilidad 2026-09-19"}"""
    }
}
