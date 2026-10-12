import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
}

// El bundle que produce `bun run build` en la raíz del repo. Desde el módulo
// `app` son tres niveles hacia arriba: app -> android -> host -> raíz.
val lynxBundle = layout.projectDirectory.file("../../../dist/main.lynx.bundle")

// Destino: los assets del APK. El bundle copiado no se versiona (ver .gitignore);
// se regenera con `bun run build`.
val assetsDir = layout.projectDirectory.dir("src/main/assets")

// `registering` (helper del DSL de Kotlin) desaparece en Gradle 9: el registro
// explícito con `tasks.register<T>(nombre)` es la forma que sobrevive.
val copyLynxBundle = tasks.register<Copy>("copyLynxBundle") {
    description = "Copia dist/main.lynx.bundle a los assets del APK."
    group = "build"

    doFirst {
        val file = lynxBundle.asFile
        if (!file.isFile) {
            throw GradleException(
                "No existe ${file.absolutePath}. Ejecuta `bun run build` en la raíz antes de compilar el host.",
            )
        }
        logger.lifecycle("Empaquetando bundle Lynx: ${file.absolutePath} (${file.length()} bytes)")
    }

    from(lynxBundle)
    into(assetsDir)
}

android {
    namespace = "com.strain.app"
    // 37 es lo mínimo que exige `androidx.core` 1.19.1 para compilar
    // (AGP 9.4 admite hasta API 37). `targetSdk` se queda en 36: compilar
    // contra 37 no es adoptar el comportamiento de 37.
    compileSdk = 37

    defaultConfig {
        applicationId = "com.strain.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        // Prueba instrumentada del módulo de almacenamiento:
        // `./gradlew connectedDebugAndroidTest` con un emulador o dispositivo.
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
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
}

// `android.kotlinOptions` ya no existe: con la Kotlin integrada de AGP 9 ese DSL
// (`jvmTarget = "17"` como String, dentro de `android {}`) es un error de
// compilación del propio build script, no un aviso. El DSL vivo es
// `kotlin.compilerOptions`, en el nivel de extensión, con el tipo `JvmTarget`.
kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_17
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

    // `xelement-svg` arrastra appcompat 1.0.0, cuyas `vectordrawable` 1.0.0
    // comparten namespace y rompen el merge de manifests con AGP 9. Forzarlas a
    // 1.2.0 las sustituye por artefactos con namespaces distintos.
    implementation(libs.vectordrawable)
    implementation(libs.vectordrawable.animated)

    // Prueba instrumentada: durabilidad y transacciones del módulo de
    // almacenamiento, contra una base de verdad en el dispositivo.
    androidTestImplementation(libs.androidx.test.core)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.ext.junit)
}
