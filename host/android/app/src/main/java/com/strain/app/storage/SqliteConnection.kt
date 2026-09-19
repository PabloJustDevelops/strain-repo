package com.strain.app.storage

import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.database.sqlite.SQLiteStatement

/** Error del módulo con un código estable para el lado JS. */
class StorageException(
    val code: String,
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)

/** Una sentencia parametrizada: `sql` con marcadores `?` y sus valores en orden. */
data class SqlOperation(val sql: String, val params: List<Any?>)

/**
 * Una única conexión SQLite en modo WAL, **sin sincronización propia**.
 *
 * Contrato de hilos: ningún método de esta clase se llama desde el hilo de UI
 * ni desde el hilo de JS. Los llama siempre [StorageModule], dentro de su
 * `ExecutorService` de un solo hilo, que es lo que serializa el acceso: por eso
 * aquí no hay `synchronized`, y por eso también hay una sola conexión de
 * escritura.
 */
internal class SqliteConnection(private val context: Context) {

    private var helper: SQLiteOpenHelper? = null
    private var database: SQLiteDatabase? = null
    private var name: String? = null

    /** Abre `dbName` en el directorio privado de bases de la app. */
    fun open(dbName: String) {
        val current = database
        if (current != null && current.isOpen) {
            if (name == dbName) return
            throw StorageException(
                "DB_ALREADY_OPEN",
                "Ya hay una base abierta ($name); llama a close() antes de abrir $dbName.",
            )
        }

        val next = StrainOpenHelper(context, dbName)
        // WAL tiene que activarse antes de abrir la base: después, el helper lo
        // ignora. Da un escritor y lecturas concurrentes, que es lo que el
        // adaptador necesita para no bloquearse consigo mismo.
        next.setWriteAheadLoggingEnabled(true)
        try {
            database = next.writableDatabase
        } catch (t: Throwable) {
            next.close()
            throw StorageException("DB_OPEN_FAILED", t.message ?: t.toString(), t)
        }
        helper = next
        name = dbName
    }

    /**
     * Cierra la conexión. Es idempotente: cerrar sin haber abierto no es un
     * error, para que el `close()` del ciclo de vida no falle en el arranque.
     */
    fun close() {
        helper?.close()
        helper = null
        database = null
        name = null
    }

    /**
     * Ejecuta una sentencia de escritura y devuelve las filas afectadas
     * (0 para DDL, que no afecta filas).
     */
    fun execute(sql: String, params: List<Any?>): Long =
        requireOpen().compileStatement(sql).use { statement ->
            bind(statement, params)
            statement.executeUpdateDelete().toLong()
        }

    /** Ejecuta una sentencia de lectura y devuelve las filas como mapas. */
    fun query(sql: String, params: List<Any?>): List<Map<String, Any?>> =
        requireOpen().rawQuery(sql, textParams(params)).use { cursor -> buildRows(cursor) }

    /**
     * Ejecuta todas las operaciones en una transacción: si una lanza, no se
     * marca como exitosa y [SQLiteDatabase.endTransaction] revierte el bloque
     * entero. Devuelve las filas afectadas por cada operación, en orden.
     */
    fun transaction(operations: List<SqlOperation>): List<Long> {
        val database = requireOpen()
        // `NonExclusive` es el modo correcto con WAL (el exclusivo no existe ahí).
        database.beginTransactionNonExclusive()
        return try {
            val affected = operations.map { execute(it.sql, it.params) }
            database.setTransactionSuccessful()
            affected
        } finally {
            database.endTransaction()
        }
    }

    private fun requireOpen(): SQLiteDatabase =
        database?.takeIf { it.isOpen }
            ?: throw StorageException("DB_NOT_OPEN", "No hay ninguna base abierta; llama a open(dbName) antes.")

    private fun bind(statement: SQLiteStatement, params: List<Any?>) {
        params.forEachIndexed { index, value ->
            val position = index + 1
            when (value) {
                null -> statement.bindNull(position)
                is String -> statement.bindString(position, value)
                is Boolean -> statement.bindLong(position, if (value) 1L else 0L)
                is Int -> statement.bindLong(position, value.toLong())
                is Long -> statement.bindLong(position, value)
                is Double -> statement.bindDouble(position, value)
                is Float -> statement.bindDouble(position, value.toDouble())
                else -> throw StorageException(
                    "INVALID_PARAMETER",
                    "Parámetro no soportado en la posición $position: ${value::class.java.name}.",
                )
            }
        }
    }

    /**
     * `SQLiteDatabase.rawQuery` solo acepta `String[]`: Android no expone una
     * consulta con parámetros tipados. Los valores viajan como texto y SQLite
     * los convierte aplicando la afinidad de la columna (`INTEGER`/`REAL`/`TEXT`),
     * así que `WHERE id = ?` con un `INTEGER` sigue comparando contra un entero.
     * Sigue siendo parametrizado: el valor nunca se interpola en el SQL.
     */
    private fun textParams(params: List<Any?>): Array<String?> = params.map { value ->
        when (value) {
            null -> null
            is Boolean -> if (value) "1" else "0"
            else -> value.toString()
        }
    }.toTypedArray()

    private fun buildRows(cursor: Cursor): List<Map<String, Any?>> {
        val columns = cursor.columnNames
        val rows = ArrayList<Map<String, Any?>>(cursor.count)
        while (cursor.moveToNext()) {
            val row = LinkedHashMap<String, Any?>(columns.size)
            columns.forEachIndexed { index, column ->
                row[column] = when (cursor.getType(index)) {
                    Cursor.FIELD_TYPE_NULL -> null
                    Cursor.FIELD_TYPE_INTEGER -> cursor.getLong(index)
                    Cursor.FIELD_TYPE_FLOAT -> cursor.getDouble(index)
                    Cursor.FIELD_TYPE_STRING -> cursor.getString(index)
                    else -> throw StorageException(
                        "UNSUPPORTED_COLUMN_TYPE",
                        "La columna \"$column\" es un BLOB; el módulo solo expone null, entero, real y texto.",
                    )
                }
            }
            rows.add(row)
        }
        return rows
    }
}

/**
 * `SQLiteOpenHelper` sin esquema propio: el esquema lo crean y lo migran las
 * sentencias que manda el adaptador (ticket 3) con `execute`. Aquí solo hacen
 * falta el ciclo de vida del fichero y WAL.
 */
private class StrainOpenHelper(context: Context, dbName: String) :
    SQLiteOpenHelper(context, dbName, null, SCHEMA_VERSION) {

    override fun onCreate(db: SQLiteDatabase) = Unit

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    private companion object {
        /** El versionado real vive en el adaptador; el helper solo sigue el del fichero. */
        const val SCHEMA_VERSION = 1
    }
}
