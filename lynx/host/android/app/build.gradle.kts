plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.jetbrains.kotlin.android)
}

// El bundle que produce `bun run build` en `lynx/`. Desde el módulo `app` son
// tres niveles hacia arriba: app -> android -> host -> lynx.
val lynxBundle = layout.projectDirectory.file("../../../dist/main.lynx.bundle")

// Destino: los assets del APK. El bundle copiado no se versiona (ver .gitignore);
// se regenera con `bun run build`.
val assetsDir = layout.projectDirectory.dir("src/main/assets")

val copyLynxBundle by tasks.registering(Copy::class) {
    description = "Copia lynx/dist/main.lynx.bundle a los assets del APK."
    group = "build"

    doFirst {
        val file = lynxBundle.asFile
        if (!file.isFile) {
            throw GradleException(
                "No existe ${file.absolutePath}. Ejecuta `bun run build` en lynx/ antes de compilar el host.",
            )
        }
        logger.lifecycle("Empaquetando bundle Lynx: ${file.absolutePath} (${file.length()} bytes)")
    }

    from(lynxBundle)
    into(assetsDir)
}

android {
    namespace = "com.strain.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.strain.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

tasks.named("preBuild") {
    dependsOn(copyLynxBundle)
}

dependencies {
    // `androidx.core` es requisito de runtime del SDK de Lynx, no transitivo.
    implementation(libs.androidx.core.ktx)

    // SDK nativo de Lynx, fijado a 4.1.0 (misma versión de motor que Lynx Explorer).
    implementation(libs.lynx)
    implementation(libs.lynx.jssdk)
    implementation(libs.lynx.trace)
    implementation(libs.primjs)

    // El bundle pinta sus iconos con `<svg>`, que en Lynx es un XElement. Sin
    // este behavior el motor avisa "No BehaviorController defined for class svg"
    // y los iconos no aparecen.
    implementation(libs.xelement.svg)
    implementation(libs.servalsvg)
}
