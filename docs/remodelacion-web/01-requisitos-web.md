# 01 · Requisitos de la web de escritorio

> **Estado**: requisitos de producto y diseño.
> **Base visual**: referencias de layout inspiradas en Hevy aportadas por el usuario.
> **Importante**: la inspiración es estructural y visual. No se replica la capa social, premium ni de
> suscripciones.
> **Stack**: la web **no es una app aparte**. Es el **target `web` de Lynx** sobre el mismo código
> (ver [09](../09-remodelacion-web-dashboard.md)). No hay Next.js, ni Tailwind, ni Vercel.

---

## 1. Resumen ejecutivo

Strain deja de plantear la web como un simple dashboard analítico y pasa a definirla como una
**app web de escritorio para gestionar y entender el entrenamiento**.

La app mobile sigue siendo el lugar más rápido para entrenar y registrar sesiones. La web pasa a
ser el espacio cómodo para:

- revisar actividad reciente,
- consultar estadísticas,
- organizar rutinas,
- explorar ejercicios,
- analizar progreso,
- y gestionar la cuenta.

La referencia visual deseada se basa en un patrón claro:

- **sidebar fija a la izquierda**,
- **contenido principal amplio en el centro**,
- **panel derecho contextual** cuando la pantalla lo necesite,
- **tarjetas blancas grandes, mucho aire y jerarquía visual simple**.

La dirección del producto queda definida así:

```
┌───────────────────────────────────────────────────────────────────────┐
│                                STRAIN                                │
├─────────────────────────┬──────────────────────────────┬─────────────┤
│ Sidebar fija            │ Contenido principal          │ Panel extra │
│                         │                              │ contextual  │
│ Inicio                  │ Resumen, actividad, cards    │ Filtros     │
│ Rutinas                 │ Gestión de carpetas/rutinas  │ Acciones    │
│ Ejercicios              │ Biblioteca y detalle         │ Biblioteca  │
│ Historial               │ Timeline y filtros           │ Rango       │
│ Estadísticas            │ Métricas y gráficas          │ Calendario  │
│ Ajustes                 │ Cuenta y preferencias        │ Secundario  │
└─────────────────────────┴──────────────────────────────┴─────────────┘
```

---

## 2. Qué es Strain Web

### Definición

Strain Web es una **aplicación privada de escritorio** centrada en el propio usuario.

No es una red social fitness. No es una app de descubrimiento de personas. No es un producto
freemium orientado a empujar upgrades visuales dentro del layout.

Su objetivo es ofrecer una interfaz clara para trabajar con los datos del entrenamiento ya
generados en móvil.

### Casos de uso principales

1. **Ver mi actividad reciente** con más contexto que en móvil.
2. **Gestionar mis rutinas** en una pantalla grande.
3. **Consultar ejercicios** con filtros y detalle.
4. **Analizar progreso** por periodos, ejercicios y volumen.
5. **Revisar histórico** de entrenamientos completados.
6. **Administrar cuenta y preferencias** sin ruido extra.

### Principios del producto

1. **Privado antes que social**. Todo gira alrededor de los datos del usuario autenticado.
2. **Escritorio primero en la web**. La prioridad es una experiencia cómoda en pantallas grandes.
3. **Inspiración visual, no clon funcional**. Se toma el lenguaje de layout, no las features ajenas.
4. **Menos ruido**. Cada bloque debe aportar utilidad real al entrenamiento.
5. **Mobile para registrar, web para revisar y organizar**.

---

## 3. Exclusiones explícitas

Estas referencias visuales traen piezas de producto que **no forman parte** del alcance deseado.
Hay que dejarlo fijado desde el principio para no contaminar diseño, arquitectura ni copy.

### No incluir

- premium,
- pro,
- desbloquear,
- paywalls,
- suscripciones,
- trials,
- upsells,
- seguidores,
- siguiendo,
- atletas sugeridos,
- comentarios,
- likes,
- feed social,
- compartir entrenamientos en red social,
- perfil público orientado a comunidad,
- enlaces a redes sociales.

### Traducción práctica

- Si una tarjeta existe solo para monetización, se elimina.
- Si una pantalla existe solo para interacción social, se elimina.
- Si una métrica existe para gamificar exposición pública, se elimina.
- Si una cabecera de perfil muestra relaciones sociales, se sustituye por datos privados útiles.

---

## 4. Dirección visual de escritorio

### Objetivo visual

La web debe sentirse:

- limpia,
- sobria,
- espaciosa,
- rápida de escanear,
- y orientada a uso frecuente.

### Rasgos visuales clave

- Fondo general gris muy claro o blanco roto.
- Tarjetas blancas de gran tamaño con borde suave.
- Tipografía simple, con jerarquías marcadas por peso y tamaño.
- Navegación persistente y estable.
- Pocas acciones primarias por pantalla.
- Mucho espacio negativo para evitar sensación de panel saturado.

### Patrón de layout

#### Columna izquierda

Navegación principal persistente:

- logo,
- acceso a `Inicio`,
- acceso a `Rutinas`,
- acceso a `Ejercicios`,
- acceso a `Historial`,
- acceso a `Estadísticas`,
- acceso a `Ajustes`,
- bloque inferior de cuenta del usuario.

### Bloque inferior del sidebar

En la parte inferior de la navegación principal debe existir un bloque persistente de cuenta.

Debe incluir al menos:

- avatar del usuario,
- nombre visible,
- acceso a cerrar sesión.

#### Columna central

Es la superficie principal de trabajo. Debe contener:

- títulos de sección,
- tarjetas grandes,
- listas principales,
- gráficas,
- historial,
- y vistas de detalle.

#### Columna derecha

No es permanente por obligación. Es un área contextual reutilizable para:

- filtros,
- calendario,
- accesos rápidos,
- creación rápida,
- biblioteca secundaria,
- o resumen breve.

Si una pantalla no la necesita, puede desaparecer y ceder ancho al contenido principal.

---

## 5. Arquitectura de información propuesta

La navegación de escritorio queda redefinida así:

| Sección | Propósito |
|---------|-----------|
| `Inicio` | Gráfico superior de actividad y listado de entrenamientos recientes del propio usuario |
| `Rutinas` | Gestión de carpetas, rutinas y acciones rápidas |
| `Ejercicios` | Biblioteca de ejercicios con filtros y detalle |
| `Historial` | Lista cronológica de sesiones completadas y consulta por rangos |
| `Perfil` | Vista privada con calendario de entrenos y estadísticas personales resumidas |
| `Estadísticas` | Vistas analíticas agregadas del entrenamiento |
| `Ajustes` | Cuenta, preferencias y opciones esenciales |

### Sobre el perfil

La referencia visual del perfil se reinterpreta como una vista privada de usuario, separada de
`Ajustes`, pero no como perfil social.

Se puede mantener una cabecera personal con:

- avatar,
- nombre visible,
- métricas privadas,
- resumen de actividad,
- y calendario.

No se deben mostrar:

- seguidores,
- siguiendo,
- sugerencias,
- ni elementos de comunidad.

---

## 6. Pantallas objetivo

## 6.1 Inicio

### Propósito

Dar una visión inmediata del progreso reciente del usuario y de los entrenamientos que ha hecho en
días anteriores.

### Estructura recomendada

- Cabecera simple con título `Inicio`.
- Gráfico principal en la parte superior.
- Controles básicos de rango temporal junto al gráfico.
- Lista de entrenamientos recientes justo debajo.
- Cada tarjeta debe corresponder solo a sesiones del propio usuario.

### Componentes

- tarjeta superior de gráfico,
- selector de rango temporal,
- tarjetas de entrenamientos recientes,
- métricas rápidas por sesión como duración, volumen y récords,
- vista resumida de ejercicios incluidos en cada entrenamiento.

### Orden visual recomendado

1. Arriba: gráfica de actividad de entrenamiento.
2. Debajo: lista cronológica de entrenamientos recientes.
3. Opcional en lateral: filtros ligeros o calendario si aporta valor real.

### Contenido deseado en el gráfico superior

El gráfico superior debe servir para leer el estado reciente del entrenamiento de un vistazo.

Ejemplos válidos:

- entrenos por semana,
- volumen por semana,
- duración total por semana,
- frecuencia de entreno en un periodo.

La prioridad inicial es mostrar una visualización simple, clara y útil, antes que una analítica
demasiado compleja.

### Qué se toma de la referencia

- composición con panel central y lateral,
- tarjetas muy limpias,
- jerarquía clara entre analítica superior y actividad inferior,
- lectura rápida de cada sesión.

### Qué se cambia respecto a la referencia

- fuera bloque de rutinas dentro del home,
- fuera perfiles de otros usuarios,
- fuera recomendaciones de personas,
- fuera paneles sociales laterales,
- fuera comentarios,
- fuera interacciones sociales,
- fuera acciones de publicación,
- fuera tarjetas de personas sugeridas.

---

## 6.2 Rutinas

### Propósito

Ofrecer una vista de escritorio cómoda para gestionar las rutinas del usuario, agruparlas en
carpetas y construir nuevas rutinas apoyándose en una biblioteca de ejercicios.

### Estructura recomendada

- Título `Rutinas`.
- Listado principal de carpetas colapsables.
- Rutinas visibles dentro de cada carpeta.
- Panel derecho con acciones rápidas.

### Vista principal de Rutinas

La vista principal debe mostrar únicamente las rutinas del usuario autenticado.

Elementos clave:

- carpetas expandibles o colapsables,
- contador de rutinas por carpeta,
- cards de rutina dentro de cada grupo,
- menú contextual por carpeta y por rutina,
- panel lateral derecho con accesos a `Nueva rutina` y `Nueva carpeta`.

### Crear carpeta

La creación de carpeta debe ser una acción rápida y directa.

Comportamiento esperado:

- abrir modal simple,
- introducir nombre,
- confirmar creación,
- refrescar el listado agrupado al instante.

### Crear rutina

La creación de rutina debe abrir una vista dedicada de trabajo, no un modal pequeño.

Estructura base de esta pantalla:

- cabecera con volver y acción `Guardar rutina`,
- campo para el título de la rutina,
- área principal para los ejercicios añadidos,
- panel superior derecho con `Resumen`,
- panel derecho con `Biblioteca`,
- acceso visible a `Ejercicio personalizado`.

### Estado de guardado

La pantalla de `Crear rutina` debe distinguir entre estado limpio y estado con cambios pendientes.

Comportamiento esperado:

- si no hay cambios, el botón `Guardar rutina` puede permanecer inactivo o en estado neutro,
- si el usuario modifica título, ejercicios, orden, series, notas, descansos o superseries, la
  rutina pasa a estado de cambios sin guardar,
- en ese estado, el botón `Guardar rutina` debe mostrarse como acción disponible.

### Salida con cambios sin guardar

Si el usuario intenta salir de `Crear rutina` teniendo cambios sin guardar, debe aparecer un modal
de confirmación.

Contenido esperado del modal:

- título indicando que hay cambios sin guardar,
- mensaje explicando que se perderán los cambios si continúa,
- acción `Seguir editando`,
- acción destructiva `Cerrar sin guardar`.

### Regla de activación

Este modal debe aparecer al usar acciones de salida como volver atrás, cerrar la vista o navegar
fuera de la pantalla mientras existan cambios pendientes.

### Editor de ejercicios dentro de la rutina

Cuando el usuario añade un ejercicio desde la `Biblioteca`, ese ejercicio debe aparecer en el área
central como una tarjeta editable.

Cada tarjeta de ejercicio debe incluir:

- icono o `drag handle` para reordenar,
- imagen o miniatura del ejercicio,
- nombre del ejercicio,
- menú contextual de acciones,
- bloque de `Notas`,
- selector de `Temporizador de descanso`,
- tabla de series editable.

### Menú contextual del ejercicio

Al pulsar en el menú de tres puntos de una tarjeta de ejercicio, deben aparecer al menos estas
acciones:

- `Añadir a la superserie`
- `Eliminar ejercicio`

### Acción `Añadir a la superserie`

Esta acción debe permitir asociar el ejercicio actual con otro ejercicio que ya esté dentro de la
misma rutina.

Comportamiento esperado:

- al pulsarla, se abre un selector o modal,
- el selector muestra ejercicios ya presentes en la rutina,
- el usuario elige con qué ejercicio quiere formar la superserie,
- al confirmar, ambos ejercicios quedan vinculados como superserie.

### Representación visual de la superserie en escritorio

Cuando un ejercicio pertenezca a una superserie dentro de la app de escritorio, la tarjeta debe
mostrar un `label` visible en la parte superior indicando `Superserie`.

Reglas de esta representación:

- el `label` aparece arriba de la tarjeta del ejercicio,
- debe ser visible antes de abrir menús o detalles,
- debe servir para identificar rápidamente qué ejercicios están agrupados como superserie,
- esta indicación visual queda definida para la app de escritorio.

En móvil, la representación puede resolverse de otra manera más adelante.

### Estado bloqueado o no disponible

Si no existe otro ejercicio compatible dentro de la rutina, esta acción no debe comportarse como si
todo fuera válido.

Opciones aceptables de UX:

- mostrar la acción deshabilitada,
- o permitir pulsarla y enseñar una alerta o mensaje explicando que no se puede crear la superserie
  todavía.

La regla funcional es clara: no se puede crear una superserie si no hay otro ejercicio dentro de la
rutina con el que emparejar el actual.

### Acción `Eliminar ejercicio`

La acción `Eliminar ejercicio` debe quitar la tarjeta completa del editor de rutina y recalcular:

- el orden de ejercicios,
- el `Resumen`,
- y cualquier superserie asociada si existiera.

### Reordenación tipo kanban

La zona central debe comportarse como una lista reordenable visualmente.

No hace falta un kanban por columnas. Lo importante es:

- poder arrastrar cada ejercicio desde el icono de agarre,
- cambiar el orden de los ejercicios dentro de la rutina,
- reflejar el nuevo orden de forma inmediata.

### Bloque de notas

Debajo de la cabecera de cada ejercicio debe existir un campo de `Notas`.

Su función es guardar una nota fija asociada a ese ejercicio dentro de la rutina, por ejemplo:

- técnica,
- observaciones,
- recordatorios,
- o indicaciones de ejecución.

### Temporizador de descanso

Cada ejercicio debe poder definir su propio `Temporizador de descanso`.

Este campo debe resolverse como selector claro y rápido, con un valor visible dentro de la tarjeta.

### Reglas del temporizador

El usuario debe poder elegir minutos de descanso a partir de tiempos válidos ya formateados.

Ejemplos válidos:

- `01:00`
- `03:00`
- `05:00`

Ejemplos no válidos:

- `05:99`
- `-03:00`

### Restricción de entrada

No debe tratarse como un campo libre sin control.

Opciones aceptables:

- `select` con tiempos predefinidos,
- o input controlado que solo permita valores válidos en formato `mm:ss`.

La intención del producto es evitar tiempos imposibles, negativos o mal formateados.

### Tabla de series

Cada ejercicio añadido debe mostrar una tabla de series editable.

Columnas base:

- `Serie`
- `KG`
- `Repeticiones` o `Intervalo de repeticiones`
- acción para eliminar la fila

Debe existir además una acción clara de `Agregar serie`.

### Tipos de serie

Al pulsar en el valor de la columna `Serie`, el usuario debe poder elegir el tipo de serie.

Opciones iniciales confirmadas:

- `W` → `Calentamiento`
- `1` → `Normal`
- `F` → `Al fallo`
- `D` → `Descendiente`

### Comportamiento de numeración

- las series `Normal` deben numerarse correlativamente,
- al añadir una nueva serie normal, el número debe incrementarse automáticamente,
- las series especiales como `W`, `F` y `D` mantienen su marcador específico.

### KG y repeticiones

La columna `KG` sirve para introducir el peso.

La columna de repeticiones debe poder trabajar en dos modos:

- `Repeticiones`
- `Intervalo de repeticiones`

El usuario debe poder cambiar entre ambos modos, y la interfaz debe adaptarse:

- en `Repeticiones`, un único campo,
- en `Intervalo de repeticiones`, dos campos para rango mínimo y máximo.

### Acciones principales

- crear rutina,
- crear carpeta,
- renombrar,
- duplicar,
- mover entre carpetas,
- eliminar,
- iniciar rutina desde la web solo si más adelante tiene sentido funcional.

### Resumen de rutina

El bloque `Resumen` debe servir para ver el estado actual de la rutina mientras se construye.

### Posición

El bloque `Resumen` debe aparecer arriba a la derecha dentro de la pantalla de `Crear rutina`.

Debe ocupar la primera tarjeta del panel lateral derecho, por encima de `Biblioteca`.

Contenido inicial recomendado:

- número de ejercicios,
- número total de series,
- duración estimada,
- representación visual del cuerpo con musculatura implicada,
- acceso a resumen más detallado más adelante si hiciera falta.

### Comportamiento esperado

- debe actualizarse conforme se añaden o eliminan ejercicios,
- debe funcionar como lectura rápida del estado de la rutina,
- puede incluir un acceso para abrir una vista ampliada del resumen,
- la vista ampliada debe mostrar el cuerpo frontal y trasero con los músculos implicados.

### Lógica visual del resumen

El resumen no debe mostrar un cuerpo estático sin contexto. Debe reflejar las zonas trabajadas según
los ejercicios que el usuario vaya metiendo en la rutina.

Comportamiento deseado:

- cada ejercicio añadido aporta uno o varios grupos musculares al resumen,
- el cuerpo frontal y trasero resalta visualmente esas zonas implicadas,
- si se añaden más ejercicios, el mapa muscular se actualiza acumulando la información,
- si se elimina un ejercicio, el resumen recalcula automáticamente las zonas implicadas.

### Desglose ampliado

En la vista ampliada del `Resumen` debe mostrarse:

- `Ejercicios`
- `Series totales`
- `Duración estimada`
- cuerpo frontal y trasero con músculos resaltados,
- listado inferior por músculo,
- número de series asociadas a cada músculo.

### Regla de interpretación

El resumen debe derivarse de la metadata del ejercicio, especialmente de:

- grupo muscular primario,
- otros músculos.

Eso permite que, según los ejercicios añadidos, se pinte una parte u otra del cuerpo y se construya
un resumen muscular coherente.

### Biblioteca dentro de Crear rutina

La `Biblioteca` es el panel desde el que se buscan y añaden ejercicios a la rutina.

Debe incluir:

- filtros por equipamiento,
- filtros por grupo muscular,
- buscador,
- listado de ejercicios disponibles,
- acción rápida para añadir un ejercicio a la rutina,
- acceso a `Ejercicio personalizado`.

La biblioteca no es una pantalla social ni de descubrimiento; es una herramienta de trabajo para
montar rutinas.

### Bloque `Todos los ejercicios`

Debajo de los filtros y del buscador, la biblioteca debe mostrar un bloque llamado
`Todos los ejercicios`.

Ese listado debe mezclar en una sola vista:

- ejercicios predeterminados del sistema,
- ejercicios personalizados creados por el usuario.

### Comportamiento del listado

- debe poder filtrarse por equipamiento,
- debe poder filtrarse por grupo muscular,
- debe responder al buscador,
- debe mostrar cada ejercicio como elemento seleccionable,
- debe permitir añadir el ejercicio a la rutina desde esa misma fila,
- debe dejar claro si un ejercicio es personalizado o predeterminado si eso aporta contexto visual.

### Notas de diseño

- Las cards de rutina deben priorizar nombre y resumen del contenido.
- Las acciones secundarias pueden vivir en menú contextual de tres puntos.
- La jerarquía carpeta → rutina es la base del diseño.
- La pantalla de crear rutina debe sentirse como un editor: contenido en el centro y utilidades en
  la derecha.
- El panel derecho puede apilar `Resumen` arriba y `Biblioteca` debajo.

---

## 6.3 Ejercicios

### Propósito

Permitir explorar la biblioteca de ejercicios y ver detalle del ejercicio seleccionado.

### Estructura recomendada

- Área principal vacía o de detalle cuando no hay selección.
- Panel lateral con biblioteca, filtros y buscador.
- Filtros por equipamiento, músculo y otros campos útiles.

### Estado base

Cuando no hay ejercicio seleccionado, la pantalla debe mostrar un estado vacío claro.

### Estado seleccionado

Cuando el usuario selecciona un ejercicio, el área principal puede mostrar:

- nombre,
- grupo muscular,
- historial relacionado,
- evolución de rendimiento,
- mejores marcas,
- y sesiones recientes donde apareció.

### Notas de producto

La acción `crear ejercicio personalizado` sí encaja, pero como herramienta funcional, no como
expansión social.

### Crear ejercicio personalizado

La creación de ejercicio personalizado debe existir tanto como acción visible dentro de la
`Biblioteca` como flujo propio dentro del sistema de ejercicios.

Campos requeridos en esta primera versión:

- imagen del ejercicio,
- nombre del ejercicio,
- tipo de ejercicio mediante `select`,
- equipamiento mediante `select`,
- grupo muscular primario mediante `select`,
- otros músculos mediante `select`.

### Valores confirmados para `Tipo de ejercicio`

Valores visibles en las capturas recibidas:

- `Repeticiones con peso`
- `Solo repeticiones`
- `Peso corporal con peso añadido`
- `Peso corporal asistido`
- `Duración`
- `Peso y duración`
- `Distancia y duración`
- `Peso y distancia`

Regla fijada:

- la última opción del listado debe ser `Otro`.

### Valores confirmados para `Equipamiento`

Valores visibles en las capturas recibidas:

- `Ninguno`
- `Barra`
- `Mancuerna`
- `Pesa Rusa`
- `Máquina`
- `Placa de Peso`
- `Banda de Resistencia`
- `Suspensión`

Regla fijada:

- si el listado incluye opción de cierre genérico, la última debe ser `Otro`.
- si faltan valores no visibles en la captura, se completarán después sin alterar esta regla.

### Valores confirmados para `Grupo muscular primario`

Valores visibles en las capturas recibidas:

- `Abdominales`
- `Hombros`
- `Bíceps`
- `Tríceps`
- `Antebrazos`
- `Cuádriceps`
- `Isquiotibiales`
- `Gemelos`
- `Glúteos`
- `Abductores`
- `Aductores`
- `Dorsales`
- `Espalda Superior`
- `Trapecio`
- `Espalda Baja`
- `Pecho`
- `Cardio`
- `Cuello`
- `Cuerpo Entero`
- `Otro`

Regla fijada:

- la última opción del listado debe ser `Otro`.

### Valores confirmados para `Otros músculos`

Valores visibles en las capturas recibidas:

- `Abdominales`
- `Hombros`
- `Bíceps`
- `Tríceps`
- `Antebrazos`
- `Cuádriceps`
- `Isquiotibiales`
- `Gemelos`
- `Glúteos`
- `Abductores`
- `Aductores`
- `Dorsales`
- `Espalda Superior`
- `Trapecio`
- `Espalda Baja`
- `Pecho`
- `Cardio`
- `Cuello`
- `Cuerpo Entero`
- `Otro`

Regla fijada:

- la última opción del listado debe ser `Otro`.
- en esta fase, `Otros músculos` usa el mismo catálogo base que `Grupo muscular primario`.

### Reglas de este formulario

- la imagen es opcional pero soportada,
- los campos estructurados deben resolverse con `selects`,
- el formulario debe estar pensado para crecer cuando se definan más opciones internas,
- el resultado final debe guardar el ejercicio como elemento reutilizable en la biblioteca del
  usuario.

---

## 6.4 Historial

### Propósito

Consultar sesiones finalizadas con un formato de lectura cómoda y filtrado simple.

### Estructura recomendada

- listado cronológico en tarjetas,
- filtros por rango de fechas,
- filtros por rutina o grupo muscular,
- detalle resumido de cada sesión.

### Contenido de cada tarjeta

- nombre del entrenamiento,
- fecha,
- duración,
- volumen,
- récords detectados,
- resumen de ejercicios realizados.

### Enfoque

El histórico debe sentirse como una extensión lógica del `Inicio`, no como una pantalla técnica.

---

## 6.5 Perfil

### Propósito

Ofrecer una vista privada del usuario con algunas estadísticas clave, un calendario de entrenos y
acceso directo al detalle de cada entrenamiento realizado.

### Estructura recomendada

- cabecera personal privada,
- bloque de `Estadísticas`,
- bloque de `Calendario`,
- listado inferior de entrenamientos relacionados o recientes.

### Preview inferior de entrenamientos finalizados

Debajo de `Estadísticas` y `Calendario` debe aparecer un listado de tarjetas con entrenamientos ya
finalizados, funcionando como preview privada del historial.

Cada tarjeta debe mostrar:

- nombre de usuario,
- fecha y hora,
- nombre del entrenamiento,
- duración,
- volumen,
- récords conseguidos si los hubo,
- solo algunos ejercicios visibles como preview, no el entrenamiento completo.

### Preview de ejercicios dentro de la tarjeta

La tarjeta no debe listar todos los ejercicios del entrenamiento.

Debe mostrar solo una muestra corta, por ejemplo:

- primeros ejercicios del entrenamiento,
- nombre del ejercicio,
- número de series por ejercicio,
- y un enlace o texto del tipo `Ver más ejercicios` si hay más contenido.

### Récords en la preview

Si el entrenamiento rompe algún récord, la tarjeta debe reflejarlo de forma clara.

Ejemplos de récords a contemplar:

- `PR`
- mejores repeticiones
- otros récords derivados que se implementen más adelante

Esto implica que el sistema deberá contemplar una lógica de detección de récords al finalizar un
entrenamiento.

### Calendario

El calendario debe mostrar visualmente los días en los que hubo entrenamiento.

Comportamiento esperado:

- navegar entre meses,
- resaltar los días con entreno,
- permitir pulsar un día con entreno,
- mostrar qué entrenamiento fue ese día,
- y llevar al detalle de ese entrenamiento al pulsarlo.

Si en una fecha concreta hubo entrenamiento, el calendario debe funcionar como punto de entrada al
detalle de esa sesión.

### Bloque `Estadísticas` dentro de Perfil

Este bloque debe ser compacto y centrado en unas pocas métricas útiles, no en una analítica
sobrecargada.

Tabs iniciales confirmadas:

- `Duration`
- `Reps`

### Tab `Duration`

`Duration` representa la duración promedio de los entrenos de la semana dentro del rango temporal
seleccionado.

Debe incluir:

- valor principal destacado,
- subtítulo contextual como `Esta semana` cuando aplique,
- gráfica simple de evolución,
- selector de rango temporal.

### Tab `Reps`

`Reps` representa el máximo volumen de repeticiones de todos los ejercicios dentro del rango
temporal seleccionado.

Debe incluir:

- valor principal destacado,
- gráfica simple de evolución,
- mismo selector temporal que `Duration`.

### Selector temporal

El selector temporal del bloque `Estadísticas` debe incluir estas opciones:

- `Últimas 12 semanas`
- `Año`
- `Siempre`

Ambas tabs, `Duration` y `Reps`, deben responder al mismo filtro temporal.

### Detalle del entrenamiento desde Perfil

Al abrir un entrenamiento desde el calendario o desde el listado inferior, debe mostrarse una vista
de detalle privada del entrenamiento.

Contenido esperado:

- nombre del entrenamiento,
- fecha y hora,
- duración,
- volumen,
- récords detectados,
- ejercicios incluidos,
- series, peso y repeticiones de cada ejercicio.

La preview inferior debe actuar como acceso directo a este detalle completo.

### Exclusiones de Perfil

Esta pantalla no debe incluir:

- likes,
- comentarios,
- compartir social,
- seguidores,
- siguiendo,
- sugerencias de usuarios.

---

## 6.6 Estadísticas

### Propósito

Convertir los datos del entrenamiento en lectura útil, sin convertir la app en un panel frío o
sobrecargado.

### Módulos iniciales recomendados

- volumen semanal,
- duración semanal,
- frecuencia de entrenamientos,
- evolución por ejercicio,
- récords personales,
- distribución por grupos musculares.

### Regla de diseño

Primero deben existir métricas simples, claras y fiables. Las visualizaciones complejas pueden
entrar más adelante.

---

## 6.7 Ajustes

### Propósito

Concentrar la configuración esencial de la cuenta sin ruido extra ni secciones irrelevantes.

### Contenido recomendado

- `Perfil`
- `Cuenta`
- `Unidades`
- `Idioma`
- `Tema`
- `Exportar datos`

### Navegación lateral de Configuración

La navegación interna de `Configuración` debe quedarse solo con estas secciones:

- `Perfil`
- `Cuenta`
- `Unidades`
- `Idioma`
- `Tema`
- `Exportar datos`

### Sección `Perfil`

Debe incluir únicamente:

- `Nombre`
- `Foto`

La foto se gestiona con una acción del tipo `Cambiar foto`.

No deben aparecer aquí:

- biografía,
- enlaces,
- campos sociales,
- ni información pública de perfil.

### Sección `Cuenta`

Debe incluir:

- cambio de contraseña,
- eliminación de cuenta.

#### Cambio de contraseña

Comportamiento esperado:

- campo de contraseña actual,
- campo de contraseña nueva,
- botón de actualizar en estado desactivado por defecto,
- el botón se activa solo cuando los campos requeridos permiten una acción válida.

La referencia que dejas marcada es que, por defecto, no se pueda hacer nada y el botón salga en
gris hasta que el usuario escriba la contraseña y proceda correctamente.

#### Eliminar cuenta

La acción `Eliminar cuenta` debe existir como acción sensible o destructiva dentro de `Cuenta`.

### Sección `Unidades`

Debe incluir selects para:

- unidad de peso,
- unidad de distancia,
- unidad de medida corporal.

Valores por defecto deseados:

- peso: `kg`
- distancia: `kilómetros`
- medida corporal: `cm`

Cada select puede incluir varias unidades compatibles, pero esos tres valores deben venir
seleccionados por defecto.

### Sección `Idioma`

Debe existir un select para cambiar el idioma de la aplicación.

La pantalla no necesita más complejidad que:

- etiqueta de idioma preferido,
- select de idioma,
- lista de idiomas disponibles.

### Sección `Tema`

Debe existir una sección para cambiar el aspecto de la interfaz, incluyendo como mínimo el modo
oscuro.

Opciones mínimas esperadas:

- `Claro`
- `Oscuro`

Puede resolverse con un select simple de tema actual.

### Sección `Exportar datos`

Debe existir una sección específica para exportar los datos de entrenamiento.

La exportación no debe limitarse solo a `CSV`. El usuario debe poder elegir entre varios formatos
de salida.

Requisitos de esta sección:

- botón o acción principal de exportación,
- selector de formato antes de exportar,
- posibilidad de ampliar formatos compatibles más adelante.

Ejemplos de formatos válidos a contemplar:

- `CSV`
- `JSON`
- otros formatos exportables que se definan después

### Cerrar sesión

Además de las secciones internas de `Configuración`, el acceso a `Cerrar sesión` debe seguir
presente en el menú izquierdo principal, dentro del bloque inferior de cuenta.

### Contenido no deseado

- edición de perfil social,
- biografía pública,
- enlaces a redes,
- estado premium,
- invitaciones a comunidad,
- gestionar suscripción,
- opciones de desarrollador.

---

## 7. Relación entre móvil y web

### Papel del móvil

La app mobile sigue siendo el producto principal para:

- iniciar entrenamientos,
- registrar series,
- completar sesiones,
- operar offline,
- y capturar datos rápidamente.

### Papel de la web

La web se convierte en la capa de:

- lectura cómoda,
- organización,
- análisis,
- y gestión desde escritorio.

### Reparto funcional

| Dominio | Móvil | Web |
|---------|-------|-----|
| Workout activo | Sí, principal | No prioritario |
| Crear/editar rutinas | Sí | Sí |
| Consultar histórico | Básico | Sí, principal |
| Analítica | Básica | Sí, principal |
| Ajustes de cuenta | Sí | Sí |
| Exploración de ejercicios | Sí | Sí |

---

## 8. Sincronización y datos

### Modelo deseado

El ecosistema debe funcionar así:

1. El dispositivo registra primero en local.
2. Los cambios se preparan para sincronización.
3. **InsForge** centraliza los datos compartidos.
4. La web consume esos datos autenticados.
5. La web se actualiza sin depender de recarga manual constante.

### Principios de sincronización

- El usuario no debe pensar en sincronizar.
- El dispositivo debe seguir funcionando sin red.
- La web prioriza consistencia visual y frescura suficiente.
- **El aislamiento por usuario es requisito**: cada cuenta ve solo lo suyo.

### Arquitectura conceptual

```
Dispositivo (almacén local) -> Cola de sync -> InsForge -> Web de escritorio
```

### Entidades esperadas

Las del dominio (ver [`CONTEXT.md`](../../CONTEXT.md)): ejercicios, rutinas y sus ejercicios,
sesiones, ejercicios de sesión, series y récords, más el perfil y una **cola de sincronización** en
local.

### Implicación importante

La web no inventa un modelo nuevo: se apoya en las entidades ya existentes y en la sincronización del
[`specs/003`](../../specs/003-auth-y-cuenta-con-insforge.md). Dirección de producto en
[`docs/09`](../09-remodelacion-web-dashboard.md).

---

## 9. Stack de la web

La web **no tiene stack propio**: es el **target `web` de Lynx**, compilado por Rspeedy desde el mismo
código que el target nativo.

| Capa | Cómo se resuelve |
|------|------------------|
| UI | ReactLynx (elementos `page` / `view` / `text`…) sobre Lynx for Web |
| Build | Rspeedy, `environments.web` |
| Estilos | El sistema de tokens por rol del proyecto |
| Datos | Los mismos repos sobre la *seam* de almacenamiento |
| Cuenta | InsForge ([`specs/003`](../../specs/003-auth-y-cuenta-con-insforge.md)) |
| Preview | Dev server de Rspeedy (puerto 3000) |

### Motivos

- Una sola base evita dos modelos de datos y dos interfaces que se desincronicen.
- La web hereda el sistema de diseño: no se reimplementa el lenguaje visual.
- **Descartado**: una app Next.js aparte, Tailwind, Supabase como backend y despliegue en Vercel.

### Límite de fidelidad

El target web **no reproduce el comportamiento nativo**. Sirve para composición, lectura y gestión; el
táctil y el rendimiento se validan en móvil real o emulador
([12](../12-entorno-desarrollo-lynx.md)).

---

## 10. Estructura

No hay carpeta `web/` ni aplicación separada. Las pantallas de escritorio son **las mismas** del
proyecto Lynx, adaptadas con el sistema de diseño:

```
lynx/src/
├── screens/         → las pantallas (adaptadas a escritorio en la parte B del diseño)
├── components/      → el shell y los componentes compartidos
└── lib/theme.ts     → los tokens del sistema
```

---

## 11. Refinamiento mobile derivado

La nueva web permite adelgazar la app mobile sin perder capacidad del producto.

### Objetivo

Que el móvil se centre en rapidez de uso y captura de entrenamientos.

### Dirección

- reducir tabs,
- simplificar navegación,
- mantener workout activo intacto,
- mover vistas de consulta profunda hacia web.

### Qué se mantiene como prioritario en móvil

- workout activo,
- home rápida,
- rutinas,
- autenticación,
- backup/importación si ya existe,
- ajustes esenciales.

### Qué puede vivir mejor en web

- histórico detallado,
- estadísticas amplias,
- exploración cómoda de ejercicios,
- gestión avanzada desde escritorio.

---

## 12. Fases propuestas

La web no tiene fases propias: se apoya en las del proyecto Lynx
([11](../11-plan-app-tipo-hevy.md)) y en los specs aprobados. Orden útil:

### Fase 1

Definir el shell de escritorio y la navegación base (parte B del sistema de diseño).

### Fase 2

Adaptar `Inicio`, `Rutinas` y `Ejercicios` al layout de escritorio.

### Fase 3

Conectar autenticación y datos reales desde **InsForge**
([`specs/003`](../../specs/003-auth-y-cuenta-con-insforge.md)).

### Fase 4

Adaptar `Historial` y `Estadísticas`.

### Fase 5

Estados vacíos, responsive de escritorio y rendimiento; previsualización web en CI
([`specs/005`](../../specs/005-ci-cd.md)).

---

## 13. Decisiones fijadas en este documento

1. La web pasa de ser solo dashboard a ser **app web de escritorio**.
2. La referencia principal del layout es el patrón visual mostrado en las capturas.
3. La capa social queda completamente fuera.
4. Premium, suscripciones y monetización visual quedan fuera.
5. El producto se orienta a uso privado del usuario autenticado.
6. La web complementa al móvil; no lo sustituye en el workout activo.

---

## 14. Puntos pendientes para próximas referencias

Este documento ya fija la dirección base, pero queda preparado para seguir refinándose cuando
lleguen más capturas.

Aspectos pendientes de concretar:

- detalle exacto del `Inicio`,
- composición final de `Estadísticas`,
- estructura definitiva de `Historial`,
- comportamiento de panel derecho en cada sección,
- estilo final de cabeceras, cards y tablas,
- prioridades del primer MVP visual.

---

## 15. Conclusión

La remodelación ya no debe pensarse como "hacer un dashboard web", sino como construir una
**versión de escritorio de Strain** centrada en gestión personal, lectura cómoda y análisis útil.

La referencia visual sirve porque resuelve bien el layout de escritorio, pero el producto final
debe quedarse solo con lo que aporta valor al entrenamiento real:

- buena navegación,
- buena jerarquía,
- buena lectura,
- buena organización,
- y cero ruido social o comercial.
