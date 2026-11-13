# Orquestador

Plataforma inteligente para administrar múltiples Páginas de Facebook mediante IA.

## Modalidad: 100% por navegador

> **Toda la interacción con Facebook se hace por navegador, únicamente.**
>
> La API de Meta no se usa para interactuar: no permite interactuar con perfiles y personas en general, y quedó descartada para eso. El login y la detección de Páginas son solo la cáscara; la interacción en sí es navegación.
>
> La prueba inicial es que las Páginas comenten los posts del perfil propio. El objetivo es la interacción general con cualquier perfil o persona.

## Estado actual

### Etapa 1 – Completada
- Login con Facebook (OAuth)
- Detección automática de las Páginas que administrás (`/me/accounts`)
- Interfaz para ver y seleccionar Páginas (optimizada para móvil)
- Página activa + selección múltiple
- **PWA lista** para instalar en Android / iOS (iconos 192/512 incluidos)

### Etapa 2 – Completada
- Intercambio a token de larga duración al iniciar sesión (`fb_exchange_token`)
- Renovación automática del token cuando está por vencer, sin volver a entrar

### Etapa 3 – Completada (núcleo)
- Proveedor de IA genérico compatible con OpenAI, configurable por entorno (por defecto NVIDIA NIM; sirve cualquier endpoint compatible)
- Loop de tool calling del Orquestador, con herramientas reales: `list_pages` y `browser_status`
- Chat funcional en el Dashboard (`/api/chat`), con el contexto de las Páginas seleccionadas

### Etapa 4 – En progreso
- Módulo de navegador con sesión persistente en el servidor y estados verificables (conectado / login / checkpoint / sin sesión)
- Tarjeta **Navegador** en el Dashboard y detección de checkpoints (detalle en [docs/NAVEGADOR.md](docs/NAVEGADOR.md))
- Falta: las acciones de interacción en sí (comentar, reaccionar) sobre esa sesión

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

> **Iconos**: `icon-192.png` e `icon-512.png` generados desde el SVG base (`public/icons/icon.svg`).

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/
│   │   ├── browser/status/
│   │   ├── chat/
│   │   └── pages/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Dashboard.tsx
│   ├── PageCard.tsx
│   ├── BrowserCard.tsx
│   ├── Chat.tsx
│   ├── Providers.tsx
│   └── PWARegister.tsx
├── lib/
│   ├── auth.ts
│   ├── facebook.ts
│   ├── browser/                # Sesión del navegador (modalidad 100% navegador)
│   └── llm/                    # Orquestador, providers y herramientas
└── store/
    └── pages-store.ts

public/
├── manifest.json
├── sw.js
└── icons/
```

## Próximas etapas

- **Etapa 4 (resto)**: Acciones de interacción del navegador (la prueba: que las Páginas comenten los posts del perfil propio)
- **Etapa 5+**: Más herramientas de interacción, historial, tareas

## Notas importantes

- Los **Page Access Tokens** nunca se envían al cliente.
- En modo Desarrollo de la App de Meta solo funcionan con tu cuenta y las Páginas que administrás.
- `pages_show_list` normalmente no requiere App Review para uso personal.

---

Hecho con ❤️ para centralizar la administración de Páginas.