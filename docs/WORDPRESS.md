# Instalar Plaza como tema de WordPress

El tema convierte la portada de WordPress en la entrada a Plaza. Al visitar la portada, el navegador abre la aplicación en una ruta propia del mismo sitio. Incluye los mismos tests, correcciones, casos prácticos, simulacros, seguimiento de convocatorias, progreso local y actualización de datos que la edición descargable.

## Preparar e instalar el tema

1. [Descarga el repositorio](https://github.com/aulafy/oposicion-es/archive/refs/heads/main.zip) y extrae el ZIP.
2. Abre una terminal en la carpeta extraída y ejecuta `python3 wordpress/empaquetar.py`. En Windows puedes usar `py -3 wordpress/empaquetar.py`. Se creará el archivo `dist/plaza-wordpress.zip`.
3. En la administración de WordPress, abre **Apariencia → Temas → Añadir nuevo → Subir tema** y elige `plaza-wordpress.zip`. Activa **Plaza Oposiciones**.
4. Visita la portada del sitio. Haz un test y comprueba que aparece el artículo en la corrección. En Chrome o Edge puedes instalar la app desde la página de Plaza que se abre.

Si WordPress rechaza la subida por tamaño, comprueba el límite de archivos del alojamiento. El ZIP ocupa alrededor de 6 MB.

El sitio publicado debe usar HTTPS para guardar los recursos de la app y poder abrirla sin conexión. La primera visita necesita red para descargar la aplicación y sus datos. En sesiones posteriores abre la dirección de Plaza que aparece tras entrar por la portada, o usa el icono instalado. [Instalar temas en WordPress](https://wordpress.org/documentation/article/appearance-themes-screen/)

## Tutor local con Ollama

Cada usuario que quiera usar el tutor instala Ollama y descarga un modelo en su propio ordenador. Después, guarda el modelo desde **Configurar Ollama** en Plaza. Los tests y las correcciones están disponibles desde el primer día. [Guía del tutor](TUTOR.md)

Para usar el tutor desde un dominio publicado, Ollama debe autorizar el origen exacto del sitio. Si la dirección de Plaza empieza por `https://oposiciones.ejemplo.es/`, el origen es `https://oposiciones.ejemplo.es`, con el puerto si aparece en la dirección. Configura `OLLAMA_ORIGINS` con ese valor y reinicia Ollama. En macOS puedes usar `launchctl setenv OLLAMA_ORIGINS "https://oposiciones.ejemplo.es"`. En Windows puedes usar `setx OLLAMA_ORIGINS "https://oposiciones.ejemplo.es"` y volver a abrir Ollama. En Linux con systemd, añade `Environment="OLLAMA_ORIGINS=https://oposiciones.ejemplo.es"` en la sección `[Service]` de la configuración del servicio y reinícialo. Si el navegador pide acceso a la red local, concédelo al dominio donde instalaste Plaza. Mantén Ollama escuchando en su dirección local. [Configuración oficial de Ollama](https://docs.ollama.com/faq#how-can-i-allow-additional-web-origins-to-access-ollama)

## Actualizar sin perder el progreso

Pulsa **Actualizar datos** desde Plaza para buscar novedades del BOE y del catálogo. Para actualizar el código, genera el ZIP desde la versión nueva del repositorio y súbelo como reemplazo del tema. Conserva el dominio, el navegador y su perfil para mantener el historial. Cada dominio y perfil guarda su propio historial.
