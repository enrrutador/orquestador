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

## Cómo arrancar

### 1. Clonar e instalar

```bash
git clone https://github.com/enrrutador/orquestador.git
cd orquestador
npm install
```

### 2. Crear la App en Meta Developers

1. Andá a [developers.facebook.com](https://developers.facebook.com)
2. Creá una nueva App → tipo **Business** o **Consumer**
3. Agregá el producto **Facebook Login**
4. En **Facebook Login → Settings**:
   - Valid OAuth Redirect URIs:
     - `http://localhost:3000/api/auth/callback/facebook`
     - (más adelante tu dominio de producción)
5. En **App Review → Permissions and Features** agregá:
   - `pages_show_list`
   - `pages_read_engagement` (recomendado)
6. Anotá el **App ID** y el **App Secret**

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

Completá:

```env
FACEBOOK_CLIENT_ID=tu_app_id
FACEBOOK_CLIENT_SECRET=tu_app_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=  # generá uno con: openssl rand -base64 32
```

### 4. Correr en desarrollo

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000)

## Usar como PWA en Android

1. Desplegá la app (Vercel es ideal)
2. Abrila en **Chrome** desde el teléfono
3. Tocá el menú (⋮) → **"Instalar aplicación"** o **"Agregar a la pantalla de inicio"**
4. Listo. Se abre a pantalla completa como una app nativa

> **Nota sobre iconos**: Actualmente hay un icono SVG. Para que Android muestre el ícono correctamente en la pantalla de inicio, generá dos PNG:
> - `public/icons/icon-192.png` (192×192)
> - `public/icons/icon-512.png` (512×512)
>
> Podés usar el SVG de `public/icons/icon.svg` como base.

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
│       ├── types.ts
│       ├── index.ts
│       └── providers/
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