package com.strain.app

import android.app.Application
import com.lynx.tasm.LynxEnv

/**
 * Arranque del host.
 *
 * Inicializa el motor Lynx una sola vez por proceso, antes de que cualquier
 * `LynxView` se construya. No se activa el DevTool ni ningún servicio de red:
 * el bundle vive en los assets del APK y no hay servidor de desarrollo.
 */
class StrainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        LynxEnv.inst().init(this, null, null, null)
    }
}
