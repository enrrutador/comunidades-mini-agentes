from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import comunidades, facebook, llm, memoria, personalidad, personajes, tareas
from app.core.config import settings
from app.db.session import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: crear tablas si no existen (usar Alembic en producción)
    init_db()
    yield
    # Shutdown


app = FastAPI(
    title="Pulse OS · Comunidades Mini-Agentes",
    description="Sistema Operativo de Comunidades de Mini-Agentes. Multiagente, multiproveedor, memoria persistente.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajustar en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(comunidades.router, prefix="/api")
app.include_router(facebook.router, prefix="/api")
app.include_router(llm.router, prefix="/api")
app.include_router(memoria.router, prefix="/api")
app.include_router(personalidad.router, prefix="/api")
app.include_router(personajes.router, prefix="/api")
app.include_router(tareas.router, prefix="/api")


@app.get("/")
def root():
    return {
        "name": "Pulse OS",
        "version": "0.1.0",
        "status": "Fase 1 - Núcleo",
        "docs": "/docs",
        "api": {
            "comunidades": "/api/comunidades",
            "personajes": "/api/personajes",
            "facebook": "/api/facebook",
            "llm": "/api/llm",
        },
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "pulse-os"}
