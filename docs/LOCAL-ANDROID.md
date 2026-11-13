# Orquestador en un teléfono Android (local)

La app corre **dentro del teléfono**, sin servidores externos: un entorno
Linux en el dispositivo (Termux + Debian interno) levanta la app y su
navegador, y la usás desde el Chrome del mismo teléfono.

## Cómo está armado

```
Teléfono Android
└── Termux (la puerta de entrada)
    └── Debian interno (proot-distro)
        ├── Node.js → la app en http://localhost:3000
        └── Chromium → el navegador de la plataforma
```

Todo vive en el teléfono: el código, la sesión de Facebook y los datos.

## Requisitos

- Un teléfono Android con espacio libre (la primera instalación descarga
  varios cientos de MB entre Debian, Node y Chromium).
- **Termux** instalado desde F-Droid o desde el GitHub de Termux
  (la versión de Play Store está abandonada, no sirve).
- Conexión Wi-Fi para la primera instalación.

## Instalación (una sola vez)

1. Abrí Termux y pegá:

```bash
pkg update -y && pkg install -y git curl
git clone https://github.com/enrrutador/orquestador.git
cd orquestador
bash scripts/android/instalar.sh
```

El script instala el Debian interno con Node.js y Chromium, y deja la app
instalada adentro.

2. Configuración: dentro de la carpeta del proyecto, creá `.env.local` con
la clave de tu proveedor de IA (ver `.env.example`). Las variables de
Facebook **no hacen falta**: el modo principal es el navegador.

## Uso diario

En Termux:

```bash
cd ~/orquestador
bash scripts/android/iniciar.sh
```

Eso mantiene el teléfono despierto para la app y la levanta adentro del
Debian. Después abrí **Chrome** en el mismo teléfono y entrá a
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
