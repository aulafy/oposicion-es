"""Verifica íntegramente el catálogo permitido antes de publicar."""
import hashlib
import json
from importar import PUBLICOS, DESTINO

def leer(ruta):
    return json.loads((DESTINO / ruta).read_text(encoding="utf-8"))

bancos = leer("bancos.json")
assert set(bancos) == set(PUBLICOS)
preguntas_por_id = {}
for banco, preguntas in bancos.items():
    assert preguntas, banco
    for pregunta in preguntas:
        assert preguntas_por_id.setdefault(pregunta["id"], pregunta) == pregunta
        assert 0 <= pregunta["correcta"] < len(pregunta["opciones"]), pregunta["id"]
ids = preguntas_por_id.keys()
assert set(leer("explicaciones.json")) <= ids
meta = leer("meta.json")
assert set(meta["sim"]) == set(meta["conv_sim"]) == {"c1", "tram", "aux"}
assert set(meta["titulos"]) == {p.stem for p in (DESTINO / "leyes").glob("*.json")}
for grupo in meta["retiradas"].values():
    assert grupo.keys() <= ids
manifest = leer("manifest.json")["ficheros"]
esperados = {"datos/" + k + ".json" for k in ("bancos", "explicaciones", "versiones", "meta", "oposiciones")}
esperados.update("datos/leyes/" + norma + ".json" for norma in meta["titulos"])
assert set(manifest) == esperados
assert {p for p in DESTINO.rglob("*") if p.is_file()} == {DESTINO / "manifest.json"} | {DESTINO.parent / ruta for ruta in esperados}
for ruta, ficha in manifest.items():
    contenido = (DESTINO.parent / ruta).read_bytes()
    assert len(contenido) == ficha["bytes"] and hashlib.sha256(contenido).hexdigest() == ficha["sha256"], ruta
print(f"Catálogo verificado: {len(bancos)} bancos, {len(ids)} ejercicios.")
