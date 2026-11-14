# Orquestador

Plataforma inteligente para administrar múltiples Páginas de Facebook mediante IA.

## Modalidad: 100% por navegador

> **Toda la interacción con Facebook se hace por navegador, únicamente.**
>
> La API de Meta no se usa para interactuar: no permite interactuar con perfiles y personas en general, y quedó descartada para eso. El login y la detección de Páginas son solo la cáscara; la interacción en sí es navegación.
>
> La prueba inicial es que las Páginas comenten los posts del perfil propio. El objetivo es la interacción general con cualquier perfil o persona.

## Enfoque: local primero (PC y Android)

> **Orquestador corre en el dispositivo del usuario. No se despliega en ningún servidor externo.**
>
> - **PC local**: la app y su navegador corren en la propia computadora.
> - **Android local**: la app y su navegador corren en el propio teléfono, dentro de un entorno Linux en el dispositivo.
>
> Sin Vercel, sin nube, sin paneles de variables de entorno. El navegador vive dentro de la app, en el mismo dispositivo, y la sesión de Facebook es del usuario en su aparato.
>
> Por este rumbo, el login OAuth con la App de Meta pasó a ser **opcional**: sirve para listar las Páginas por API, pero la app funciona sin él, en modo navegador. La única clave que la app necesita es la del proveedor de IA, y se configura en un archivo local (`.env.local`), nunca en un panel externo.

## Estado actual

### Etapa 1 – Completada
- Login con Facebook (OAuth)
- Detección automática de las Páginas que administrás (`/me/accounts`)
- Interfaz para ver y seleccionar Páginas (optimizada para móvil)
- Página activa + selección múltiple
- **PWA lista** para instalar (iconos 192/512 incluidos)

### Etapa 2 – Completada
- Intercambio a token de larga duración al iniciar sesión (`fb_exchange_token`)
- Renovación automática del token cuando está por vencer, sin volver a entrar

### Etapa 3 – Completada (núcleo)
- Proveedor de IA genérico compatible con OpenAI, configurable por entorno (por defecto NVIDIA NIM; sirve cualquier endpoint compatible)
- Loop de tool calling del Orquestador, con herramientas reales: `list_pages` y `browser_status`
- Chat funcional en el Dashboard (`/api/chat`), con el contexto de las Páginas seleccionadas

### Etapa 4 – En progreso
- Módulo de navegador con sesión persistente en el dispositivo y estados verificables (conectado / login / checkpoint / sin sesión)
- Tarjeta **Navegador** en el Dashboard y detección de checkpoints (detalle en [docs/NAVEGADOR.md](docs/NAVEGADOR.md))
- Falta: las acciones de interacción en sí (comentar, reaccionar) sobre esa sesión

### Etapa 5 – Cambio de rumbo: local primero
- Documentación reorientada a PC local y Android local (guías nuevas); la guía de Vercel quedó en desuso
- OAuth opcional: sin variables de Facebook la app arranca en modo navegador
- Scripts de instalación y arranque para Android en el dispositivo

## Stack

- **Next.js 15** (App Router) + TypeScript
- **NextAuth.js** (Facebook Provider)
- **Zustand** (estado de Páginas)
- **Tailwind CSS**
- **PWA** (manifest + service worker)
- Graph API de Meta

## Usarlo local (la forma de uso)

### En una PC

Guía completa: **[docs/LOCAL-PC.md](docs/LOCAL-PC.md)**

Resumen:
1. Cloná el repo e instalá dependencias (`npm install`)
2. (Opcional) Creá `.env.local` con la clave de tu proveedor de IA
3. `npm run build && npm run start`
4. Abrí `http://localhost:3000` en tu navegador

### En un teléfono Android

Guía completa: **[docs/LOCAL-ANDROID.md](docs/LOCAL-ANDROID.md)**

La app corre dentro del teléfono (Termux, todo nativo de Android: su Node.js y su Chromium) y se usa desde el navegador del mismo teléfono, en `http://localhost:3000`. Hay scripts de instalación y arranque en `scripts/android/`.

### PWA en el teléfono

Con la app corriendo local en el teléfono:

1. Abrí `http://localhost:3000` en **Chrome**
2. Menú (⋮) → **Instalar aplicación** / **Agregar a la pantalla de inicio**
3. Se abre a pantalla completa como una app nativa

> **Iconos**: `icon-192.png` e `icon-512.png` generados desde el SVG base (`public/icons/icon.svg`).

### Vercel (en desuso)

La guía [docs/DESPLIEGUE-VERCEL.md](docs/DESPLIEGUE-VERCEL.md) quedó como referencia histórica: el proyecto ya no se despliega en servidores externos. Un navegador con sesión persistente no puede vivir en funciones efímeras, y el diseño del proyecto es local.

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
- **Etapa 5 (resto)**: Probar la instalación de Android en un teléfono real y pulir el arranque
- **Etapa 6+**: Más herramientas de interacción, historial, tareas

## Notas importantes

- El login OAuth y el listado de Páginas por API son **opcionales**: sin las variables de Facebook, la app arranca en modo navegador.
- Los **Page Access Tokens** nunca se envían al cliente.
- La sesión del navegador (Facebook) vive solo en el dispositivo del usuario, en `.data/` (nunca se commitea).
- En modo Desarrollo de la App de Meta (si se usa OAuth) solo funcionan con tu cuenta y las Páginas que administrás.

---

Hecho con ❤️ para centralizar la administración de Páginas.