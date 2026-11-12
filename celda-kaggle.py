# ============ PULSE OS: LEVANTAR EL PROGRAMA (COMPLETO) ============
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
run("pkill -f cloudflared ; pkill -f 'uvicorn app.main' ; pkill -f 'next start' ; pkill -f websockify ; pkill x11vnc ; pkill Xvfb ; sleep 2")

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

print("\n===============================================")
print("RESUMEN  ->  Backend:", "OK" if backend_ok else "MAL", "| Web:", "OK" if web_ok else "MAL")
if url:
    print("PULSE OS CORRIENDO. Abrilo desde el telefono:")
    print(url)
else:
    print("El enlace no salio. Esto dice el tunel:")
    cola("tunnel.log")
print("===============================================")
