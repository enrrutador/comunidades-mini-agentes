# Documento maestro · Versión 1.0

**PROYECTO:** SISTEMA OPERATIVO DE COMUNIDADES DE MINI-AGENTES

Documento maestro de arquitectura y desarrollo  
Versión: 1.0  
Fecha: 9 de noviembre de 2026

---

## 1. VISIÓN GENERAL

### 1.1. Objetivo

Desarrollar un sistema capaz de administrar comunidades sociales formadas por cientos o miles de personajes artificiales, cada uno con identidad pública, personalidad, memoria, historial y comportamiento individual.

Los personajes tendrán presencia en redes sociales existentes, comenzando por Facebook mediante sus Páginas.

Cada personaje podrá tener su propia identidad pública, publicar contenido, participar en conversaciones, comentar, reaccionar y mantener relaciones con otros participantes, utilizando las funciones que cada plataforma permita.

El sistema estará dirigido por un LLM central que actuará como cerebro y orquestador de todas las operaciones.

No se busca construir un chatbot ni una automatización convencional de publicaciones.

Se busca desarrollar un **sistema operativo de comunidades de agentes sociales**.

### 1.2. Principios fundamentales

1. Arquitectura multiagente coordinada por un LLM central.
2. Identidades independientes y modificables.
3. Administración de una cantidad variable de cuentas y Páginas.
4. Soporte para múltiples comunidades.
5. Memoria individual y colectiva.
6. Capacidad de utilizar múltiples proveedores y modelos de inteligencia artificial.
7. Independencia respecto del proveedor de LLM.
8. Infraestructura modular y escalable.
9. Optimización de recursos y costos.
10. Posibilidad de incorporar nuevas redes sociales sin reconstruir el sistema.

### 1.3. Escenario de referencia

Una comunidad temática sobre gatos con 600 personajes.

Cada personaje tiene:

* Nombre.
* Identidad pública.
* Página social asociada.
* Fotografía o avatar.
* Personalidad.
* Forma de expresarse.
* Intereses.
* Memoria individual.
* Historial de publicaciones.
* Relaciones con otros personajes.
* Nivel de actividad.

El sistema puede administrar esta comunidad y, simultáneamente, otras comunidades de temáticas completamente diferentes.

---

## 2. ARQUITECTURA GENERAL

El sistema se dividirá en seis grandes capas.

**Capa 1. Inteligencia central**
* LLM central.
* Enrutador de modelos.
* Planificador.
* Motor de decisiones.
* Gestión de personalidades.
* Memoria contextual.
* Evaluación de resultados.

**Capa 2. Administración**
* Gestor de cuentas.
* Gestor de Páginas.
* Gestor de personajes.
* Gestor de comunidades.
* Administrador de relaciones.
* Planificador temporal.

**Capa 3. Orquestación**
* Cola de tareas.
* Distribución de trabajos.
* Trabajadores independientes.
* Gestión de prioridades.
* Control de concurrencia.
* Recuperación de tareas.

**Capa 4. Ejecución**
* Conectores de plataformas.
* Integraciones oficiales.
* Herramientas de lectura.
* Herramientas de publicación.
* Herramientas de interacción permitidas.
* Navegación asistida cuando corresponda.

**Capa 5. Persistencia**
* Base de datos principal.
* Memoria individual.
* Memoria colectiva.
* Historial de actividad.
* Almacenamiento de archivos.
* Registro de eventos.

**Capa 6. Interfaz**
* Panel administrativo.
* Administración de comunidades.
* Administración de personajes.
* Administración de cuentas y Páginas.
* Configuración de proveedores de IA.
* Monitoreo de tareas.
* Estadísticas y actividad.

El sistema será independiente de una plataforma específica y de un proveedor específico de inteligencia artificial.

---

## 3. SISTEMA MULTI-LLM Y MULTIPROVEEDOR

Este módulo es uno de los componentes centrales del proyecto.

No se utilizará un único proveedor obligatorio.

El administrador podrá conectar varios proveedores, agregar diferentes modelos y seleccionar manualmente cuál utilizar.

### 3.1. Gestión de proveedores

El sistema deberá permitir registrar múltiples proveedores de inteligencia artificial.

Ejemplos de integraciones posibles:

* OpenAI.
* Google Gemini.
* Anthropic.
* OpenRouter.
* NVIDIA NIM.
* Proveedores compatibles con OpenAI API.
* Servidores locales.
* Otros proveedores que se incorporen posteriormente.

La lista no será cerrada.

### 3.2. Gestión de modelos

Cada proveedor podrá ofrecer varios modelos.

El sistema deberá registrar:

* Nombre del proveedor.
* Nombre del modelo.
* Identificador técnico.
* Endpoint.
* Tipo de API.
* Capacidades.
* Contexto máximo.
* Disponibilidad.
* Estado de conexión.
* Costos conocidos, si existen.
* Límites de utilización.
* Prioridad.
* Fecha de última comprobación.

### 3.3. Selector manual de modelos

Desde el panel administrativo se podrá:

* Seleccionar un proveedor.
* Seleccionar un modelo.
* Cambiar de modelo en cualquier momento.
* Cambiar de proveedor sin modificar los personajes.
* Asignar un modelo a una tarea específica.
* Asignar modelos diferentes a distintas funciones.

### 3.4. Enrutador inteligente

Además de la selección manual, se desarrollará un enrutador de modelos.

Funciones:

* Selección según tipo de tarea.
* Selección según capacidad del modelo.
* Preferencia por modelos gratuitos cuando se configure así.
* Consideración de costos.
* Detección de errores.
* Detección de límites de utilización.
* Cambio automático al modelo alternativo.
* Reintentos controlados.
* Registro del modelo utilizado en cada operación.

### 3.5. Failover

El sistema deberá poder continuar funcionando si un proveedor deja de responder.

El cambio de modelo no debe provocar pérdida de memoria ni duplicación de operaciones.

### 3.6. Independencia del proveedor

Las personalidades, memorias, tareas, relaciones y configuraciones no deben quedar almacenadas exclusivamente en el proveedor de IA.

Toda esa información pertenece a la base de datos del proyecto.

Cambiar de proveedor no debe requerir reconstruir los personajes.

---

## 4. LLM CENTRAL Y ORQUESTADOR

El LLM central será el cerebro operativo.

Será responsable de interpretar objetivos, planificar actividades, consultar información, utilizar herramientas y coordinar los diferentes módulos.

### 4.1. Funciones del orquestador

* Interpretar instrucciones.
* Consultar el estado de las comunidades.
* Consultar personajes disponibles.
* Seleccionar personajes según el contexto.
* Recuperar memorias.
* Preparar planes de actividad.
* Generar tareas.
* Distribuir tareas.
* Consultar resultados.
* Evaluar resultados.
* Replanificar cuando sea necesario.

### 4.2. Herramientas disponibles para el LLM (tool calling)

Administración, Memoria, Planificación, Contenido, Ejecución.

### 4.3. Contexto dinámico

No se enviará toda la información de todos los personajes al LLM en cada solicitud.

El sistema recuperará solamente lo relevante para reducir consumo de tokens.

---

## 5–20. (Resumen de secciones restantes)

- **5. Gestor de identidades y personajes**: sin límites artificiales, fichas de personalidad editables, estados, identidad modificable.
- **6. Gestor de cuentas y Páginas**: separación clara Cuenta / Página / Personaje, relaciones muchos-a-muchos.
- **7. Sistema multi-comunidad**: independencia entre comunidades.
- **8. Sistema de memoria**: individual, colectiva, episódica, semántica + estructurada.
- **9. Motor de personalidad y comportamiento**.
- **10. Motor de orquestación y tareas**: cola, estados, trabajadores, concurrencia, reintentos e idempotencia.
- **11. Conectores de redes sociales**: adaptadores independientes (Facebook primero).
- **12. Base de datos**: PostgreSQL + pgvector recomendado.
- **13. Panel web de administración**.
- **14. Monitoreo y observabilidad**.
- **15. Economía y optimización**: priorizar costo cero.
- **16. Tecnología propuesta**.
- **17. Fases de desarrollo** (1 a 7).
- **18. Criterios de aceptación**.
- **19. Principios que no deben cambiarse**.
- **20. Resultado final esperado**.

---

## Recomendación de inicio

Empezar por el **modelo de datos** y la **capa multiproveedor**, porque son dos decisiones que condicionan todo lo demás.

Primer entregable funcional:

* Crear una comunidad.
* Registrar personajes.
* Conectar dos o más proveedores de LLM.
* Cambiar entre modelos.
* Guardar y recuperar personalidades.
* Mantener memoria persistente.

Después conectar Facebook.

---

*Documento completo original preservado. Esta versión se mantiene sincronizada con el desarrollo.*
