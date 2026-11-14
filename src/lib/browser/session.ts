import { existsSync } from "fs";
import path from "path";
import type { BrowserContext, Page } from "playwright-core";

// Termux/Android: el Node de Termux reporta process.platform === "android"
// y Playwright solo conoce linux/darwin/win32 al calcular su carpeta de
// registro: sin PLAYWRIGHT_BROWSERS_PATH definido, cualquier lanzamiento
// muere con «Unsupported platform: android» aunque se le pase el ejecutable
// (verificado por reproducción local, 2026-11-14). Se fija una carpeta
// propia dentro de .data antes de que Playwright se importe y la lea.
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(
    process.cwd(),
    ".data",
    "ms-playwright"
  );
}
if (!process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS) {
  process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "1";
}

/**
 * Navegador de la app — modalidad 100% navegador.
 *
 * La interacción con Facebook se hace navegando, no por API. El navegador
 * vive en el mismo dispositivo que la app (la PC o el teléfono Android) y
 * su perfil queda guardado en disco: la sesión sobrevive a reinicios.
 *
 * El dueño de la cuenta inicia sesión una vez mirando la pantalla del
 * navegador desde el panel (captura en vivo, toques y texto reenviados).
 * Si Facebook muestra un checkpoint, lo resuelve el dueño; la app no lo toca.
 */

export type BrowserState =
  | "conectado"
  | "login-requerido"
  | "checkpoint"
  | "sin-sesion"
  | "detenido"
  | "no-verificable";

export interface BrowserStatus {
  state: BrowserState;
  detail: string;
  /** true si en este entorno hay un Chromium utilizable. */
  browserAvailable: boolean;
  /** true si existe una sesión guardada en el dispositivo. */
  hasSavedSession: boolean;
  /** true si el navegador está abierto ahora mismo. */
  running: boolean;
  checkedAt: string;
}

export function getStatePath(): string {
  return (
    process.env.BROWSER_STATE_PATH ||
    path.join(process.cwd(), ".data", "browser-state.json")
  );
}

export function getProfileDir(): string {
  return (
    process.env.BROWSER_PROFILE_DIR ||
    path.join(process.cwd(), ".data", "browser-profile")
  );
}

function findChromium(): string | null {
  const candidates = [
    process.env.BROWSER_EXECUTABLE_PATH,
    // Termux nativo (Android local): Chromium del repo x11 de Termux.
    // OJO: el ejecutable se llama "chromium-browser", no "chromium".
    "/data/data/com.termux/files/usr/bin/chromium-browser",
    "/data/data/com.termux/files/usr/bin/chromium",
    // Linux / Debian
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

// ============================================================
// Sesión en vivo (singleton del proceso)
// ============================================================

interface LiveSession {
  context: BrowserContext;
  page: Page;
  cdp?: import("playwright-core").CDPSession;
}

const globalRef = globalThis as unknown as {
  __orquestadorBrowser?: {
    live: LiveSession | null;
    /** true cuando el cierre lo pidió el usuario (no reabrir solo). */
    stopRequested: boolean;
    /** Reaperturas automáticas seguidas; frena bucles de cierres. */
    relaunchCount: number;
  };
};
if (!globalRef.__orquestadorBrowser) {
  globalRef.__orquestadorBrowser = {
    live: null,
    stopRequested: false,
    relaunchCount: 0,
  };
}
const store = globalRef.__orquestadorBrowser;

const VIEWPORT = { width: 412, height: 915 };

export function isBrowserRunning(): boolean {
  return store.live !== null;
}

export async function startBrowser(manual = true): Promise<BrowserStatus> {
  if (store.live) return getBrowserStatus();
  if (manual) {
    store.stopRequested = false;
    store.relaunchCount = 0;
  }

  const executable = findChromium();
  if (!executable && !process.env.BROWSER_CDP_URL) {
    return {
      state: "no-verificable",
      detail: "No se encontró Chromium en este dispositivo.",
      browserAvailable: false,
      hasSavedSession: existsSync(getProfileDir()),
      running: false,
      checkedAt: new Date().toISOString(),
    };
  }

  const { chromium } = await import("playwright-core");
  const context = await chromium.launchPersistentContext(getProfileDir(), {
    executablePath: executable || undefined,
    headless: true,
    viewport: VIEWPORT,
    // Escala 1 (no 2): en el teléfono de 32 bits cada captura y cada
    // repintado pesan la cuarta parte, y Chromium aguanta mejor las
    // páginas pesadas de comprobación de Facebook.
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    // Sin sandbox: en Termux el sandbox de Chromium no puede arrancar;
    // es el modo verificado en el teléfono.
    args: [
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      // WebGL desactivado: las comprobaciones de Facebook lo usan para
      // huellas del equipo y en este Chromium de 32 bits corre por
      // software (SwiftShader), que es el sospechoso de los cierres
      // repentinos del navegador en plena comprobación (crashpad a los
      // ~85 s en dos corridas seguidas). Sin WebGL esa vía de cierre
      // desaparece; la comprobación sigue cargando.
      "--disable-webgl",
      "--disable-webgl2",
    ],
  });

  const page = context.pages()[0] || (await context.newPage());
  store.live = { context, page };
  context.on("close", () => {
    if (store.live?.context === context) store.live = null;
    // Cierre inesperado (Chromium se cae en el teléfono con las páginas
    // pesadas de comprobación): se reabre solo y vuelve a Facebook. El
    // perfil guarda la sesión, así que retoma donde estaba — incluso a
    // mitad de una comprobación. Con tope para no entrar en bucle.
    if (!store.stopRequested && store.relaunchCount < 6) {
      store.relaunchCount++;
      setTimeout(() => {
        startBrowser(false).catch(() => {});
      }, 1500);
    }
  });

  await page
    .goto("https://www.facebook.com/", {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    })
    .catch(() => {});

  return getBrowserStatus();
}

export async function stopBrowser(): Promise<void> {
  store.stopRequested = true;
  if (!store.live) return;
  const { context } = store.live;
  store.live = null;
  await context.close().catch(() => {});
}

export async function browserScreenshot(): Promise<Buffer | null> {
  if (!store.live) return null;
  if (store.live.page.isClosed()) {
    // La página murió pero el contexto sigue: se fuerza el cierre para
    // que el manejador reabra el navegador solo.
    const { context } = store.live;
    store.live = null;
    context.close().catch(() => {});
    return null;
  }
  // JPEG calidad 80: mucho más liviano que el PNG para capturar seguido en
  // un teléfono débil, y con nitidez suficiente para leer un captcha
  // (lección de Pulse OS: con calidad baja el captcha no se distinguía).
  return store.live.page
    .screenshot({ type: "jpeg", quality: 80 })
    .catch(() => null);
}

/**
 * Puntero completo (apretar / mover / soltar) sobre la pantalla del
 * navegador, como TOQUE real por CDP (Input.dispatchTouchEvent).
 *
 * Con la emulación móvil activa, los eventos de mouse de Playwright no
 * siempre producen el clic: la página (y los iframes de comprobación de
 * Facebook) esperan toques. El toque por CDP es el mismo evento que
 * genera un dedo y además habilita mantener apretado y arrastrar, que
 * es lo que piden esos desafíos.
 */
export async function browserPointer(
  action: "down" | "move" | "up",
  fx: number,
  fy: number
): Promise<void> {
  if (!store.live) return;
  const live = store.live;
  const x = Math.round(fx * VIEWPORT.width);
  const y = Math.round(fy * VIEWPORT.height);
  try {
    if (!live.cdp) {
      live.cdp = await live.context.newCDPSession(live.page);
    }
    const type =
      action === "down"
        ? "touchStart"
        : action === "move"
          ? "touchMove"
          : "touchEnd";
    await live.cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: action === "up" ? [] : [{ x, y, id: 1 }],
    });
    if (action === "up") {
      await live.page.waitForTimeout(500);
    }
  } catch {
    // Si el toque por CDP falla (o el navegador se cerró a mitad de
    // camino), se intenta con el mouse clásico antes de rendirse.
    try {
      if (action === "down") {
        await live.page.mouse.move(x, y);
        await live.page.mouse.down();
      } else if (action === "move") {
        await live.page.mouse.move(x, y, { steps: 5 });
      } else {
        await live.page.mouse.up();
      }
    } catch {
      /* el navegador se cerró; la reapertura automática se encarga */
    }
  }
}

export async function browserClick(fx: number, fy: number): Promise<void> {
  if (!store.live) return;
  const { page } = store.live;
  await page.mouse.click(fx * VIEWPORT.width, fy * VIEWPORT.height);
  await page.waitForTimeout(700);
}

export async function browserType(text: string): Promise<void> {
  if (!store.live) return;
  await store.live.page.keyboard.type(text, { delay: 25 });
}

export async function browserKey(key: string): Promise<void> {
  if (!store.live) return;
  await store.live.page.keyboard.press(key);
  await store.live.page.waitForTimeout(500);
}

// ============================================================
// Estado
// ============================================================

async function liveStatus(): Promise<BrowserStatus> {
  const checkedAt = new Date().toISOString();
  const { context, page } = store.live!;
  const url = page.url();

  const cookies = await context
    .cookies("https://www.facebook.com")
    .catch(() => []);
  const hasUserCookie = cookies.some((c) => c.name === "c_user");

  let checkpoint = url.includes("/checkpoint");
  if (!checkpoint && !hasUserCookie) {
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    checkpoint =
      bodyText.includes("persona real") ||
      bodyText.toLowerCase().includes("checkpoint");
  }

  if (checkpoint) {
    return {
      state: "checkpoint",
      detail:
        "Facebook pidió confirmar que sos una persona real. Resolvelo en la pantalla del navegador.",
      browserAvailable: true,
      hasSavedSession: true,
      running: true,
      checkedAt,
    };
  }

  if (hasUserCookie) {
    return {
      state: "conectado",
      detail: "Sesión activa en Facebook.",
      browserAvailable: true,
      hasSavedSession: true,
      running: true,
      checkedAt,
    };
  }

  return {
    state: "login-requerido",
    detail: "Iniciá sesión en la pantalla del navegador.",
    browserAvailable: true,
    hasSavedSession: existsSync(getProfileDir()),
    running: true,
    checkedAt,
  };
}

export async function getBrowserStatus(): Promise<BrowserStatus> {
  const checkedAt = new Date().toISOString();

  if (store.live) {
    try {
      return await liveStatus();
    } catch {
      // Si la página murió, el singleton se limpia solo por el evento close;
      // mientras tanto se reporta como no verificable.
      return {
        state: "no-verificable",
        detail: "El navegador no respondió.",
        browserAvailable: true,
        hasSavedSession: existsSync(getProfileDir()),
        running: true,
        checkedAt,
      };
    }
  }

  const hasSavedSession =
    existsSync(getProfileDir()) || existsSync(getStatePath());
  const executable = findChromium();

  if (hasSavedSession) {
    return {
      state: "detenido",
      detail: "Hay una sesión guardada. Abrí el navegador para usarla.",
      browserAvailable: Boolean(executable),
      hasSavedSession,
      running: false,
      checkedAt,
    };
  }

  return {
    state: "sin-sesion",
    detail: "Abrí el navegador e iniciá sesión en Facebook una vez.",
    browserAvailable: Boolean(executable),
    hasSavedSession: false,
    running: false,
    checkedAt,
  };
}
