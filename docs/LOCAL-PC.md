# Orquestador en una PC local

La forma principal de uso: la app corre en tu propia computadora, con su
navegador en la misma máquina. Nada se despliega en servidores externos.

## Requisitos

- **Node.js 20 o más nuevo** (https://nodejs.org)
- **Git**
- **Google Chrome o Chromium** instalado (lo usa el navegador de la app)
- Una clave de un proveedor de IA para el Orquestador (por ejemplo NVIDIA
  NIM; cualquier endpoint compatible con OpenAI sirve)

## Instalación (una sola vez)

```bash
git clone https://github.com/enrrutador/orquestador.git
cd orquestador
npm install
```

## Configuración (archivo local, nada de paneles)

Copiá `.env.example` como `.env.local` y completá solo lo que uses:

- **Proveedor de IA** (para el chat del Orquestador):
  `LLM_API_KEY` (o `NVIDIA_API_KEY`), `LLM_BASE_URL`, `LLM_MODEL`.
- **OAuth de Facebook** (opcional): `FACEBOOK_CLIENT_ID`,
  `FACEBOOK_CLIENT_SECRET`, `NEXTAUTH_SECRET`. Solo hace falta si querés
  listar tus Páginas por API. **Sin estas variables la app arranca igual,
  en modo navegador.**

## Uso diario

```bash
npm run build   # solo la primera vez, o cuando actualices el código
npm run start
```

Abrí **http://localhost:3000** en tu navegador.

## La sesión de Facebook del navegador (una sola vez)

```bash
node scripts/browser-login.mjs
```

Se abre un Chrome en Facebook: iniciás sesión **a mano** (contraseña,
códigos y verificaciones los resolvés vos). La sesión queda guardada en
`.data/browser-state.json`, en tu computadora, y el Dashboard la muestra
en la tarjeta **Navegador**. Detalle: [NAVEGADOR.md](NAVEGADOR.md).

## Actualizar

```bash
git pull
npm install
npm run build
```
