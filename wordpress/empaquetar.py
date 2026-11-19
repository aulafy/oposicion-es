"""Genera el ZIP instalable del tema usando la aplicación del repositorio."""
import argparse
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

RAIZ = Path(__file__).resolve().parents[1]
APP = RAIZ / "web"
TEMA = RAIZ / "wordpress" / "plaza"
ARCHIVOS_TEMA = ("style.css", "index.php", "front-page.php", "functions.php")


def empaquetar(destino):
    manifiesto = json.loads((APP / "datos/manifest.json").read_text(encoding="utf-8"))
    recursos = {
        p.relative_to(APP).as_posix(): p.read_bytes()
        for p in sorted(APP.rglob("*"))
        if p.is_file() and p.suffix in {".html", ".css", ".js", ".svg", ".png", ".woff2", ".txt"}
        and "datos" not in p.relative_to(APP).parts and p.name != "sw.js"
    }
    for ruta in sorted(manifiesto["ficheros"]):
        recursos[ruta] = (APP / ruta).read_bytes()
    for ruta in ("manifest.json", "datos/manifest.json", "tutor-local/reglas.json"):
        recursos[ruta] = (APP / ruta).read_bytes()

    resumen = [(ruta, hashlib.sha256(datos).hexdigest()) for ruta, datos in recursos.items()]
    plantilla = (RAIZ / "wordpress/sw.js").read_text(encoding="utf-8")
    version = hashlib.sha256((json.dumps(resumen) + plantilla).encode()).hexdigest()[:16]
    precarga = ["./", *recursos]
    recursos["sw.js"] = (
        f"const VERSION = {json.dumps(version)};\n"
        f"const RECURSOS = {json.dumps(precarga)};\n" + plantilla
    )

    destino.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(destino, "w", compression=ZIP_DEFLATED) as zip_tema:
        for nombre in ARCHIVOS_TEMA:
            zip_tema.write(TEMA / nombre, f"plaza/{nombre}")
        zip_tema.write(RAIZ / "LICENSE", "plaza/LICENSE")
        zip_tema.write(RAIZ / "docs/LICENCIAS.md", "plaza/LICENCIAS.md")
        for ruta, datos in recursos.items():
            zip_tema.writestr(f"plaza/app/{ruta}", datos)
    print(f"Tema generado en {destino}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--salida", type=Path, default=RAIZ / "dist/plaza-wordpress.zip")
    empaquetar(parser.parse_args().salida)
