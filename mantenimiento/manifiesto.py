"""Genera el manifiesto de los datos sin modificar su fecha si no han cambiado."""
import hashlib, json
from datetime import datetime, timezone
from pathlib import Path


def main():
    datos = Path(__file__).resolve().parents[1] / 'web/datos'; destino = datos / 'manifest.json'; ficheros = {}
    for p in sorted(datos.rglob('*')):
        relativo = p.relative_to(datos)
        if not p.is_file() or relativo.as_posix() == 'manifest.json' or any(x.startswith('.') for x in relativo.parts): continue
        contenido = p.read_bytes(); ficheros['datos/' + relativo.as_posix()] = {'sha256': hashlib.sha256(contenido).hexdigest(), 'bytes': len(contenido)}
    lista = [(p, v['sha256']) for p, v in sorted(ficheros.items())]
    version = hashlib.sha256(json.dumps(lista, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()[:12]
    generado = datetime.now(timezone.utc).isoformat()
    try:
        anterior = json.loads(destino.read_text())
        if anterior.get('version') == version: generado = anterior['generado']
    except (OSError, ValueError, KeyError): pass
    destino.write_text(json.dumps({'version': version, 'generado': generado, 'ficheros': ficheros}, ensure_ascii=False, sort_keys=True, indent=2) + '\n', encoding='utf-8')
    print(f'Manifiesto {version}: {len(ficheros)} ficheros, {sum(v["bytes"] for v in ficheros.values())} bytes')


if __name__ == '__main__': main()
