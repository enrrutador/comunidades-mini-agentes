"""Navegador EN VIVO dentro de la app.

Screencast CDP del Chromium de la cuenta: la vista de Facebook muestra
la pantalla del navegador de la propia app (sin ventanas externas, sin
VNC) y retransmite clicks, teclas y texto. El usuario inicia sesion EL
MISMO, ahi adentro, y cuando la sesion entra, la app la guarda y marca
la cuenta como conectada.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
from datetime import datetime, timezone

from sqlmodel import Session

from app.core.crypto import cifrar
from app.db.models import Cuenta
from app.db.session import engine
from app.services.browser.manager import get_browser_manager

logger = logging.getLogger(__name__)

MAX_SEGUNDOS = 900  # 15 minutos para iniciar sesion con calma
URL_LOGIN = "https://www.facebook.com/login"


class SesionViva:
    def __init__(self, cuenta_id: str):
        self.cuenta_id = cuenta_id
        self.connector = None
        self.contexto = None
        self.pagina = None
        self.cdp = None
        self.frame: bytes | None = None
        self.frame_id = 0
        self.conectado = False
        self.activa = False
        self._vigia: asyncio.Task | None = None

    async def _al_recibir_frame(self, evento) -> None:
        try:
            self.frame = base64.b64decode(evento["data"])
            self.frame_id += 1
        except Exception:
            pass
        try:
            await self.cdp.send(
                "Page.screencastFrameAck", {"sessionId": evento["sessionId"]}
            )
        except Exception:
            pass


SESIONES: dict[str, SesionViva] = {}


async def iniciar(cuenta_id: str) -> SesionViva:
    previa = SESIONES.get(cuenta_id)
    if previa and previa.activa:
        return previa
    manager = get_browser_manager()
    try:
        await manager.close(cuenta_id)
    except Exception:
        pass
    sesion = SesionViva(cuenta_id)
    connector = await manager.get_connector(cuenta_id)
    sesion.connector = connector
    # Contexto PROPIO y angosto: el contenido de Facebook (y el desafio de
    # seguridad) ocupa casi todo el ancho de la pantalla, con el doble de
    # definicion, en vez de perderse en una pagina de escritorio ancha.
    navegador = await connector.navegador()
    sesion.contexto = await navegador.new_context(
        viewport={"width": 780, "height": 680},
        device_scale_factor=2,
    )
    sesion.pagina = await sesion.contexto.new_page()
    await sesion.pagina.goto(
        URL_LOGIN,
        wait_until="domcontentloaded",
        timeout=30000,
    )
    sesion.cdp = await sesion.contexto.new_cdp_session(sesion.pagina)
    sesion.cdp.on(
        "Page.screencastFrame",
        lambda ev: asyncio.ensure_future(sesion._al_recibir_frame(ev)),
    )
    await sesion.cdp.send(
        "Page.startScreencast",
        {"format": "jpeg", "quality": 85, "maxWidth": 1560,
         "maxHeight": 1360, "everyNthFrame": 1},
    )
    sesion.activa = True
    SESIONES[cuenta_id] = sesion
    sesion._vigia = asyncio.ensure_future(_vigilar(sesion))
    return sesion


async def _vigilar(sesion: SesionViva) -> None:
    for _ in range(MAX_SEGUNDOS // 4):
        await asyncio.sleep(4)
        if not sesion.activa:
            return
        try:
            cookies = await sesion.contexto.cookies("https://www.facebook.com")
            if any(c["name"] == "c_user" for c in cookies):
                state = await sesion.contexto.storage_state()
                with Session(engine) as db:
                    cuenta = db.get(Cuenta, sesion.cuenta_id)
                    if cuenta:
                        cuenta.storage_state_cifrado = cifrar(json.dumps(state))
                        cuenta.estado_conexion = "conectado"
                        cuenta.estado_autorizacion = "autorizado (navegador de la app)"
                        cuenta.ultima_conexion = datetime.now(timezone.utc)
                        db.add(cuenta)
                        db.commit()
                sesion.conectado = True
                logger.info("Navegador de la app: sesion guardada %s", sesion.cuenta_id)
                return
        except Exception as error:  # noqa: BLE001
            logger.warning("Vigia del navegador de la app: %s", error)


async def entrada(sesion: SesionViva, mensaje: dict) -> None:
    if not sesion.cdp:
        return
    tipo = mensaje.get("tipo")
    try:
        if tipo == "click":
            x, y = float(mensaje["x"]), float(mensaje["y"])
            for tipo_evento in ("mousePressed", "mouseReleased"):
                await sesion.cdp.send(
                    "Input.dispatchMouseEvent",
                    {"type": tipo_evento, "x": x, "y": y,
                     "button": "left", "clickCount": 1},
                )
        elif tipo == "texto":
            await sesion.cdp.send(
                "Input.insertText", {"text": str(mensaje.get("texto", ""))}
            )
        elif tipo == "tecla":
            tecla = str(mensaje.get("tecla", ""))
            if tecla:
                await sesion.cdp.send(
                    "Input.dispatchKeyEvent",
                    {"type": "keyDown", "key": tecla, "code": tecla},
                )
                await sesion.cdp.send(
                    "Input.dispatchKeyEvent",
                    {"type": "keyUp", "key": tecla, "code": tecla},
                )
    except Exception as error:  # noqa: BLE001
        logger.warning("Entrada del navegador de la app: %s", error)


async def cerrar(cuenta_id: str) -> None:
    sesion = SESIONES.pop(cuenta_id, None)
    if not sesion:
        return
    sesion.activa = False
    if sesion._vigia:
        sesion._vigia.cancel()
    try:
        if sesion.cdp:
            await sesion.cdp.send("Page.stopScreencast")
    except Exception:
        pass
    try:
        if sesion.contexto:
            await sesion.contexto.close()
    except Exception:
        pass
    try:
        await get_browser_manager().release(cuenta_id)
    except Exception:
        pass
