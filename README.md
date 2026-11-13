# Orquestador

Plataforma inteligente para administrar múltiples Páginas de Facebook mediante IA.

## Estado actual – Etapa 1

✅ **Completado**

- Login con Facebook (OAuth)
- Detección automática de las Páginas que administrás (`/me/accounts`)
- Interfaz para ver y seleccionar Páginas
- Página activa + selección múltiple
- Arquitectura modular lista para crecer

## Stack

- **Next.js 15** (App Router) + TypeScript
- **NextAuth.js** (Facebook Provider)
- **Zustand** (estado de Páginas)
- **Tailwind CSS**
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

## Estructura del proyecto

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth
│   │   └── pages/                # Endpoint seguro de Páginas
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Dashboard.tsx             # Pantalla principal
│   ├── PageCard.tsx              # Card de cada Página
│   └── Providers.tsx
├── lib/
│   ├── auth.ts                   # Configuración NextAuth + Facebook
│   └── facebook.ts               # Gestor de Páginas (Graph API)
└── store/
    └── pages-store.ts            # Estado de selección (Zustand)
```

## Próximas etapas

- **Etapa 2**: Mejoras de UI + tokens long-lived + más info de Páginas
- **Etapa 3**: Orquestador LLM + múltiples proveedores de IA
- **Etapa 4**: Navegador asistido
- **Etapa 5+**: Herramientas de interacción, historial, tareas

## Notas importantes

- Los **Page Access Tokens** nunca se envían al cliente.
- En modo Desarrollo de la App de Meta solo funcionan con tu cuenta y las Páginas que administrás.
- `pages_show_list` normalmente no requiere App Review para uso personal.

---

Hecho con ❤️ para centralizar la administración de Páginas.