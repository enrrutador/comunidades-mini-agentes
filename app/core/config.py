from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me"

    # Database (SQLite por defecto para desarrollo; PostgreSQL en producción)
    DATABASE_URL: str = "sqlite:///./pulse_os.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # LLM
    OPENAI_API_KEY: str | None = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENROUTER_API_KEY: str | None = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OLLAMA_BASE_URL: str = "http://localhost:11434/v1"

    # Orquestación / ejecutor de tareas de Facebook
    # La comunidad real cuelga de UNA sola cuenta: el ritmo se mide a nivel
    # de la cuenta completa, no por personaje.
    SCHEDULER_HABILITADO: bool = True
    SCHEDULER_INTERVALO_SEG: int = 20
    FB_MAX_ACCIONES_POR_HORA_CUENTA: int = 40
    FB_PAUSA_ENTRE_ACCIONES_SEG: int = 8


settings = Settings()
