"""Abre la edición local de Plaza con la biblioteca estándar de Python."""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import webbrowser

URL = "http://127.0.0.1:8826/"
CARPETA = Path(__file__).resolve().parent / "web"


class Archivos(SimpleHTTPRequestHandler):
    def list_directory(self, path):
        self.send_error(403)
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main():
    try:
        servidor = ThreadingHTTPServer(("127.0.0.1", 8826), functools.partial(Archivos, directory=str(CARPETA)))
    except OSError:
        sys.exit("El puerto 8826 está ocupado. Si Plaza ya está abierta, entra en " + URL)
    print("Plaza está en " + URL + " · Deja esta ventana abierta. Para salir, pulsa Ctrl+C.", flush=True)
    with servidor:
        if "--sin-navegador" not in sys.argv:
            webbrowser.open(URL)
        try:
            servidor.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
