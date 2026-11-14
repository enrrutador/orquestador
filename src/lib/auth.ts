import { NextAuthOptions } from "next-auth";
import FacebookProvider from "next-auth/providers/facebook";

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v21.0";
/** Margen para renovar el token antes de que venza (7 días, en segundos). */
const REFRESH_MARGIN_SECS = 7 * 24 * 60 * 60;

/**
 * Etapa 2 — Intercambia un token de usuario de vida corta (~2 h) por uno
 * de larga duración (~60 días) usando las credenciales de la App de Meta.
 * Si el intercambio falla, devuelve el token original: el login no se rompe.
 */
async function exchangeLongLivedToken(
  shortToken: string
): Promise<{ accessToken: string; expiresAt?: number }> {
  try {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: process.env.FACEBOOK_CLIENT_ID || "",
      client_secret: process.env.FACEBOOK_CLIENT_SECRET || "",
      fb_exchange_token: shortToken,
    });
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${params}`
    );
    if (!res.ok) return { accessToken: shortToken };
    const data = await res.json();
    if (!data.access_token) return { accessToken: shortToken };
    return {
      accessToken: data.access_token,
      expiresAt: data.expires_in
        ? Math.floor(Date.now() / 1000) + data.expires_in
        : undefined,
    };
  } catch {
    return { accessToken: shortToken };
  }
}

/**
 * El login OAuth es OPCIONAL (enfoque local primero): solo se activa si la
 * App de Meta está configurada en el entorno. Sin esas variables la app
 * arranca en modo navegador y el resto de las funciones sigue andando.
 */
export function isOAuthConfigured(): boolean {
  return Boolean(
    process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
  );
}

export const authOptions: NextAuthOptions = {
  providers: isOAuthConfigured()
    ? [
        FacebookProvider({
          clientId: process.env.FACEBOOK_CLIENT_ID!,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
          authorization: {
            params: {
              scope:
                "pages_show_list,pages_read_engagement,public_profile,email",
            },
          },
        }),
      ]
    : [],
  callbacks: {
    async jwt({ token, account }) {
      // Login: guardamos el token ya intercambiado a larga duración.
      if (account?.access_token) {
        const long = await exchangeLongLivedToken(account.access_token);
        token.accessToken = long.accessToken;
        token.expiresAt = long.expiresAt ?? account.expires_at;
        return token;
      }
      // Sesiones siguientes: si el token está por vencer, se renueva solo
      // con otro intercambio, sin que el usuario tenga que volver a entrar.
      if (
        token.accessToken &&
        token.expiresAt &&
        token.expiresAt - Math.floor(Date.now() / 1000) < REFRESH_MARGIN_SECS
      ) {
        const renewed = await exchangeLongLivedToken(token.accessToken);
        if (renewed.accessToken !== token.accessToken) {
          token.accessToken = renewed.accessToken;
          token.expiresAt = renewed.expiresAt ?? token.expiresAt;
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Exponemos el accessToken al cliente (solo lo necesario)
      session.accessToken = token.accessToken as string;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  // En modo local puro (sin OAuth configurado) no hay login real que
  // proteger: la sesión es solo del dispositivo. Sin un secreto de
  // respaldo, NextAuth rompe en producción (NO_SECRET) aunque el modo
  // local no lo use. Con OAuth configurado, el secreto real es obligatorio.
  secret:
    process.env.NEXTAUTH_SECRET ||
    (isOAuthConfigured() ? undefined : "orquestador-modo-local"),
};

// Extensiones de tipos para TypeScript
declare module "next-auth" {
  interface Session {
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    expiresAt?: number;
  }
}