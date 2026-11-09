from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title="Sistema Operativo de Comunidades de Mini-Agentes",
    description="Plataforma multiagente para administrar comunidades sociales de personajes artificiales.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ajustar en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": "Comunidades Mini-Agentes OS",
        "version": "0.1.0",
        "status": "Fase 1 - Núcleo en construcción",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
