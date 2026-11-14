#!/data/data/com.termux/files/usr/bin/bash
# Orquestador local en Android — instalación (una sola vez), desde Termux.
#
# RUTA NATIVA (sin Debian ni proot): la app corre directo en Termux, con el
# Node.js y el Chromium compilados para Android. En teléfonos ARM de 32 bits
# el JavaScript dentro de proot se cae (el motor V8 muere al ejecutar), así
# que el entorno emulado quedó descartado: acá todo es nativo del teléfono.
#
# Uso (en Termux):
#   bash scripts/android/instalar.sh
# Si todavía no clonaste el repo, primero:
#   pkg install -y git
#   git clone https://github.com/enrrutador/orquestador.git
#   cd orquestador
set -e

echo "== Orquestador local en Android: instalación nativa en Termux =="

# Node.js de Termux (incluye npm). Si Termux no tiene espejo de descarga
# elegido, el propio pkg prueba los espejos y elige uno automáticamente.
pkg install -y nodejs git

# Chromium vive en el repo gráfico (x11) de Termux, también en ARM de
# 32 bits. OJO: el ejecutable se llama "chromium-browser", no "chromium".
pkg install -y x11-repo
pkg install -y chromium

# Repo (si el script se corre desde afuera de la carpeta, se clona en ~)
if [ ! -f package.json ]; then
  if [ -d ~/orquestador ]; then
    cd ~/orquestador && git pull
  else
    git clone https://github.com/enrrutador/orquestador.git ~/orquestador
    cd ~/orquestador
  fi
fi

# Dependencias del proyecto. El package.json ya trae
# @next/swc-wasm-nodejs: el compilador nativo de Next para Android ARM no
# se publica desde Next 13, así que en el teléfono Next compila con el
# SWC en WASM (verificado: build completo en ~84 s en un ARM de 32 bits).
npm install

if [ ! -f .env.local ]; then cp .env.example .env.local; fi

echo ""
echo "Instalación completa. Falta un paso a mano: cargá la clave de tu"
echo "proveedor de IA en .env.local (LLM_API_KEY o NVIDIA_API_KEY)."
echo "Para usar la app:  bash scripts/android/iniciar.sh"
