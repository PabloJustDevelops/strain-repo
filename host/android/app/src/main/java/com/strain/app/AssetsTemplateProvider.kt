package com.strain.app

import android.content.Context
import com.lynx.tasm.provider.AbsTemplateProvider
import java.io.IOException

/**
 * Sirve el bundle desde los assets del APK.
 *
 * Lynx pide el template a través de esta interfaz; al no haber servidor de
 * desarrollo, la única fuente es `src/main/assets` (donde la tarea
 * `copyLynxBundle` deja `main.lynx.bundle`).
 */
class AssetsTemplateProvider(context: Context) : AbsTemplateProvider() {

    private val appContext: Context = context.applicationContext

    override fun loadTemplate(uri: String, callback: Callback) {
        Thread {
            try {
                val bytes = appContext.assets.open(uri).use { it.readBytes() }
                callback.onSuccess(bytes)
            } catch (e: IOException) {
                callback.onFailed(e.message ?: "No se pudo leer el asset $uri")
            }
        }.start()
    }
}
