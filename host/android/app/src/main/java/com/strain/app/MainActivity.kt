package com.strain.app

import android.app.Activity
import android.os.Bundle
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder
import com.lynx.tasm.TemplateData
import com.lynx.xelement.svg.BehaviorGenerator

/**
 * Única pantalla del host: monta un `LynxView` a pantalla completa y le pide el
 * bundle embebido. Todo el árbol de UI vive en el bundle; acá no hay nada más.
 */
class MainActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val lynxView: LynxView = LynxViewBuilder()
            .setTemplateProvider(AssetsTemplateProvider(this))
            // Los iconos del bundle son `<svg>`, un XElement: hay que registrar
            // su behavior o el motor los descarta.
            .addBehaviors(BehaviorGenerator.getBehaviors())
            .build(this)

        setContentView(lynxView)
        lynxView.renderTemplateUrl(BUNDLE_ASSET, TemplateData.empty())
    }

    private companion object {
        /** Ruta del bundle dentro de `assets/`, puesta por `copyLynxBundle`. */
        const val BUNDLE_ASSET = "main.lynx.bundle"
    }
}
