"""Pydantic schemas for API request/response."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Comunidad
# ---------------------------------------------------------------------------

class ComunidadCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=120)
    tematica: Optional[str] = None
    descripcion_interna: Optional[str] = None


class ComunidadRead(BaseModel):
    id: str
    nombre: str
    tematica: Optional[str] = None
    descripcion_interna: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ComunidadUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=120)
    tematica: Optional[str] = None
    descripcion_interna: Optional[str] = None


# ---------------------------------------------------------------------------
# Personaje
# ---------------------------------------------------------------------------

class PersonajeCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    apellido: Optional[str] = None
    comunidad_id: str
    biografia_interna: Optional[str] = None
    estilo_linguistico: Optional[str] = None
    avatar_url: Optional[str] = None
    personalidad: Optional[dict] = None
    nivel_actividad: int = Field(default=5, ge=1, le=10)


class PersonajeRead(BaseModel):
    id: str
    nombre: str
    apellido: Optional[str] = None
    comunidad_id: str
    pagina_id: Optional[str] = None
    biografia_interna: Optional[str] = None
    estilo_linguistico: Optional[str] = None
    avatar_url: Optional[str] = None
    personalidad: Optional[dict] = None
    estado: str
    nivel_actividad: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PersonajeUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=80)
    apellido: Optional[str] = None
    biografia_interna: Optional[str] = None
    estilo_linguistico: Optional[str] = None
    avatar_url: Optional[str] = None
    personalidad: Optional[dict] = None
    nivel_actividad: Optional[int] = Field(None, ge=1, le=10)
    estado: Optional[str] = None
    pagina_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Health / Status
# ---------------------------------------------------------------------------

class SystemStatus(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    personajes: int = 0
    comunidades: int = 0
    tareas_pendientes: int = 0
    errores: int = 0


# ---------------------------------------------------------------------------
# Proveedor LLM
# ---------------------------------------------------------------------------

class ProveedorLLMCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    tipo_api: str = Field(default="openai_compatible")
    base_url: Optional[str] = None
    activo: bool = Field(default=True)
    prioridad: int = Field(default=100)


class ProveedorLLMRead(BaseModel):
    id: str
    nombre: str
    tipo_api: str
    base_url: Optional[str] = None
    activo: bool
    prioridad: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProveedorLLMUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=80)
    tipo_api: Optional[str] = None
    base_url: Optional[str] = None
    activo: Optional[bool] = None
    prioridad: Optional[int] = None


# ---------------------------------------------------------------------------
# Modelo LLM
# ---------------------------------------------------------------------------

class ModeloLLMCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=80)
    identificador_tecnico: str = Field(..., min_length=1, max_length=120)
    proveedor_id: str
    contexto_maximo: Optional[int] = None
    capacidades: Optional[list[str]] = None
    disponible: bool = Field(default=True)
    costo_input: Optional[float] = None
    costo_output: Optional[float] = None
    prioridad: int = Field(default=100)


class ModeloLLMRead(BaseModel):
    id: str
    nombre: str
    identificador_tecnico: str
    proveedor_id: str
    contexto_maximo: Optional[int] = None
    capacidades: Optional[list[str]] = None
    disponible: bool
    costo_input: Optional[float] = None
    costo_output: Optional[float] = None
    prioridad: int
    ultima_comprobacion: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ModeloLLMUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=80)
    identificador_tecnico: Optional[str] = Field(None, min_length=1, max_length=120)
    contexto_maximo: Optional[int] = None
    capacidades: Optional[list[str]] = None
    disponible: Optional[bool] = None
    costo_input: Optional[float] = None
    costo_output: Optional[float] = None
    prioridad: Optional[int] = None


# ---------------------------------------------------------------------------
# LLM Chat
# ---------------------------------------------------------------------------

class LLMChatRequest(BaseModel):
    messages: list[dict]
    modelo_id: Optional[str] = None  # si no se pasa, usa el default
    proveedor_id: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, ge=1, le=32768)
    tools: Optional[list[dict]] = None


class LLMChatResponse(BaseModel):
    content: str
    role: str = "assistant"
    model_used: Optional[str] = None
    provider_used: Optional[str] = None
    usage: Optional[dict] = None
    finish_reason: Optional[str] = None


class LLMTestRequest(BaseModel):
    proveedor_id: str


class LLMTestResponse(BaseModel):
    ok: bool
    modelos_disponibles: list[str] = []
    error: Optional[str] = None
