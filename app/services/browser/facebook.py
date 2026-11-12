"""
Conector de Facebook basado en navegador (Playwright).

Toda la interacción se hace a través de un navegador real.
No se usa ninguna API de Facebook.

Requiere: pip install playwright && playwright install chromium
"""

import asyncio
import json
import logging
import os
import random
from typing import Optional

logger = logging.getLogger(__name__)


def _norm(texto: str) -> str:
    """Normalizar texto para comparar nombres/contenido (minúsculas, sin tildes)."""
    import unicodedata

    t = unicodedata.normalize("NFKD", (texto or "").lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return " ".join(t.split())

try:
    from playwright.async_api import async_playwright, Browser, BrowserContext, Page
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    logger.warning("Playwright no está instalado. El conector de Facebook no funcionará.")


class FacebookBrowserConnector:
    """Conector de Facebook vía navegador (Playwright)."""

    def __init__(self, storage_state: Optional[dict] = None, proxy: Optional[str] = None):
        self.storage_state = storage_state
        self.proxy = proxy
        self._playwright = None
        self._browser: Optional["Browser"] = None
        self._context: Optional["BrowserContext"] = None
        self._page: Optional["Page"] = None

    async def start(self):
        """Iniciar el navegador y crear un contexto."""
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright no está instalado. Ejecutá: pip install playwright && playwright install chromium")

        self._playwright = await async_playwright().start()
        # Modo visible: con PULSE_NAVEGADOR_VISIBLE=1 el navegador se abre
        # con pantalla (bajo Xvfb/VNC) para que el usuario inicie sesion
        # EL MISMO desde su telefono o PC, a traves del enlace en vivo.
        visible = os.environ.get("PULSE_NAVEGADOR_VISIBLE") == "1"
        self._browser = await self._playwright.chromium.launch(
            headless=not visible,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context_opts = {
            "viewport": {"width": 1280, "height": 800},
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        }
        if self.storage_state:
            context_opts["storage_state"] = self.storage_state
        if self.proxy:
            context_opts["proxy"] = {"server": self.proxy}

        self._context = await self._browser.new_context(**context_opts)
        self._page = await self._context.new_page()

    async def close(self):
        """Cerrar el navegador."""
        if self._context:
            await self._context.close()
        if self._browser:
            await self._browser.close()
        if self._playwright:
            await self._playwright.stop()

    async def abrir_pagina_login(self) -> None:
        """Abrir la pagina de login y DEJARLA ABIERTA para que el usuario
        inicie sesion a mano en el navegador en vivo."""
        if not self._page:
            await self.start()
        await self._page.goto(
            "https://www.facebook.com/login",
            wait_until="domcontentloaded",
            timeout=20000,
        )

    async def sesion_cdp(self):
        """Sesion CDP de la pagina actual (screencast + entrada remota)."""
        if not self._context or not self._page:
            await self.start()
        return await self._context.new_cdp_session(self._page)

    async def tiene_sesion(self) -> bool:
        """True si ya hay cookie c_user, SIN navegar (no interfiere con
        lo que el usuario esta escribiendo en el navegador en vivo)."""
        if not self._context:
            return False
        try:
            cookies = await self._context.cookies("https://www.facebook.com")
            return any(c["name"] == "c_user" for c in cookies)
        except Exception:
            return False

    async def get_storage_state(self) -> dict:
        """Exportar el storage state actual (cookies + localStorage)."""
        if not self._context:
            raise RuntimeError("Contexto no iniciado. Llamá a start() primero.")
        return await self._context.storage_state()

    async def is_logged_in(self) -> bool:
        """Verificar si la sesión sigue activa."""
        if not self._page:
            return False
        try:
            await self._page.goto("https://www.facebook.com/", wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(2)
            # Buscar indicador de sesión activa
            cookies = await self._context.cookies("https://www.facebook.com")
            return any(c["name"] == "c_user" for c in cookies)
        except Exception:
            return False

    async def login(self, email: str, password: str, totp_secret: Optional[str] = None) -> bool:
        """Iniciar sesión en Facebook con credenciales."""
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            await self.start()

        try:
            await self._page.goto("https://www.facebook.com/login", wait_until="domcontentloaded", timeout=15000)
            await asyncio.sleep(1)

            await self._page.fill(S["login_email"], email)
            await asyncio.sleep(random.uniform(0.5, 1.5))
            await self._page.fill(S["login_password"], password)
            await asyncio.sleep(random.uniform(0.5, 1.5))
            try:
                await self._page.click(S["login_button"], timeout=8000)
            except Exception:
                try:
                    await self._page.click("button[type='submit']", timeout=8000)
                except Exception:
                    await self._page.press(S["login_password"], "Enter")
            await asyncio.sleep(4)

            # Manejar 2FA
            if totp_secret:
                try:
                    import pyotp
                    totp = pyotp.TOTP(totp_secret)
                    code = totp.now()
                    await self._page.fill(S["login_2fa_code"], code)
                    await self._page.click(S["login_2fa_submit"])
                    await asyncio.sleep(3)
                except Exception:
                    pass

            # Verificar login exitoso
            logged_in = await self.is_logged_in()
            if not logged_in:
                # Si el rechazo fue la contrasena, esperar no cambia nada.
                motivo = await self.diagnosticar_login()
                if motivo.startswith("Facebook rechazo la contrasena"):
                    logger.warning("Login fallido: contrasena rechazada")
                    return False
                # Checkpoint con aprobacion en el telefono: Facebook valida
                # recien cuando el usuario toca "Si" en la notificacion de
                # su dispositivo. Esperar y reintentar la comprobacion.
                logger.info("Posible checkpoint: esperando aprobacion en el telefono")
                for _ in range(12):
                    await asyncio.sleep(10)
                    if await self.is_logged_in():
                        logged_in = True
                        break
            if logged_in:
                logger.info("Login exitoso en Facebook")
            else:
                logger.warning("Login fallido o checkpoint detectado")
            return logged_in
        except Exception as e:
            logger.error(f"Error en login: {e}")
            return False

    async def diagnosticar_login(self) -> str:
        """Explicar en palabras simples por que Facebook rechazo el login.

        Lee la URL y el texto visible de la pagina donde quedo el
        navegador tras el intento. Nunca lanza: ante cualquier problema
        devuelve una descripcion generica con la URL final.
        """
        if not self._page:
            return "El navegador no llego a abrir la pagina de login."
        try:
            url = self._page.url or ""
        except Exception:
            url = ""
        texto = ""
        alerta = ""
        try:
            texto = _norm(await self._page.inner_text("body", timeout=3000))
        except Exception:
            pass
        try:
            el = await self._page.query_selector("[role='alert']")
            if el:
                alerta = " ".join((await el.inner_text()).split())[:180]
        except Exception:
            pass
        if "checkpoint" in url:
            return ("Facebook pidio una verificacion de seguridad (checkpoint): "
                    "el ingreso desde esta red quedo marcado para revision. "
                    "No es un error de contrasena.")
        if ("contrasena" in texto and ("incorrecta" in texto or "no es correcta" in texto or "no coincide" in texto)) or \
                "password you entered is incorrect" in texto or "incorrect password" in texto:
            return "Facebook rechazo la contrasena: no es la contrasena actual de la cuenta."
        if "two_step" in url or "approvals" in url or "codigo de seguridad" in texto or \
                "autenticacion en dos pasos" in texto or "ingresa el codigo" in texto:
            return ("Facebook pide el codigo de verificacion en dos pasos (2FA). "
                    "Carga el codigo TOTP al registrar la cuenta.")
        if alerta:
            return f"Facebook mostro: {alerta}"
        return f"No se confirmo la sesion. La pagina quedo en: {url or 'sin URL'}"

    async def _human_delay(self, min_s: float = 2.0, max_s: float = 5.0):
        """Delay aleatorio para simular comportamiento humano."""
        await asyncio.sleep(random.uniform(min_s, max_s))

    async def current_identity_name(self) -> Optional[str]:
        """Nombre de la identidad activa en la caja de comentario, si se puede leer."""
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            return None
        try:
            btn = await self._page.query_selector(S["identity_button"])
            if btn:
                label = (await btn.get_attribute("aria-label") or "").strip()
                if label:
                    return label
            img = await self._page.query_selector("form img[alt]")
            if img:
                alt = (await img.get_attribute("alt") or "").strip()
                if alt:
                    return alt
        except Exception:
            pass
        return None

    async def switch_identity(self, page_name: str) -> bool:
        """
        Cambiar la identidad activa a la Página indicada.

        Devuelve True solo si la Página apareció en el selector de
        identidad y se la eligió. Si no se puede, devuelve False y el
        llamador DEBE abortar: actuar con la identidad equivocada es el
        error que este sistema no puede permitirse (el comentario
        saldría como el perfil personal del administrador).
        """
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            return False
        try:
            actual = await self.current_identity_name()
            if actual and _norm(page_name) in _norm(actual):
                return True

            btn = await self._page.query_selector(S["identity_button"])
            if not btn:
                btn = await self._page.query_selector(
                    "[aria-label*='perfil'], [aria-label*='cuenta actual']"
                )
            if not btn:
                logger.warning("No se encontró el botón de cambio de identidad")
                return False
            await btn.click()
            await self._human_delay(1, 2)

            items = await self._page.query_selector_all(S["identity_menu_item"])
            for item in items:
                try:
                    text = (await item.inner_text()).strip()
                    if text and _norm(page_name) in _norm(text):
                        await item.click()
                        await self._human_delay(1, 2)
                        logger.info("Identidad cambiada a '%s'", page_name)
                        return True
                except Exception:
                    continue
            logger.warning(
                "La Página '%s' no apareció en el selector de identidad", page_name
            )
            return False
        except Exception as e:
            logger.error(f"Error cambiando identidad: {e}")
            return False

    async def _find_comment_element(self, author: str):
        """Buscar el bloque del comentario cuyo autor coincide (normalizado)."""
        if not self._page:
            return None
        blocks = await self._page.query_selector_all("[role='article']")
        for block in blocks:
            try:
                link = await block.query_selector("a[role='link']")
                if not link:
                    continue
                name = (await link.inner_text()).strip()
                if name and _norm(name) == _norm(author):
                    return block
            except Exception:
                continue
        return None

    async def publish_post(self, page_url: str, message: str, page_name: Optional[str] = None) -> dict:
        """
        Publicar un post en una Página de Facebook.

        Falla en voz alta si falta algún elemento (nada de éxito
        silencioso) y, si se indica page_name, verifica que el post haya
        quedado publicado con la Página como autora.
        """
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            raise RuntimeError("Navegador no iniciado")

        try:
            await self._page.goto(page_url, wait_until="domcontentloaded", timeout=20000)
            await self._human_delay(2, 4)

            create_btn = await self._page.query_selector(S["create_post_button"])
            if not create_btn:
                return {
                    "status": "error",
                    "error": "No se encontró el botón 'Crear publicación' (¿la sesión está actuando como la Página?).",
                    "verificado": False,
                }
            await create_btn.click()
            await self._human_delay(1, 2)

            textarea = await self._page.query_selector(S["post_textarea"])
            if not textarea:
                return {
                    "status": "error",
                    "error": "No se encontró la caja de texto de la publicación.",
                    "verificado": False,
                }
            await textarea.click()
            await self._page.keyboard.type(message, delay=random.randint(50, 150))
            await self._human_delay(1, 2)

            publish_btn = await self._page.query_selector(S["publish_button"])
            if not publish_btn:
                return {
                    "status": "error",
                    "error": "No se encontró el botón 'Publicar'.",
                    "verificado": False,
                }
            await publish_btn.click()
            await self._human_delay(3, 5)

            verificado = False
            if page_name:
                posts = await self.get_page_posts(page_url, limit=5)
                verificado = any(
                    _norm(p.get("author", "")) == _norm(page_name)
                    and _norm(message)[:60] in _norm(p.get("text", ""))
                    for p in posts
                )
            return {
                "status": "publicado",
                "message": message[:50],
                "identidad": page_name,
                "verificado": verificado,
            }
        except Exception as e:
            logger.error(f"Error al publicar: {e}")
            return {"status": "error", "error": str(e), "verificado": False}

    async def publish_comment(
        self,
        post_url: str,
        message: str,
        page_name: Optional[str] = None,
        reply_to_author: Optional[str] = None,
    ) -> dict:
        """
        Comentar en un post de Facebook.

        Si se indica page_name, primero cambia la identidad activa a
        esa Página y ABORTA si no puede confirmarla (nunca comentar con
        la identidad equivocada). Si se indica reply_to_author, responde
        al comentario de ese autor (hilo) en vez de abrir un comentario
        de primer nivel. Al final verifica en la página que el
        comentario quedó con el autor esperado.
        """
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            raise RuntimeError("Navegador no iniciado")

        try:
            await self._page.goto(post_url, wait_until="domcontentloaded", timeout=20000)
            await self._human_delay(2, 4)

            if page_name:
                ok = await self.switch_identity(page_name)
                if not ok:
                    return {
                        "status": "error",
                        "error": f"No se pudo confirmar la identidad '{page_name}'; no se comentó para no hacerlo con la identidad equivocada.",
                        "verificado": False,
                    }

            if reply_to_author:
                target = await self._find_comment_element(reply_to_author)
                if not target:
                    return {
                        "status": "error",
                        "error": f"No se encontró el comentario de '{reply_to_author}' para responder.",
                        "verificado": False,
                    }
                reply_btn = await target.query_selector(S["comment_reply_button"])
                if not reply_btn:
                    reply_btn = await target.query_selector("text=Responder")
                if not reply_btn:
                    return {
                        "status": "error",
                        "error": "El comentario no tiene botón Responder visible.",
                        "verificado": False,
                    }
                await reply_btn.click()
                await self._human_delay(1, 2)
                comment_input = await target.query_selector(
                    "[contenteditable='true'][role='textbox']"
                )
                if not comment_input:
                    return {
                        "status": "error",
                        "error": "No apareció la caja de respuesta.",
                        "verificado": False,
                    }
            else:
                comment_btn = await self._page.query_selector(S["comment_button"])
                if comment_btn:
                    await comment_btn.click()
                    await self._human_delay(1, 2)
                comment_input = await self._page.query_selector(S["comment_input"])
                if not comment_input:
                    return {
                        "status": "error",
                        "error": "No se encontró la caja de comentario.",
                        "verificado": False,
                    }

            await comment_input.click()
            await self._page.keyboard.type(message, delay=random.randint(50, 150))
            await self._human_delay(0.5, 1.5)
            await self._page.keyboard.press("Enter")
            await self._human_delay(2, 3)

            verificado = False
            if page_name:
                comentarios = await self.get_post_comments(post_url, limit=50)
                verificado = any(
                    _norm(c.get("author", "")) == _norm(page_name)
                    and _norm(message)[:60] in _norm(c.get("text", ""))
                    for c in comentarios
                )
            return {
                "status": "comentado",
                "message": message[:50],
                "identidad": page_name,
                "es_respuesta": bool(reply_to_author),
                "verificado": verificado,
            }
        except Exception as e:
            logger.error(f"Error al comentar: {e}")
            return {"status": "error", "error": str(e), "verificado": False}

    async def react(
        self,
        object_url: str,
        reaction_type: str = "like",
        page_name: Optional[str] = None,
        comment_author: Optional[str] = None,
    ) -> dict:
        """
        Reaccionar a un post o a un comentario puntual (comment_author).

        Si se indica page_name, cambia la identidad activa a esa Página
        antes de reaccionar y aborta si no puede confirmarla (las
        reacciones también llevan la identidad de quien las pone).
        """
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            raise RuntimeError("Navegador no iniciado")

        try:
            await self._page.goto(object_url, wait_until="domcontentloaded", timeout=20000)
            await self._human_delay(2, 4)

            if page_name:
                ok = await self.switch_identity(page_name)
                if not ok:
                    return {
                        "status": "error",
                        "error": f"No se pudo confirmar la identidad '{page_name}'; no se reaccionó.",
                        "verificado": False,
                    }

            scope = self._page
            if comment_author:
                block = await self._find_comment_element(comment_author)
                if not block:
                    return {
                        "status": "error",
                        "error": f"No se encontró el comentario de '{comment_author}'.",
                        "verificado": False,
                    }
                scope = block

            like_btn = await scope.query_selector(S["like_button"])
            if not like_btn:
                return {
                    "status": "error",
                    "error": "No se encontró el botón 'Me gusta'.",
                    "verificado": False,
                }

            if reaction_type == "like":
                await like_btn.click()
            else:
                reaction_map = {
                    "love": S["reaction_love"],
                    "haha": S["reaction_haha"],
                    "wow": S["reaction_wow"],
                    "sad": S["reaction_sad"],
                    "angry": S["reaction_angry"],
                }
                selector = reaction_map.get(reaction_type)
                if not selector:
                    return {
                        "status": "error",
                        "error": f"Tipo de reacción desconocido: {reaction_type}",
                        "verificado": False,
                    }
                await like_btn.hover()
                await self._human_delay(0.8, 1.5)
                reaction_btn = await self._page.query_selector(selector)
                if not reaction_btn:
                    return {
                        "status": "error",
                        "error": f"No apareció la reacción '{reaction_type}' en el selector.",
                        "verificado": False,
                    }
                await reaction_btn.click()

            await self._human_delay(1, 2)

            # Verificación básica: el botón queda en estado activo.
            verificado = False
            try:
                state_btn = await scope.query_selector(S["like_button"])
                if state_btn:
                    label = (await state_btn.get_attribute("aria-label") or "").lower()
                    verificado = "quitar" in label or "remove" in label
            except Exception:
                pass

            return {
                "status": "reaccionado",
                "tipo": reaction_type,
                "identidad": page_name,
                "verificado": verificado,
            }
        except Exception as e:
            logger.error(f"Error al reaccionar: {e}")
            return {"status": "error", "error": str(e), "verificado": False}

    async def get_page_posts(self, page_url: str, limit: int = 10) -> list[dict]:
        """Leer posts de una Página de Facebook."""
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            raise RuntimeError("Navegador no iniciado")

        posts = []
        try:
            await self._page.goto(page_url, wait_until="domcontentloaded", timeout=15000)
            await self._human_delay(2, 4)

            # Scroll para cargar más posts
            for _ in range(min(limit // 3, 5)):
                await self._page.evaluate("window.scrollBy(0, window.innerHeight)")
                await self._human_delay(1, 2)

            # Extraer posts
            post_elements = await self._page.query_selector_all(S["post_container"])
            for el in post_elements[:limit]:
                try:
                    text_el = await el.query_selector(S["post_text"])
                    text = await text_el.inner_text() if text_el else ""
                    author_el = await el.query_selector(S["post_author"])
                    author = await author_el.inner_text() if author_el else ""
                    posts.append({"author": author, "text": text})
                except Exception:
                    continue

            return posts
        except Exception as e:
            logger.error(f"Error al leer posts: {e}")
            return posts

    async def get_post_comments(self, post_url: str, limit: int = 50) -> list[dict]:
        """
        Leer los comentarios de un post (autor + texto).

        Se usa para dos cosas: verificar que un comentario propio quedó
        publicado con la identidad correcta, y leer los comentarios que
        reciben los personajes para decidir respuestas.
        El primer bloque [role=article] de la página es el post mismo y
        se salta.
        """
        if not self._page:
            raise RuntimeError("Navegador no iniciado")

        comentarios: list[dict] = []
        try:
            await self._page.goto(post_url, wait_until="domcontentloaded", timeout=20000)
            await self._human_delay(2, 4)

            # Expandir la vista de comentarios si Facebook la colapsa
            for texto_boton in (
                "Ver más comentarios",
                "View more comments",
                "Todos los comentarios",
                "All comments",
            ):
                try:
                    btn = await self._page.query_selector(f"text={texto_boton}")
                    if btn:
                        await btn.click()
                        await self._human_delay(1, 2)
                except Exception:
                    pass

            blocks = await self._page.query_selector_all("[role='article']")
            for block in blocks[1:]:  # el primero es el post
                try:
                    link = await block.query_selector("a[role='link']")
                    author = (await link.inner_text()).strip() if link else ""
                    spans = await block.query_selector_all("[dir='auto']")
                    textos: list[str] = []
                    for sp in spans:
                        t = (await sp.inner_text()).strip()
                        if t and t != author and t not in textos:
                            textos.append(t)
                    text = " ".join(textos)
                    if author and text:
                        comentarios.append({"author": author, "text": text})
                    if len(comentarios) >= limit:
                        break
                except Exception:
                    continue
            return comentarios
        except Exception as e:
            logger.error(f"Error al leer comentarios: {e}")
            return comentarios

    async def crear_pagina(self, nombre: str, categoria: str = "Comunidad") -> dict:
        """Crear una Página de Facebook nueva y devolver su URL/id."""
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            await self.start()

        try:
            await self._page.goto(
                "https://www.facebook.com/pages/creation/", wait_until="domcontentloaded", timeout=20000
            )
            await self._human_delay(3, 5)

            # Facebook muestra a veces un modal de "crear página" en la home.
            # Intentamos llenar el nombre.
            name_input = await self._page.query_selector(S["page_create_name"])
            if not name_input:
                # Fallback: buscar cualquier input de texto visible
                inputs = await self._page.query_selector_all("input[type='text']")
                if inputs:
                    name_input = inputs[0]
            if not name_input:
                return {"status": "error", "error": "No se encontró el campo de nombre de página"}

            await name_input.click()
            await self._page.keyboard.type(nombre, delay=random.randint(40, 90))
            await self._human_delay(1, 2)

            # Categoría
            cat_input = await self._page.query_selector(S["page_create_category"])
            if cat_input:
                await cat_input.click()
                await self._page.keyboard.type(categoria, delay=random.randint(40, 90))
                await self._human_delay(1.5, 2.5)
                # seleccionar primera sugerencia
                try:
                    await self._page.keyboard.press("ArrowDown")
                    await asyncio.sleep(0.3)
                    await self._page.keyboard.press("Enter")
                except Exception:
                    pass
                await self._human_delay(1, 2)

            # Botón crear
            submit = await self._page.query_selector(S["page_create_submit"])
            if not submit:
                # fallback por texto
                submit = await self._page.query_selector("button[type='submit']")
            if not submit:
                return {"status": "error", "error": "No se encontró el botón Crear página"}
            await submit.click()
            await self._human_delay(5, 8)

            # Saltar pasos opcionales (foto de perfil/portada)
            for _ in range(4):
                skip = await self._page.query_selector(S["page_create_skip"])
                if skip:
                    await skip.click()
                    await self._human_delay(2, 3)
                else:
                    break

            url = self._page.url
            # Extraer id de página desde la URL si es posible
            page_id = None
            if "/pages/" in url:
                parts = url.split("/pages/")[-1].split("/")
                if parts and parts[0].isdigit():
                    page_id = parts[0]
            # fallback: buscar en cookies/storage
            if not page_id:
                page_id = url.rstrip("/").split("/")[-1]

            logger.info("Página creada: %s (%s)", nombre, url)
            return {
                "status": "creada",
                "nombre": nombre,
                "url": url,
                "id_plataforma": page_id,
            }
        except Exception as e:
            logger.error("Error al crear página '%s': %s", nombre, e)
            return {"status": "error", "error": str(e)}

    async def listar_paginas_administradas(self) -> list[dict]:
        """Listar las Páginas que la cuenta administra (scraping)."""
        from app.services.browser.selectors import SELECTORS as S

        if not self._page:
            await self.start()

        paginas: list[dict] = []
        try:
            # Intento 1: sección "Tus páginas"
            await self._page.goto(
                "https://www.facebook.com/pages/?tab=your_pages", wait_until="domcontentloaded", timeout=20000
            )
            await self._human_delay(3, 5)

            # Buscar links a páginas
            links = await self._page.query_selector_all("a[href*='/pages/'], a[href*='facebook.com/']")
            seen: set[str] = set()
            for link in links:
                try:
                    href = await link.get_attribute("href") or ""
                    text = (await link.inner_text()).strip()
                    if not text or len(text) < 2 or len(text) > 80:
                        continue
                    # Filtrar links que parecen páginas (no posts/perfiles)
                    if "/pages/" in href:
                        slug = href.split("/pages/")[-1].split("/")[0].split("?")[0]
                        if slug and slug not in seen:
                            seen.add(slug)
                            paginas.append({"nombre": text, "url": href.split("?")[0], "id_plataforma": slug})
                except Exception:
                    continue

            # Intento 2: si no encontró nada, probar el switcher de páginas
            if not paginas:
                await self._page.goto("https://www.facebook.com/", wait_until="domcontentloaded", timeout=15000)
                await self._human_delay(2, 4)
                switcher = await self._page.query_selector("[aria-label='Cambiar de página'], [aria-label='Switch accounts']")
                if switcher:
                    await switcher.click()
                    await self._human_delay(2, 3)
                    items = await self._page.query_selector_all("[role='menuitem'], [role='option']")
                    for item in items:
                        try:
                            text = (await item.inner_text()).strip()
                            href = await item.get_attribute("href") or ""
                            if text and len(text) < 80:
                                paginas.append({"nombre": text, "url": href, "id_plataforma": href.split("/")[-1] if href else text})
                        except Exception:
                            continue

            logger.info("Páginas administradas detectadas: %d", len(paginas))
            return paginas
        except Exception as e:
            logger.error("Error al listar páginas administradas: %s", e)
            return paginas

    async def take_screenshot(self) -> bytes:
        """Tomar screenshot de la página actual."""
        if not self._page:
            raise RuntimeError("Navegador no iniciado")
        return await self._page.screenshot()
