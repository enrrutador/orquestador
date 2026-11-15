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
echo "Commit: $(git rev-parse --short HEAD 2>/dev/null || echo '?')"

# Si el pull trajo dependencias nuevas, instalarlas antes de compilar.
if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
  npm install
fi

# Compilar también cuando el código es más nuevo que el build anterior.
# Sin esto, un git pull podía dejar corriendo el .next viejo y el arreglo
# no se veía hasta borrar .next a mano.
if [ ! -f .next/BUILD_ID ] || [ -n "$(find src scripts package.json package-lock.json next.config.ts -newer .next/BUILD_ID -print -quit 2>/dev/null)" ]; then
  npm run build
fi

if ! command -v termux-wake-lock >/dev/null 2>&1; then
  echo "AVISO: falta termux-api; Android puede cerrar el navegador en la verificación."
  echo "Instalá: pkg install termux-api (y la app Termux:API desde F-Droid)."
fi

mkdir -p .data
# El diagnóstico de Playwright (process did exit: signal=...) va a stderr;
# se guarda junto al de la app para poder verlo desde el panel.
export BROWSER_DEBUG="${BROWSER_DEBUG:-1}"
npm run start 2>&1 | tee -a .data/inicio.log

termux-wake-unlock || true
