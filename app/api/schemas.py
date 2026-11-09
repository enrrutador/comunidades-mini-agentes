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
