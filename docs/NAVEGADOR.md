# El navegador de Orquestador

La modalidad de la plataforma es **100% por navegador**: la interacción con
Facebook se hace navegando, como la haría una persona. La API de Meta solo
se usa para el login de la app y para listar las Páginas.

## Dónde puede vivir el navegador

El navegador necesita un proceso de servidor **vivo y persistente**, con un
Chromium instalado y un disco donde guardar la sesión:

- ✅ Una computadora, una VM, un entorno tipo Kaggle.
- ❌ Vercel y otros serverless: las funciones nacen y mueren por pedido, no
  hay disco persistente ni navegador disponible. Ahí la app sigue andando
  (login, Páginas, chat con el Orquestador), pero el estado del navegador
  se reporta como **«no verificable»**.

## Cómo se crea la sesión (una sola vez)

En el servidor donde vive la app:

```bash
node scripts/browser-login.mjs
```

Se abre un Chromium en Facebook y **el dueño de la cuenta inicia sesión a
mano**: contraseña, códigos y cualquier verificación los resuelve él, nunca
la plataforma. Al detectar la sesión, el estado queda guardado en
`.data/browser-state.json` (o en la ruta de `BROWSER_STATE_PATH`).

Ese archivo es una credencial: no se commitea (está en `.gitignore` vía
`.data/`) y no sale del servidor.

## Estados que reconoce la plataforma

| Estado | Qué significa |
|---|---|
| `conectado` | La sesión guardada está activa. |
| `login-requerido` | La sesión venció o se cerró; hay que repetir el login. |
| `checkpoint` | Facebook frenó la cuenta («confirmá que sos una persona real»). Lo resuelve el dueño desde Facebook; la plataforma no toca nada ni reintenta. |
| `sin-sesion` | Todavía no se hizo el login en este servidor. |
| `no-verificable` | En este entorno no hay navegador para comprobar la sesión. |

El estado se ve en la tarjeta **Navegador** del Dashboard y el Orquestador
lo consulta con su herramienta `browser_status`.

## Variables de entorno

| Variable | Para qué |
|---|---|
| `BROWSER_EXECUTABLE_PATH` | Ruta al Chromium/Chrome del servidor (opcional si está en una ruta común). |
| `BROWSER_STATE_PATH` | Dónde guardar la sesión (default `.data/browser-state.json`). |
| `BROWSER_CDP_URL` | Alternativa: conectarse a un Chromium ya abierto por CDP. |
