#!/data/data/com.termux/files/usr/bin/bash
# Orquestador local en Android — instalación (una sola vez), desde Termux.
#
# Instala un Debian interno (proot-distro) con Node.js y Chromium, clona el
# repo adentro y deja la app instalada. La app y su navegador corren en el
# teléfono; nada se despliega en servidores externos.
#
# Uso (en Termux, desde la carpeta del repo):
#   bash scripts/android/instalar.sh
set -e

echo "== Orquestador local en Android: instalación =="

pkg install -y proot-distro

# Debian interno (si ya está instalado, se reutiliza)
proot-distro install debian || echo "Debian ya estaba instalado, sigo."

proot-distro login debian -- bash -lc '
  set -e
  apt-get update
  apt-get install -y nodejs npm git chromium ca-certificates
  if [ -d /root/orquestador ]; then
    cd /root/orquestador && git pull
  else
    git clone https://github.com/enrrutador/orquestador.git /root/orquestador
    cd /root/orquestador
  fi
  npm install
  if [ ! -f .env.local ]; then cp .env.example .env.local; fi
  echo ""
  echo "Instalación completa dentro del Debian."
  echo "Falta un paso a mano: cargá la clave de tu proveedor de IA en"
  echo "/root/orquestador/.env.local (LLM_API_KEY o NVIDIA_API_KEY)."
'

echo ""
echo "Listo. Para usar la app:  bash scripts/android/iniciar.sh"
