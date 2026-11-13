/**
 * Login del navegador — se corre UNA VEZ en el servidor donde vive la app
 * (una computadora, una VM o un entorno persistente; NO en Vercel).
 *
 * Abre un Chromium visible en facebook.com para que el dueño de la cuenta
 * inicie sesión a mano (contraseña, códigos y checkpoints los resuelve él).
 * Cuando detecta la cookie de sesión, guarda el estado en el archivo de
 * sesión que usa la plataforma y cierra.
 *
 * Uso:
 *   node scripts/browser-login.mjs
 *
 * Variables:
 *   BROWSER_EXECUTABLE_PATH  ruta al Chromium/Chrome (opcional)
 *   BROWSER_STATE_PATH       dónde guardar la sesión
 *                            (default: .data/browser-state.json)
 */

import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const statePath =
  process.env.BROWSER_STATE_PATH ||
  path.join(process.cwd(), ".data", "browser-state.json");

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

mkdirSync(path.dirname(statePath), { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: false,
});
const context = await browser.newContext();
const page = await context.newPage();

console.log("Abriendo Facebook. Iniciá sesión en la ventana del navegador.");
console.log("Tenés 10 minutos. No cierres la ventana hasta que termine solo.");
await page.goto("https://www.facebook.com/", {
  waitUntil: "domcontentloaded",
});

const deadline = Date.now() + 10 * 60 * 1000;
let saved = false;

while (Date.now() < deadline) {
  const cookies = await context.cookies("https://www.facebook.com");
  if (cookies.some((c) => c.name === "c_user")) {
    await context.storageState({ path: statePath });
    saved = true;
    break;
  }
  await new Promise((r) => setTimeout(r, 3000));
}

await browser.close().catch(() => {});

if (saved) {
  console.log(`Sesión guardada en ${statePath}`);
} else {
  console.error("Se acabó el tiempo sin detectar una sesión iniciada.");
  process.exit(1);
}
