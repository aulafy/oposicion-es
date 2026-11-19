"""Detecta cambios en los metadatos del BOE y conserva las revisiones pendientes."""
import json
from pathlib import Path

from oposiciones import pedir

BASE = Path(__file__).resolve().parent
DATOS = BASE.parent / "web/datos"


def leer(ruta, defecto):
    return json.loads(ruta.read_text(encoding="utf-8")) if ruta.exists() else defecto


def guardar(ruta, datos):
    ruta.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def revisar():
    registro = BASE / "revision-leyes.json"
    cola = BASE / "revision-pendiente.json"
    anterior = leer(registro, {})
    pendientes = leer(cola, {})
    fichas = {}
    for archivo in sorted((DATOS / "leyes").glob("*.json")):
        norma = archivo.stem
        url = f"https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/{norma}/metadatos"
        ficha = json.loads(pedir(url))["data"][0]
        fecha = ficha["fecha_actualizacion"]
        if ficha["identificador"] != norma or not fecha:
            raise ValueError("Respuesta inesperada para " + norma)
        fichas[norma] = fecha
        if norma in anterior and anterior[norma] != fecha:
            entrada = pendientes.setdefault(norma, {"fecha_anterior": anterior[norma]})
            entrada["fecha_detectada"] = fecha

    # Guarda primero la cola para que un reintento pueda recuperar un aviso.
    guardar(cola, pendientes)
    guardar(registro, fichas)
    print("### Normas pendientes de revisión editorial")
    if not pendientes:
        print("Sin revisiones pendientes.")
    for norma, entrada in pendientes.items():
        print(f"- [{norma}](https://www.boe.es/buscar/act.php?id={norma}) · "
              f"{entrada['fecha_anterior']} → {entrada['fecha_detectada']}")


if __name__ == "__main__":
    revisar()
