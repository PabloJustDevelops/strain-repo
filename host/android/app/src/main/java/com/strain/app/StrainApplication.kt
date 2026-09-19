package com.strain.app

import android.app.Application
import com.lynx.tasm.LynxEnv
import com.strain.app.storage.StorageModule

/**
 * Arranque del host.
 *
 * Inicializa el motor Lynx una sola vez por proceso, antes de que cualquier
 * `LynxView` se construya. No se activa el DevTool ni ningún servicio de red:
 * el bundle vive en los assets del APK y no hay servidor de desarrollo.
 *
 * El registro de módulos nativos tiene que ir **después** de `init`: el motor
 * crea su `LynxModuleFactory` ahí y hasta entonces `registerModule` no tendría
 * dónde apuntar.
 */
class StrainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        LynxEnv.inst().init(this, null, null, null)
        // StorageModule queda accesible desde el bundle como `StorageModule`.
        LynxEnv.inst().registerModule(STORAGE_MODULE, StorageModule::class.java)
    }

    private companion object {
        /** Nombre con el que el runtime Lynx resuelve el módulo. */
        const val STORAGE_MODULE = "StorageModule"
    }
}
