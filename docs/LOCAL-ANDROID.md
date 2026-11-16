# Orquestador en un teléfono Android (local)

La app corre **dentro del teléfono**, sin servidores externos y sin
entornos emulados: Termux levanta la app y su navegador, todo nativo de
Android, y la usás desde el navegador del mismo teléfono.

## Cómo está armado

```
Teléfono Android
└── Termux (todo nativo, compilado para Android)
    ├── Node.js → la app en http://localhost:3000
    └── Chromium → el navegador de la plataforma
```

Todo vive en el teléfono: el código, la sesión de Facebook y los datos.

**Por qué no un Linux interno (Debian/proot):** en teléfonos ARM de
32 bits, el motor JavaScript (V8) muere al ejecutar cualquier código
dentro de proot — probado con el Node de Debian y con el Node oficial.
La ruta nativa de Termux no tiene ese problema y quedó verificada de
punta a punta en un teléfono ARM de 32 bits (Node 26 + Chromium 157).

## Requisitos

- Un teléfono Android con espacio libre (la primera instalación descarga
  varios cientos de MB entre Node, Chromium y las dependencias).
- **Termux** instalado desde F-Droid o desde el GitHub de Termux
  (la versión de Play Store está abandonada, no sirve).
- Conexión Wi-Fi para la primera instalación.

## Instalación (una sola vez)

En Termux, **pegá los comandos de a uno** y esperá que cada uno termine
antes de pegar el siguiente (pegar bloques enteros puede mezclar los
comandos en la terminal):

```bash
pkg install -y git
git clone https://github.com/enrrutador/orquestador.git
cd orquestador
bash scripts/android/instalar.sh
```

El script instala el Node.js de Termux y el Chromium del repo gráfico
(x11) de Termux, instala las dependencias del proyecto y deja creada la
configuración inicial.

Notas de la instalación:

- Si Termux avisa que no tiene espejo de descarga elegido, el propio
  `pkg` prueba los espejos y elige uno automáticamente; dejalo correr.
- El ejecutable de Chromium se llama **`chromium-browser`** (no
  `chromium`); la app ya lo busca con ese nombre.
- El script instala `termux-api`, pero el wake lock necesita además la app
  **Termux:API** desde F-Droid (misma firma que Termux). Sin ella, Android
  puede cerrar el navegador durante la verificación.
- La compilación de la app (`npm run build`) usa el compilador SWC en
  WASM (`@next/swc-wasm-nodejs`, ya incluido en el proyecto): el SWC
  nativo para Android ARM no se publica desde Next 13. Es más lento que
  el nativo, pero compila: ~84 s en un ARM de 32 bits.

Configuración: en la carpeta del proyecto, cargá tu clave del proveedor
de IA en `.env.local` (ver `.env.example`). Las variables de Facebook
**no hacen falta**: el modo principal es el navegador.

## Uso diario

En Termux:

```bash
cd ~/orquestador
bash scripts/android/iniciar.sh
```

Eso mantiene el teléfono despierto para la app y la levanta. Después
abrí el **navegador** del mismo teléfono y entrá a
`http://localhost:3000`. Desde el menú (⋮) podés **Instalar aplicación**
para tenerla como una app más.

## La sesión de Facebook (una sola vez)

El navegador de la plataforma necesita que inicies sesión una vez dentro
de su Chromium. Como en el teléfono ese Chromium no tiene pantalla propia
usable, el login se hace desde la tarjeta **Navegador** del Dashboard: la
captura en vivo muestra la página y tus toques/texto se reenvían al
navegador interno. Ahí resolvés contraseña, códigos y la verificación de
Facebook. La sesión queda guardada en `.data/browser-profile/`, en el
teléfono, y sobrevive a reinicios.

Si Facebook pide verificar que sos una persona, la app mantiene esa página
abierta y la reabre en el mismo paso si el render se cae. En Android 12+ el
navegador arranca en modo suave y, en todo Android, sin aislamiento de sitio,
justamente para que esa verificación no levante un proceso que Android mate.
Detalles en [NAVEGADOR.md](NAVEGADOR.md).

El script `scripts/browser-login.mjs` abre una ventana real: en Android
necesita X11 (Termux:X11) y no es necesario para el uso normal.

## Si Android cierra el navegador en la verificación

Esto aplica a **Android 12 o posterior**, que tiene un **phantom process
killer**: cuando Termux queda en segundo plano (por ejemplo, mientras mirás
el panel desde Chrome), el sistema mata los procesos hijos que consumen CPU.
La verificación de Facebook es justo eso, así que puede cerrar el navegador
aunque la app lo reabra y retome la misma página.

En **Android 11 o menor no existe ese killer**. Si ahí se cierra, la causa
es memoria insuficiente (low-memory killer) o una caída nativa de Chromium.
El diagnóstico lo distingue: `process did exit: signal=SIGKILL` con poca RAM
disponible apunta a memoria; `SIGSEGV`, `SIGTRAP` o `SIGABRT` apuntan a
Chromium. En ese caso probá el botón **Probar verificación liviana
(mbasic)**, cerrá otras apps y revisá `free -m` y `.data/inicio.log`.

La app ya hace lo que puede desde adentro:

- pide el **wake lock** de Termux al abrir el navegador (necesita
  `pkg install termux-api` y la app **Termux:API** desde F-Droid);
- en Android 12+ reduce el modelo de procesos (modo suave) y en todo
  Android desactiva el aislamiento de sitio;
- tras dos cierres con la comprobación en pantalla, reintenta sin esos
  ajustes agresivos;
- reabre la página de la verificación y retoma la URL;
- muestra el diagnóstico en la tarjeta Navegador (botón **Ver
  diagnóstico**) y en `http://localhost:3000/api/browser/diagnostico`.

Si aun así se cierra en Android 12+, hay que desactivar el killer del lado
de Android:

- **Android 14 o superior:** Ajustes → Sistema → Opciones de
  desarrollador → **Deshabilitar restricciones de procesos hijos**.
- **Android 12, 12L o 13:** por ADB (una vez):

  ```bash
  adb shell settings put global settings_enable_monitor_phantom_procs false
  ```

  En Android 12 también hay que subir el tope (el orden importa):

  ```bash
  adb shell "/system/bin/device_config set_sync_disabled_for_tests persistent"
  adb shell "/system/bin/device_config put activity_manager max_phantom_processes 2147483647"
  ```

  Sin computadora, se puede hacer desde el propio teléfono con
  `pkg install android-tools`, activando **Depuración inalámbrica** y
  usando `adb pair`/`adb connect`.

Mientras tanto, el botón **Probar verificación liviana (mbasic)** de la
tarjeta navega a la versión sin JavaScript de Facebook, que suele ser
mucho más liviana para el teléfono.

## Notas honestas

- La primera instalación es la parte pesada; el uso diario es un comando.
- Mientras la app está en uso, Termux tiene que quedar abierto (el script
  de arranque evita que Android lo duerma, pero no lo cierres a la fuerza).
- El rendimiento depende del teléfono: el chat y las Páginas vuelan; el
  navegador interno es la pieza más lenta.
- iPhone no está soportado para uso local: iOS no permite correr un
  programa así dentro del teléfono. En iPhone solo se puede usar la PWA
  contra una instancia corriendo en otro dispositivo.
