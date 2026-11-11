# Pulse OS · Backend

Documentación del backend FastAPI.

**Última actualización:** 11 de noviembre de 2026

---

## Stack

- Python 3.11+
- FastAPI
- SQLModel (SQLAlchemy + Pydantic)
- PostgreSQL (recomendado) / SQLite para desarrollo rápido
- pgvector (memoria semántica, Fase 3)

---

## Cómo correr

```bash
# Desde la raíz del repo
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Editar DATABASE_URL si es necesario

uvicorn app.main:app --reload --port 8000
```

Docs interactivas: http://localhost:8000/docs

---

## Endpoints actuales

### Salud
- `GET /` → info del sistema
- `GET /health` → healthcheck

### Comunidades (`/api/comunidades`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/comunidades` | Listar todas |
| POST   | `/api/comunidades` | Crear |
| GET    | `/api/comunidades/{id}` | Obtener una |
| PATCH  | `/api/comunidades/{id}` | Actualizar |
| DELETE | `/api/comunidades/{id}` | Eliminar |

### Personajes (`/api/personajes`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/personajes` | Listar (filtro opcional `?comunidad_id=`) |
| POST   | `/api/personajes` | Crear |
| GET    | `/api/personajes/{id}` | Obtener uno |
| PATCH  | `/api/personajes/{id}` | Actualizar |
| DELETE | `/api/personajes/{id}` | Eliminar |

### LLM Multiproveedor (`/api/llm`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/llm/proveedores` | Listar proveedores |
| POST   | `/api/llm/proveedores` | Crear proveedor |
| GET    | `/api/llm/proveedores/{id}` | Obtener proveedor |
| PATCH  | `/api/llm/proveedores/{id}` | Actualizar proveedor |
| DELETE | `/api/llm/proveedores/{id}` | Eliminar proveedor |
| GET    | `/api/llm/modelos` | Listar modelos (filtro `?proveedor_id=`) |
| POST   | `/api/llm/modelos` | Crear modelo |
| GET    | `/api/llm/modelos/{id}` | Obtener modelo |
| PATCH  | `/api/llm/modelos/{id}` | Actualizar modelo |
| DELETE | `/api/llm/modelos/{id}` | Eliminar modelo |
| POST   | `/api/llm/test` | Test de conexión (body: `{proveedor_id}`) |
| POST   | `/api/llm/chat` | Chat con LLM (body: `{messages, modelo_id?, proveedor_id?, temperature?, max_tokens?}`) |

### Memoria (`/api/memoria`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/memoria` | Listar (filtros: `?scope=`, `?comunidad_id=`, `?personaje_id=`) |
| POST   | `/api/memoria` | Crear entrada de memoria |
| GET    | `/api/memoria/{id}` | Obtener una entrada |
| PATCH  | `/api/memoria/{id}` | Actualizar |
| DELETE | `/api/memoria/{id}` | Eliminar |
| GET    | `/api/memoria/buscar?q=` | Buscar por texto en resumen |

### Tareas (`/api/tareas`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET    | `/api/tareas` | Listar (filtros: `?estado=`, `?tipo=`, `?comunidad_id=`, `?personaje_id=`) |
| POST   | `/api/tareas` | Crear tarea (soporta `idempotency_key`) |
| GET    | `/api/tareas/{id}` | Obtener una tarea |
| PATCH  | `/api/tareas/{id}` | Actualizar (estado, resultado, error) |
| DELETE | `/api/tareas/{id}` | Eliminar |
| POST   | `/api/tareas/{id}/reintentar` | Reintentar tarea fallida |
| POST   | `/api/tareas/{id}/cancelar` | Cancelar tarea pendiente |
| GET    | `/api/tareas/estadisticas/resumen` | Resumen por estado |

Las tareas de Facebook (`fb_publicar`, `fb_comentar`, `fb_responder`,
`fb_reaccionar`, `fb_leer_posts`, `fb_leer_comentarios`) las ejecuta
el **ejecutor** (`app/services/orchestration/executor.py`): un
scheduler en `main.py` procesa las vencidas cada
`SCHEDULER_INTERVALO_SEG` segundos, con tope de ritmo por cuenta
(`FB_MAX_ACCIONES_POR_HORA_CUENTA`). Cada ejecución verifica en
Facebook que la acción haya quedado con la Página correcta como
autora y lo registra en la memoria del personaje.

### Facebook (`/api/facebook`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST   | `/api/facebook/cuentas` | Registrar cuenta (credenciales cifradas) |
| GET    | `/api/facebook/cuentas` | Listar cuentas |
| GET    | `/api/facebook/cuentas/{id}` | Obtener cuenta |
| DELETE | `/api/facebook/cuentas/{id}` | Eliminar cuenta |
| POST   | `/api/facebook/cuentas/{id}/login` | Iniciar sesión en navegador |
| GET    | `/api/facebook/cuentas/{id}/estado` | Estado de conexión |
| POST   | `/api/facebook/cuentas/{id}/crear-pagina` | Crear una Página vía navegador |
| POST   | `/api/facebook/cuentas/{id}/detectar-paginas` | Detectar y guardar las Páginas de la cuenta |
| GET    | `/api/facebook/cuentas/{id}/paginas` | Listar Páginas de la cuenta |
| GET    | `/api/facebook/paginas` | Listar todas las Páginas |
| PATCH  | `/api/facebook/paginas/{id}/asignar` | Asignar Página a Personaje |
| PATCH  | `/api/facebook/paginas/{id}/desasignar` | Desvincular Página |
| POST   | `/api/facebook/publicar` | Publicar post como el personaje dueño de la Página (ejecuta de verdad) |
| POST   | `/api/facebook/comentar` | Comentar como la Página de `personaje_id` (obligatorio; ejecuta y verifica) |
| POST   | `/api/facebook/reaccionar` | Reaccionar como la Página de `personaje_id` (obligatorio; ejecuta y verifica) |
| GET    | `/api/facebook/leer-posts` | Leer posts (scraping real; `pagina_id`, `limit`) |
| GET    | `/api/facebook/leer-comentarios` | Leer comentarios (scraping real; `post_url`, `pagina_id`, `limit`) |

### Orquestación (`/api/orquestacion`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST   | `/api/orquestacion/ronda` | Planifica una ronda sobre un post con la spec de comportamiento y crea las tareas programadas |
| POST   | `/api/orquestacion/responder-comentarios` | Lee los comentarios de un post propio y programa respuestas del personaje dueño |
| POST   | `/api/orquestacion/procesar-vencidas` | Ejecuta ya las tareas de Facebook vencidas |

### Memoria (`/api/memoria`)
Ver sección anterior.

---

## Modelo de datos (resumen)

- **Comunidad**: nombre, temática, descripción interna, reglas editoriales, config de actividad
- **Personaje**: nombre, apellido, personalidad (JSON: temperamento, ortografía, longitud habitual, uso de emojis, temas, tendencias, nivel de actividad y **reacción de firma**), estado, nivel de actividad, relación con Comunidad y Página
- **Cuenta**: identidad en red social, credenciales cifradas, estado de conexión
- **Página**: id de plataforma, nombre público, URL, avatar, capacidades, relación con Cuenta y Comunidad (los campos `token_*` son legado del diseño por API, sin uso)
- **SesionNavegador**: storage state cifrado, user agent, proxy, estado
- **ProveedorLLM / ModeloLLM**: multiproveedor
- **MemoryEntry**: scope (individual/colectiva/episódica/semántica), owner, summary, metadata
- **Tarea**: cola de orquestación con estados, prioridad, payload, resultado, error, idempotency y `fecha_programada` (la agenda del ejecutor)

Ver `app/db/models.py` para el detalle completo.

---

## Próximos pasos backend

Hecho: endpoints completos (comunidades, personajes, LLM
multiproveedor con failover, memoria, tareas, Facebook, personalidad
y orquestación), autenticación del panel, Alembic, seed con los 15
personajes reales y sus fichas de voz, Browser Manager y conector de
Facebook por navegador, motor de personalidad, ejecutor de tareas
con scheduler y verificación, planificador de rondas con la spec de
comportamiento. Tests: `tests/test_api.py` + `tests/test_flujo.py`.

Pendiente:
1. Probar el flujo completo con la cuenta real y Playwright
   instalado; afinar selectores contra la UI real de Facebook.
2. Conectar el composer de runs del frontend al nuevo endpoint de
   rondas (hoy los runs solo generan contenido).
3. Worker periódico de renovación de sesiones.
4. Migración Alembic para bases ya creadas (el campo
   `reaccion_firma` vive dentro del JSON de personalidad, no requiere
   migración de columnas).

---

## Conexión con el frontend

El frontend (`web/src/lib/api.ts`) ya tiene el cliente TypeScript listo.

Variable de entorno del frontend:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```
