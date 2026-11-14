import type { Locator, Page } from "playwright-core";
import { getLivePage, isBrowserRunning, startBrowser } from "./session";

/**
 * EL EJECUTOR — el proceso de comentar como una Página, hecho código.
 *
 * Replica paso a paso el proceso manual verificado:
 *   1. Abrir el post.
 *   2. Encontrar el cuadro de comentarios.
 *   3. Cambiar la identidad a la Página indicada y CONFIRMAR el cambio
 *      antes de escribir (si la identidad no se confirma, se aborta:
 *      un comentario con la identidad equivocada es peor que ninguno).
 *   4. Escribir el texto y enviarlo.
 *   5. Verificar en el post que el comentario quedó con la Página como
 *      autora. Sin verificación no se reporta éxito.
 *
 * La sesión de Facebook se inicia a mano en la pantalla del navegador
 * (tarjeta del navegador); el ejecutor solo trabaja con la sesión viva.
 */

export interface ResultadoEjecucion {
  ok: boolean;
  paso?:
    | "sesion"
    | "navegacion"
    | "comentario"
    | "identidad"
    | "envio"
    | "verificacion";
  detalle: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

async function visible(locator: Locator, timeout = 6000): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

/** El cuadro de comentarios (etiquetas en español o inglés). */
async function buscarCuadro(page: Page): Promise<Locator | null> {
  const candidatos = [
    page.locator('[contenteditable="true"][aria-label*="comentario" i]'),
    page.locator('[contenteditable="true"][aria-label*="comment" i]'),
    page.getByRole("textbox", { name: /comentario|comment/i }),
    page.locator('[contenteditable="true"][role="textbox"]'),
  ];
  for (const c of candidatos) {
    if (await visible(c, 5000)) return c.first();
  }
  return null;
}

/**
 * El botón de identidad del compositor: el avatar que está junto al
 * cuadro y dice como quién se comenta. Se busca dentro del contenedor
 * del cuadro (primer botón con imagen o con nombre de identidad).
 */
async function botonIdentidad(
  page: Page,
  cuadro: Locator
): Promise<Locator | null> {
  // Atajo: botón rotulado «cambiar de cuenta» (algunas vistas lo traen).
  const rotulado = page.locator(
    '[aria-label*="cambiar de cuenta" i], [aria-label*="switch" i]'
  );
  if (await visible(rotulado, 1200)) return rotulado.first();

  const contenedor = cuadro.locator(
    "xpath=ancestor::*[.//*[@role='button']][1]"
  );
  const botones = contenedor.locator('[role="button"]');
  const cantidad = await botones.count().catch(() => 0);
  for (let i = 0; i < Math.min(cantidad, 6); i++) {
    const b = botones.nth(i);
    const tieneImg = (await b.locator("img").count().catch(() => 0)) > 0;
    if (tieneImg) return b;
  }
  return cantidad > 0 ? botones.first() : null;
}

/** Nombre de la identidad actual según el botón (aria-label o alt). */
async function identidadActual(boton: Locator): Promise<string> {
  const label = (await boton.getAttribute("aria-label").catch(() => null)) || "";
  const alt =
    (await boton
      .locator("img")
      .first()
      .getAttribute("alt")
      .catch(() => null)) || "";
  return `${label} ${alt}`;
}

/** Cambia la identidad a la Página y confirma el cambio. */
async function cambiarIdentidad(
  page: Page,
  cuadro: Locator,
  pagina: string
): Promise<{ ok: boolean; detalle: string }> {
  const boton = await botonIdentidad(page, cuadro);
  if (!boton) {
    return {
      ok: false,
      detalle: "No se encontró el selector de identidad del comentario.",
    };
  }

  const actual = await identidadActual(boton);
  if (norm(actual).includes(norm(pagina))) {
    return { ok: true, detalle: `Ya se comentaba como «${pagina}».` };
  }

  await boton.click();
  await page.waitForTimeout(1200);

  // El menú de identidades: se busca la entrada con el nombre de la Página.
  const menu = page
    .locator('[role="menu"], [role="dialog"], [role="listbox"]')
    .last();
  const entrada = menu.getByText(pagina, { exact: false }).first();
  if (!(await visible(entrada, 4000))) {
    await page.keyboard.press("Escape").catch(() => {});
    return {
      ok: false,
      detalle: `«${pagina}» no apareció en el selector de identidad.`,
    };
  }
  await entrada.click();
  await page.waitForTimeout(1200);

  const nueva = await identidadActual(boton);
  if (!norm(nueva).includes(norm(pagina))) {
    return {
      ok: false,
      detalle: `El cambio a «${pagina}» no se pudo confirmar (el selector muestra «${nueva.trim()}»).`,
    };
  }
  return { ok: true, detalle: `Identidad confirmada: «${pagina}».` };
}

/**
 * Verifica que el comentario exista con la Página como autora.
 * El artículo del post contiene a todos los comentarios, así que se
 * busca el artículo MÁS CORTO que nombre a la Página y traiga el texto.
 */
async function verificarComentario(
  page: Page,
  pagina: string,
  texto: string
): Promise<boolean> {
  const fragmento = norm(texto).slice(0, 40);
  const articulos = page.locator('div[role="article"]');
  const cantidad = await articulos.count().catch(() => 0);
  let mejor = Infinity;
  for (let i = 0; i < cantidad; i++) {
    const txt = await articulos
      .nth(i)
      .innerText()
      .catch(() => "");
    const n = norm(txt);
    if (n.includes(norm(pagina)) && n.includes(fragmento)) {
      if (txt.length < mejor) mejor = txt.length;
    }
  }
  return mejor !== Infinity && mejor < 1500;
}

export async function comentarComoPagina(input: {
  postUrl: string;
  pagina: string;
  texto: string;
}): Promise<ResultadoEjecucion> {
  const { postUrl, pagina, texto } = input;

  if (!isBrowserRunning()) {
    await startBrowser(false);
  }
  const page = getLivePage();
  if (!page) {
    return {
      ok: false,
      paso: "sesion",
      detalle:
        "El navegador de la app no está abierto. Abrilo desde la tarjeta del navegador.",
    };
  }

  // 1) Abrir el post
  try {
    await page.goto(postUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
  } catch {
    return {
      ok: false,
      paso: "navegacion",
      detalle: "El post no cargó (¿el enlace es válido?).",
    };
  }
  await page.waitForTimeout(2800);
  if (page.url().includes("/checkpoint")) {
    return {
      ok: false,
      paso: "navegacion",
      detalle:
        "Facebook frenó en una comprobación de seguridad. Resolvela en la pantalla del navegador y volvé a intentar.",
    };
  }

  // 2) Cuadro de comentarios
  const cuadro = await buscarCuadro(page);
  if (!cuadro) {
    return {
      ok: false,
      paso: "comentario",
      detalle:
        "No se encontró el cuadro de comentarios. Lo más probable: la sesión no está iniciada en el navegador de la app, o el post no permite comentar.",
    };
  }
  await cuadro.scrollIntoViewIfNeeded().catch(() => {});
  await cuadro.click();
  await page.waitForTimeout(600);

  // 3) Identidad confirmada o nada
  const identidad = await cambiarIdentidad(page, cuadro, pagina);
  if (!identidad.ok) {
    return { ok: false, paso: "identidad", detalle: identidad.detalle };
  }

  // 4) Escribir y enviar
  await cuadro.click();
  await page.keyboard.type(texto, { delay: 30 });
  await page.waitForTimeout(500);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(3000);

  // 5) Verificar (con un reintento por el botón de enviar, si existe)
  if (!(await verificarComentario(page, pagina, texto))) {
    const enviar = page
      .locator(
        '[aria-label*="comentar" i][role="button"], [aria-label*="publicar" i][role="button"], [aria-label*="send" i][role="button"]'
      )
      .first();
    if (await visible(enviar, 1500)) {
      await enviar.click().catch(() => {});
      await page.waitForTimeout(3000);
    }
  }
  if (!(await verificarComentario(page, pagina, texto))) {
    return {
      ok: false,
      paso: "verificacion",
      detalle:
        "El comentario no apareció en el post con la Página como autora; no se da por publicado.",
    };
  }

  return {
    ok: true,
    detalle: `Comentario publicado como «${pagina}» y verificado en el post.`,
  };
}
