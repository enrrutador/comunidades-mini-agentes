# Pulse OS · Integración Facebook (cuentas y Páginas)

Documento de diseño para la conexión con Facebook Pages.

**Última actualización:** 11 de noviembre de 2026

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
- Una **Página** es una Facebook Page que la cuenta administra. En el flujo por navegador no hay tokens: se actúa con la sesión del navegador.
- Un **Personaje** puede tener 0 o 1 Página asignada.
- Una Página puede reasignarse a otro Personaje sin perder historial.

### Tablas involucradas

| Tabla | Rol |
|-------|-----|
| `cuentas` | Identidad de Facebook + credenciales cifradas (Fernet) |
| `paginas` | Facebook Page + capacidades |
| `personajes` | Personaje con FK opcional a `paginas.id` |
| `comunidades` | Agrupación de personajes |

---

## 3. Sin app de Meta ni API (decisión de diseño)

**No se crea ninguna Facebook App, no hay OAuth ni App Review.**

El diseño original (app en Meta for Developers, scopes
`pages_manage_posts` / `pages_read_engagement`, tokens de Página)
quedó **descartado**: la API no permite que una Página comente o
reaccione en posts ajenos ni en el perfil del administrador, que es
justo el corazón de esta comunidad. La única vía que lo permite es el
navegador, actuando como la Página (ver sección 4).

Los campos `token_*` que quedan en los modelos son legado sin uso en
el flujo actual; las credenciales reales son email/contraseña
cifradas con Fernet y el storage state de la sesión.

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

### 7.4. Ritmo y límites (autoimpuestos)

El ritmo real lo define la **spec de comportamiento**, no topes
uniformes por hora: el planificador de rondas
(`app/services/orchestration/ronda.py`) reparte las acciones con
huecos irregulares de minutos (y a veces horas, con «tardíos»), para
que el patrón se parezca al de personas y no al de un reloj.

Como red de seguridad, el ejecutor aplica además:
- **Tope por cuenta**: máximo `FB_MAX_ACCIONES_POR_HORA_CUENTA`
  (40) acciones de Facebook por hora, medido sobre la cuenta
  completa — la comunidad real cuelga de una sola cuenta, así que el
  ritmo se mide a ese nivel, no por personaje. Si se supera, la
  tarea se reprograma sola 30 minutos.
- **Pausa entre acciones** del scheduler
  (`FB_PAUSA_ENTRE_ACCIONES_SEG`).
- Delays cortos de tipeo/lectura dentro del navegador
  (`_human_delay`).

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

Cada acción crea una **Tarea real** y la ejecuta en el momento con el
ejecutor (`app/services/orchestration/executor.py`): navegador con la
sesión de la cuenta, identidad de la Página del personaje y
verificación del resultado en Facebook. La respuesta devuelve el
estado real de la tarea (`completada` / `fallida` y si quedó
verificada) — nunca un «en_cola» sin ejecución detrás.

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/facebook/publicar` | Publicar post como el personaje dueño de la Página (pagina_id, mensaje) |
| POST | `/api/facebook/comentar` | Comentar en un post (post_url, mensaje, **personaje_id obligatorio**) |
| POST | `/api/facebook/reaccionar` | Reaccionar (object_url, tipo, **personaje_id obligatorio**) |
| GET | `/api/facebook/leer-posts` | Leer posts de una Página (pagina_id, limit) |
| GET | `/api/facebook/leer-comentarios` | Leer comentarios de un post (post_url, **pagina_id**, limit) |

Sin `personaje_id` no se actúa: comentar o reaccionar sin saber como
qué Página sería hacerlo con la identidad equivocada (el error que
este sistema no puede permitirse).

### Orquestación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/orquestacion/ronda` | Planifica una ronda sobre un post (spec de comportamiento) y crea las tareas programadas |
| POST | `/api/orquestacion/responder-comentarios` | Lee los comentarios de un post propio y programa respuestas del personaje dueño |
| POST | `/api/orquestacion/procesar-vencidas` | Ejecuta ya las tareas vencidas (el scheduler también lo hace solo) |

## 9. Flujo completo de ejemplo

1. Admin registra la cuenta en el panel (email + contraseña; se
   guardan cifradas con Fernet) y apreta «login»: el navegador
   headless inicia sesión y el storage state queda guardado cifrado.
2. El admin apreta «detectar Páginas»: el sistema lista las Páginas
   que la cuenta administra y las guarda.
3. El admin asigna cada Página a su personaje (p. ej. la Página
   «Luna rescata gatos» al personaje Luna) y activa los personajes
   con su ficha de voz completa.
4. Alguien publica un post objetivo (de Fabian o de un tercero) y el
   admin pide una ronda: `POST /api/orquestacion/ronda`.
5. El planificador elige un subconjunto desprolijo de personajes,
   mezcla roles (algunos solo reaccionan, otros comentan, otros
   responden), genera los textos con la voz de cada uno y crea las
   tareas con horarios irregulares.
6. Cuando cada tarea vence, el ejecutor abre el navegador con la
   sesión de la cuenta, **cambia la identidad activa a la Página del
   personaje** (si no puede confirmarla, aborta), ejecuta la acción
   y **verifica en Facebook que haya quedado con esa Página como
   autora**.
7. La tarea queda `completada` (o `fallida` con el error) y el hecho
   se registra en la memoria episódica del personaje.
8. Con `POST /api/orquestacion/responder-comentarios`, el dueño de
   una Página lee los comentarios que recibió su post y programa
   respuestas para algunos, a veces.

---

## 10. Seguridad

- **Credenciales y storage state cifrados at-rest** con Fernet
  (`CREDENTIAL_ENCRYPTION_KEY`).
- **La clave Fernet NUNCA va al repo**: vive solo en el entorno
  (`.env` / secreto del sistema). Si la clave se filtra junto con la
  base, el cifrado no protege nada; si llega a commitearse hay que
  rotarla y volver a loguear las cuentas.
- **Credenciales nunca en logs, respuestas de API ni conversaciones
  del LLM.**
- **Identidad verificada antes de actuar**: ninguna acción sale sin
  confirmar que la identidad activa es la Página del personaje.
- **Detección de checkpoints**: si Facebook pide verificación, la
  cuenta queda en estado `checkpoint` y se frena la actividad.
- **Auditoría**: cada acción queda registrada en su Tarea (personaje,
  Página, horarios, resultado y si fue verificada) y en la memoria
  episódica del personaje.

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

## 12. Estado y próximos pasos

Hecho:
1. ✅ Login real con credenciales en Playwright (con 2FA TOTP y
   detección de checkpoints) y storage state cifrado.
2. ✅ Detección y creación de Páginas vía navegador.
3. ✅ Endpoints de cuentas, Páginas y asignación a personajes.
4. ✅ Selectores centralizados en `selectors.py`.
5. ✅ Publicación, comentarios (incl. respuestas en hilo) y
   reacciones vía navegador, con **cambio de identidad a la Página y
   verificación del autor** tras cada acción.
6. ✅ Lectura de posts y comentarios vía scraping.
7. ✅ Ejecutor de tareas + scheduler: las tareas programadas se
   ejecutan solas al vencer; tope de ritmo por cuenta.
8. ✅ Planificador de rondas con la spec de comportamiento y flujo
   de respuestas a comentarios entrantes.

Pendiente:
1. Instalar Playwright en el entorno de ejecución
   (`pip install playwright && playwright install chromium`) y
   probar el flujo completo con la cuenta real.
2. Afinar los selectores de identidad/comentarios contra la UI real
   de Facebook (cambian seguido).
3. Worker periódico de renovación de sesiones (hoy el re-login es
   bajo demanda, al ejecutar una tarea con la sesión vencida).
4. Tests con una cuenta de prueba contra Facebook real.

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
