# Plan: Remodelación Web de Strain

**Generado**: 2026-06-18
**Complejidad estimada**: Alta
**Ámbito**: Solo web de escritorio

## Overview

El repo actual sigue un enfoque **mobile-first** basado en Expo Router, SQLite local con Drizzle y
una preview web técnica vía Expo Web. La remodelación definida en `01-requisitos-web.md` exige dar
el salto hacia una **app web de escritorio dedicada**, privada y centrada en gestión personal del
entrenamiento.

La recomendación es implementar esta web como una nueva app dentro del mismo repo, en una carpeta
`web/`, reutilizando el modelo de datos y la integración con Supabase ya presentes en:

- `src/db/schema.ts`
- `src/lib/supabase.ts`
- `app/(tabs)/index.tsx`
- `app/(tabs)/routines.tsx`
- `app/(tabs)/exercises.tsx`
- `app/(tabs)/history.tsx`
- `app/(tabs)/progress.tsx`
- `app/(tabs)/settings.tsx`

## Objetivos del plan

- crear una app web real de escritorio dentro del repo,
- mantener el enfoque privado y no social definido en requisitos,
- reutilizar el modelo de datos existente siempre que sea viable,
- entregar incrementos demoables por pantallas y flujos,
- dejar fuera la remodelación mobile por ahora.

## No objetivos

- remodelar la app mobile en esta fase,
- rehacer el flujo de workout activo en móvil,
- introducir funcionalidades sociales,
- introducir premium o suscripciones.

## Prerrequisitos

- aprobación del documento `01-requisitos-web.md`,
- decisión de mantener monorepo con nueva carpeta `web/`,
- acceso operativo a Supabase y revisión del estado real del schema,
- definición mínima de variables de entorno para auth y datos,
- confirmación de stack web objetivo: `Next.js`, `Tailwind`, `supabase-js`, despliegue en `Vercel`.

## Sprint 0: Preparación y contrato de datos
**Objetivo**: convertir el borrador funcional en una base técnica implementable sin tocar aún la UI final.

**Demo/Validación**:
- Existe una carpeta `web/` planificada y documentada.
- Queda definido qué datos vienen de SQLite/Supabase y qué DTOs necesita la web.
- Queda cerrada la tabla de mapeo entre pantallas mobile actuales y pantallas web futuras.

### Task 0.1: Auditar estado real del repo
- **Ubicación**: `package.json`, `app/`, `src/db/`, `src/lib/`, `supabase/`
- **Descripción**: validar dependencias reales, rutas actuales, estado de Expo Web y si existe algo reutilizable para desktop.
- **Dependencias**: ninguna
- **Acceptance Criteria**:
  - queda documentado el stack real del repo,
  - se identifican rutas mobile reutilizables,
  - se listan huecos para una futura carpeta `web/`.
- **Validation**:
  - revisión manual de archivos clave,
  - documento de hallazgos enlazado en PR o issue.

### Task 0.2: Congelar contrato funcional web
- **Ubicación**: `docs/remodelacion-web/01-requisitos-web.md`
- **Descripción**: revisar y cerrar ambigüedades restantes de flujos y prioridades de MVP web.
- **Dependencias**: Task 0.1
- **Acceptance Criteria**:
  - el documento refleja navegación, exclusiones, flujos de rutinas, perfil y configuración,
  - no quedan decisiones bloqueantes abiertas para arrancar UI.
- **Validation**:
  - revisión manual de requisitos,
  - aprobación del usuario o equipo.

### Task 0.3: Definir adaptadores de datos web
- **Ubicación**: propuesto `web/lib/`, referencia en `src/db/schema.ts` y `src/lib/supabase.ts`
- **Descripción**: especificar qué entidades necesita la web y cómo se obtienen desde Supabase, evitando acoplar UI directamente al schema crudo.
- **Dependencias**: Task 0.1
- **Acceptance Criteria**:
  - existe una lista de DTOs o view models para `Inicio`, `Rutinas`, `Ejercicios`, `Perfil`, `Configuración`,
  - queda definido qué cálculos deben vivir en cliente y cuáles en backend.
- **Validation**:
  - revisión técnica del contrato,
  - checklist de entidades cubierta.

## Sprint 1: Scaffold de la app web y shell base
**Objetivo**: disponer de una app `web/` arrancable con navegación base, auth protegida y layout desktop.

**Demo/Validación**:
- `web/` arranca localmente.
- Existe shell de escritorio con sidebar izquierda, área central y panel derecho contextual.
- Las rutas protegidas muestran estructura real aunque usen datos simulados.

### Task 1.1: Crear la app `web/`
- **Ubicación**: nueva carpeta `web/`
- **Descripción**: inicializar una app Next.js con App Router dentro del monorepo actual.
- **Dependencias**: Sprint 0
- **Acceptance Criteria**:
  - la carpeta `web/` existe,
  - arranca con script propio,
  - queda separada del runtime Expo actual.
- **Validation**:
  - `npm run dev` o equivalente dentro de `web/`,
  - render de página inicial.

### Task 1.2: Configurar base UI y estilos
- **Ubicación**: `web/app/`, `web/components/`, `web/styles/` o equivalente
- **Descripción**: instalar y configurar Tailwind, tema base y componentes compartidos de layout.
- **Dependencias**: Task 1.1
- **Acceptance Criteria**:
  - existen tokens visuales mínimos,
  - el layout refleja la estructura aprobada,
  - el sidebar es persistente en desktop.
- **Validation**:
  - preview local del shell,
  - revisión visual manual.

### Task 1.3: Preparar auth web
- **Ubicación**: `web/lib/supabase.ts`, `web/middleware.ts`, `web/app/login/page.tsx`
- **Descripción**: preparar autenticación con Supabase Auth compartida con móvil.
- **Dependencias**: Task 1.1
- **Acceptance Criteria**:
  - existe pantalla de login,
  - rutas privadas redirigen correctamente,
  - la sesión queda accesible a la app web.
- **Validation**:
  - prueba manual de redirección autenticado/no autenticado.

### Task 1.4: Implementar navegación base
- **Ubicación**: `web/app/page.tsx`, `web/app/rutinas/page.tsx`, `web/app/ejercicios/page.tsx`, `web/app/historial/page.tsx`, `web/app/perfil/page.tsx`, `web/app/estadisticas/page.tsx`, `web/app/ajustes/page.tsx`
- **Descripción**: crear rutas base vacías o con placeholders reales.
- **Dependencias**: Task 1.2, Task 1.3
- **Acceptance Criteria**:
  - todas las secciones principales existen,
  - el sidebar navega entre ellas,
  - el bloque inferior muestra cuenta y cierre de sesión.
- **Validation**:
  - navegación manual por todas las rutas.

## Sprint 2: Inicio y tarjetas de actividad
**Objetivo**: entregar una homepage usable con gráfico superior y tarjetas privadas de entrenamientos recientes.

**Demo/Validación**:
- `Inicio` muestra gráfico arriba y tarjetas debajo.
- No hay elementos sociales.
- La UI ya se parece al patrón aprobado.

### Task 2.1: Construir gráfico superior de `Inicio`
- **Ubicación**: `web/app/page.tsx`, `web/components/inicio/`
- **Descripción**: crear bloque superior con selector temporal y gráfica resumida.
- **Dependencias**: Sprint 1
- **Acceptance Criteria**:
  - el gráfico está arriba,
  - soporta rango temporal básico,
  - usa datos simulados o adaptados.
- **Validation**:
  - revisión visual,
  - cambio de selector temporal visible.

### Task 2.2: Construir tarjetas de entrenamientos recientes
- **Ubicación**: `web/components/inicio/`, `web/components/history/` reutilizable si aplica
- **Descripción**: implementar tarjetas privadas con nombre, fecha, duración, volumen, récords y preview de ejercicios.
- **Dependencias**: Task 2.1
- **Acceptance Criteria**:
  - cada tarjeta muestra solo datos del usuario,
  - solo se renderizan unos pocos ejercicios como preview,
  - no aparecen comentarios, likes ni compartir.
- **Validation**:
  - revisión manual sobre dataset de ejemplo.

### Task 2.3: Conectar `Inicio` a modelo de datos
- **Ubicación**: `web/lib/`, `web/app/page.tsx`
- **Descripción**: conectar la página a datos reales de sesiones, métricas y récords cuando la capa de acceso esté lista.
- **Dependencias**: Sprint 0, Task 2.2
- **Acceptance Criteria**:
  - la página carga sesiones reales,
  - la estructura soporta vacío, loading y error.
- **Validation**:
  - prueba con usuario real o seed controlado.

## Sprint 3: Rutinas y editor de rutina
**Objetivo**: entregar el flujo más complejo de la web, incluyendo carpetas, editor de ejercicios, resumen y biblioteca.

**Demo/Validación**:
- Se pueden ver carpetas y rutinas.
- Se puede abrir `Crear rutina`.
- El editor central, el resumen y la biblioteca funcionan en la UI.

### Task 3.1: Vista principal de `Rutinas`
- **Ubicación**: `web/app/rutinas/page.tsx`, `web/components/rutinas/`
- **Descripción**: construir listado de carpetas colapsables, cards de rutina y panel derecho con acciones rápidas.
- **Dependencias**: Sprint 1
- **Acceptance Criteria**:
  - se pueden visualizar carpetas y rutinas,
  - existe acceso a `Nueva rutina` y `Nueva carpeta`.
- **Validation**:
  - interacción manual con expand/collapse y acciones.

### Task 3.2: Modal de `Nueva carpeta`
- **Ubicación**: `web/components/rutinas/`
- **Descripción**: implementar modal con nombre y creación inmediata de carpeta.
- **Dependencias**: Task 3.1
- **Acceptance Criteria**:
  - abre modal,
  - permite crear carpeta,
  - refresca el listado.
- **Validation**:
  - prueba manual de creación.

### Task 3.3: Scaffold de `Crear rutina`
- **Ubicación**: `web/app/rutinas/nueva/page.tsx` o ruta equivalente
- **Descripción**: crear pantalla dedicada con cabecera, título, zona central, resumen y biblioteca.
- **Dependencias**: Task 3.1
- **Acceptance Criteria**:
  - la estructura coincide con el diseño aprobado,
  - el botón `Guardar rutina` reacciona al estado de edición.
- **Validation**:
  - prueba manual de cambios sin guardar.

### Task 3.4: Editor central de ejercicios
- **Ubicación**: `web/components/rutinas/editor/`
- **Descripción**: implementar tarjetas de ejercicio con notas, descanso, series, reordenación y menú contextual.
- **Dependencias**: Task 3.3
- **Acceptance Criteria**:
  - soporta drag and drop vertical,
  - soporta notas,
  - soporta selector de descanso válido,
  - soporta series con tipos `W`, `Normal`, `F`, `D`,
  - soporta repeticiones e intervalo.
- **Validation**:
  - pruebas manuales de edición,
  - si se añade DnD, test de interacción de orden.

### Task 3.5: Superseries y estado de guardado
- **Ubicación**: `web/components/rutinas/editor/`
- **Descripción**: implementar menú de tres puntos con superserie y eliminar, label visual en desktop y modal de cambios sin guardar.
- **Dependencias**: Task 3.4
- **Acceptance Criteria**:
  - se puede crear superserie con otro ejercicio válido,
  - se bloquea o avisa cuando no hay otro ejercicio,
  - aparece label `Superserie` en escritorio,
  - salir con cambios muestra modal.
- **Validation**:
  - pruebas manuales de superserie y salida.

### Task 3.6: Resumen y biblioteca lateral
- **Ubicación**: `web/components/rutinas/resumen/`, `web/components/rutinas/biblioteca/`
- **Descripción**: construir `Resumen` arriba derecha y `Biblioteca` debajo, con `Todos los ejercicios`.
- **Dependencias**: Task 3.3
- **Acceptance Criteria**:
  - `Resumen` recalcula ejercicios, series, duración estimada y mapa muscular,
  - `Biblioteca` filtra y busca,
  - `Todos los ejercicios` mezcla predeterminados y personalizados.
- **Validation**:
  - prueba manual con varios ejercicios.

## Sprint 4: Ejercicios y ejercicio personalizado
**Objetivo**: cubrir la biblioteca de ejercicios y la creación de ejercicios personalizados.

**Demo/Validación**:
- La pantalla `Ejercicios` funciona.
- Se puede crear un ejercicio personalizado reutilizable.
- Los selects y catálogos acordados están implementados.

### Task 4.1: Biblioteca de ejercicios
- **Ubicación**: `web/app/ejercicios/page.tsx`, `web/components/ejercicios/`
- **Descripción**: crear vista split con listado, filtros y detalle.
- **Dependencias**: Sprint 1
- **Acceptance Criteria**:
  - estado vacío claro,
  - selección de ejercicio,
  - filtros de equipamiento y músculo.
- **Validation**:
  - prueba manual con dataset semilla.

### Task 4.2: Formulario de ejercicio personalizado
- **Ubicación**: `web/components/ejercicios/`
- **Descripción**: implementar formulario con imagen, nombre y selects cerrados.
- **Dependencias**: Task 4.1
- **Acceptance Criteria**:
  - soporta foto,
  - soporta todos los catálogos confirmados,
  - guarda el ejercicio para reutilizarlo en biblioteca.
- **Validation**:
  - prueba manual de alta y reuso.

### Task 4.3: Vista detalle del ejercicio
- **Ubicación**: `web/app/ejercicios/[id]/page.tsx` o detalle embebido
- **Descripción**: mostrar historial, mejores marcas y sesiones recientes del ejercicio.
- **Dependencias**: Task 4.1
- **Acceptance Criteria**:
  - existe un detalle útil,
  - carga métricas derivadas del ejercicio.
- **Validation**:
  - verificación manual con un ejercicio real.

## Sprint 5: Perfil e histórico privado
**Objetivo**: entregar la experiencia privada de consulta del usuario con calendario y previews de entrenamientos finalizados.

**Demo/Validación**:
- `Perfil` muestra estadísticas compactas, calendario y previews.
- Cada día con entreno lleva al detalle.

### Task 5.1: Pantalla `Perfil`
- **Ubicación**: `web/app/perfil/page.tsx`, `web/components/perfil/`
- **Descripción**: crear vista privada con bloques `Estadísticas`, `Calendario` y listado inferior.
- **Dependencias**: Sprint 1
- **Acceptance Criteria**:
  - estructura visual acorde a requisitos,
  - sin capa social.
- **Validation**:
  - revisión manual de layout.

### Task 5.2: Calendario navegable
- **Ubicación**: `web/components/perfil/calendario/`
- **Descripción**: resaltar días con entreno, navegar por meses y enlazar al entrenamiento correspondiente.
- **Dependencias**: Task 5.1
- **Acceptance Criteria**:
  - días con entreno resaltados,
  - click abre tooltip o acceso,
  - se navega al detalle del entreno.
- **Validation**:
  - prueba manual sobre varios meses.

### Task 5.3: Bloque `Estadísticas` de perfil
- **Ubicación**: `web/components/perfil/estadisticas/`
- **Descripción**: implementar tabs `Duration` y `Reps` con selector `Últimas 12 semanas`, `Año`, `Siempre`.
- **Dependencias**: Task 5.1
- **Acceptance Criteria**:
  - `Duration` calcula duración promedio semanal,
  - `Reps` calcula máximo volumen de repeticiones,
  - ambas tabs responden al mismo filtro temporal.
- **Validation**:
  - validación manual con dataset conocido.

### Task 5.4: Preview y detalle de entrenamientos
- **Ubicación**: `web/components/perfil/`, `web/app/historial/[id]/page.tsx` o ruta equivalente
- **Descripción**: implementar preview inferior con pocos ejercicios y vista completa al abrir.
- **Dependencias**: Task 5.1
- **Acceptance Criteria**:
  - preview muestra usuario, fecha, duración, volumen y récords,
  - solo enseña algunos ejercicios,
  - abre detalle completo.
- **Validation**:
  - prueba manual de navegación y render.

## Sprint 6: Historial, estadísticas globales y configuración
**Objetivo**: completar la capa analítica restante y los ajustes de cuenta.

**Demo/Validación**:
- `Historial`, `Estadísticas` y `Configuración` son usables de extremo a extremo.

### Task 6.1: Pantalla `Historial`
- **Ubicación**: `web/app/historial/page.tsx`, `web/components/historial/`
- **Descripción**: construir listado cronológico con filtros y detalle resumido.
- **Dependencias**: Sprint 1
- **Acceptance Criteria**:
  - listado cronológico,
  - filtros por fecha y rutina/grupo,
  - acceso al detalle.
- **Validation**:
  - prueba manual con filtros.

### Task 6.2: Pantalla `Estadísticas`
- **Ubicación**: `web/app/estadisticas/page.tsx`, `web/components/estadisticas/`
- **Descripción**: llevar la analítica agregada a una página más amplia que la del perfil.
- **Dependencias**: Sprint 5
- **Acceptance Criteria**:
  - muestra al menos volumen, duración, frecuencia, evolución y récords,
  - maneja filtros y estados vacíos.
- **Validation**:
  - revisión manual de gráficos.

### Task 6.3: Pantalla `Configuración`
- **Ubicación**: `web/app/ajustes/page.tsx`, `web/components/ajustes/`
- **Descripción**: implementar `Perfil`, `Cuenta`, `Unidades`, `Idioma`, `Tema`, `Exportar datos`.
- **Dependencias**: Sprint 1
- **Acceptance Criteria**:
  - nombre y foto configurables,
  - cambio de contraseña con botón gris por defecto,
  - eliminar cuenta visible como acción destructiva,
  - unidades con defaults `kg`, `kilómetros`, `cm`,
  - idioma seleccionable,
  - tema con claro/oscuro,
  - exportación con selector de formato.
- **Validation**:
  - pruebas manuales por subpantalla.

### Task 6.4: Cierre de sesión persistente
- **Ubicación**: `web/components/layout/`
- **Descripción**: asegurar que el bloque inferior del sidebar muestra cuenta y cierre de sesión usable.
- **Dependencias**: Sprint 1
- **Acceptance Criteria**:
  - logout accesible desde cualquier pantalla,
  - el estado de sesión se limpia correctamente.
- **Validation**:
  - prueba manual de login/logout.

## Sprint 7: Integración real, récords y exportación
**Objetivo**: conectar definitivamente la UI a Supabase y cerrar lógica derivada clave.

**Demo/Validación**:
- La web ya opera con datos reales.
- Los récords se detectan y muestran.
- La exportación produce archivos válidos.

### Task 7.1: Capa de fetch y caché
- **Ubicación**: `web/lib/`
- **Descripción**: implementar fetchers, manejo de caché y sincronización razonable con Supabase.
- **Dependencias**: Sprints 2-6
- **Acceptance Criteria**:
  - todas las pantallas consumen datos reales,
  - existen estados de loading/error/empty.
- **Validation**:
  - pruebas manuales integradas,
  - revisión de red.

### Task 7.2: Detección de récords
- **Ubicación**: `web/lib/calculations.ts`, posible apoyo en backend/supabase
- **Descripción**: definir y aplicar la lógica de PR, mejores repeticiones y derivados.
- **Dependencias**: Sprint 0, Sprints 2 y 5
- **Acceptance Criteria**:
  - los entrenamientos pueden marcar récords coherentes,
  - el perfil y previews muestran esos resultados.
- **Validation**:
  - dataset controlado con casos esperados.

### Task 7.3: Exportación multiformato
- **Ubicación**: `web/app/ajustes/`, `web/lib/export/` o equivalente
- **Descripción**: implementar exportación a varios formatos elegibles por el usuario.
- **Dependencias**: Task 6.3
- **Acceptance Criteria**:
  - soporta al menos `CSV` y `JSON`,
  - el usuario elige formato,
  - el archivo descargado es válido.
- **Validation**:
  - abrir y revisar archivos exportados.

## Sprint 8: QA, rendimiento y despliegue
**Objetivo**: dejar la web lista para validación real y primer despliegue.

**Demo/Validación**:
- La app web se puede desplegar y probar de extremo a extremo.
- Existe checklist claro de calidad.

### Task 8.1: Cobertura de pruebas críticas
- **Ubicación**: `web/` tests
- **Descripción**: añadir pruebas a flujos críticos: auth, rutinas, perfil, configuración y exportación.
- **Dependencias**: Sprints 1-7
- **Acceptance Criteria**:
  - flujos críticos con cobertura mínima,
  - bugs importantes protegidos.
- **Validation**:
  - ejecución de suite automatizada.

### Task 8.2: Ajustes de rendimiento y UX
- **Ubicación**: `web/`
- **Descripción**: revisar estados vacíos, skeletons, responsive básico, bundle y accesibilidad elemental.
- **Dependencias**: Sprints 1-7
- **Acceptance Criteria**:
  - tiempos razonables,
  - no hay pantallas rotas en desktop,
  - se manejan errores y vacíos con claridad.
- **Validation**:
  - checklist manual,
  - Lighthouse o equivalente si aplica.

### Task 8.3: Preparar despliegue
- **Ubicación**: `web/`, configuración de plataforma
- **Descripción**: configurar entorno para Vercel y dejar instrucciones de deploy.
- **Dependencias**: Task 8.2
- **Acceptance Criteria**:
  - variables de entorno definidas,
  - build estable,
  - despliegue reproducible.
- **Validation**:
  - build de producción y despliegue de prueba.

## Testing Strategy

- validación visual por sprint sobre las pantallas implementadas,
- pruebas manuales de flujos críticos de auth y navegación,
- pruebas dirigidas para `Crear rutina`, superseries, guardado y cambios sin guardar,
- pruebas de calendario y detalle de entrenamiento,
- validación funcional de exportación y récords,
- cobertura automatizada solo en flujos de alto riesgo.

## Potential Risks & Gotchas

- **Desacople insuficiente entre mobile y web**
  - Mitigación: introducir adaptadores de datos y evitar reutilizar pantallas Expo directamente.
- **Schema local y modelo cloud desalineados**
  - Mitigación: auditar `src/db/schema.ts` frente a Supabase antes de conectar UI real.
- **Cálculos ambiguos de récords**
  - Mitigación: congelar reglas exactas antes de implementar la detección.
- **Complejidad alta de `Crear rutina`**
  - Mitigación: construir primero la UI y luego activar persistencia por capas.
- **Configuración documental desactualizada**
  - Mitigación: actualizar docs de stack y setup en paralelo si se detectan diferencias críticas.

## Rollback Plan

- mantener la app mobile actual intacta mientras la web se desarrolla en `web/`,
- no sustituir rutas Expo existentes durante la primera fase,
- desplegar la web como proyecto separado hasta validar estabilidad,
- si una fase falla, revertir solo la app `web/` o su despliegue sin afectar mobile.

## Siguiente bloque recomendado

Tras cerrar este plan e iniciar la implementación web, el siguiente documento a preparar debería ser
la **remodelación mobile**, ya separada de esta carpeta y con alcance propio.
