# Pulse OS · Integración Facebook (cuentas y Páginas)

Documento de diseño para la conexión con Facebook Pages.

**Última actualización:** 10 de noviembre de 2026

---

## 1. Objetivo

Permitir que el sistema administre Páginas de Facebook asociadas a personajes, para publicar contenido, comentar, reaccionar e interactuar, respetando los límites de la API y las políticas de la plataforma.

Principios del Documento Maestro que aplican:
- Administración de una cantidad variable de cuentas y Páginas.
- Separación clara: Cuenta / Página / Personaje / Comunidad.
- Identidades modificables (un personaje no queda atado permanentemente a una Página).
- Conectores independientes por plataforma (Facebook primero).

---

## 2. Modelo de relación

```
Cuenta (Facebook user identity)
  └── tiene N → Pagina (Facebook Page)
        └── asignada a 0..1 → Personaje
              └── pertenece a → Comunidad
```

- Una **Cuenta** es una identidad de Facebook (un usuario real o una cuenta de administración) que gestiona una o más Páginas.
- Una **Página** es una Facebook Page con su propio token de acceso.
- Un **Personaje** puede tener 0 o 1 Página asignada.
- Una Página puede reasignarse a otro Personaje sin perder historial.

### Tablas involucradas

| Tabla | Rol |
|-------|-----|
| `cuentas` | Identidad de Facebook + tokens de usuario |
| `paginas` | Facebook Page + token de página + capacidades |
| `personajes` | Personaje con FK opcional a `paginas.id` |
| `comunidades` | Agrupación de personajes |

---

## 3. Facebook App (Meta Developer Console)

### 3.1. Creación de la app

1. Crear una app en [developers.facebook.com](https://developers.facebook.com) con tipo "Business" o "Consumer".
2. Agregar el producto **Facebook Login**.
3. Agregar el producto **Pages API** (o Graph API).
4. Configurar los dominios permitidos (redirect URIs).
5. Anotar `App ID` y `App Secret` (se guardan en `.env` o secret store, nunca en el repo).

### 3.2. Permisos requeridos (scopes OAuth)

| Permiso | Uso |
|---------|-----|
| `pages_show_list` | Listar las Páginas que el usuario administra |
| `pages_read_engagement` | Leer métricas, comentarios y reacciones |
| `pages_manage_posts` | Publicar, editar y eliminar posts |
| `pages_manage_metadata` | Actualizar info de la Página |
| `pages_messaging` (opcional, Fase 4+) | Responder mensajes de Messenger |

### 3.3. App Review

Los permisos avanzados (`pages_manage_posts`, `pages_manage_metadata`) requieren **App Review** de Meta antes de usarse con usuarios reales. Durante desarrollo se puede usar con roles de test (administradores, desarrolladores, testers).

---

## 4. Flujo de autenticación (credenciales en navegador)

### 4.1. Principio

**No se usa ninguna API de Facebook.** Toda la interacción se hace a través de un navegador real (Playwright/Chromium) que se loguea con las credenciales de la cuenta (email/usuario + contraseña) y opera la interfaz web de Facebook.

Esto elimina la dependencia de:
- Facebook App en Meta Developer Console.
- App Review y permisos.
- OAuth y tokens de acceso.
- Rate limits de la Graph API.

### 4.2. Diagrama de flujo

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Panel   │────▶│  Backend     │────▶│  Browser     │
│  (admin) │     │  (FastAPI)   │     │  Manager     │
└──────────┘     └──────────────┘     └──────────────┘
                       │                      │
                       │                      ▼
                       │              ┌──────────────┐
                       │              │  Facebook    │
                       │              │  (login web) │
                       │              └──────────────┘
                       │                      │
                       │◀─────────────────────┘
                       │   (storage state guardado)
                       ▼
              ┌──────────────────┐
              │  DB: Cuenta +    │
              │  SesionNavegador │
              └──────────────────┘
```

### 4.3. Pasos detallados

**Paso 1 — Registro de credenciales desde el panel**
- El admin abre el panel → tab Comunidad → "Agregar cuenta de Facebook".
- Ingresa: email/usuario, contraseña, y opcionalmente 2FA (código o app).
- Las credenciales se envían al backend y se almacenan **cifradas** (Fernet).
- El frontend nunca guarda credenciales en localStorage ni las muestra.

**Paso 2 — Login en navegador (backend/worker)**
- El Browser Manager crea un nuevo Browser Context aislado.
- Navega a `https://www.facebook.com/login`.
- Ingresa el email/usuario y la contraseña en los campos del formulario.
- Si aparece 2FA, espera el código (ingresado por el admin o generado por TOTP).
- Si aparece checkpoint (verificación de identidad), notifica al admin para intervención manual.
- Una vez logueado, Facebook redirige al feed principal.

**Paso 3 — Guardar sesión**
- Se exporta el storage state (cookies + localStorage) del contexto.
- Se cifra y se guarda en `sesiones_navegador.storage_state_cifrado`.
- Se actualiza `cuentas.estado_conexion = "conectado"`, `ultima_conexion = now()`.
- El contexto se cierra (o se mantiene activo si hay tareas pendientes).

**Paso 4 — Sesiones posteriores**
- Al necesitar ejecutar una acción, el Browser Manager:
  1. Carga el storage state cifrado.
  2. Crea un nuevo contexto con ese estado.
  3. Verifica que la sesión siga válida (navega a facebook.com y chequea si sigue logueado).
  4. Si la sesión expiró, repite el login con las credenciales guardadas.
  5. Ejecuta la acción.
  6. Actualiza y guarda el storage state.

### 4.4. Manejo de 2FA (autenticación de dos factores)

| Método | Implementación |
|--------|---------------|
| **TOTP (app autenticadora)** | El admin ingresa el secret TOTP. El sistema genera códigos automáticamente con `pyotp`. |
| **SMS** | El admin ingresa el código manualmente cuando el sistema lo solicita. |
| **Confirmación en app** | El sistema notifica al admin para que apruebe en su dispositivo. Timeout de 5 min. |

### 4.5. Manejo de checkpoints

Facebook puede pedir verificación de identidad (checkpoint) en casos de:
- Login desde una IP nueva.
- Comportamiento sospechoso.
- Cambio de contraseña reciente.

En estos casos:
- El sistema marca la cuenta como `estado_conexion = "checkpoint"`.
- Notifica al admin con un screenshot del checkpoint.
- El admin resuelve manualmente (ingresa código, sube foto, etc.).
- Una vez resuelto, el sistema guarda el nuevo storage state.

## 5. Almacenamiento seguro de credenciales

### 5.1. Principio

Las credenciales (usuario + contraseña) y el storage state (cookies) se almacenan **cifrados** en la base de datos. Nunca en texto plano, nunca en logs, nunca en el frontend, nunca en conversaciones del LLM.

### 5.2. Qué se almacena

| Dato | Ubicación | Cifrado |
|------|-----------|---------|
| Email/usuario de Facebook | `cuentas` (campo `nombre_identificador`) | No (no es secreto) |
| Contraseña | `cuentas.token_usuario_cifrado` (reutilizado como credencial cifrada) | Sí (Fernet) |
| Secret TOTP (si aplica) | `cuentas.token_usuario_cifrado` (segundo campo o JSON) | Sí (Fernet) |
| Storage state (cookies + localStorage) | `sesiones_navegador.storage_state_cifrado` | Sí (Fernet) |
| Proxy asignado | `sesiones_navegador.proxy` | No (no es secreto) |

### 5.3. Implementación

- Usar `cryptography.fernet.Fernet` con `CREDENTIAL_ENCRYPTION_KEY` en `.env`.
- El frontend envía credenciales por HTTPS al backend.
- El backend cifra y guarda. Nunca devuelve credenciales al frontend.
- El Browser Manager descifra en memoria solo cuando necesita hacer login.
- Las credenciales se borran de memoria después de usarlas.

### 5.4. Variables de entorno

```env
# Cifrado de credenciales y storage state
CREDENTIAL_ENCRYPTION_KEY=clave_fernet_base64
```

## 6. Ciclo de vida de las sesiones

### 6.1. Estados de una sesión

| Estado | Descripción |
|--------|-------------|
| `inactivo` | Sesión guardada pero no en uso |
| `activo` | Contexto de navegador activo con sesión válida |
| `error` | Login falló o sesión expiró y no se pudo renovar |
| `checkpoint` | Facebook pidió verificación de identidad |

### 6.2. Validación de sesión

Antes de ejecutar una acción, el Browser Manager:
1. Carga el storage state.
2. Crea un contexto con ese estado.
3. Navega a `https://www.facebook.com/`.
4. Verifica que el usuario sigue logueado (busca el avatar o el nombre en el header).
5. Si está logueado → ejecuta la acción.
6. Si no está logueado → intenta login con credenciales guardadas.
7. Si el login falla → marca como `error` y notifica al admin.

### 6.3. Renovación automática

Un worker periódico:
1. Lista sesiones con `ultima_actividad` mayor a 24 horas.
2. Para cada una, valida la sesión (paso 6.2).
3. Si es válida, actualiza `ultima_actividad`.
4. Si expiró, intenta re-login con credenciales.
5. Si falla, marca como `error`.

### 6.4. Detección de checkpoint

Si durante el login o la navegación aparece un checkpoint:
- El sistema toma un screenshot.
- Marca la cuenta como `estado_conexion = "checkpoint"`.
- Notifica al admin con el screenshot.
- El admin resuelve manualmente (ingresa código, sube foto, etc.).
- Una vez resuelto, el sistema guarda el nuevo storage state y marca como `conectado`.

## 7. Conector de Facebook (browser-based)

### 7.1. Estructura

```
app/
├── connectors/
│   └── facebook/
│       ├── __init__.py
│       ├── browser_manager.py   # Gestión de contextos Playwright
│       ├── login.py             # Login con credenciales
│       ├── publisher.py        # Publicar posts, comentarios, reacciones
│       ├── reader.py           # Leer posts, comentarios, métricas
│       └── selectors.py        # Selectores CSS/XPath de la UI de Facebook
```

### 7.2. Interfaz del conector

```python
class FacebookBrowserConnector:
    def __init__(self, session_state: dict):
        self.state = session_state

    async def ensure_logged_in(self) -> bool:
        """Verifica y renueva la sesión si es necesario."""
        ...

    async def publish_post(self, page_id: str, message: str, media: Optional[bytes] = None) -> dict:
        """Publica un post en la Página. Navega a la Página, hace clic en 'Crear publicación', escribe el mensaje, adjunta media si hay, y publica."""
        ...

    async def publish_comment(self, post_url: str, message: str) -> dict:
        """Navega al post, hace clic en 'Comentar', escribe y envía."""
        ...

    async def react(self, object_url: str, reaction_type: str) -> dict:
        """Navega al post/comentario y hace clic en la reacción correspondiente."""
        ...

    async def get_page_posts(self, page_url: str, limit: int = 10) -> list[dict]:
        """Navega a la Página, scroll para cargar posts, extrae texto, fecha, métricas."""
        ...

    async def get_post_comments(self, post_url: str, limit: int = 50) -> list[dict]:
        """Navega al post, expande comentarios, extrae texto y autor."""
        ...
```

### 7.3. Selectores de Facebook

Los selectores CSS/XPath de la UI de Facebook cambian frecuentemente. Se centralizan en `selectors.py` para facilitar mantenimiento:

```python
SELECTORS = {
    "login_email": "input[name='email']",
    "login_password": "input[name='pass']",
    "login_button": "button[name='login']",
    "create_post_button": "[aria-label='Crear una publicación']",
    "post_textarea": "[contenteditable='true'][role='textbox']",
    "publish_button": "[aria-label='Publicar']",
    ...
}
```

### 7.4. Rate limits (autoimpuestos)

Como no hay API, los límites son autoimpuestos para evitar detección:
- Máximo 5 publicaciones por hora por cuenta.
- Máximo 20 comentarios por hora por cuenta.
- Máximo 50 reacciones por hora por cuenta.
- Delay aleatorio de 2-8 segundos entre acciones.
- Pausa de 30-60 segundos cada 10 acciones.

## 8. Endpoints de backend necesarios

### Cuentas y sesiones

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/facebook/cuentas` | Registrar nueva cuenta (email, password, totp_secret opcional) |
| GET | `/api/facebook/cuentas` | Listar cuentas conectadas |
| GET | `/api/facebook/cuentas/{id}` | Obtener detalle de cuenta |
| DELETE | `/api/facebook/cuentas/{id}` | Desconectar cuenta (borra credenciales y sesiones) |
| POST | `/api/facebook/cuentas/{id}/login` | Iniciar sesión en navegador (async) |
| GET | `/api/facebook/cuentas/{id}/estado` | Estado de la sesión (conectado, checkpoint, error) |
| GET | `/api/facebook/cuentas/{id}/paginas` | Listar Páginas detectadas en la cuenta |

### Páginas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/facebook/paginas` | Listar todas las Páginas |
| GET | `/api/facebook/paginas/{id}` | Obtener detalle |
| PATCH | `/api/facebook/paginas/{id}/asignar` | Asignar Página a un Personaje |
| PATCH | `/api/facebook/paginas/{id}/desasignar` | Desvincular Página de Personaje |

### Acciones (usadas por el orquestador)

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/facebook/publicar` | Publicar post (pagina_id, mensaje, media opcional) |
| POST | `/api/facebook/comentar` | Comentar en un post (url, mensaje) |
| POST | `/api/facebook/reaccionar` | Reaccionar (url, tipo) |
| GET | `/api/facebook/leer-posts` | Leer posts de una Página (pagina_id, limit) |
| GET | `/api/facebook/leer-comentarios` | Leer comentarios de un post (post_url, limit) |

## 9. Flujo completo de ejemplo

1. Admin abre el panel → tab Comunidad → "Conectar Facebook".
2. Se redirige a Facebook → inicia sesión → autoriza.
3. Callback al backend → se guardan Cuenta + Páginas.
4. Panel muestra las Páginas disponibles.
5. Admin asigna "Comunidad Gatos" (Página) a personaje "Luna".
6. El orquestador recibe una tarea: "Publicá un post sobre adopción en la Página de Luna".
7. El conector usa el token de la Página para publicar vía Graph API.
8. Se registra la tarea como completada con el ID del post.

---

## 10. Seguridad

- **Tokens cifrados at-rest** (Fernet o secret manager).
- **Tokens nunca en logs, respuestas de API ni conversaciones del LLM.**
- **CSRF protection** en el flujo OAuth (parámetro `state`).
- **Validación de redirect URI** (solo URIs registradas en Meta).
- **Rate limiting** en endpoints de autenticación.
- **Revocación**: al desconectar una cuenta, se intenta revocar el token en Facebook (`DELETE /me/permissions`).
- **Auditoría**: cada acción de publicación se registra con personaje, Página, timestamp y resultado.

---

## 11. Variables de entorno necesarias

```env
# Cifrado de credenciales y storage state
CREDENTIAL_ENCRYPTION_KEY=clave_fernet_base64

# Navegadores
BROWSER_POOL_SIZE=5
BROWSER_HEADLESS=true
BROWSER_PROXY_URL=  # opcional, para rotación de IPs
STORAGE_STATE_PATH=./data/browser_states/

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 12. Próximos pasos

1. Instalar Playwright en el entorno de ejecución (`pip install playwright && playwright install chromium`).
2. Crear el modelo `SesionNavegador` en la base de datos (ya definido en `app/db/models.py`).
3. Implementar el Browser Manager como servicio independiente (worker, no en FastAPI).
4. Implementar login con credenciales en Playwright (incluyendo 2FA y checkpoints).
5. Implementar el pool de workers con cola de tareas.
6. Crear los endpoints de backend (cuentas, páginas, acciones).
7. Actualizar el frontend (tab Comunidad) para registrar cuentas con credenciales y mostrar Páginas.
8. Implementar selectores CSS de Facebook en `selectors.py`.
9. Implementar publicación, comentarios y reacciones vía navegador.
10. Implementar lectura de posts y comentarios vía scraping.
11. Implementar refresh automático de sesiones.
12. Tests con una cuenta de prueba.

## 13. Navegadores para manejo simultáneo de cuentas

### 13.1. Por qué se necesitan navegadores

**No se usa ninguna API de Facebook.** Toda la interacción se hace a través de un navegador real que se loguea con credenciales y opera la interfaz web.

Esto elimina la dependencia de:
- Facebook App en Meta Developer Console.
- App Review y permisos.
- OAuth y tokens de acceso.
- Rate limits de la Graph API.

### 13.2. Arquitectura de navegadores

```
┌─────────────────────────────────────────────────────┐
│  Browser Manager (servicio independiente)           │
│                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Contexto 1  │  │  Contexto 2  │  │  Contexto N  │ │
│  │  (Cuenta A)  │  │  (Cuenta B)  │  │  (Cuenta N)  │ │
│  │              │  │              │  │              │ │
│  │  - Cookies   │  │  - Cookies   │  │  - Cookies   │ │
│  │  - Storage   │  │  - Storage   │  │  - Storage   │ │
│  │  - Session   │  │  - Session   │  │  - Session   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│                                                     │
│  Motor: Playwright (Chromium headless)              │
│  Proxy: rotación de IPs (opcional, Fase 4+)         │
└─────────────────────────────────────────────────────┘
```

### 13.3. Tecnología recomendada

| Componente | Tecnología | Motivo |
|------------|-----------|--------|
| Motor de navegador | **Playwright** (Chromium) | Soporte multi-contexto, headless, estable, API moderna |
| Aislamiento | **Browser contexts** de Playwright | Cada contexto = sesión aislada |
| Persistencia de sesión | **Storage state** (cookies + localStorage) | Se guarda por cuenta y se restaura |
| Orquestación | **Worker pool** con cola de tareas | Cada tarea asigna un contexto libre |

### 13.4. Gestión de múltiples cuentas en simultáneo

**Concurrencia:**
- Un solo proceso de Chromium puede manejar N contextos simultáneos.
- Límite práctico: ~10-20 contextos por instancia (depende de RAM).
- Para más cuentas, se usan múltiples instancias de Chromium distribuidas.

**Aislamiento:**
- Cada contexto es completamente aislado.
- No hay cross-contamination de cookies ni storage.

**Rotación de IPs (Fase 4+):**
- Facebook detecta múltiples cuentas desde la misma IP.
- Usar proxies (residenciales o datacenter) por contexto.

### 13.5. Consideraciones de seguridad

- **Credenciales cifradas** con Fernet, nunca en texto plano.
- **Delays humanos**: 2-8 segundos entre acciones.
- **Límites de frecuencia**: máximo 5 posts/hora, 20 comentarios/hora, 50 reacciones/hora por cuenta.
- **Detección de captcha/checkpoint**: pausar cuenta y notificar al admin.
- **User agents realistas**: rotar para evitar detección.
- **Aislamiento de procesos**: si una cuenta es baneada, no afecta a las demás.

### 13.6. Variables de entorno adicionales

```env
BROWSER_POOL_SIZE=5
BROWSER_HEADLESS=true
BROWSER_PROXY_URL=  # opcional
STORAGE_STATE_PATH=./data/browser_states/
```
