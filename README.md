# Sistema Operativo de Comunidades de Mini-Agentes

**Versión del documento maestro:** 1.0  
**Fecha de inicio:** 9 de noviembre de 2026

Plataforma central para administrar comunidades sociales formadas por cientos o miles de personajes artificiales, cada uno con identidad pública, personalidad, memoria, historial y comportamiento individual.

Coordinado por un **LLM central** que actúa como cerebro y orquestador. Independiente de proveedor de IA y de red social específica.

---

## Principios fundamentales

1. Arquitectura multiagente coordinada por un LLM central.
2. Identidades independientes y modificables.
3. Administración de cantidad variable de cuentas y Páginas.
4. Soporte para múltiples comunidades.
5. Memoria individual y colectiva.
6. Capacidad de utilizar múltiples proveedores y modelos de IA.
7. Independencia respecto del proveedor de LLM.
8. Infraestructura modular y escalable.
9. Optimización de recursos y costos.
10. Posibilidad de incorporar nuevas redes sociales sin reconstruir el sistema.

---

## Stack inicial recomendado

| Componente          | Tecnología              |
|---------------------|-------------------------|
| Backend             | Python / FastAPI        |
| Base de datos       | PostgreSQL + pgvector   |
| Cola de tareas      | Redis + workers         |
| Frontend            | React / Next.js         |
| LLM                 | Capa de abstracción multiproveedor |
| Conectores          | Adaptadores independientes |
| Archivos            | Local / S3 compatible   |

---

## Fases de desarrollo

### Fase 1 — Núcleo del sistema (en curso)
- Estructura del proyecto
- Backend + base de datos
- Modelo de datos (Comunidades, Personajes, Cuentas, Páginas)
- Persistencia

### Fase 2 — Infraestructura multi-LLM
- Abstracción de proveedores
- Selector manual + enrutador + failover

### Fase 3 — Inteligencia y memoria
- Orquestador central + tool calling
- Fichas de personalidad
- Memoria individual / colectiva / episódica / semántica

### Fase 4 — Motor de tareas
- Cola persistente + trabajadores

### Fase 5 — Integración social
- Adaptador de Facebook (Páginas)

### Fase 6 — Panel administrativo

### Fase 7 — Escalabilidad

---

## Estructura del repositorio (inicial)

```
comunidades-mini-agentes/
├── app/
│   ├── api/                 # Endpoints FastAPI
│   ├── core/                # Config, seguridad, dependencias
│   ├── db/                  # Modelos SQLAlchemy / SQLModel + sesión
│   ├── models/              # Schemas Pydantic
│   ├── services/
│   │   ├── llm/             # Capa multiproveedor + enrutador
│   │   ├── memory/          # Gestión de memoria
│   │   └── orchestration/   # Orquestador y tareas
│   └── main.py
├── workers/                 # Trabajadores de cola
├── tests/
├── docs/                    # Documento maestro y diseños
├── scripts/
├── .env.example
├── pyproject.toml / requirements.txt
└── README.md
```

---

## Cómo empezar (desarrollo local)

```bash
git clone https://github.com/enrrutador/comunidades-mini-agentes.git
cd comunidades-mini-agentes
python -m venv .venv
source .venv/bin/activate   # o .venv\\Scripts\\activate en Windows
pip install -r requirements.txt
cp .env.example .env
# Configurar DATABASE_URL, etc.
uvicorn app.main:app --reload
```

---

## Documento maestro

El documento completo de arquitectura se encuentra en `docs/DOCUMENTO_MAESTRO.md`.

---

**Estado actual:** Repositorio creado. Comenzando Fase 1 — Núcleo del sistema.
