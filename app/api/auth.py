"""Autenticación del panel administrativo."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel
from sqlmodel import Session, select

from app.core.config import settings
from app.db.models import Usuario
from app.db.session import get_session

router = APIRouter(prefix="/auth", tags=["auth"])

# Configuración
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None


class UsuarioCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str
    is_admin: bool = False


class UsuarioRead(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    is_active: bool
    is_admin: bool


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = session.exec(select(Usuario).where(Usuario.username == username)).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_admin(user: Usuario = Depends(get_current_user)) -> Usuario:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Se requiere rol de administrador")
    return user


@router.post("/register", response_model=UsuarioRead, status_code=201)
def register(payload: UsuarioCreate, session: Session = Depends(get_session)):
    """Registrar un nuevo usuario. Solo para setup inicial."""
    existing = session.exec(select(Usuario).where(Usuario.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=409, detail="El usuario ya existe")
    user = Usuario(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        is_admin=payload.is_admin,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    """Login con username y password. Devuelve JWT."""
    user = session.exec(select(Usuario).where(Usuario.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Usuario inactivo")
    access_token = create_access_token(data={"sub": user.username})
    return Token(access_token=access_token)


@router.get("/me", response_model=UsuarioRead)
def me(current_user: Usuario = Depends(get_current_user)):
    """Obtener el usuario autenticado actual."""
    return current_user
