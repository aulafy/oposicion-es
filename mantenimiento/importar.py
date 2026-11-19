"""Selecciona los bancos públicos de una exportación revisada de Plaza."""
import argparse
import json
import shutil
from pathlib import Path

PUBLICOS = "bloque4 c1_i_iii gestion justicia justicia_org sms ayto casos procesales clasificacion silencio recursos organo_municipal permisos estatutario requisitos".split()
DESTINO = Path(__file__).resolve().parents[1] / "web/datos"


def importar(origen):
    def leer(nombre):
        return json.loads((origen / nombre).read_text(encoding="utf-8"))

    def guardar(nombre, valor):
        (DESTINO / nombre).write_text(json.dumps(valor, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    todos = leer("bancos.json")
    bancos = {k: todos[k] for k in PUBLICOS}
    preguntas = [q for banco in bancos.values() for q in banco]
    ids = {q["id"] for q in preguntas}
    anterior = DESTINO / "bancos.json"
    if anterior.exists():
        publicados = json.loads(anterior.read_text(encoding="utf-8"))
        faltan = {q["id"] for banco in publicados.values() for q in banco} - ids
        if faltan:
            muestra = ", ".join(sorted(faltan)[:5])
            raise ValueError(f"La exportación omite {len(faltan)} ejercicios publicados ({muestra}).")
    citas = [c for q in preguntas for c in ([q["cita"]] if q.get("cita") else []) + q.get("citas", [])]
    claves = {c["norma"] + "|" + c["bloque"] for c in citas if "norma" in c}
    normas = {c["norma"] for c in citas if "norma" in c}
    meta = leer("meta.json")
    for campo in ("sim", "conv_sim"):
        meta[campo] = {k: meta[campo][k] for k in ("c1", "tram", "aux")}
    for campo in ("frq", "frq_otras"):
        meta[campo] = {k: v for k, v in meta[campo].items() if k in claves}
    meta["titulos"] = {k: meta["titulos"][k] for k in normas}
    meta["ambiguas"] = {k: v for k, v in meta["ambiguas"].items() if k in ids}
    meta["retiradas"] = {conv: {k: v for k, v in grupo.items() if k in ids} for conv, grupo in meta["retiradas"].items() if conv in ("", "age2025", "justicia2025")}
    guardar("meta.json", meta)
    guardar("bancos.json", bancos)
    guardar("explicaciones.json", {k: v for k, v in leer("explicaciones.json").items() if k in ids})
    guardar("versiones.json", {conv: {k: v for k, v in grupo.items() if k in claves} for conv, grupo in leer("versiones.json").items() if conv in meta["conv"]})
    leyes = DESTINO / "leyes"
    leyes.mkdir(exist_ok=True)
    for norma in normas:
        shutil.copyfile(origen / "leyes" / (norma + ".json"), leyes / (norma + ".json"))
    for p in leyes.glob("*.json"):
        if p.stem not in normas:
            p.unlink()
    print(f"{len(ids)} preguntas y casos distintos, {len(normas)} normas.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("origen", type=Path)
    importar(parser.parse_args().origen)
