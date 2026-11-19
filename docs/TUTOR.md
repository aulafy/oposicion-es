# Configurar el tutor de Plaza con Ollama

Ollama ejecuta un modelo de IA en tu ordenador para ayudarte a entender la corrección de una pregunta. Instálalo si quieres usar el botón **Preguntar**. Puedes hacer tests y leer las explicaciones incluidas desde que abres Plaza.

## 1. Instala Ollama

- **macOS.** Descarga la aplicación, muévela a Aplicaciones si el instalador te lo pide y ábrela. Consulta los requisitos de tu versión de macOS. [Guía oficial para macOS](https://docs.ollama.com/macos)
- **Windows.** Descarga y ejecuta el instalador de Ollama. Al terminar, abre Ollama desde el menú Inicio y abre una ventana nueva de PowerShell. [Guía oficial para Windows](https://docs.ollama.com/windows)
- **Linux.** Sigue los pasos del instalador oficial de Ollama. Si el servicio está detenido, ejecuta `ollama serve` y deja esa terminal abierta. Usa otra terminal para descargar el modelo. [Guía oficial para Linux](https://docs.ollama.com/linux)

Para seguir la instalación y descargar tu primer modelo con una explicación en español, consulta la lección de Aulafy.net. [Ollama desde cero](https://www.aulafy.net/cursos/ia-local/ollama-desde-cero) · [Descargar Ollama](https://ollama.com/download) · [Guía oficial de inicio](https://docs.ollama.com/quickstart)

## 2. Elige un modelo que quepa en tu equipo

Si tienes **8 GB**, empieza con **Qwen3 1.7B**. Con **16 GB**, prueba primero **Qwen2.5 3B**, que hemos usado con el tutor de Plaza en macOS. Descarga un solo modelo para comenzar.

Estas diez opciones son orientativas. La **memoria** es la que usa el ordenador para trabajar. El tamaño de **descarga** es el espacio que ocupa el modelo en disco. Deja memoria libre para el sistema, el navegador y el texto de la pregunta. En un Mac con Apple Silicon cuenta la memoria unificada. En un PC con gráfica dedicada, comprueba también su memoria de vídeo. Si tu ordenador usa solo el procesador, empieza con un modelo pequeño y espera respuestas más lentas.

| Equipo orientativo | Comando para descargar | Espacio aproximado |
| --- | --- | --- |
| Portátil de 4–6 GB con poca memoria libre | `ollama pull qwen3:0.6b` | 523 MB |
| Portátil de 6–8 GB, prueba ligera | `ollama pull gemma3:1b` | 806 MB |
| Portátil de 8 GB, punto de partida | `ollama pull qwen3:1.7b` | 1,4 GB |
| PC o Mac de 8–16 GB, cerrando otras aplicaciones | `ollama pull qwen2.5:3b` | 1,9 GB |
| Mac con Apple Silicon o PC de 16 GB | `ollama pull qwen3:4b` | 2,5 GB |
| Equipo de 16 GB con memoria libre | `ollama pull gemma3:4b` | 3,4 GB |
| Mac de 16–24 GB o PC de 24 GB | `ollama pull qwen3:8b` | 5,2 GB |
| Mac o PC de 24–32 GB | `ollama pull gemma3:12b` | 8,2 GB |
| Mac o PC de 32 GB | `ollama pull qwen3:14b` | 9,3 GB |
| Mac de 48 GB o estación de trabajo de 64 GB | `ollama pull gemma3:27b` | 17 GB |

Los modelos más pequeños sirven para empezar y pueden dar explicaciones más limitadas. Si Ollama indica que falta memoria, baja un tamaño. Contrasta la respuesta con el artículo incluso si usas un modelo grande. [Tamaños de Qwen3](https://ollama.com/library/qwen3/tags) · [Ficha de Qwen2.5 3B](https://ollama.com/library/qwen2.5:3b) · [Tamaños de Gemma 3](https://ollama.com/library/gemma3/tags)

## 3. Haz tu primera pregunta

1. Copia el comando de la tabla en Terminal o PowerShell y pulsa Intro. Espera a que termine la descarga. Usa `ollama list` para confirmar que aparece el modelo.
2. Mantén Ollama abierto e inicia Plaza en el mismo ordenador. Responde una pregunta y pulsa **Preguntar** en la corrección.
3. Selecciona el modelo que descargaste. Prueba con «¿Qué parte del artículo descarta mi respuesta?» y pulsa **Explicar con Ollama**. La primera respuesta puede tardar mientras el modelo se carga.
4. Lee la explicación junto al artículo. Una cita literal puede ser correcta aunque la interpretación sea equivocada.

Si el selector aparece vacío, comprueba que Ollama está abierto y que `ollama list` muestra el modelo. Cierra y vuelve a abrir el tutor. [Ayuda de Plaza](AYUDA.md) · [Solución de problemas en Aulafy.net](https://www.aulafy.net/cursos/ia-local/troubleshooting-ollama)
