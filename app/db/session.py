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


_NUEVAS_COLUMNAS_CUENTAS = [
    ("email_usuario", "VARCHAR"),
    ("password_cifrado", "TEXT"),
    ("totp_secret_cifrado", "TEXT"),
    ("storage_state_cifrado", "TEXT"),
]


def init_db() -> None:
    """Crea las tablas si no existen. Usar Alembic en producción."""
    SQLModel.metadata.create_all(engine)
    _migrar_cuentas()


def _migrar_cuentas() -> None:
    """ALTER TABLE para columnas nuevas en DBs preexistentes (SQLite)."""
    with engine.connect() as conn:
        columnas = {
            row[1] for row in conn.exec_driver_sql("PRAGMA table_info(cuentas)")
        }
        if not columnas:
            return
        for nombre, tipo in _NUEVAS_COLUMNAS_CUENTAS:
            if nombre not in columnas:
                conn.exec_driver_sql(
                    f"ALTER TABLE cuentas ADD COLUMN {nombre} {tipo}"
                )
        conn.commit()
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session
