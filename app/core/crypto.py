"""Cifrado de credenciales con Fernet.

La clave se genera una vez y se guarda en `.credential_key` (raíz del repo,
chmod 0600). También se puede forzar con la variable de entorno
CREDENTIAL_ENCRYPTION_KEY (compatible con secret managers en producción).
"""

import os
from pathlib import Path

from cryptography.fernet import Fernet

_KEY_FILE = Path(__file__).resolve().parents[2] / ".credential_key"


def _load_key() -> bytes:
    env_key = os.environ.get("CREDENTIAL_ENCRYPTION_KEY")
    if env_key:
        return env_key.encode()
    if _KEY_FILE.exists():
        key = _KEY_FILE.read_bytes().strip()
        if key:
            return key
    key = Fernet.generate_key()
    _KEY_FILE.write_bytes(key)
    try:
        os.chmod(_KEY_FILE, 0o600)
    except OSError:
        pass
    return key


_fernet = Fernet(_load_key())


def cifrar(texto: str) -> str:
    """Cifrar texto plano (contraseñas, tokens, storage states)."""
    return _fernet.encrypt(texto.encode()).decode()


def descifrar(token: str) -> str:
    """Descifrar un token de Fernet."""
    return _fernet.decrypt(token.encode()).decode()
