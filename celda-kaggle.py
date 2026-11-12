# ============ PULSE OS: LEVANTAR EL PROGRAMA, CON NAVEGADOR EN VIVO ============
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

# ---------- 1.5: pantalla en vivo para el navegador de la app ----------
# Xvfb (pantalla virtual) + x11vnc + noVNC: el navegador de Pulse OS se
# ve y se maneja desde el telefono con un enlace, igual que la app.
NAVEGADOR_URL = None
os.chdir("/kaggle/working")
if not (hay("Xvfb") and hay("x11vnc") and hay("websockify")):
    run("apt-get update -qq && apt-get install -y -qq xvfb x11vnc novnc websockify")
if hay("Xvfb") and hay("x11vnc") and hay("websockify"):
    run("pkill Xvfb ; pkill x11vnc ; pkill -f websockify ; sleep 1")
    subprocess.Popen("nohup Xvfb :99 -screen 0 1280x800x24 > /kaggle/working/xvfb.log 2>&1 &", shell=True)
    time.sleep(2)
    subprocess.Popen("nohup x11vnc -display :99 -forever -shared -nopw -rfbport 5900 > /kaggle/working/vnc.log 2>&1 &", shell=True)
    time.sleep(2)
    subprocess.Popen("nohup websockify --web=/usr/share/novnc 6080 localhost:5900 > /kaggle/working/novnc.log 2>&1 &", shell=True)
    if espera_http("http://127.0.0.1:6080/vnc.html", intentos=15):
        if not os.path.exists("cloudflared"):
            run("curl -fsSL -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x cloudflared")
        run("pkill -f 'cloudflared tunnel --url http://localhost:6080' ; sleep 1")
        subprocess.Popen("nohup /kaggle/working/cloudflared tunnel --url http://localhost:6080 > /kaggle/working/tunnel-nav.log 2>&1 &", shell=True)
        base_nav = espera_url_tunel("/kaggle/working/tunnel-nav.log")
        if base_nav:
            NAVEGADOR_URL = base_nav + "/vnc.html?autoconnect=true&resize=scale"
    if NAVEGADOR_URL:
        os.environ["DISPLAY"] = ":99"
        os.environ["PULSE_NAVEGADOR_VISIBLE"] = "1"
        os.environ["PULSE_NAVEGADOR_URL"] = NAVEGADOR_URL
        print("Navegador en vivo: LISTO")
    else:
        print("Navegador en vivo: NO se pudo levantar (ver vnc.log / novnc.log). La app corre igual, con el login clasico.")
else:
    print("Navegador en vivo: faltan paquetes de pantalla. La app corre igual, con el login clasico.")

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
if NAVEGADOR_URL:
    print("\nNAVEGADOR EN VIVO (tambien sale como boton dentro de la app):")
    print(NAVEGADOR_URL)
print("===============================================")
