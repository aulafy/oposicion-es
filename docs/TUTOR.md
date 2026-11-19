# Hacer una pregunta al tutor local

1. Instala Ollama para tu sistema y abre la aplicación. En Linux, si el servicio está detenido, ejecuta `ollama serve` y déjalo abierto. [Descargar Ollama](https://ollama.com/download)
2. Abre Terminal o PowerShell. Para empezar con un modelo pequeño, ejecuta `ollama pull qwen3:1.7b`. La descarga ocupa aproximadamente 1,4 GB. Al responder también necesita memoria para el contexto. Puedes elegir otro modelo local de conversación que quepa en tu equipo. [Ficha del modelo](https://ollama.com/library/qwen3:1.7b)
3. Ejecuta `ollama list`. Comprueba que aparece el nombre descargado. Abre Plaza en ese mismo ordenador con el lanzador.
4. Contesta una pregunta y pulsa **Preguntar** en la corrección. Selecciona el modelo, escribe por ejemplo «¿Qué parte del artículo descarta mi opción?» y pulsa **Explicar con Ollama**. La primera respuesta puede tardar mientras el modelo se carga en memoria.
5. Lee el artículo y los avisos de verificación junto a la explicación. Una cita literal correcta por sí sola no acredita toda la interpretación del modelo.

Plaza usa la interfaz local de Ollama en el puerto 11434. El modelo recibe el artículo, el enunciado, las opciones, la clave de corrección, tu opción y tu duda. Elige un modelo descargado para inferencia local. Puedes usar la app sin configurar claves ni cuentas. [Guía de Ollama](https://docs.ollama.com/quickstart)
