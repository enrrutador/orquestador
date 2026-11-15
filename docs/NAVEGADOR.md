# El navegador de Orquestador

La modalidad de la plataforma es **100% por navegador**: la interacción con
Facebook se hace navegando, como la haría una persona. La API de Meta solo
se usa para el login de la app y para listar las Páginas.

## Dónde vive el navegador

El navegador vive **en el mismo dispositivo que la app**, porque el diseño
del proyecto es local primero:

- ✅ **PC local**: el Chromium/Chrome de la propia computadora.
- ✅ **Android local**: un Chromium dentro del entorno Debian del teléfono
  (ver [LOCAL-ANDROID.md](LOCAL-ANDROID.md)).
- ❌ Servidores externos y serverless (Vercel y similares): fuera del diseño.
  Las funciones efímeras no pueden sostener un navegador con sesión
  persistente; ahí el estado del navegador se reporta como
  **«no verificable»**.

## Cómo se crea la sesión (una sola vez)

Desde la tarjeta **Navegador** del Dashboard, con **Abrir navegador**. El
dueño de la cuenta inicia sesión a mano sobre la captura en vivo: contraseña,
códigos y cualquier verificación los resuelve él, nunca la plataforma. El
perfil queda guardado en `.data/browser-profile/` (o en
`BROWSER_PROFILE_DIR`) y la sesión sobrevive a reinicios.

En una PC con pantalla también se puede usar:

```bash
node scripts/browser-login.mjs
```

Ese script abre una ventana de Chromium **con el mismo perfil persistente de
la app** y cierra solo cuando detecta la sesión fuera de una comprobación. En
Android/Termux sin X11 no sirve: ahí el login se hace desde el panel.

El perfil y `.data/browser-state.json` son credenciales: no se commitean
(están en `.gitignore` vía `.data/`) y no salen del dispositivo.

## Si Facebook pide verificar que sos una persona

La app **no resuelve** la comprobación: la muestra en el panel para que la
resuelva el dueño. Lo que sí hace es sostenerla:

- Sigue la pestaña o ventana nueva donde Facebook abra la verificación.
- Si el render de esa página se cae, rehace la página y vuelve a la misma
  URL (incluido `/checkpoint`) en vez de cerrar todo el navegador.
- Si Chromium se cierra entero, lo relanza solo con backoff y retoma la
  última URL. Tras una sesión estable, el contador de reintentos se limpia.

En Android el navegador arranca con el **modo suave** y el **aislamiento de
sitio desactivado** para que el iframe cruzado de la verificación no estrene
un proceso que Android pueda matar. Se pueden apagar con `BROWSER_SUAVE=0`
y `BROWSER_SIN_AISLAMIENTO=0`.

## Estados que reconoce la plataforma

| Estado | Qué significa |
|---|---|
| `conectado` | La sesión guardada está activa. |
| `login-requerido` | La sesión venció o se cerró; hay que repetir el login. |
| `checkpoint` | Facebook frenó la cuenta («confirmá que sos una persona real»). Lo resuelve el dueño en el panel; la app mantiene y reabre esa página, pero no la resuelve. |
| `sin-sesion` | Todavía no se hizo el login en este dispositivo. |
| `no-verificable` | En este entorno no hay navegador para comprobar la sesión. |

El estado se ve en la tarjeta **Navegador** del Dashboard y el Orquestador
lo consulta con su herramienta `browser_status`.

## Variables de entorno

| Variable | Para qué |
|---|---|
| `BROWSER_EXECUTABLE_PATH` | Ruta al Chromium/Chrome del dispositivo (opcional si está en una ruta común). |
| `BROWSER_PROFILE_DIR` | Perfil persistente del navegador (default `.data/browser-profile`). |
| `BROWSER_STATE_PATH` | Copia de `storageState` que guarda el script de login (default `.data/browser-state.json`). La app usa el perfil persistente. |
| `BROWSER_CDP_URL` | Alternativa: conectarse a un Chromium ya abierto por CDP. |
| `BROWSER_SUAVE` | `1` achica el modelo de procesos (sin zygote, un renderizador, GPU en proceso principal). Por defecto `1` en Android; `0` lo apaga. |
| `BROWSER_SIN_AISLAMIENTO` | `1` desactiva el aislamiento de sitio. Por defecto `1` en Android; `0` lo apaga. |
| `BROWSER_JITLESS` | `1` corre JavaScript sin JIT (más lento, evita memoria ejecutable RWX). |
| `BROWSER_LOW_MEMORY` | `1` fuerza un solo proceso con heap acotado (resultó peor en el teléfono; queda para probar). |
| `BROWSER_URL_INICIAL` | Fuerza la URL del primer arranque (default: última URL o `https://www.facebook.com/`). |
| `BROWSER_DEBUG` | `1` vuelca la vida del proceso de Chromium y escribe `.data/chromium.log`. |
