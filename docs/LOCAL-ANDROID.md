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
usable, el login se hace con el script de sesión guiado (ver
[NAVEGADOR.md](NAVEGADOR.md)); la sesión queda guardada en el teléfono,
en `.data/`, y la tarjeta **Navegador** del Dashboard muestra su estado.

## Notas honestas

- La primera instalación es la parte pesada; el uso diario es un comando.
- Mientras la app está en uso, Termux tiene que quedar abierto (el script
  de arranque evita que Android lo duerma, pero no lo cierres a la fuerza).
- El rendimiento depende del teléfono: el chat y las Páginas vuelan; el
  navegador interno es la pieza más lenta.
- iPhone no está soportado para uso local: iOS no permite correr un
  programa así dentro del teléfono. En iPhone solo se puede usar la PWA
  contra una instancia corriendo en otro dispositivo.
