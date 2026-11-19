# Plaza · Oposiciones en casa

Prepara una oposición en tu ordenador. Haz un test, responde y abre el artículo que fundamenta la corrección. Puedes practicar supuestos, repetir fallos con el plan de repaso y consultar convocatorias abiertas y ofertas pendientes. Tu progreso se guarda en el navegador. Para empezar basta con Python y un navegador.

**[Descargar Plaza en ZIP](https://github.com/aulafy/oposicion-es/archive/refs/heads/main.zip)**

## Proyecto de investigación de Aulafy.net

Plaza es una aplicación de estudio y un proyecto de investigación aplicada sobre modelos de lenguaje creado por [Aulafy.net](https://aulafy.net/). Una de sus líneas de trabajo explora la «cirugía de pesos», es decir, cambios dirigidos en los parámetros internos de un modelo ya entrenado. El objetivo es medir si estas intervenciones reducen las afirmaciones sin respaldo en tareas jurídicas concretas sin depender de un sistema de búsqueda y recuperación de documentos en cada consulta (RAG). [Investigación y alcance del experimento](docs/INVESTIGACION.md)

## Aviso de responsabilidad

Plaza es un proyecto independiente con fines educativos y de investigación. Se ofrece tal cual, sin garantías de exactitud, actualización o cobertura. Las preguntas, explicaciones y fechas pueden contener errores. Usa las bases y la publicación oficial para verificar el temario, los requisitos y los plazos antes de tomar decisiones o presentar una solicitud. El material de Plaza carece de carácter oficial y de valor como asesoramiento jurídico. El BOE indica que sus textos consolidados tienen carácter informativo. [Información de la Agencia Estatal BOE](https://www.boe.es/buscar/ayudas/legislacion_actualizada.php)

## Primera instalación

1. Descarga el ZIP y **extráelo completo** en Documentos. En Windows, pulsa con el botón derecho y elige **Extraer todo**.
2. Instala **Python 3.9 o posterior** si aún no lo tienes. En Windows, si el instalador ofrece añadir Python a la ruta del sistema, marca la casilla. [Descargar Python](https://www.python.org/downloads/)
3. Abre la carpeta que contiene este documento. En **Windows** haz doble clic en **Abrir Plaza.cmd**. En **macOS** abre **Abrir Plaza.command**. En **Linux**, abre una terminal en esa carpeta y ejecuta `python3 iniciar.py`. Si macOS bloquea el lanzador descargado, usa el mismo comando en Terminal.
4. Se abrirá Plaza. Elige tu oposición, pulsa **Test rápido** y responde una pregunta. Mantén abierta la ventana del lanzador mientras estudias. También puedes entrar escribiendo **http://127.0.0.1:8826/** en tu navegador.
5. Para tener un icono propio, abre Plaza en Chrome o Edge y elige **Instalar Plaza** o **Instalar página como aplicación** en el menú del navegador. Cada día inicia primero el lanzador. Para salir, cierra la ventana del lanzador o pulsa **Ctrl+C** en ella.

Usa siempre el mismo navegador, perfil y dirección para conservar el progreso. Puedes estudiar sin conexión con los datos incluidos. La descarga de novedades y el primer aprovisionamiento de un modelo necesitan internet.

## Qué puedes preparar

| Perfil | Práctica disponible |
| --- | --- |
| Administrativo del Estado | Tests, supuestos y simulacro de la parte legal |
| Auxiliar Administrativo del Estado | Tests y supuestos |
| Tramitación Procesal y Administrativa | Tests, supuestos y simulacro |
| Auxilio Judicial | Tests, supuestos y simulacro |
| Administración del Servicio Murciano de Salud | Tests y supuestos |
| Administración Local | Tests y supuestos de temario común |

Iremos incorporando oposiciones de ámbito estatal a medida que revisemos sus temarios y bancos. La cobertura depende del perfil. Compara los bloques disponibles con las bases de tu convocatoria. Los bancos específicos de la CARM (Administrativo y Auxiliar), de Auxiliar de los ayuntamientos de Madrid y Barcelona y de Conserje Operario del Ayuntamiento de Murcia se reservan para la edición de pago. Sus anuncios oficiales sí pueden aparecer en el buscador de convocatorias.

## Tutor opcional con Ollama

Las correcciones y explicaciones ya incluidas funcionan desde el primer día. Si quieres **hacer tu propia pregunta**, instala Ollama, descarga un modelo de conversación y selecciónalo al pulsar **Preguntar** en una corrección. La respuesta del test queda fijada en el banco. El modelo ayuda a interpretarla y puede equivocarse. [Guía paso a paso de Ollama](docs/TUTOR.md)

## Novedades y convocatorias

En **Oposiciones** puedes buscar procesos con inscripción abierta y consultar ofertas de empleo público pendientes de convocatoria. Una oferta pendiente todavía puede carecer de fecha de inscripción. Las fechas de cierre calculadas son orientativas. Abre el anuncio y comprueba las bases, especialmente los festivos locales y autonómicos.

GitHub Actions revisa diariamente el BOE. Publica el catálogo de convocatorias y señala cambios en las normas del temario para su revisión. Los cambios en leyes, tests y explicaciones se distribuyen cuando el equipo publica una exportación revisada. Al abrirse y cada 24 horas mientras está abierta, Plaza busca datos publicados en este repositorio. También puedes pulsar **Actualizar datos** en el menú (↻ en móvil) para comprobar si hay novedades en ese momento. La descarga conserva las preguntas y el progreso. Si hay datos nuevos, termina el test abierto y vuelve a abrir Plaza para usarlos. [Guía de mantenimiento](docs/MANTENIMIENTO.md)

## Ayúdanos a mejorar

¿Una pregunta admite dos respuestas? ¿Falta una convocatoria? Después de corregir, pulsa **Reportar error**, escribe el motivo y elige **Abrir correo**. Revisa el borrador y pulsa **Enviar** en tu aplicación de correo. Si usas correo web, escribe directamente a **learntouseai@gmail.com** e incluye el identificador de la pregunta o el enlace al anuncio. También agradecemos sugerencias desde **Ayuda → Reportar un error**.

[Solución de problemas](docs/AYUDA.md) · [Licencias y atribución](docs/LICENCIAS.md)

## Cómo colaborar

Abre una incidencia para describir un error o proponer una mejora. Incluye los pasos para reproducirlo y, si se trata de una pregunta, añade su identificador y el artículo del BOE. Para aportar cambios, crea un *fork*, abre una rama y envía una solicitud de cambios (*pull request*) a `main` explicando qué has cambiado y cómo lo has comprobado. También puedes contactar con Aulafy.net en **learntouseai@gmail.com**. [Guía de colaboración](CONTRIBUTING.md)
