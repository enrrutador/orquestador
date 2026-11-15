/**
 * Login del navegador — se corre UNA VEZ en el servidor donde vive la app
 * (una computadora, una VM o un entorno persistente; NO en Vercel).
 *
 * Abre un Chromium visible en facebook.com para que el dueño de la cuenta
 * inicie sesión a mano (contraseña, códigos y checkpoints los resuelve él).
 * Usa el MISMO perfil persistente que el navegador de la app, así la
 * sesión queda disponible sin importar el archivo de estado. Cuando
 * detecta la cookie de sesión fuera de una comprobación, guarda también
 * el estado y cierra.
 *
 * En Android/Termux sin pantalla, el login se hace desde la tarjeta
 * **Navegador** del panel: este script necesita una ventana (X11).
 *
 * Uso:
 *   node scripts/browser-login.mjs
 *
 * Variables:
 *   BROWSER_EXECUTABLE_PATH  ruta al Chromium/Chrome (opcional)
 *   BROWSER_PROFILE_DIR      perfil persistente de la app
 *                            (default: .data/browser-profile)
 *   BROWSER_STATE_PATH       dónde guardar la sesión
 *                            (default: .data/browser-state.json)
 */

import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const statePath =
  process.env.BROWSER_STATE_PATH ||
  path.join(process.cwd(), ".data", "browser-state.json");

const profileDir =
  process.env.BROWSER_PROFILE_DIR ||
  path.join(process.cwd(), ".data", "browser-profile");

const candidates = [
  process.env.BROWSER_EXECUTABLE_PATH,
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
].filter(Boolean);

const executablePath = candidates.find((c) => existsSync(c));

if (!executablePath) {
  console.error(
    "No se encontró Chromium/Chrome. Instalalo o definí BROWSER_EXECUTABLE_PATH."
  );
  process.exit(1);
}

mkdirSync(profileDir, { recursive: true });
mkdirSync(path.dirname(statePath), { recursive: true });

let context;
try {
  context = await chromium.launchPersistentContext(profileDir, {
    executablePath,
    headless: false,
    // Sin sandbox: es el modo que funciona en Termux y en contenedores.
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
} catch (error) {
  console.error("No se pudo abrir una ventana de Chromium.");
  console.error(
    "En Android usá la tarjeta Navegador del panel: este script necesita una pantalla (X11)."
  );
  console.error(
    "Si la app está corriendo, cerrala antes: el perfil queda bloqueado."
  );
  console.error(String(error));
  process.exit(1);
}

const page = context.pages()[0] || (await context.newPage());

console.log("Abriendo Facebook. Iniciá sesión en la ventana del navegador.");
console.log("Tenés 10 minutos. No cierres la ventana hasta que termine solo.");
await page.goto("https://www.facebook.com/", {
  waitUntil: "domcontentloaded",
});

const deadline = Date.now() + 10 * 60 * 1000;
let saved = false;
let avisoCheckpoint = false;

while (Date.now() < deadline) {
  const cookies = await context.cookies("https://www.facebook.com");
  const url = page.url();
  const checkpoint = url.includes("/checkpoint");

  if (checkpoint && !avisoCheckpoint) {
    avisoCheckpoint = true;
    console.log(
      "Facebook pidió verificar que sos una persona. Resolvelo en la ventana."
    );
  }

  // c_user puede existir mientras la comprobación sigue en pantalla: no
  // cerrar ahí (era justo el momento en que se perdía la verificación).
  if (!checkpoint && cookies.some((c) => c.name === "c_user")) {
    await context.storageState({ path: statePath });
    saved = true;
    break;
  }
  await new Promise((r) => setTimeout(r, 3000));
}

await context.close().catch(() => {});

if (saved) {
  console.log(`Sesión guardada en el perfil ${profileDir}`);
  console.log(`Copia del estado en ${statePath}`);
} else {
  console.error("Se acabó el tiempo sin detectar una sesión iniciada.");
  process.exit(1);
}
