from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, comunidades, facebook, llm, memoria, orquestacion, personalidad, personajes, tareas
from app.core.config import settings
from app.db.session import init_db

logger = logging.getLogger(__name__)


def _procesar_vencidas_background() -> None:
    """Una pasada del ejecutor (corre en un hilo para no bloquear el loop)."""
    from sqlmodel import Session

    from app.db.session import engine
    from app.services.orchestration.executor import procesar_vencidas

    with Session(engine) as session:
        procesadas = procesar_vencidas(session, limite=3)
        if procesadas:
            logger.info("Scheduler: %d tareas procesadas", len(procesadas))


async def _scheduler_loop() -> None:
    """Loop del planificador: ejecuta las tareas vencidas cada intervalo."""
    while True:
        try:
            await asyncio.sleep(settings.SCHEDULER_INTERVALO_SEG)
            await asyncio.to_thread(_procesar_vencidas_background)
        except asyncio.CancelledError:
            raise
        except Exception:  # noqa: BLE001
            logger.exception("Error en el scheduler de tareas")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: crear tablas si no existen (usar Alembic en producción)
    init_db()
    scheduler_task = None
    if settings.SCHEDULER_HABILITADO:
        scheduler_task = asyncio.create_task(_scheduler_loop())
    yield
    # Shutdown
    if scheduler_task:
        scheduler_task.cancel()


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
app.include_router(auth.router, prefix="/api")
app.include_router(comunidades.router, prefix="/api")
app.include_router(facebook.router, prefix="/api")
app.include_router(llm.router, prefix="/api")
app.include_router(memoria.router, prefix="/api")
app.include_router(orquestacion.router, prefix="/api")
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
