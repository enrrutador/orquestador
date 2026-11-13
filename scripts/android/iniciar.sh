#!/data/data/com.termux/files/usr/bin/bash
# Orquestador local en Android — arranque diario, desde Termux.
#
# Mantiene el teléfono despierto para la app y la levanta dentro del Debian
# interno. Después abrí Chrome en el mismo teléfono y entrá a
# http://localhost:3000
#
# Uso (en Termux):
#   bash scripts/android/iniciar.sh
# Para frenarla: Ctrl+C en esta misma ventana de Termux.

termux-wake-lock || true

echo "Levantando Orquestador en http://localhost:3000 ..."
echo "Dejá esta ventana de Termux abierta mientras uses la app."

proot-distro login debian -- bash -lc '
  cd /root/orquestador
  if [ ! -d .next ]; then npm run build; fi
  npm run start
'

termux-wake-unlock || true
