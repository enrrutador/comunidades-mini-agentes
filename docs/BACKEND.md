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

---

## Modelo de datos (resumen)

- **Comunidad**: nombre, temática, descripción interna, reglas editoriales, config de actividad
- **Personaje**: nombre, apellido, personalidad (JSON), estado, nivel de actividad, relación con Comunidad y Página
- **Cuenta / Página**: infraestructura de identidades en redes sociales
- **ProveedorLLM / ModeloLLM**: multiproveedor
- **Tarea**: cola de orquestación

Ver `app/db/models.py` para el detalle completo.

---

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
