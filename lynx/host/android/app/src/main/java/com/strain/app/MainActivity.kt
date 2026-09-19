package com.strain.app

import android.app.Activity
import android.os.Bundle
import android.widget.FrameLayout

/**
 * Esqueleto del host: todavía no monta Lynx. Solo comprueba que el proyecto
 * Gradle y el empaquetado funcionan antes de integrar el SDK.
 */
class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(FrameLayout(this))
    }
}
