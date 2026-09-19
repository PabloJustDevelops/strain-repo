package com.strain.app.storage

import android.content.Context
import android.database.sqlite.SQLiteConstraintException
import android.database.sqlite.SQLiteDatabaseLockedException
import android.database.sqlite.SQLiteDiskIOException
import android.database.sqlite.SQLiteException
import android.database.sqlite.SQLiteFullException
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.lynx.react.bridge.Callback
import com.lynx.react.bridge.JavaOnlyArray
import com.lynx.react.bridge.JavaOnlyMap
import com.lynx.react.bridge.ReadableArray
import com.lynx.react.bridge.ReadableType
import com.lynx.react.bridge.WritableArray
import com.lynx.react.bridge.WritableMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

/**
 * Almacenamiento durable expuesto al runtime Lynx (ticket 2 de `specs/001`).
 *
 * El runtime no trae SQLite: esto lo pone el host. La superficie es la del spec:
 * `open(dbName)`, `close()`, `execute(sql, params)`, `query(sql, params)` y
 * `transaction(operations)`. Todos los parámetros viajan parametrizados; el SQL
 * nunca se interpola con valores.
 *
 * **Asincronía**: los cinco métodos son asíncronos, como todos los de un
 * `LynxModule`. Ninguno bloquea el hilo de UI ni el de JS: el trabajo se encola
 * y se ejecuta en [storageThread], y la respuesta llega por el `callback`.
 *
 * **Contestación única**: el `callback` se invoca exactamente una vez, siempre
 * un objeto con esta forma:
 *
 * ```
 * { ok: true,  data: <resultado> }
 * { ok: false, error: { code: <código estable>, message: <mensaje> } }
 * ```
 *
 * `data` es `null` para `open`/`close`, las filas afectadas (`number`) para
 * `execute`, un array de filas para `query` y un array de filas afectadas para
 * `transaction`. Los errores nunca se tragan: el código es `DB_NOT_OPEN`,
 * `DB_ALREADY_OPEN`, `DB_OPEN_FAILED`, `SQLITE_*`, `INVALID_ARGUMENT` o `UNKNOWN`.
 *
 * **Contrato de hilos**: el constructor corre en el hilo que crea el módulo (el
 * de UI, al arrancar el host). Los cinco métodos públicos solo encolan en
 * [storageThread] y **no tocan SQLite**; el cuerpo real de cada uno —y el
 * `callback`— corre en ese hilo único, que es el único que toca
 * [SqliteConnection].
 */
class StorageModule(context: Context) : LynxModule(context) {

    private val connection = SqliteConnection(context.applicationContext)

    /** Hilo único de almacenamiento: serializa el acceso a la conexión. */
    private val storageThread: ExecutorService = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, THREAD_NAME)
    }

    @LynxMethod
    fun open(dbName: String, callback: Callback) = answer(callback) {
        connection.open(dbName)
        null
    }

    @LynxMethod
    fun close(callback: Callback) = answer(callback) {
        connection.close()
        null
    }

    @LynxMethod
    fun execute(sql: String, params: JavaOnlyArray?, callback: Callback) = answer(callback) {
        connection.execute(sql, readParams(params))
    }

    @LynxMethod
    fun query(sql: String, params: JavaOnlyArray?, callback: Callback) = answer(callback) {
        writableRows(connection.query(sql, readParams(params)))
    }

    /**
     * `operations` es un array de `{ sql, params }`. Se ejecutan en orden dentro
     * de una sola transacción y el resultado es la lista de filas afectadas.
     */
    @LynxMethod
    fun transaction(operations: JavaOnlyArray?, callback: Callback) = answer(callback) {
        writableLongs(connection.transaction(readOperations(operations)))
    }

    override fun destroy() {
        // El motor lo llama en el hilo de UI: el cierre real se encola para no
        // bloquearlo, y como el executor es de un solo hilo, la cola se vacía
        // (y se cierra la base) antes de apagarlo.
        try {
            storageThread.execute { connection.close() }
        } catch (_: RejectedExecutionException) {
            /* ya estaba cerrado */
        }
        storageThread.shutdown()
        super.destroy()
    }

    private fun answer(callback: Callback, work: () -> Any?) {
        try {
            storageThread.execute {
                val response = try {
                    success(work())
                } catch (t: Exception) {
                    failure(t)
                }
                callback.invoke(response)
            }
        } catch (t: RejectedExecutionException) {
            callback.invoke(
                failure(StorageException(MODULE_CLOSED, "El módulo de almacenamiento ya está cerrado.")),
            )
        }
    }

    private fun success(data: Any?): WritableMap = JavaOnlyMap().apply {
        putBoolean(FIELD_OK, true)
        putValue(FIELD_DATA, data)
    }

    private fun failure(error: Exception): WritableMap = JavaOnlyMap().apply {
        putBoolean(FIELD_OK, false)
        putMap(
            FIELD_ERROR,
            JavaOnlyMap().apply {
                putString(FIELD_CODE, errorCode(error))
                putString(FIELD_MESSAGE, error.message ?: error.javaClass.simpleName)
            },
        )
    }

    private fun errorCode(error: Exception): String = when (error) {
        is StorageException -> error.code
        is SQLiteConstraintException -> "SQLITE_CONSTRAINT"
        is SQLiteDatabaseLockedException -> "SQLITE_LOCKED"
        is SQLiteDiskIOException -> "SQLITE_DISK_IO"
        is SQLiteFullException -> "SQLITE_FULL"
        is SQLiteException -> "SQLITE_ERROR"
        is IllegalArgumentException -> "INVALID_ARGUMENT"
        else -> "UNKNOWN"
    }

    private fun WritableMap.putValue(key: String, value: Any?) {
        when (value) {
            null -> putNull(key)
            is Boolean -> putBoolean(key, value)
            is Int -> putInt(key, value)
            is Long -> putLong(key, value)
            is Double -> putDouble(key, value)
            is String -> putString(key, value)
            is WritableArray -> putArray(key, value)
            is WritableMap -> putMap(key, value)
            else -> throw StorageException(
                "INVALID_RESULT",
                "Resultado no serializable en \"$key\": ${value::class.java.name}.",
            )
        }
    }

    private fun writableRows(rows: List<Map<String, Any?>>): WritableArray = JavaOnlyArray().apply {
        rows.forEach { row ->
            pushMap(
                JavaOnlyMap().apply {
                    row.forEach { (column, value) -> putValue(column, value) }
                },
            )
        }
    }

    private fun writableLongs(values: List<Long>): WritableArray = JavaOnlyArray().apply {
        values.forEach { pushLong(it) }
    }

    /** `params` ausente o `null` es una lista vacía, no un error. */
    private fun readParams(params: ReadableArray?): List<Any?> {
        if (params == null) return emptyList()
        return (0 until params.size()).map { index ->
            when (params.getType(index)) {
                ReadableType.Null -> null
                ReadableType.Boolean -> params.getBoolean(index)
                ReadableType.Int -> params.getInt(index).toLong()
                ReadableType.Long -> params.getLong(index)
                ReadableType.Number -> params.getDouble(index)
                ReadableType.String -> params.getString(index)
                else -> throw StorageException(
                    "INVALID_ARGUMENT",
                    "Parámetro no soportado en la posición ${index + 1}: ${params.getType(index)}.",
                )
            }
        }
    }

    private fun readOperations(operations: JavaOnlyArray?): List<SqlOperation> {
        if (operations == null || operations.size == 0) {
            throw StorageException("INVALID_ARGUMENT", "transaction necesita al menos una operación.")
        }
        return (0 until operations.size).map { index ->
            val operation = operations.getMap(index)
                ?: throw StorageException(
                    "INVALID_ARGUMENT",
                    "La operación ${index + 1} no es un objeto { sql, params }.",
                )
            val sql = operation.getString(FIELD_SQL)
                ?: throw StorageException("INVALID_ARGUMENT", "La operación ${index + 1} no trae \"sql\".")
            SqlOperation(sql, readParams(operation.getArray(FIELD_PARAMS)))
        }
    }

    private companion object {
        const val THREAD_NAME = "strain-storage"
        const val MODULE_CLOSED = "MODULE_CLOSED"

        const val FIELD_OK = "ok"
        const val FIELD_DATA = "data"
        const val FIELD_ERROR = "error"
        const val FIELD_CODE = "code"
        const val FIELD_MESSAGE = "message"
        const val FIELD_SQL = "sql"
        const val FIELD_PARAMS = "params"
    }
}
