# ============ PULSE OS: LEVANTAR EL PROGRAMA (COMPLETO) ============
# v8 (2026-11-12): lee la clave de NVIDIA desde los Secrets de Kaggle (UserSecretsClient).
# v7 (2026-11-12): carga claves desde claves.env (persisten en Kaggle) y avisa si falta alguna.
# v6 (2026-11-12): vigia que revisa backend, web y tunel y los levanta solos si se caen.
import subprocess, sys, os, time, re, urllib.request

BASE_NUEVA = False   # True = borra la base anterior y arranca de cero

# Clave del proveedor de IA (opcional). Pegala ACA en Kaggle, nunca en el chat.
# El nombre de la variable es <NOMBRE DEL PROVEEDOR>_API_KEY, en mayusculas:
# os.environ["OPENAI_API_KEY"] = "tu-clave"

WORK = "/kaggle/working"
REPO = WORK + "/comunidades-mini-agentes"

def run(cmd, cwd=None):
    print("\n>>>", cmd)
    r = subprocess.run(cmd, shell=True, cwd=cwd)
    print("salio con codigo", r.returncode)
    return r.returncode

def responde(url):
    try:
        with urllib.request.urlopen(url, timeout=4) as resp:
            return resp.status == 200
    except Exception:
        return False

def espera_http(url, intentos=40):
    for _ in range(intentos):
        if responde(url):
            return True
        time.sleep(2)
    return False

def cola(nombre, n=15):
    try:
        lineas = open(f"{WORK}/{nombre}", errors="replace").read().splitlines()
        print(f"--- ultimas lineas de {nombre} ---")
        print("\n".join(lineas[-n:]) if lineas else "(vacio)")
    except Exception as e:
        print(f"(sin {nombre}: {e})")

def hay(cmd):
    return subprocess.run(f"which {cmd}", shell=True, capture_output=True).returncode == 0

# ---------- 0: limpieza total de corridas anteriores ----------
run("pkill -f vigia.py ; pkill -f cloudflared ; pkill -f 'uvicorn app.main' ; pkill -f 'next start' ; pkill -f websockify ; pkill x11vnc ; pkill Xvfb ; sleep 2")

# ---------- 1: repo + dependencias del backend ----------
os.chdir(WORK)
if not os.path.exists(REPO):
    run("git clone https://github.com/enrrutador/comunidades-mini-agentes.git")
os.chdir(REPO)
run("git fetch origin && git reset --hard origin/main")
run(f"{sys.executable} -m pip install -q -r requirements.txt")
if run(f"{sys.executable} -m playwright install --with-deps chromium") != 0:
    run(f"{sys.executable} -m playwright install chromium")

# ---------- 2: configuracion y base ----------
with open(".env", "w") as f:
    f.write("DATABASE_URL=sqlite:////kaggle/working/pulse.db\n")
    f.write("APP_ENV=development\n")
    f.write("SECRET_KEY=kaggle-local\n")
    f.write("SCHEDULER_HABILITADO=true\n")
    f.write("SCHEDULER_INTERVALO_SEG=20\n")
if BASE_NUEVA and os.path.exists(WORK + "/pulse.db"):
    os.remove(WORK + "/pulse.db")
    print("Base anterior borrada")
if not os.path.exists(WORK + "/pulse.db"):
    run(f"{sys.executable} -c \"from app.db.session import init_db; init_db(); print('Base vacia creada')\"")

# Claves de proveedores guardadas en el disco de Kaggle (persisten entre
# sesiones del cuaderno): una linea NOMBRE_API_KEY=valor por linea.
if os.path.exists(WORK + "/claves.env"):
    for linea in open(WORK + "/claves.env"):
        linea = linea.strip()
        if "=" in linea and not linea.startswith("#"):
            k, v = linea.split("=", 1)
            os.environ[k.strip()] = v.strip()
    print("Claves cargadas desde claves.env")

# Claves desde los Secrets de Kaggle (ahi vive la de NVIDIA, adjuntada a
# este cuaderno): los Secrets NO pasan solos al programa, hay que leerlos.
try:
    from kaggle_secrets import UserSecretsClient
    nombre_clave = "NVIDIA" + "_API_KEY"
    sec_nvidia = UserSecretsClient().get_secret(nombre_clave)
    if sec_nvidia:
        os.environ[nombre_clave] = sec_nvidia
        print("Clave de NVIDIA cargada desde Kaggle Secrets")
    else:
        print("El secret de NVIDIA vino vacio")
except Exception as e:
    print("No se pudo leer el secret de Kaggle (¿esta adjuntado a este cuaderno?):", e)

cargadas = sorted(k for k in os.environ if k.endswith("_API_KEY"))
print("Variables de clave presentes:", ", ".join(cargadas) if cargadas else "NINGUNA (los proveedores van a fallar al llamarlos)")

# ---------- 3: backend ----------
subprocess.Popen(f"nohup {sys.executable} -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > {WORK}/backend.log 2>&1 &", shell=True, cwd=REPO)
backend_ok = espera_http("http://127.0.0.1:8000/docs")
print("Backend:", "OK" if backend_ok else "NO RESPONDE")
if not backend_ok:
    cola("backend.log")

# ---------- 4: cara web ----------
if not hay("npm"):
    run(f"cd {WORK} && curl -fsSL -o node.tar.xz https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-x64.tar.xz && tar -xJf node.tar.xz && mv node-v20.18.1-linux-x64 node")
    os.environ["PATH"] = WORK + "/node/bin:" + os.environ["PATH"]
os.chdir(REPO + "/web")
run("npm install --no-audit --no-fund")
build_ok = run("npm run build") == 0
print("Build web:", "OK" if build_ok else "FALLO (la salida quedo arriba)")
subprocess.Popen(f"nohup npm run start > {WORK}/web.log 2>&1 &", shell=True, cwd=REPO + "/web")
web_ok = espera_http("http://127.0.0.1:3000")
print("Web:", "OK" if web_ok else "NO RESPONDE")
if not web_ok:
    cola("web.log")

# ---------- 5: enlace publico (con reintento) ----------
os.chdir(WORK)
if not os.path.exists("cloudflared"):
    run("curl -fsSL -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x cloudflared")
run("chmod +x cloudflared")

def intentar_tunel():
    if os.path.exists(WORK + "/tunnel.log"):
        os.remove(WORK + "/tunnel.log")
    subprocess.Popen(f"nohup {WORK}/cloudflared tunnel --url http://localhost:3000 > {WORK}/tunnel.log 2>&1 &", shell=True)
    for _ in range(60):
        time.sleep(2)
        try:
            m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", open(WORK + "/tunnel.log").read())
            if m:
                return m.group(0)
        except Exception:
            pass
    return None

url = intentar_tunel()
if not url:
    print("El tunel no salio; reintentando una vez...")
    run("pkill -f cloudflared ; sleep 3")
    url = intentar_tunel()

# ---------- 6: vigia (si un proceso se cae, lo levanta solo) ----------
codigo_vigia = '''
import subprocess, time, urllib.request

WORK = "/kaggle/working"
REPO = WORK + "/comunidades-mini-agentes"
PY = "__PYTHON__"
LOG = WORK + "/vigia.log"

def log(msg):
    try:
        with open(LOG, "a") as f:
            f.write(time.strftime("%H:%M:%S ") + msg + "\\n")
    except Exception:
        pass

def responde(url):
    try:
        with urllib.request.urlopen(url, timeout=4) as resp:
            return resp.status == 200
    except Exception:
        return False

def vivo(patron):
    return subprocess.run("pgrep -f '" + patron + "'", shell=True, capture_output=True).returncode == 0

def levantar_backend():
    subprocess.Popen("nohup " + PY + " -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > " + WORK + "/backend.log 2>&1 &", shell=True, cwd=REPO)

def levantar_web():
    subprocess.Popen("nohup npm run start > " + WORK + "/web.log 2>&1 &", shell=True, cwd=REPO + "/web")

def levantar_tunel():
    subprocess.Popen("nohup " + WORK + "/cloudflared tunnel --url http://localhost:3000 > " + WORK + "/tunnel.log 2>&1 &", shell=True, cwd=WORK)

fallos = {"backend": 0, "web": 0}
gracia = {"backend": 0.0, "web": 0.0}
reinicios = {"backend": 0, "web": 0, "tunel": 0}
log("vigia activo")
while True:
    time.sleep(15)
    ahora = time.time()
    if ahora > gracia["backend"]:
        if responde("http://127.0.0.1:8000/docs"):
            fallos["backend"] = 0
        else:
            fallos["backend"] += 1
            if fallos["backend"] >= 3:
                subprocess.run("pkill -f 'uvicorn app.main' ; sleep 2", shell=True)
                levantar_backend()
                reinicios["backend"] += 1
                log("backend caido: reinicio nro " + str(reinicios["backend"]))
                fallos["backend"] = 0
                gracia["backend"] = ahora + 90
    if ahora > gracia["web"]:
        if responde("http://127.0.0.1:3000"):
            fallos["web"] = 0
        else:
            fallos["web"] += 1
            if fallos["web"] >= 3:
                subprocess.run("pkill -f 'next start' ; sleep 2", shell=True)
                levantar_web()
                reinicios["web"] += 1
                log("web caida: reinicio nro " + str(reinicios["web"]))
                fallos["web"] = 0
                gracia["web"] = ahora + 90
    if not vivo("cloudflared tunne[l]"):
        subprocess.run("pkill -f cloudflared ; sleep 2", shell=True)
        levantar_tunel()
        reinicios["tunel"] += 1
        log("tunel caido: reinicio nro " + str(reinicios["tunel"]) + " (el enlace publico cambia; el nuevo queda en tunnel.log)")
        time.sleep(10)
'''
codigo_vigia = codigo_vigia.replace("__PYTHON__", sys.executable)
with open(WORK + "/vigia.py", "w") as f:
    f.write(codigo_vigia)
subprocess.Popen(f"nohup {sys.executable} {WORK}/vigia.py > {WORK}/vigia-arranque.log 2>&1 &", shell=True)
print("Vigia: ACTIVO (revisa backend, web y tunel cada 15 s; si algo se cae, lo levanta solo)")

print("\n===============================================")
print("RESUMEN  ->  Backend:", "OK" if backend_ok else "MAL", "| Web:", "OK" if web_ok else "MAL")
if url:
    print("PULSE OS CORRIENDO. Abrilo desde el telefono:")
    print(url)
else:
    print("El enlace no salio. Esto dice el tunel:")
    cola("tunnel.log")
print("===============================================")
