# ============ PULSE OS: LEVANTAR EL PROGRAMA ============
import subprocess, sys, os, time, re, urllib.request

BASE_NUEVA = False   # True = borra la base anterior y arranca de cero

# Clave del proveedor de IA (opcional). Pegala ACA en Kaggle, nunca en el chat.
# El nombre de la variable es <NOMBRE DEL PROVEEDOR>_API_KEY, en mayusculas:
# os.environ["OPENAI_API_KEY"] = "tu-clave"

def run(cmd):
    print("\n>>>", cmd)
    r = subprocess.run(cmd, shell=True)
    print("salio con codigo", r.returncode)
    return r.returncode

def espera_http(url, intentos=40):
    for i in range(intentos):
        try:
            with urllib.request.urlopen(url, timeout=4) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(2)
    return False

def espera_url_tunel(log, intentos=40):
    for i in range(intentos):
        time.sleep(2)
        try:
            texto = open(log).read()
            m = re.search(r"https://[a-z0-9-]+\.trycloudflare\.com", texto)
            if m:
                return m.group(0)
        except Exception:
            pass
    return None

def hay(cmd):
    return subprocess.run(f"which {cmd}", shell=True, capture_output=True).returncode == 0

# ---------- 1: bajar el repo e instalar el backend ----------
os.chdir("/kaggle/working")
if not os.path.exists("comunidades-mini-agentes"):
    run("git clone https://github.com/enrrutador/comunidades-mini-agentes.git")
os.chdir("/kaggle/working/comunidades-mini-agentes")
run("git pull --ff-only")
run(f"{sys.executable} -m pip install -q -r requirements.txt")
if run(f"{sys.executable} -m playwright install --with-deps chromium") != 0:
    run(f"{sys.executable} -m playwright install chromium")

# ---------- 2: configuracion y base ----------
os.chdir("/kaggle/working/comunidades-mini-agentes")
with open(".env", "w") as f:
    f.write("DATABASE_URL=sqlite:////kaggle/working/pulse.db\n")
    f.write("APP_ENV=development\n")
    f.write("SECRET_KEY=kaggle-local\n")
    f.write("SCHEDULER_HABILITADO=true\n")
    f.write("SCHEDULER_INTERVALO_SEG=20\n")
if BASE_NUEVA and os.path.exists("/kaggle/working/pulse.db"):
    os.remove("/kaggle/working/pulse.db")
    print("Base anterior borrada")
if not os.path.exists("/kaggle/working/pulse.db"):
    run(f"{sys.executable} -c \"from app.db.session import init_db; init_db(); print('Base vacia creada')\"")

# ---------- 3: arrancar el backend ----------
run("pkill -f 'uvicorn app.main' ; sleep 1")
subprocess.Popen(f"nohup {sys.executable} -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /kaggle/working/backend.log 2>&1 &", shell=True)
print("Backend:", "OK" if espera_http("http://127.0.0.1:8000/docs") else "NO RESPONDE (ver /kaggle/working/backend.log)")

# ---------- 4: la cara web (Node + Next) ----------
if not hay("npm"):
    run("cd /kaggle/working && curl -fsSL -o node.tar.xz https://nodejs.org/dist/v20.18.1/node-v20.18.1-linux-x64.tar.xz && tar -xJf node.tar.xz && mv node-v20.18.1-linux-x64 node")
    os.environ["PATH"] = "/kaggle/working/node/bin:" + os.environ["PATH"]
os.chdir("/kaggle/working/comunidades-mini-agentes/web")
run("npm install --no-audit --no-fund")
run("npm run build")
run("pkill -f 'next start' ; sleep 1")
subprocess.Popen("nohup npm run start > /kaggle/working/web.log 2>&1 &", shell=True)
print("Web:", "OK" if espera_http("http://127.0.0.1:3000") else "NO RESPONDE (ver /kaggle/working/web.log)")

# ---------- 5: enlace publico de la app para tu telefono ----------
os.chdir("/kaggle/working")
if not os.path.exists("cloudflared"):
    run("curl -fsSL -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x cloudflared")
run("pkill -f 'cloudflared tunnel --url http://localhost:3000' ; sleep 1")
subprocess.Popen("nohup /kaggle/working/cloudflared tunnel --url http://localhost:3000 > /kaggle/working/tunnel.log 2>&1 &", shell=True)
url = espera_url_tunel("/kaggle/working/tunnel.log")

print("\n===============================================")
if url:
    print("PULSE OS CORRIENDO. Abrilo desde el telefono:")
    print(url)
else:
    print("El programa corre, pero el enlace de la app no salio. Mira /kaggle/working/tunnel.log")
print("===============================================")
