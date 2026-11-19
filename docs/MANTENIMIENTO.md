# Publicar novedades

## Convocatorias y ofertas

El flujo **Revisar convocatorias y normas del BOE** se programa diariamente a las 12:45 UTC. Puede ejecutarse a mano desde la pestaña de acciones de GitHub. Usa el permiso de escritura del token integrado para guardar los cambios en la rama principal. Conserva el último día revisado, el índice de anuncios y los detalles. Tras una interrupción, la siguiente ejecución retoma los días pendientes. La fecha que aparece en la aplicación corresponde al catálogo instalado.

## Revisar cambios en las normas

El mismo flujo compara la fecha de actualización de cada norma con la última observada en la API del BOE. Si cambia, añade la norma a [la lista de revisiones pendientes](../mantenimiento/revision-pendiente.json) y la muestra en el resumen de GitHub Actions. La primera lectura de una norma establece la referencia. Una revisión pendiente sigue apareciendo en las siguientes ejecuciones hasta que se cierre expresamente.

Para cerrar una revisión:

1. Abre la norma en el BOE y comprueba qué artículos cambiaron y desde cuándo se aplica la nueva redacción. Una fecha de actualización distinta también puede deberse a un cambio de metadatos.
2. Busca los ejercicios que citan esos artículos. Revisa el enunciado, las opciones, la clave, la cita y la explicación. Comprueba la redacción que corresponda a cada convocatoria. Si la pregunta quedó desfasada, márcala como retirada para las sesiones afectadas y conserva su identificador.
3. Publica los datos revisados. Quita la entrada de la lista de pendientes en el mismo cambio. Si el cambio de metadatos carece de efecto sobre el temario, puedes cerrar la revisión con una nota en el commit o en la solicitud de cambios.

Los avisos de GitHub Actions abren una revisión editorial. Los textos legales y las respuestas del banco se publican tras comprobar su contenido.

## Publicar bancos o leyes revisados

1. Prepara una exportación de estudio que contenga bancos, versiones, explicaciones, metadatos y leyes en el mismo formato que `web/datos`. Revisa las citas, la clave de corrección y las retiradas por convocatoria.
2. Desde la raíz, ejecuta `python3 mantenimiento/importar.py "/ruta/a/la/exportacion"`. El importador selecciona los bancos de la lista pública y sus leyes. Los bancos nuevos requieren revisar expresamente esa lista. El importador comprueba los identificadores antes de escribir y rechaza una exportación que omita ejercicios ya publicados.
3. Ejecuta `python3 mantenimiento/manifiesto.py` y `python3 mantenimiento/comprobar.py`. Inicia Plaza y prueba una pregunta cambiada, su corrección y el artículo.
4. Examina el cambio en Git y publica los archivos revisados en la rama principal. Cada instalación comprueba tamaño y huella SHA-256 antes de activar una descarga. El código de la aplicación se actualiza descargando una nueva copia o usando Git.

El seguimiento de convocatorias se nutre del BOE y puede tener cobertura parcial de boletines autonómicos y provinciales. El calendario de festivos nacionales del escáner está definido hasta 2027 y debe revisarse cada año.
