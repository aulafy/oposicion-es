# Instalar Plaza

Necesitas un ordenador con navegador y Python 3.9 o posterior. Python permite abrir Plaza desde tu propio ordenador. Puedes empezar a estudiar en cuanto completes los pasos de tu sistema.

Si quieres que Codex o Claude te acompañen, copia el texto de la [guía para instalar con un asistente](INSTALAR-CON-UN-ASISTENTE.md).

## 1. Descarga Plaza

Descarga el ZIP y extráelo en Documentos. Abre la carpeta extraída, donde verás el archivo `iniciar.py`. Conserva juntos todos los archivos y carpetas. [Descargar el ZIP](https://github.com/aulafy/oposicion-es/archive/refs/heads/main.zip)

## 2. Sigue los pasos de tu sistema

### macOS

1. Abre **Terminal** desde Aplicaciones → Utilidades. Escribe `python3 --version` y pulsa Intro. Si el comando falla, Python es anterior a 3.9 o macOS te pide herramientas de desarrollo, instala Python desde su web y vuelve a abrir Terminal. [Instalador de Python para macOS](https://www.python.org/downloads/macos/)
2. En Terminal, escribe `cd` seguido de un espacio, arrastra desde Finder la carpeta extraída a la ventana de Terminal y pulsa Intro.
3. Ejecuta `python3 iniciar.py`. También puedes hacer doble clic en **Abrir Plaza.command** si macOS permite abrir el lanzador.

### Windows

1. Para descomprimir la descarga, pulsa con el botón derecho sobre el ZIP y selecciona **Extraer todo**.
2. Instala Python desde su web. Si el instalador ofrece **Add Python to PATH**, marca esa opción. Si ya tienes Python, abre PowerShell y comprueba la versión con `py -3 --version` o `python --version`. [Instalador de Python para Windows](https://www.python.org/downloads/windows/)
3. Abre la carpeta extraída y haz doble clic en **Abrir Plaza.cmd**. Si la ventana se cierra enseguida, abre esa carpeta en el Explorador, escribe `powershell` en la barra de direcciones y pulsa Intro. Ejecuta `py -3 iniciar.py`. Si el comando `py` no está disponible, prueba con `python iniciar.py`.

### Linux

1. Abre una terminal y comprueba Python con `python3 --version`. Si necesitas instalarlo, en Ubuntu, Debian o Linux Mint ejecuta `sudo apt install python3`. En Fedora, ejecuta `sudo dnf install python3`. En otras distribuciones, busca `python3` en su gestor de paquetes.
2. Abre la carpeta extraída en el gestor de archivos y selecciona **Abrir en una terminal**, si está disponible. También puedes usar `cd` seguido de la ruta de la carpeta entre comillas.
3. Ejecuta `python3 iniciar.py`.

## 3. Abre Plaza y empieza un test

Se abrirá el navegador. Si no se abre, escribe **http://127.0.0.1:8826/** en la barra de direcciones. Mantén abierta la ventana del lanzador mientras estudias. Elige tu oposición y abre **Inicio → Test rápido**.

En Chrome o Edge puedes añadir un icono de Plaza con la opción de instalación del menú del navegador. Para usar ese icono en otra sesión, inicia primero el lanzador.

Si instalas una versión nueva del programa, cierra el lanzador anterior y abre el de la carpeta nueva. Usa el mismo navegador, perfil y dirección para conservar tu historial y repasos. [Solución de problemas](AYUDA.md)
