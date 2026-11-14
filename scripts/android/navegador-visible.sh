#!/data/data/com.termux/files/usr/bin/bash
# Navegador VISIBLE del Orquestador: abre Chromium en la ventana de
# Termux:X11 con el perfil de la app y el puerto de control (CDP).
# El usuario toca la ventana real, sin intermediarios; la app se
# conecta por BROWSER_CDP_URL para ver la sesión y operar después.
cd "$(dirname "$0")/../.." || exit 1

# Registrar la conexión en .env.local (una sola vez).
if ! grep -q "^BROWSER_CDP_URL=" .env.local 2>/dev/null; then
  echo "BROWSER_CDP_URL=http://127.0.0.1:9222" >> .env.local
  echo "Conexión registrada en .env.local."
  echo "Si el servidor ya está corriendo, frenalo (Ctrl+C) y volvé a arrancar con iniciar.sh."
fi

# Servidor X11, si no está corriendo.
if ! pgrep -f "termux-x11" > /dev/null; then
  termux-x11 :0 > /dev/null 2>&1 &
  sleep 2
fi

DISPLAY=:0 nohup chromium-browser \
  --no-sandbox \
  --remote-debugging-port=9222 \
  --user-data-dir="$PWD/.data/browser-profile" \
  --start-maximized \
  https://www.facebook.com/ > /dev/null 2>&1 &

echo "Listo: abrí la app Termux:X11 y vas a ver el navegador."
echo "Esa ventana se toca directamente: es un navegador de verdad."
