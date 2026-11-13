import { existsSync } from "fs";
import path from "path";

/**
 * Sesión del navegador — modalidad 100% navegador.
 *
 * La interacción con Facebook se hace navegando, no por API. Este módulo
 * cuida la sesión guardada del navegador (storage state de Playwright) y
 * sabe decir en qué estado está: conectada, pidiendo login, o frenada por
 * un checkpoint de seguridad de Facebook.
 *
 * El navegador vive en el mismo dispositivo que la app (enfoque local
 * primero): la PC del usuario o su teléfono Android (dentro del entorno
 * Debian interno). En entornos sin navegador disponible el estado se
 * reporta como "no-verificable" y el resto de la app sigue funcionando.
 */

export type BrowserState =
  | "conectado"
  | "login-requerido"
  | "checkpoint"
  | "sin-sesion"
  | "no-verificable";

export interface BrowserStatus {
  state: BrowserState;
  detail: string;
  /** true si en este entorno hay un Chromium utilizable. */
  browserAvailable: boolean;
  /** true si existe una sesión guardada en el servidor. */
  hasSavedSession: boolean;
  checkedAt: string;
}

export function getStatePath(): string {
  return (
    process.env.BROWSER_STATE_PATH ||
    path.join(process.cwd(), ".data", "browser-state.json")
  );
}

function findChromium(): string | null {
  const candidates = [
    process.env.BROWSER_EXECUTABLE_PATH,
    // Linux / Debian (incluye el Debian interno de Android local)
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    // Windows (PC local)
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
    // macOS (PC local)
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

export async function getBrowserStatus(): Promise<BrowserStatus> {
  const checkedAt = new Date().toISOString();
  const statePath = getStatePath();
  const hasSavedSession = existsSync(statePath);
  const executable = findChromium();
  const cdpUrl = process.env.BROWSER_CDP_URL;

  if (!hasSavedSession) {
    return {
      state: "sin-sesion",
      detail:
        "Todavía no hay una sesión de Facebook guardada en este dispositivo. Hay que iniciar sesión una vez con el navegador de la app (ver docs/NAVEGADOR.md).",
      browserAvailable: Boolean(executable || cdpUrl),
      hasSavedSession,
      checkedAt,
    };
  }

  if (!executable && !cdpUrl) {
    return {
      state: "no-verificable",
      detail:
        "Hay una sesión guardada, pero en este entorno no hay un navegador disponible para verificarla (esto pasa en despliegues serverless como Vercel).",
      browserAvailable: false,
      hasSavedSession,
      checkedAt,
    };
  }

  try {
    const { chromium } = await import("playwright-core");
    const browser = cdpUrl
      ? await chromium.connectOverCDP(cdpUrl)
      : await chromium.launch({
          executablePath: executable || undefined,
          headless: true,
        });

    try {
      const context = await browser.newContext({ storageState: statePath });
      const cookies = await context.cookies("https://www.facebook.com");
      const hasUserCookie = cookies.some((c) => c.name === "c_user");

      const page = await context.newPage();
      await page.goto("https://www.facebook.com/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      const url = page.url();
      const bodyText = await page
        .locator("body")
        .innerText()
        .catch(() => "");

      if (
        url.includes("/checkpoint") ||
        bodyText.includes("persona real") ||
        bodyText.toLowerCase().includes("checkpoint")
      ) {
        return {
          state: "checkpoint",
          detail:
            "Facebook frenó la cuenta con un checkpoint («confirmá que sos una persona real»). Lo tiene que resolver el dueño de la cuenta desde Facebook; la plataforma no lo toca.",
          browserAvailable: true,
          hasSavedSession,
          checkedAt,
        };
      }

      if (!hasUserCookie || url.includes("/login")) {
        return {
          state: "login-requerido",
          detail:
            "La sesión guardada ya no sirve: Facebook pide iniciar sesión de nuevo.",
          browserAvailable: true,
          hasSavedSession,
          checkedAt,
        };
      }

      return {
        state: "conectado",
        detail: "La sesión del navegador está activa y conectada a Facebook.",
        browserAvailable: true,
        hasSavedSession,
        checkedAt,
      };
    } finally {
      await browser.close().catch(() => {});
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return {
      state: "no-verificable",
      detail: `No se pudo verificar la sesión del navegador: ${msg.slice(0, 200)}`,
      browserAvailable: true,
      hasSavedSession,
      checkedAt,
    };
  }
}
