#!/data/data/com.termux/files/usr/bin/bash
# Orquestador local en Android — arranque diario, desde Termux.
#
# Levanta la app directo en Termux (ruta nativa, sin Debian). Después abrí
# el navegador del mismo teléfono y entrá a http://localhost:3000
#
# Uso (en Termux):
#   bash scripts/android/iniciar.sh
# Para frenarla: Ctrl+C en esta misma ventana de Termux.

termux-wake-lock || true

cd ~/orquestador || { echo "No está la carpeta ~/orquestador: corré primero la instalación."; exit 1; }

echo "Levantando Orquestador en http://localhost:3000 ..."
echo "Dejá esta ventana de Termux abierta mientras uses la app."

if [ ! -d .next ]; then npm run build; fi
npm run start

termux-wake-unlock || true
