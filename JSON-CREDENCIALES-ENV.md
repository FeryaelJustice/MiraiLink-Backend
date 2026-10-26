# Copiar credenciales JSON al portapapeles para el .env

Ejecutar los comandos desde la raiz de este repositorio. Cada comando lee el archivo local, valida su sintaxis JSON, lo minifica y copia el resultado al portapapeles sin imprimir las claves en la terminal. No envia datos a servicios externos.

## Archivo y variable correspondiente

| Archivo local | Variable del entorno | Uso |
| --- | --- | --- |
| `mirailink-afb49-firebase-adminsdk-fbsvc-1dbcf5d47a.json` | `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase Admin y notificaciones FCM |
| `mirailink-afb49-3942b9df130b.json` | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Verificacion y gestion de suscripciones Google Play |

Los nombres corresponden a los archivos locales actuales. Si se renuevan las claves y cambian los nombres, adaptar el comando y las rutas de fallback.

## Windows: PowerShell

Firebase:

```powershell
Get-Content -Raw .\mirailink-afb49-firebase-adminsdk-fbsvc-1dbcf5d47a.json | ConvertFrom-Json | ConvertTo-Json -Depth 20 -Compress | Set-Clipboard
```

Google Play:

```powershell
Get-Content -Raw .\mirailink-afb49-3942b9df130b.json | ConvertFrom-Json | ConvertTo-Json -Depth 20 -Compress | Set-Clipboard
```

Ejecutar un comando y pegar su resultado antes de ejecutar el siguiente, que reemplaza el portapapeles.

## Windows: CMD

Requiere Node.js disponible en `PATH`. `clip` viene incluido en Windows.

Firebase:

```bat
node -e "const fs=require('node:fs'); process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync('mirailink-afb49-firebase-adminsdk-fbsvc-1dbcf5d47a.json','utf8'))))" | clip
```

Google Play:

```bat
node -e "const fs=require('node:fs'); process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync('mirailink-afb49-3942b9df130b.json','utf8'))))" | clip
```

## macOS: Terminal, zsh o bash

Requiere Node.js disponible en `PATH`. `pbcopy` viene incluido en macOS.

Firebase:

```sh
node -e "const fs=require('node:fs'); process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync('mirailink-afb49-firebase-adminsdk-fbsvc-1dbcf5d47a.json','utf8'))))" | pbcopy
```

Google Play:

```sh
node -e "const fs=require('node:fs'); process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync('mirailink-afb49-3942b9df130b.json','utf8'))))" | pbcopy
```

## Linux: Terminal, bash o zsh

Requiere Node.js y una sesion grafica con acceso al portapapeles. En Wayland se usa `wl-copy`, del paquete `wl-clipboard`.

Firebase:

```sh
node -e "const fs=require('node:fs'); process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync('mirailink-afb49-firebase-adminsdk-fbsvc-1dbcf5d47a.json','utf8'))))" | wl-copy
```

Google Play:

```sh
node -e "const fs=require('node:fs'); process.stdout.write(JSON.stringify(JSON.parse(fs.readFileSync('mirailink-afb49-3942b9df130b.json','utf8'))))" | wl-copy
```

En X11, sustituir `wl-copy` por `xclip -selection clipboard`, del paquete `xclip`. En un servidor sin sesion grafica o una conexion SSH corriente no suele existir un portapapeles de escritorio: ejecutar estos comandos en el ordenador local que contiene los archivos. Si falta alguna utilidad, instalarla mediante el gestor de paquetes de la distribucion.

## Pegar en el .env local

1. Copiar Firebase y pegar el resultado en `FIREBASE_SERVICE_ACCOUNT_JSON`.
2. Copiar Google Play y pegar el resultado en `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`.
3. Cada asignacion debe ocupar una sola linea fisica. Envolver el objeto JSON en comillas simples exteriores, como muestra el esquema siguiente.

```dotenv
# Esquema ilustrativo: sustituir cada marcador por el objeto JSON completo.
FIREBASE_SERVICE_ACCOUNT_JSON='<PEGAR_JSON_COMPLETO_FIREBASE>'
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON='<PEGAR_JSON_COMPLETO_GOOGLE_PLAY>'
```

No pegar los marcadores literales. No envolver de nuevo el JSON con comillas dobles ni escapar todas sus comillas. Conservar los `\n` de `private_key` dentro del JSON: el lector los convierte en saltos de linea reales al analizarlo.

En Abasthan u otro panel de variables, usar el nombre de la variable como nombre y pegar solamente el objeto JSON como valor, sin las comillas simples exteriores del archivo `.env` y sin el prefijo `VARIABLE=`.

## Prioridad y reinicio

- Firebase lee primero `FIREBASE_SERVICE_ACCOUNT_JSON`. Si esta ausente o vacia, lee `FIREBASE_SERVICE_ACCOUNT_FILE_NAME`; si tampoco hay ruta, conserva el fallback historico `src/serviceAccountKey.json`.
- Google Play lee primero `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`. Si esta ausente o vacia, lee `GOOGLE_PLAY_SERVICE_ACCOUNT_FILE`.
- Un JSON presente pero invalido produce un error. No se intenta el archivo en ese caso.
- Se pueden conservar las rutas existentes como alternativa local. No se buscan archivos automaticamente por sus nombres.
- Reiniciar o redesplegar el backend y los workers tras cambiar credenciales. Firebase y OAuth mantienen cache en el proceso.

## Manejo de secretos

No subir los JSON ni el `.env` a Git, pegarlos en chats, capturas o minificadores web. Esta guia contiene solo nombres de archivo y comandos, nunca claves. Al terminar, reemplazar el contenido del portapapeles; si esta activo el historial o la sincronizacion del portapapeles, eliminar tambien esas entradas desde el sistema.

Validar la sintaxis JSON y la clave privada no confirma permisos, vigencia ni conectividad: verificar despues una notificacion FCM y una operacion de Google Play en el entorno correspondiente.
