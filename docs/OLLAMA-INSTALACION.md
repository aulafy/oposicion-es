# Ollama: guía de instalación

Ollama ejecuta modelos de inteligencia artificial en tu ordenador. En Plaza sirve para conversar con el tutor después de corregir una pregunta. Puedes estudiar con los tests, simulacros y explicaciones incluidas desde el primer día.

Esta guía adapta para Plaza la lección «Ollama desde cero», de Aulafy.net. Se centra en descargar y probar un modelo local y dejarlo listo para el tutor. [Lección original de Aulafy.net](https://www.aulafy.net/cursos/ia-local/ollama-desde-cero)

## 1. Instala Ollama en tu ordenador

### macOS

1. Comprueba que tienes macOS 14 Sonoma o posterior en **Menú Apple → Acerca de este Mac**. Ollama funciona en equipos Apple Silicon y en Mac Intel. En Intel, el modelo se ejecuta en el procesador.
2. Descarga Ollama para macOS, abre la imagen de disco y arrastra **Ollama** a **Aplicaciones**.
3. Abre Ollama desde Aplicaciones. Si te ofrece habilitar el comando `ollama` en Terminal, acepta para poder seguir esta guía. [Descarga oficial](https://ollama.com/download) · [Requisitos y pasos para macOS](https://docs.ollama.com/macos)

### Windows

1. Comprueba que tienes Windows 10 22H2 o posterior. Puedes ver tu versión en **Configuración → Sistema → Acerca de**.
2. Descarga Ollama para Windows y ejecuta **OllamaSetup.exe**. Abre Ollama desde Inicio cuando termine.
3. Abre una ventana nueva de **PowerShell**. Si tenías una abierta antes de instalar Ollama, ciérrala y vuelve a abrirla. [Descarga oficial](https://ollama.com/download) · [Requisitos y pasos para Windows](https://docs.ollama.com/windows)

### Linux

1. Abre una terminal. Sigue el apartado **Install** de la guía oficial de Ollama para tu equipo.
2. Si Ollama no está en marcha, prueba `ollama serve` y deja esa terminal abierta. Usa otra para los pasos siguientes. Si ya tienes un servicio de Ollama funcionando, puedes pasar directamente a descargar el modelo. [Instalación oficial en Linux](https://docs.ollama.com/linux)

## 2. Descarga y prueba un modelo local

Abre **Terminal** (macOS o Linux) o **PowerShell** (Windows). Ejecuta estas dos líneas una por una. La primera muestra la versión instalada. La segunda descarga un modelo ligero que ocupa aproximadamente 1,4 GB en disco y requiere conexión para la descarga.

```text
ollama --version
ollama pull qwen3:1.7b
```

Al finalizar, ejecuta `ollama list`. Deberías ver `qwen3:1.7b` en la lista. Si quieres probarlo antes de abrir Plaza, ejecuta `ollama run qwen3:1.7b`, escribe «Explícame en una frase qué es una oposición» y pulsa Intro. Para salir de esa conversación, escribe `/bye`. Mantén Ollama en marcha para usar el tutor.

El tamaño de la descarga indica el espacio necesario en disco. Al responder, el modelo también utiliza memoria RAM. Si la respuesta tarda demasiado o aparece un error de memoria, cierra otras aplicaciones o elige un modelo más pequeño. [Ficha de Qwen3 1.7B](https://ollama.com/library/qwen3:1.7b) · [Modelos orientativos según tu equipo](TUTOR.md#modelos-según-la-memoria-del-ordenador)

## 3. Activa el tutor en Plaza

1. Abre Plaza y pulsa **Configurar Ollama**, debajo del menú lateral. En pantallas estrechas aparece como un engranaje en la barra superior.
2. Pulsa **Volver a comprobar**, elige el modelo y selecciona **Guardar y cerrar**.
3. Responde una pregunta del test y pulsa **Preguntar** al final de la corrección. Puedes pedir un ejemplo, elegir una sugerencia o escribir tu propia duda.

Con el modelo descargado, la generación de la respuesta se hace en tu ordenador. La primera respuesta puede tardar mientras Ollama carga el modelo. Ten a mano el artículo que muestra Plaza para contrastar lo que diga el tutor. [Guía con capturas](TUTOR.md#configuración-paso-a-paso-con-capturas)

## Si algo falla

- **El comando `ollama` no aparece.** Abre Ollama y prueba en una ventana nueva de Terminal o PowerShell. Si sigue fallando, revisa la instalación de tu sistema.
- **La lista está vacía.** Comprueba que la descarga terminó con `ollama list`. Luego vuelve a Plaza y pulsa **Volver a comprobar**.
- **Plaza se abre desde un sitio WordPress.** Puede que tengas que permitir que el navegador acceda a Ollama y autorizar el dominio en Ollama. [Configurar el tutor en WordPress](WORDPRESS.md#tutor-local-con-ollama)
