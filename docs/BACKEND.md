# Pulse OS · Backend

Documentación del backend FastAPI.

**Última actualización:** 9 de noviembre de 2026

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

### Facebook (`/api/facebook`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST   | `/api/facebook/cuentas` | Registrar cuenta (credenciales cifradas) |
| GET    | `/api/facebook/cuentas` | Listar cuentas |
| GET    | `/api/facebook/cuentas/{id}` | Obtener cuenta |
| DELETE | `/api/facebook/cuentas/{id}` | Eliminar cuenta |
| POST   | `/api/facebook/cuentas/{id}/login` | Iniciar sesión en navegador |
| GET    | `/api/facebook/cuentas/{id}/estado` | Estado de conexión |
| GET    | `/api/facebook/cuentas/{id}/paginas` | Listar Páginas de la cuenta |
| GET    | `/api/facebook/paginas` | Listar todas las Páginas |
| PATCH  | `/api/facebook/paginas/{id}/asignar` | Asignar Página a Personaje |
| PATCH  | `/api/facebook/paginas/{id}/desasignar` | Desvincular Página |
| POST   | `/api/facebook/publicar` | Publicar post (via navegador) |
| POST   | `/api/facebook/comentar` | Comentar (via navegador) |
| POST   | `/api/facebook/reaccionar` | Reaccionar (via navegador) |
| GET    | `/api/facebook/leer-posts` | Leer posts (via scraping) |
| GET    | `/api/facebook/leer-comentarios` | Leer comentarios (via scraping) |

### Memoria (`/api/memoria`)
Ver sección anterior.

---

## Modelo de datos (resumen)

- **Comunidad**: nombre, temática, descripción interna, reglas editoriales, config de actividad
- **Personaje**: nombre, apellido, personalidad (JSON), estado, nivel de actividad, relación con Comunidad y Página
- **Cuenta**: identidad en red social, credenciales cifradas, estado de conexión
- **Página**: id de plataforma, nombre público, URL, avatar, capacidades, token cifrado, relación con Cuenta y Comunidad
- **SesionNavegador**: storage state cifrado, user agent, proxy, estado
- **ProveedorLLM / ModeloLLM**: multiproveedor
- **MemoryEntry**: scope (individual/colectiva/episódica/semántica), owner, summary, metadata
- **Tarea**: cola de orquestación con estados, prioridad, payload, resultado, error, idempotency

Ver `app/db/models.py` para el detalle completo.

---

## Próximos pasos backend

1. Browser Manager (Playwright) — implementar login, publicación, scraping
2. Motor de personalidad — generación de contenido por personaje
3. Conectar frontend ↔ backend (reemplazar localStorage por API calls)
4. Autenticación básica del panel
5. Alembic para migraciones
6. Seed de datos de ejemplo
7. Tests

## Próximos pasos backend

1. Endpoints de Tareas y estado del sistema
2. Capa multiproveedor LLM real (OpenAI-compatible + failover)
3. Alembic para migraciones
4. Seed de datos de ejemplo (comunidad gatos + 15 personajes)
5. Autenticación básica del panel

---

## Conexión con el frontend

El frontend (`web/src/lib/api.ts`) ya tiene el cliente TypeScript listo.

Variable de entorno del frontend:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```
