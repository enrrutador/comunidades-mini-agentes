# Pulse OS

**Sistema Operativo de Comunidades de Mini-Agentes**

Versión del documento maestro: 1.0  
Fecha de inicio: 9 de noviembre de 2026

Plataforma central para administrar comunidades sociales formadas por cientos o miles de personajes artificiales, cada uno con identidad pública, personalidad, memoria, historial y comportamiento individual.

Coordinado por un **LLM central** que actúa como cerebro y orquestador. Independiente de proveedor de IA y de red social específica.

---

## Interfaz · Pulse OS

El panel administrativo tiene estética **dark + neon mesh**, inspirada en interfaces tipo Grok Bot Mesh / neural agent systems.

### Tabs disponibles

| Tab           | Estado   | Descripción |
|---------------|----------|-------------|
| Global        | Completa | Mesh central, filtros, bots/personajes, output y composer |
| Bots          | Completa | Módulos del sistema y bots de workflow editables |
| Runs          | Completa | Historial de tareas, modelo y verificación |
| Rules         | Completa | Reglas editoriales y políticas |
| Memory        | Completa | Memoria individual, colectiva, episódica y semántica |
| Comunidad     | Completa | Comunidades, personajes y cuentas de Página |

Incluye configuración multiproveedor LLM (OpenAI, OpenRouter, Groq, NVIDIA NIM, Ollama local y custom), proxy `/api/llm` y persistencia en `localStorage`.

### Cómo correr el frontend

```bash
cd web
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

Documentación: [`docs/FRONTEND.md`](docs/FRONTEND.md)

---

## Backend

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Docs interactivas: http://localhost:8000/docs  
Documentación: [`docs/BACKEND.md`](docs/BACKEND.md)

Endpoints listos:
- `GET/POST/PATCH/DELETE /api/comunidades`
- `GET/POST/PATCH/DELETE /api/personajes`

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

## Stack

| Componente          | Tecnología              |
|---------------------|-------------------------|
| Backend             | Python / FastAPI        |
| Base de datos       | PostgreSQL + pgvector   |
| Cola de tareas      | Redis + workers         |
| Frontend            | Next.js + Tailwind (Pulse OS) |
| LLM                 | Capa de abstracción multiproveedor |
| Conectores          | Adaptadores independientes |

---

## Estructura del repositorio

```
comunidades-mini-agentes/
├── app/                     # Backend FastAPI
│   ├── api/                 # Routers (comunidades, personajes)
│   ├── core/
│   ├── db/
│   ├── services/llm/
│   └── main.py
├── web/                     # Frontend Pulse OS (Next.js)
│   ├── src/app/
│   │   └── api/llm/         # Proxy LLM OpenAI-compatible
│   ├── src/components/      # Header, vistas, mesh, output, modales
│   ├── src/lib/             # api, tipos, datos, tema, LLM y persistencia
│   └── ...
├── docs/
│   ├── DOCUMENTO_MAESTRO.md
│   ├── FRONTEND.md
│   └── BACKEND.md
├── requirements.txt
└── README.md
```

---

## Documento maestro

El documento completo de arquitectura está en [`docs/DOCUMENTO_MAESTRO.md`](docs/DOCUMENTO_MAESTRO.md).

---

**Estado actual (10 nov 2026):**  
- Backend: modelos completos + CRUD (Comunidades, Personajes, Proveedores LLM, Modelos LLM, Memoria, Tareas) + LLM multiproveedor real + Facebook browser-based (router) + SQLite dev  
- Frontend: Pulse OS con 6 tabs, composer LLM, configuración multiproveedor y runs simuladas; cliente API completo; registro de cuentas Facebook desde el panel  
- Servicios: Browser Manager (Playwright) para manejo simultáneo de cuentas Facebook  
- Documentación: Documento Maestro + FRONTEND.md + BACKEND.md + FACEBOOK.md
