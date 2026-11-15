import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from "fs";
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

// Diagnóstico (BROWSER_DEBUG=1): Playwright vuelca en la terminal del
// servidor la vida del proceso de Chromium, incluida la línea clave al
// morir: «process did exit: exitCode=…, signal=…». SIGKILL = Android lo
// mató (memoria); SIGSEGV/SIGTRAP/SIGABRT = caída nativa del motor.
if (process.env.BROWSER_DEBUG === "1" && !process.env.DEBUG) {
  process.env.DEBUG = "pw:browser";
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

// ============================================================
// Diagnóstico: bitácora de eventos + muestreo de memoria
// ============================================================

export function getDiagPath(): string {
  return path.join(process.cwd(), ".data", "diagnostico.log");
}

export function getChromiumLogPath(): string {
  return path.join(process.cwd(), ".data", "chromium.log");
}

/**
 * Anota un evento en .data/diagnostico.log (una línea JSON por evento).
 * El diagnóstico nunca puede romper la app: todo va envuelto en try.
 */
export function diag(evento: string, datos?: Record<string, unknown>): void {
  try {
    mkdirSync(path.join(process.cwd(), ".data"), { recursive: true });
    appendFileSync(
      getDiagPath(),
      JSON.stringify({ t: new Date().toISOString(), evento, ...datos }) + "\n"
    );
  } catch {
    /* sin bitácora, la app sigue */
  }
}

/**
 * Foto de memoria del momento: RAM disponible del teléfono y consumo de
 * los procesos de Chromium (en Termux son del mismo usuario y /proc se
 * puede leer). Sirve para ver la curva previa a un cierre: si la RAM
 * disponible cae a casi cero antes de morir, lo mata Android (LMK/OOM);
 * si muere con RAM de sobra, la caída es del propio Chromium.
 */
export function sampleMemory(): {
  disponibleMB: number;
  chromiumMB: number;
  procesos: number;
  mayorMB: number;
  tipos: Record<string, number>;
} {
  let disponibleMB = -1;
  try {
    const m = readFileSync("/proc/meminfo", "utf8").match(
      /MemAvailable:\s+(\d+)\s+kB/
    );
    if (m) disponibleMB = Math.round(parseInt(m[1], 10) / 1024);
  } catch {
    /* /proc no disponible en este sistema */
  }
  let totalKB = 0;
  let mayorKB = 0;
  let procesos = 0;
  const tipos: Record<string, number> = {};
  try {
    for (const ent of readdirSync("/proc")) {
      if (!/^\d+$/.test(ent)) continue;
      try {
        const cmd = readFileSync(`/proc/${ent}/cmdline`, "utf8");
        if (!cmd.includes("chromium")) continue;
        const mt = cmd.match(/--type=([a-z-]+)/);
        const tipo = mt
          ? mt[1]
          : cmd.includes("crashpad_handler")
            ? "crashpad"
            : "navegador";
        tipos[tipo] = (tipos[tipo] ?? 0) + 1;
        const vm = readFileSync(`/proc/${ent}/status`, "utf8").match(
          /VmRSS:\s+(\d+)\s+kB/
        );
        if (vm) {
          const kb = parseInt(vm[1], 10);
          totalKB += kb;
          if (kb > mayorKB) mayorKB = kb;
          procesos++;
        }
      } catch {
        /* el proceso murió a mitad de la lectura */
      }
    }
  } catch {
    /* sin /proc */
  }
  return {
    disponibleMB,
    chromiumMB: Math.round(totalKB / 1024),
    procesos,
    mayorMB: Math.round(mayorKB / 1024),
    tipos,
  };
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
  /**
   * true si el navegador es EXTERNO y visible (Termux:X11): la app se
   * conectó por CDP a una ventana que maneja el usuario con el dedo.
   * En ese modo la app no lo abre ni lo cierra: solo se conecta.
   */
  external?: boolean;
  /** Conexión CDP a soltar al desconectar (solo modo externo). */
  browser?: import("playwright-core").Browser;
  /** Muestreador de memoria del diagnóstico, activo con la sesión. */
  sampler?: ReturnType<typeof setInterval>;
  /** Última URL http(s) de la pestaña activa (para retomar el checkpoint). */
  lastUrl?: string;
  /** Evita reentradas mientras se rehace la página. */
  recovering?: boolean;
  /** Páginas rehechas en esta sesión (tope anti-bucle). */
  pageRecoveries?: number;
}

const globalRef = globalThis as unknown as {
  __orquestadorBrowser?: {
    live: LiveSession | null;
    /** true cuando el cierre lo pidió el usuario (no reabrir solo). */
    stopRequested: boolean;
    /** Reaperturas automáticas seguidas; frena bucles de cierres. */
    relaunchCount: number;
    /** Última URL viva, para volver al checkpoint tras un cierre. */
    lastUrl: string | null;
    /** Cierres con la comprobación de Facebook en pantalla. */
    checkpointCrashes: number;
    /** true si la app retiene el wake lock de Termux. */
    wakeLockHeld: boolean;
  };
};
if (!globalRef.__orquestadorBrowser) {
  globalRef.__orquestadorBrowser = {
    live: null,
    stopRequested: false,
    relaunchCount: 0,
    lastUrl: null,
    checkpointCrashes: 0,
    wakeLockHeld: false,
  };
}
const store = globalRef.__orquestadorBrowser;

const VIEWPORT = { width: 412, height: 915 };
const FACEBOOK_HOME = "https://www.facebook.com/";

function esAndroid(): boolean {
  return process.platform === "android" || Boolean(process.env.PREFIX);
}

function urlNavegable(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function urlDe(page: Page): string {
  try {
    return page.url();
  } catch {
    return "";
  }
}

/** Ejecuta un comando corto del sistema sin romper la sesión si falla. */
async function comando(
  cmd: string,
  args: string[]
): Promise<{ ok: boolean; out: string; error?: string }> {
  try {
    const { execFile } = await import("child_process");
    return await new Promise((resolve) => {
      execFile(cmd, args, { timeout: 5000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            ok: false,
            out: "",
            error: `${String(error)}${stderr ? `: ${String(stderr).trim()}` : ""}`,
          });
        } else {
          resolve({ ok: true, out: String(stdout).trim() });
        }
      });
    });
  } catch (error) {
    return { ok: false, out: "", error: String(error) };
  }
}

let androidReleaseCache: string | null = null;
async function androidRelease(): Promise<string> {
  if (!esAndroid()) return "";
  if (androidReleaseCache !== null) return androidReleaseCache;
  const res = await comando("getprop", ["ro.build.version.release"]);
  androidReleaseCache = res.ok ? res.out : "";
  return androidReleaseCache;
}

let commitCache: string | null = null;
async function commitActual(): Promise<string> {
  if (commitCache !== null) return commitCache;
  const res = await comando("git", ["rev-parse", "--short", "HEAD"]);
  commitCache = res.ok ? res.out : "";
  return commitCache;
}

/**
 * Wake lock de Termux: cuando el dueño mira el panel desde Chrome, Termux
 * queda en segundo plano y Android 12+ mata los procesos hijos que gastan
 * CPU (justo lo que hace la comprobación de Facebook). El wake lock no es
 * una bala de plata, pero mantiene la app y sus hijos despiertos. Requiere
 * el paquete termux-api y la app Termux:API.
 */
async function asegurarWakeLock(): Promise<void> {
  if (!esAndroid() || store.wakeLockHeld) return;
  const res = await comando("termux-wake-lock", []);
  store.wakeLockHeld = res.ok;
  diag(
    "wake-lock",
    res.ok
      ? { ok: true }
      : { ok: false, error: res.error, ayuda: "pkg install termux-api + app Termux:API" }
  );
}

async function liberarWakeLock(): Promise<void> {
  if (!esAndroid() || !store.wakeLockHeld) return;
  const res = await comando("termux-wake-unlock", []);
  if (res.ok) store.wakeLockHeld = false;
  diag("wake-unlock", res.ok ? { ok: true } : { ok: false, error: res.error });
}

function avisoProcesosAndroid(release: string): string {
  const mayor = Number.parseInt(release, 10);
  if (Number.isFinite(mayor) && mayor >= 14) {
    return "Android está matando los procesos del navegador. Activá Ajustes → Sistema → Opciones de desarrollador → «Deshabilitar restricciones de procesos hijos» y volvé a abrir el navegador.";
  }
  return "Android 12/13 está matando los procesos del navegador. Desactivá el «phantom process killer» por ADB (comando en docs/LOCAL-ANDROID.md) y volvé a abrir el navegador.";
}

/** Páginas que ya tienen enganchados los manejadores de vida/muerte. */
const paginasEnlazadas = new WeakSet<Page>();

function recordarUrl(live: LiveSession, url: string): void {
  if (!urlNavegable(url)) return;
  live.lastUrl = url;
  store.lastUrl = url;
}

/**
 * Página activa: la que se muestra en el panel y recibe toques/texto.
 * Facebook puede abrir la comprobación en otra pestaña o ventana; la app
 * tiene que seguirla, no quedarse mirando la pestaña vieja. Si la
 * comprobación se cierra (o se cae su render), se vuelve a la que siga
 * viva en vez de cerrar todo el navegador.
 */
function adoptarPagina(live: LiveSession, page: Page): void {
  if (store.live !== live) return;
  live.page = page;
  live.cdp = undefined;
  recordarUrl(live, urlDe(page));

  if (paginasEnlazadas.has(page)) return;
  paginasEnlazadas.add(page);

  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) recordarUrl(live, frame.url());
  });
  page.on("crash", () => {
    diag("pagina-crash", { url: urlDe(page), ...sampleMemory() });
    if (store.live === live && live.page === page) {
      void recuperarPagina(live, "crash");
    }
  });
  page.on("close", () => {
    diag("pagina-cerrada", { url: urlDe(page), ...sampleMemory() });
    if (store.live === live && live.page === page) {
      void recuperarPagina(live, "cierre");
    }
  });
}

/**
 * Rehace la página activa tras un cierre o un crash del render. No cierra
 * el contexto: la verificación de Facebook puede haberse mudado a otra
 * pestaña y hay que conservarla. Si no queda ninguna, se crea una nueva y
 * se vuelve a la última URL (el checkpoint incluido).
 */
async function recuperarPagina(
  live: LiveSession,
  motivo: string
): Promise<void> {
  if (store.live !== live || live.recovering) return;
  const disparadora = live.page;
  const intento = (live.pageRecoveries ?? 0) + 1;
  live.pageRecoveries = intento;
  live.recovering = true;
  const url = live.lastUrl || store.lastUrl || FACEBOOK_HOME;
  diag("pagina-recuperacion", { motivo, intento, url });

  try {
    if (intento > 10) {
      diag("pagina-recuperacion-agotada", { motivo, intento });
      return;
    }

    let siguiente = live.context
      .pages()
      .find(
        (p) => p !== disparadora && !p.isClosed() && urlNavegable(urlDe(p))
      );

    if (!siguiente) {
      siguiente = await live.context.newPage();
    }

    // Si mientras tanto Facebook abrió la pestaña de la comprobación, esa
    // manda: no hay que taparla con una página recuperada.
    if (live.page !== disparadora && live.page !== siguiente) return;

    adoptarPagina(live, siguiente);
    if (live.page !== siguiente) return;

    if (urlNavegable(url) && urlDe(siguiente) !== url) {
      await siguiente
        .goto(url, { waitUntil: "domcontentloaded", timeout: 45000 })
        .catch(() => {});
    }
    await siguiente.waitForTimeout(1200);
    // Si la página rehecha aguanta un minuto, se limpia el contador para
    // que un cierre aislado mañana no agote el tope anti-bucle.
    setTimeout(() => {
      if (
        store.live === live &&
        live.page === siguiente &&
        !siguiente.isClosed()
      ) {
        live.pageRecoveries = 0;
      }
    }, 60000);
  } catch (error) {
    diag("pagina-recuperacion-error", { motivo, error: String(error) });
  } finally {
    if (store.live === live) live.recovering = false;
  }
}

export function isBrowserRunning(): boolean {
  return store.live !== null;
}

/** Página viva de la sesión (la usa el ejecutor de acciones). */
export function getLivePage(): Page | null {
  return store.live?.page ?? null;
}

/** Navega la página activa (login liviano, volver a Facebook, etc.). */
export async function browserGoto(url: string): Promise<boolean> {
  if (!store.live) return false;
  const live = store.live;
  if (live.page.isClosed()) {
    void recuperarPagina(live, "goto-pagina-cerrada");
    return false;
  }
  try {
    await live.page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function startBrowser(manual = true): Promise<BrowserStatus> {
  if (store.live) return getBrowserStatus();
  if (manual) {
    store.stopRequested = false;
    store.relaunchCount = 0;
    store.checkpointCrashes = 0;
  }

  // En Android, el sistema mata procesos hijos que gastan CPU cuando la
  // app está en segundo plano. El wake lock mantiene viva la sesión
  // mientras el dueño mira el panel desde otro navegador.
  await asegurarWakeLock();

  // Modo navegador VISIBLE (Termux:X11): si hay una URL de CDP
  // configurada, la app se conecta al Chromium que el usuario abrió en
  // su ventana y maneja con el dedo — sin intermediarios entre su mano
  // y la página. La sesión vive en el perfil de esa ventana.
  const cdpUrl = process.env.BROWSER_CDP_URL;
  if (cdpUrl) {
    try {
      const { chromium } = await import("playwright-core");
      const browser = await chromium.connectOverCDP(cdpUrl);
      const context = browser.contexts()[0];
      const page = context.pages()[0] || (await context.newPage());
      const live: LiveSession = { context, page, external: true, browser };
      store.live = live;
      adoptarPagina(live, page);
      browser.on("disconnected", () => {
        if (store.live?.browser === browser) store.live = null;
      });
      return getBrowserStatus();
    } catch {
      return {
        state: "no-verificable",
        detail:
          "No se encontró el navegador visible. Abrilo primero con scripts/android/navegador-visible.sh y después conectá.",
        browserAvailable: false,
        hasSavedSession: existsSync(getProfileDir()),
        running: false,
        checkedAt: new Date().toISOString(),
      };
    }
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

  // Limpieza previa en Termux: si una corrida anterior dejó un Chromium
  // huérfano (el servidor se frenó con Ctrl+C y el navegador hijo quedó
  // vivo), ese proceso retiene el perfil y cualquier reapertura muere en
  // silencio. Sin sesión viva propia, cualquier chromium-browser que
  // ande suelto en el teléfono es un huérfano de esta app: se lo baja.
  if (!store.live && (process.env.PREFIX || process.platform === "android")) {
    try {
      const { execFile } = await import("child_process");
      await new Promise<void>((resolve) => {
        execFile("pkill", ["-f", "chromium-browser"], () => resolve());
      });
      await new Promise((r) => setTimeout(r, 600));
    } catch {
      /* sin pkill o sin procesos: se sigue igual */
    }
  }

  // Candado de perfil vencido: cuando Chromium muere de golpe (la página
  // de comprobación de Facebook lo cierra en el teléfono), deja en el
  // perfil los archivos Singleton*, y el próximo lanzamiento aborta con
  // «Failed to create a ProcessSingleton... Aborting now to avoid
  // profile corruption» (exitCode 21, verificado 2026-11-14). Sin sesión
  // viva propia, esos archivos son de un proceso muerto: se borran antes
  // de lanzar para que la app se recupere sola de un cierre brusco.
  if (!store.live) {
    try {
      const { rmSync } = await import("fs");
      for (const name of [
        "SingletonLock",
        "SingletonCookie",
        "SingletonSocket",
      ]) {
        rmSync(path.join(getProfileDir(), name), { force: true });
      }
    } catch {
      /* si no se puede limpiar, el lanzamiento dará su propio error */
    }
  }

  const android = esAndroid();
  // En Android el aislamiento de sitio es lo que hace que el iframe
  // cruzado de la comprobación de Facebook estrene un proceso nuevo, y
  // Android lo mate a los ~2 s. Desactivarlo por defecto mantiene la
  // comprobación dentro del renderizador que ya existe. Se puede apagar
  // con BROWSER_SIN_AISLAMIENTO=0 (o forzar en PC con =1).
  const sinAislamiento =
    process.env.BROWSER_SIN_AISLAMIENTO === "1" ||
    (android && process.env.BROWSER_SIN_AISLAMIENTO !== "0");
  // Modo suave: mismo objetivo por otra vía (sin zygote, un solo
  // renderizador y agrupado por sitio). En Android queda activo por
  // defecto; se apaga con BROWSER_SUAVE=0.
  const suave =
    process.env.BROWSER_SUAVE === "1" ||
    (android && process.env.BROWSER_SUAVE !== "0");
  const urlInicial =
    process.env.BROWSER_URL_INICIAL || store.lastUrl || FACEBOOK_HOME;

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
      // Modo de memoria baja (BROWSER_LOW_MEMORY=1), para teléfonos de
      // 32 bits con poca RAM: un solo proceso (sin procesos hijos que
      // Android mate por separado con su low-memory-killer), sin zygote
      // y heap de JavaScript acotado. Es el conjunto de flags estándar
      // para Chromium en entornos débiles; se activa por entorno para
      // poder probarlo sin tocar el modo normal.
      ...(process.env.BROWSER_LOW_MEMORY === "1"
        ? [
            "--single-process",
            "--no-zygote",
            "--renderer-process-limit=1",
            "--js-flags=--max-old-space-size=128",
            "--disable-extensions",
            "--mute-audio",
          ]
        : []),
      // Modo sin JIT (BROWSER_JITLESS=1): la comprobación de Facebook
      // corre JavaScript pesadísimo y el JIT de V8 pide memoria
      // ejecutable (RWX), que Android corta en procesos de terminal
      // (W^X/SELinux) y puede matar el render a mitad de la
      // comprobación. Sin JIT todo se interpreta: más lento, pero sin
      // esa vía de cierre. Multiproceso normal (el single-process del
      // modo memoria baja resultó peor: verificado 2026-11-14).
      ...(process.env.BROWSER_JITLESS === "1"
        ? [
            "--jitless",
            "--in-process-gpu",
            "--disable-software-rasterizer",
          ]
        : []),
      // Sin aislamiento de sitio: la comprobación de Facebook vive en
      // un iframe cruzado; con site isolation activo Chromium levanta un
      // proceso aparte y Android lo mata en plena verificación. Al
      // desactivarlo, el iframe corre en el renderizador de la página.
      // EnforceSameDocumentOriginInvariants es la feature que causó el
      // «Aw Snap» al loguear en Facebook en Chrome 153 (crbug 549229687);
      // desactivarla es una red de seguridad para builds viejos de Termux.
      ...(sinAislamiento
        ? [
            "--disable-site-isolation-trials",
            "--disable-features=IsolateOrigins,site-per-process,SitePerProcessAndroid,IsolateOriginsAndroid,EnforceSameDocumentOriginInvariants",
          ]
        : []),
      // Modo suave (BROWSER_SUAVE=1, activo por defecto en Android): la
      // muerte llega ~2 s después de que Chromium levanta un proceso
      // nuevo para la comprobación. Achica el modelo de procesos — sin
      // zygote (cada hijo arranca limpio), un solo renderizador y
      // agrupado por sitio — para que la comprobación reuse el proceso
      // existente en vez de estrenar uno. Se apaga con BROWSER_SUAVE=0.
      ...(suave
        ? ["--no-zygote", "--renderer-process-limit=1", "--process-per-site"]
        : []),
      // Con diagnóstico activo, Chromium deja su propio registro en
      // .data/chromium.log (errores nativos, crashpad, GPU). OJO:
      // "--enable-logging=file" NO es válido en la compilación de
      // Termux (verificado 2026-11-15: "Invalid logging destination");
      // quedan --log-file/--log-level, inertes ahí pero válidos en PC.
      ...(process.env.BROWSER_DEBUG === "1"
        ? [`--log-file=${getChromiumLogPath()}`, "--log-level=0"]
        : []),
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

  const launchedAt = Date.now();
  const page = context.pages()[0] || (await context.newPage());
  const live: LiveSession = { context, page };
  store.live = live;
  adoptarPagina(live, page);

  // Facebook puede abrir la comprobación en una pestaña/ventana nueva:
  // se adopta como activa y se sigue. Si esa pestaña se cierra, la
  // recuperación vuelve a la que siga viva (o rehace una).
  context.on("page", (nueva) => {
    if (store.live !== live) return;
    diag("pagina-nueva", { url: urlDe(nueva) });
    adoptarPagina(live, nueva);
  });

  // Diagnóstico: eventos de vida/muerte y curva de memoria cada 5 s.
  diag("lanzado", {
    commit: await commitActual(),
    android: await androidRelease(),
    wakeLock: store.wakeLockHeld,
    ejecutable: executable,
    jitless: process.env.BROWSER_JITLESS === "1",
    memoriaBaja: process.env.BROWSER_LOW_MEMORY === "1",
    suave,
    sinAislamiento,
    urlInicial,
    debug: process.env.BROWSER_DEBUG === "1",
    ...sampleMemory(),
  });
  live.sampler = setInterval(() => {
    try {
      diag("memoria", { url: urlDe(live.page), ...sampleMemory() });
    } catch {
      /* el muestreo nunca rompe la sesión */
    }
  }, 5000);

  context.on("close", () => {
    const vivioMs = Date.now() - launchedAt;
    diag("contexto-cerrado", {
      reaperturas: store.relaunchCount,
      vivioMs,
      checkpointCrashes: store.checkpointCrashes,
      ...sampleMemory(),
    });
    if (store.live?.context === context && store.live.sampler) {
      clearInterval(store.live.sampler);
    }
    if (store.live?.context === context) store.live = null;
    if (store.lastUrl?.includes("/checkpoint")) {
      store.checkpointCrashes++;
    }
    // Una sesión que duró un minuto cuenta como estable: el contador de
    // reaperturas se limpia para no agotar el tope entre días.
    if (vivioMs > 60000) store.relaunchCount = 0;
    // Cierre inesperado (Chromium se cae en el teléfono con las páginas
    // pesadas de comprobación): se reabre solo y retoma la última URL,
    // incluso a mitad de una comprobación. Backoff creciente y tope.
    if (!store.stopRequested && store.relaunchCount < 8) {
      store.relaunchCount++;
      const espera = Math.min(
        1500 * 2 ** (store.relaunchCount - 1),
        15000
      );
      setTimeout(() => {
        if (!store.stopRequested && !store.live) {
          startBrowser(false).catch(() => {});
        }
      }, espera);
    }
  });

  await live.page
    .goto(urlInicial, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    })
    .catch(() => {});

  return getBrowserStatus();
}

export async function stopBrowser(): Promise<void> {
  store.stopRequested = true;
  const live = store.live;
  store.live = null;
  if (live?.external) {
    // Navegador visible del usuario: la app solo se desconecta; la
    // ventana sigue abierta y es de él.
    await live.browser?.close().catch(() => {});
    await liberarWakeLock();
    return;
  }
  if (live) await live.context.close().catch(() => {});
  await liberarWakeLock();
}

export async function browserScreenshot(): Promise<Buffer | null> {
  if (!store.live) return null;
  const live = store.live;
  // La comprobación puede haber quedado en otra pestaña: si hay una con
  // /checkpoint, esa manda. Si la activa murió, se rehace sin cerrar el
  // contexto (cerrarlo mataba la pestaña de la verificación).
  const checkpoint = live.context
    .pages()
    .find((p) => !p.isClosed() && urlDe(p).includes("/checkpoint"));
  if (checkpoint && checkpoint !== live.page) {
    adoptarPagina(live, checkpoint);
  } else if (live.page.isClosed()) {
    void recuperarPagina(live, "captura-pagina-cerrada");
    return null;
  }
  // JPEG calidad 80: mucho más liviano que el PNG para capturar seguido en
  // un teléfono débil, y con nitidez suficiente para leer un captcha
  // (lección de Pulse OS: con calidad baja el captcha no se distinguía).
  return live.page.screenshot({ type: "jpeg", quality: 80 }).catch(() => {
    if (live.page.isClosed()) {
      void recuperarPagina(live, "captura-error");
    }
    return null;
  });
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
  const size = await pageSize();
  await page.mouse.click(fx * size.width, fy * size.height);
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

async function getCdp(): Promise<import("playwright-core").CDPSession | null> {
  if (!store.live) return null;
  if (!store.live.cdp) {
    store.live.cdp = await store.live.context.newCDPSession(store.live.page);
  }
  return store.live.cdp;
}

async function dispatchTouch(
  type: "touchStart" | "touchMove" | "touchEnd",
  x?: number,
  y?: number
): Promise<boolean> {
  const cdp = await getCdp().catch(() => null);
  if (!cdp) return false;
  try {
    await cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x: x ?? 0, y: y ?? 0, id: 1 }],
    });
    return true;
  } catch {
    if (store.live) store.live.cdp = undefined;
    return false;
  }
}

/**
 * Toque completo en UNA sola operación: apretar y soltar salen juntos
 * del servidor, sin depender de que el «soltar» del cliente llegue en
 * otra petición (con la pantalla refrescándose, ese segundo evento se
 * perdía y el clic nunca existía). Si el toque por CDP falla, cae al
 * clic de Playwright en el mismo acto.
 */
/**
 * Tamaño REAL de la página. En el navegador lanzado por la app es el
 * viewport fijado; en el navegador externo (visible) viewportSize()
 * viene vacío y hay que medir la ventana misma — asumir 412×915 ahí
 * desplazaba todos los toques (verificado: el botón grande entraba de
 * suerte y la casilla chica erraba por 45 px).
 */
async function pageSize(): Promise<{ width: number; height: number }> {
  const page = store.live?.page;
  if (!page) return VIEWPORT;
  const vs = page.viewportSize();
  if (vs) return vs;
  try {
    const size = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));
    if (size.width > 0 && size.height > 0) return size;
  } catch {
    /* página en transición: se usa el tamaño por defecto */
  }
  return VIEWPORT;
}

export async function browserTap(fx: number, fy: number): Promise<void> {
  if (!store.live) return;
  const size = await pageSize();
  const x = Math.round(fx * size.width);
  const y = Math.round(fy * size.height);
  const started = await dispatchTouch("touchStart", x, y);
  if (started) {
    await store.live.page.waitForTimeout(90);
    await dispatchTouch("touchEnd");
    await store.live.page.waitForTimeout(500);
    return;
  }
  await store.live.page.mouse.click(x, y).catch(() => {});
}

/**
 * Mantener apretado en un punto, en una sola operación (para las
 * comprobaciones de «mantené presionado»): el servidor sostiene el
 * toque la duración indicada y suelta.
 */
export async function browserHold(
  fx: number,
  fy: number,
  ms = 3500
): Promise<void> {
  if (!store.live) return;
  const size = await pageSize();
  const x = Math.round(fx * size.width);
  const y = Math.round(fy * size.height);
  const started = await dispatchTouch("touchStart", x, y);
  if (started) {
    await store.live.page.waitForTimeout(ms);
    await dispatchTouch("touchEnd");
    await store.live.page.waitForTimeout(500);
    return;
  }
  await store.live.page.mouse.move(x, y).catch(() => {});
  await store.live.page.mouse.down().catch(() => {});
  await store.live.page.waitForTimeout(ms);
  await store.live.page.mouse.up().catch(() => {});
}

// ============================================================
// Estado
// ============================================================

async function liveStatus(): Promise<BrowserStatus> {
  const checkedAt = new Date().toISOString();
  const live = store.live!;
  const { context } = live;

  // La comprobación puede vivir en otra pestaña que la activa. Se busca
  // primero ahí; si la activa se cerró, se adopta cualquier otra viva.
  const checkpointPage = context
    .pages()
    .find((p) => !p.isClosed() && urlDe(p).includes("/checkpoint"));
  let page = live.page;
  if (checkpointPage && checkpointPage !== page) {
    adoptarPagina(live, checkpointPage);
    page = checkpointPage;
  } else if (page.isClosed()) {
    const otra = context.pages().find((p) => !p.isClosed());
    if (otra) {
      adoptarPagina(live, otra);
      page = otra;
    } else {
      void recuperarPagina(live, "estado-pagina-cerrada");
      return {
        state: "no-verificable",
        detail: "Se cerró la página del navegador; la app la está rehaciendo.",
        browserAvailable: true,
        hasSavedSession: true,
        running: true,
        checkedAt,
      };
    }
  }

  const url = urlDe(page);
  const cookies = await context
    .cookies("https://www.facebook.com")
    .catch(() => []);
  const hasUserCookie = cookies.some((c) => c.name === "c_user");

  // Solo URL y cookies: leer el texto completo del cuerpo obligaba a
  // recorrer todo el DOM de la página más pesada de Facebook cada pocos
  // segundos, justo cuando el navegador del teléfono menos resto tiene.
  const checkpoint = url.includes("/checkpoint");

  if (checkpoint) {
    return {
      state: "checkpoint",
      detail:
        "Facebook pidió confirmar que sos una persona real. Resolvelo en la pantalla del navegador: si la página se cierra, la app la reabre sola en el mismo paso.",
      browserAvailable: true,
      hasSavedSession: true,
      running: true,
      checkedAt,
    };
  }

  if (hasUserCookie) {
    if (store.live === live) {
      store.checkpointCrashes = 0;
      store.relaunchCount = 0;
    }
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
    const release = await androidRelease();
    const detail =
      esAndroid() && release && store.checkpointCrashes >= 2
        ? `El navegador se cerró ${store.checkpointCrashes} veces durante la comprobación. ${avisoProcesosAndroid(release)}`
        : "Hay una sesión guardada. Abrí el navegador para usarla.";
    return {
      state: "detenido",
      detail,
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
