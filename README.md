# Orquestador

Plataforma inteligente para administrar múltiples Páginas de Facebook mediante IA.

## Estado actual

### Etapa 1 – Completada
- Login con Facebook (OAuth)
- Detección automática de las Páginas que administrás (`/me/accounts`)
- Interfaz para ver y seleccionar Páginas (optimizada para móvil)
- Página activa + selección múltiple
- **PWA lista** para instalar en Android / iOS

### Etapa 3 – En progreso
- Arquitectura del Orquestador LLM
- Sistema multi-provider con fallback
- Tipos y esqueleto listos

## Stack

- **Next.js 15** (App Router) + TypeScript
- **NextAuth.js** (Facebook Provider)
- **Zustand** (estado de Páginas)
- **Tailwind CSS**
- **PWA** (manifest + service worker)
- Graph API de Meta

## Desplegar en Vercel (recomendado)

Guía completa paso a paso (se puede hacer desde el teléfono):

**→ [docs/DESPLIEGUE-VERCEL.md](docs/DESPLIEGUE-VERCEL.md)**

Resumen rápido:
1. Importá el repo en [vercel.com](https://vercel.com)
2. Configurá las variables de entorno (`FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, `NEXTAUTH_SECRET`)
3. Deploy
4. Agregá la URL de Vercel como Redirect URI en Facebook Login
5. Abrí la URL en Chrome del teléfono → Instalar aplicación

## Desarrollo local

```bash
git clone https://github.com/enrrutador/orquestador.git
cd orquestador
npm install
cp .env.example .env.local
# completar variables
npm run dev
```

## Usar como PWA en Android

1. Desplegá en Vercel
2. Abrí la URL en **Chrome** del teléfono
3. Menú (⋮) → **Instalar aplicación** / **Agregar a la pantalla de inicio**
4. Se abre a pantalla completa como una app nativa

> **Iconos**: Todavía falta generar `icon-192.png` y `icon-512.png`. El SVG base está en `public/icons/icon.svg`.

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   └── pages/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Dashboard.tsx
│   ├── PageCard.tsx
│   ├── Providers.tsx
│   └── PWARegister.tsx
├── lib/
│   ├── auth.ts
│   ├── facebook.ts
│   └── llm/                    # Orquestador (en construcción)
└── store/
    └── pages-store.ts

public/
├── manifest.json
├── sw.js
└── icons/
```

## Próximas etapas

- **Etapa 2**: Tokens long-lived + más info de Páginas
- **Etapa 3**: Orquestador LLM + múltiples proveedores de IA + chat
- **Etapa 4**: Navegador asistido
- **Etapa 5+**: Herramientas de interacción, historial, tareas

## Notas importantes

- Los **Page Access Tokens** nunca se envían al cliente.
- En modo Desarrollo de la App de Meta solo funcionan con tu cuenta y las Páginas que administrás.
- `pages_show_list` normalmente no requiere App Review para uso personal.

---

Hecho con ❤️ para centralizar la administración de Páginas.