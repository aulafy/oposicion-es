"""Registra la fecha de actualización de las normas públicas para su revisión."""
import json
from pathlib import Path
from oposiciones import pedir

BASE = Path(__file__).resolve().parent
destino = BASE / "revision-leyes.json"
anterior = json.loads(destino.read_text()) if destino.exists() else {}
revision = {}
for archivo in sorted((BASE.parent / "web/datos/leyes").glob("*.json")):
    norma = archivo.stem
    url = "https://www.boe.es/datosabiertos/api/legislacion-consolidada/id/" + norma + "/metadatos"
    ficha = json.loads(pedir(url))["data"][0]
    fecha = ficha["fecha_actualizacion"]
    if ficha["identificador"] != norma or not fecha:
        raise ValueError("Respuesta inesperada para " + norma)
    revision[norma] = fecha
    if anterior.get(norma) != fecha:
        print(f"- {norma} · {fecha} · https://www.boe.es/buscar/act.php?id={norma}")
destino.write_text(json.dumps(revision, indent=2) + "\n")
