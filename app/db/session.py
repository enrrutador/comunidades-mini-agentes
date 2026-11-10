from sqlmodel import Session, create_engine, SQLModel

from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.APP_ENV == "development",
    pool_pre_ping=True,
    connect_args=connect_args,
)


def init_db() -> None:
    """Crea las tablas si no existen. Usar Alembic en producción."""
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
