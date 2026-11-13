/**
 * Gestor de Facebook - Etapa 1
 * Responsable de obtener las Páginas administradas por el usuario.
 */

export interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  access_token: string;
  tasks?: string[];
  picture?: {
    data: {
      url: string;
      width?: number;
      height?: number;
    };
  };
}

export interface PagesResponse {
  data: FacebookPage[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
}

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";

/**
 * Obtiene todas las Páginas que el usuario administra.
 * Usa el endpoint oficial /me/accounts
 */
export async function getManagedPages(
  accessToken: string
): Promise<FacebookPage[]> {
  const fields = [
    "id",
    "name",
    "category",
    "access_token",
    "tasks",
    "picture.type(large)",
  ].join(",");

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=${fields}&access_token=${accessToken}&limit=100`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    // Cache corto para no saturar la API en desarrollo
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error("[Facebook] Error al obtener Páginas:", error);
    throw new Error(
      error?.error?.message || `Error ${res.status} al obtener Páginas`
    );
  }

  const data: PagesResponse = await res.json();
  return data.data || [];
}