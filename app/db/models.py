"""
Modelos de datos principales del Sistema Operativo de Comunidades de Mini-Agentes.

Principios:
- Sin límites artificiales de cantidad de personajes/comunidades.
- Identidades modificables (personaje no atado permanentemente a una Página).
- Memoria y personalidades en la base de datos del proyecto (no en el proveedor LLM).
- Separación clara: Cuenta / Página / Personaje / Comunidad.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, Text, JSON
from sqlmodel import Field, Relationship, SQLModel


def generate_uuid() -> str:
    return str(uuid4())


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class PersonajeEstado(str, Enum):
    EN_PREPARACION = "en_preparacion"
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    SUSPENDIDO = "suspendido"
    PENDIENTE_CONFIGURACION = "pendiente_configuracion"
    ERROR_INTEGRACION = "error_integracion"


class TareaEstado(str, Enum):
    PENDIENTE = "pendiente"
    PROGRAMADA = "programada"
    EN_EJECUCION = "en_ejecucion"
    COMPLETADA = "completada"
    FALLIDA = "fallida"
    EN_ESPERA = "en_espera"
    CANCELADA = "cancelada"


class Plataforma(str, Enum):
    FACEBOOK = "facebook"
    # Futuras: INSTAGRAM, X, TIKTOK, etc.


# ---------------------------------------------------------------------------
# Comunidad
# ---------------------------------------------------------------------------

class ComunidadBase(SQLModel):
    nombre: str = Field(index=True)
    tematica: Optional[str] = None
    descripcion_interna: Optional[str] = Field(default=None, sa_column=Column(Text))
    reglas_editoriales: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    configuracion_actividad: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class Comunidad(ComunidadBase, table=True):
    __tablename__ = "comunidades"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    personajes: list["Personaje"] = Relationship(back_populates="comunidad")


# ---------------------------------------------------------------------------
# Personaje + Personalidad
# ---------------------------------------------------------------------------

class Personalidad(SQLModel):
    """Ficha de personalidad (embebida o separada)."""
    temperamento: Optional[str] = None
    nivel_expresividad: Optional[int] = Field(default=5, ge=1, le=10)
    longitud_habitual_comentarios: Optional[str] = None  # corta / media / larga
    vocabulario: Optional[str] = None
    ortografia: Optional[str] = None
    uso_emojis: Optional[str] = None
    temas_preferidos: Optional[list[str]] = Field(default=None, sa_column=Column(JSON))
    temas_secundarios: Optional[list[str]] = Field(default=None, sa_column=Column(JSON))
    intereses: Optional[list[str]] = Field(default=None, sa_column=Column(JSON))
    tipo_humor: Optional[str] = None
    tendencia_preguntar: Optional[int] = Field(default=5, ge=1, le=10)
    tendencia_responder: Optional[int] = Field(default=5, ge=1, le=10)
    nivel_actividad: Optional[int] = Field(default=5, ge=1, le=10)


class PersonajeBase(SQLModel):
    nombre: str = Field(index=True)
    apellido: Optional[str] = None
    biografia_interna: Optional[str] = Field(default=None, sa_column=Column(Text))
    estilo_linguistico: Optional[str] = Field(default=None, sa_column=Column(Text))
    avatar_url: Optional[str] = None
    estado: PersonajeEstado = Field(default=PersonajeEstado.EN_PREPARACION)
    nivel_actividad: int = Field(default=5, ge=1, le=10)


class Personaje(PersonajeBase, table=True):
    __tablename__ = "personajes"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    comunidad_id: str = Field(foreign_key="comunidades.id", index=True)
    pagina_id: Optional[str] = Field(default=None, foreign_key="paginas.id", index=True)

    # Personalidad como JSON para flexibilidad (editable sin migraciones frecuentes)
    personalidad: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    comunidad: Optional[Comunidad] = Relationship(back_populates="personajes")
    pagina: Optional["Pagina"] = Relationship(back_populates="personaje")


# ---------------------------------------------------------------------------
# Cuenta y Página
# ---------------------------------------------------------------------------

class CuentaBase(SQLModel):
    nombre_identificador: str
    plataforma: Plataforma = Field(default=Plataforma.FACEBOOK)
    estado_conexion: str = Field(default="desconectado")
    metodo_autenticacion: Optional[str] = None
    estado_autorizacion: Optional[str] = None
    ultima_conexion: Optional[datetime] = None


class Cuenta(CuentaBase, table=True):
    __tablename__ = "cuentas"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    # Token de usuario cifrado (Fernet). Nunca en texto plano.
    token_usuario_cifrado: Optional[str] = Field(default=None, sa_column=Column(Text))
    token_usuario_expira: Optional[datetime] = None
    # Credenciales / tokens se almacenan de forma segura (nunca en conversaciones del LLM)
    # Se recomienda tabla separada o secret manager en producción.
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    paginas: list["Pagina"] = Relationship(back_populates="cuenta")


class PaginaBase(SQLModel):
    id_plataforma: str = Field(index=True)  # ID original de Facebook, etc.
    nombre_publico: str
    url: Optional[str] = None
    avatar_url: Optional[str] = None
    plataforma: Plataforma = Field(default=Plataforma.FACEBOOK)
    estado_conexion: str = Field(default="desconectado")
    capacidades: Optional[dict] = Field(default=None, sa_column=Column(JSON))


class Pagina(PaginaBase, table=True):
    __tablename__ = "paginas"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    comunidad_id: Optional[str] = Field(default=None, foreign_key="comunidades.id", index=True)
    cuenta_id: Optional[str] = Field(default=None, foreign_key="cuentas.id", index=True)
    # Token de página cifrado (Fernet). Page tokens no expiran si se obtienen con LLT.
    token_pagina_cifrado: Optional[str] = Field(default=None, sa_column=Column(Text))
    token_pagina_expira: Optional[datetime] = None
    # Un personaje puede estar asociado a una Página (relación 1:1 o 1:N según evolución)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    personaje: Optional[Personaje] = Relationship(back_populates="pagina")
    cuenta: Optional["Cuenta"] = Relationship(back_populates="paginas")


# ---------------------------------------------------------------------------
# Proveedores y Modelos LLM
# ---------------------------------------------------------------------------

class ProveedorLLMBase(SQLModel):
    nombre: str = Field(index=True)
    tipo_api: str = Field(default="openai_compatible")  # openai_compatible | anthropic | etc.
    base_url: Optional[str] = None
    activo: bool = Field(default=True)
    prioridad: int = Field(default=100)


class ProveedorLLM(ProveedorLLMBase, table=True):
    __tablename__ = "proveedores_llm"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    # API keys se manejan por env o secret store, no necesariamente aquí
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    modelos: list["ModeloLLM"] = Relationship(back_populates="proveedor")


class ModeloLLMBase(SQLModel):
    nombre: str
    identificador_tecnico: str = Field(index=True)
    contexto_maximo: Optional[int] = None
    capacidades: Optional[list[str]] = Field(default=None, sa_column=Column(JSON))
    disponible: bool = Field(default=True)
    costo_input: Optional[float] = None
    costo_output: Optional[float] = None
    limites: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    prioridad: int = Field(default=100)
    ultima_comprobacion: Optional[datetime] = None


class ModeloLLM(ModeloLLMBase, table=True):
    __tablename__ = "modelos_llm"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    proveedor_id: str = Field(foreign_key="proveedores_llm.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    proveedor: Optional[ProveedorLLM] = Relationship(back_populates="modelos")


# ---------------------------------------------------------------------------
# Tareas (orquestación)
# ---------------------------------------------------------------------------

class TareaBase(SQLModel):
    tipo: str = Field(index=True)
    prioridad: int = Field(default=5)
    estado: TareaEstado = Field(default=TareaEstado.PENDIENTE, index=True)
    payload: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    resultado: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    error: Optional[str] = Field(default=None, sa_column=Column(Text))
    fecha_programada: Optional[datetime] = None
    fecha_ejecucion: Optional[datetime] = None
    idempotency_key: Optional[str] = Field(default=None, index=True)


class Tarea(TareaBase, table=True):
    __tablename__ = "tareas"

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    comunidad_id: Optional[str] = Field(default=None, foreign_key="comunidades.id", index=True)
    personaje_id: Optional[str] = Field(default=None, foreign_key="personajes.id", index=True)
    modelo_usado: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
