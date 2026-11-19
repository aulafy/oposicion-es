# Publicar novedades

## Convocatorias y ofertas

El flujo **Revisar convocatorias y normas del BOE** se programa diariamente a las 12:45 UTC. Puede ejecutarse a mano desde la pestaña de acciones de GitHub. Usa el permiso de escritura del token integrado para guardar los cambios en la rama principal. Conserva el último día revisado, el índice de anuncios y los detalles. Tras una interrupción, la siguiente ejecución retoma los días pendientes. La fecha que aparece en la aplicación corresponde al catálogo instalado.

El resumen del flujo enumera las normas cuya fecha de actualización ha cambiado en la API del BOE. La primera lectura establece la referencia. Revisa el artículo, la entrada en vigor y las bases antes de aceptar una pregunta revisada. Un cambio de metadatos puede no alterar la respuesta.

## Publicar bancos o leyes revisados

1. Prepara una exportación de estudio que contenga bancos, versiones, explicaciones, metadatos y leyes en el mismo formato que `web/datos`. Revisa las citas, la clave de corrección y las retiradas por convocatoria.
2. Desde la raíz, ejecuta `python3 mantenimiento/importar.py "/ruta/a/la/exportacion"`. El importador selecciona los bancos de la lista pública y sus leyes. Los bancos nuevos requieren revisar expresamente esa lista.
3. Ejecuta `python3 mantenimiento/manifiesto.py` y `python3 mantenimiento/comprobar.py`. Inicia Plaza y prueba una pregunta cambiada, su corrección y el artículo.
4. Examina el cambio en Git y publica los archivos revisados en la rama principal. Cada instalación comprueba tamaño y huella SHA-256 antes de activar una descarga. El código de la aplicación se actualiza descargando una nueva copia o usando Git.

El seguimiento de convocatorias se nutre del BOE y puede tener cobertura parcial de boletines autonómicos y provinciales. El calendario de festivos nacionales del escáner está definido hasta 2027 y debe revisarse cada año.
