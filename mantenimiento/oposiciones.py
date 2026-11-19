"""Seguimiento de oposiciones desde el BOE: convocatorias con plazo de inscripción, novedades de cada proceso y ofertas de empleo público.

Fuente: el sumario diario del BOE (API de datos abiertos) y el texto de cada anuncio (xml.php). Sin IA.
  - Sección II.B (Oposiciones y concursos): todas las administraciones (Estado, comunidades, entes locales, universidades).
    Se descartan los procedimientos que no son de acceso (libre designación, provisión de puestos, traslados, cargos judiciales,
    profesorado universitario).
  - Cualquier sección: las ofertas de empleo público (OEP), que anuncian lo que se va a convocar.
Del texto de cada convocatoria se saca el plazo de solicitudes («veinte días hábiles a contar desde el siguiente al de la publicación
en el BOE») y se calcula la fecha de fin. La fecha es ESTIMADA: cuenta sábados, domingos y festivos nacionales como inhábiles
(art. 30 de la Ley 39/2015), pero no los autonómicos ni los locales; si alguno cae dentro, el plazo acaba un día más tarde.

Guarda en actualizacion/oposiciones/:
  estado.json        último día revisado
  anuncios.jsonl     un anuncio por línea (lo que dice el título)
  detalles.json      lo que dice el texto (plazo, plazas, grupo, sistema, bases), por identificador
  textos/ID.txt.gz   texto del anuncio, para volver a analizarlo sin descargar
  oposiciones.json   lo que lee la app y Plaza Hoy (se regenera en cada pasada)

Uso:
  python3 -I actualizacion/oposiciones.py                    # días pendientes desde la última vez (la primera vez, desde el 1/1)
  python3 -I actualizacion/oposiciones.py --desde 20260101   # volver a revisar desde una fecha
  python3 -I actualizacion/oposiciones.py --solo-exportar    # rehacer oposiciones.json con lo guardado (sin red)
  python3 -I actualizacion/oposiciones.py --reanalizar       # volver a extraer los detalles de los textos guardados (sin red)
"""
import datetime as dt
import gzip, http.client, json, re, sys, time, unicodedata, urllib.error, urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

DIR = Path(__file__).resolve().parent / 'oposiciones'
UA = {'User-Agent': 'plaza-actualizacion/1.0'}
INICIO = dt.date(2026, 1, 1)          # primera revisión: todo el año en curso (para cruzar con las OEP)
DIAS_TEXTO = 75                       # se descarga el texto de las convocatorias de los últimos 75 días (plazos que pueden seguir abiertos)
PAUSA = 0.35                          # segundos entre peticiones al BOE

# Festivos nacionales (inhábiles en todo el territorio, calendario de días inhábiles de la AGE). Los autonómicos y locales no se cuentan.
FESTIVOS = {dt.date(*f) for f in [
    (2025, 1, 1), (2025, 1, 6), (2025, 4, 18), (2025, 5, 1), (2025, 8, 15), (2025, 11, 1), (2025, 12, 6), (2025, 12, 8), (2025, 12, 25),
    (2026, 1, 1), (2026, 1, 6), (2026, 4, 3), (2026, 5, 1), (2026, 8, 15), (2026, 10, 12), (2026, 12, 8), (2026, 12, 25),
    (2027, 1, 1), (2027, 1, 6), (2027, 3, 26), (2027, 5, 1), (2027, 10, 12), (2027, 11, 1), (2027, 12, 6), (2027, 12, 8), (2027, 12, 25)]}

MESES = {m: i for i, m in enumerate('enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(), 1)}
NUM = {'un': 1, 'uno': 1, 'una': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
       'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15, 'dieciseis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
       'veinte': 20, 'veintiuno': 21, 'veintidos': 22, 'veintitres': 23, 'veinticuatro': 24, 'veinticinco': 25, 'veintiseis': 26,
       'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29, 'treinta': 30, 'cuarenta': 40, 'cuarenta y cinco': 45, 'sesenta': 60}
FUERA = ('libre designacion', 'provision de puesto', 'provision, por', 'traslado', 'cargos judiciales', 'docentes universitarios',
         'profesorado universitario', 'profesor titular', 'catedratic', 'comision de servicios', 'puestos de trabajo', 'puesto de trabajo',
         'concurso de meritos para la provision', 'jueces sustitutos', 'magistrados suplentes', 'personal eventual', 'concurso unitario',
         'convoca la provision', 'convocan la provision', 'se convoca concurso para la provision', 'concurso de acceso a plazas de cuerpos docentes')
# Lo que acredita cada grupo (art. 76 del TREBEP), para mostrarlo al opositor.
TITULACION = {'A1': 'Grado universitario', 'A2': 'Grado universitario', 'B': 'Técnico Superior (FP)', 'C1': 'Bachiller o Técnico (FP)',
              'C2': 'Graduado en ESO', 'E': 'Sin titulación (agrupaciones profesionales)'}


def norm(t):
    t = unicodedata.normalize('NFD', (t or '').casefold())
    return ' '.join(''.join(c for c in t if not unicodedata.combining(c)).split())


lista = lambda v: [] if v is None else v if isinstance(v, list) else [v]
iso = lambda d: d.strftime('%Y%m%d')
de_iso = lambda s: dt.date(int(s[:4]), int(s[4:6]), int(s[6:8]))


def guardar(ruta, datos):
    tmp = ruta.with_suffix(ruta.suffix + '.tmp')
    tmp.write_text(json.dumps(datos, ensure_ascii=False, indent=1) + '\n', encoding='utf-8'); tmp.replace(ruta)


_ultima = [0.0]


def pedir(url, accept='application/json'):
    for intento in range(3):
        time.sleep(max(0, PAUSA - (time.monotonic() - _ultima[0])))
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=dict(UA, Accept=accept)), timeout=40) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            if intento == 2: raise
        except (urllib.error.URLError, OSError, http.client.HTTPException):
            if intento == 2: raise
        finally:
            _ultima[0] = time.monotonic()
        time.sleep(3 * (intento + 1))


# ---------------------------------------------------------------- título → anuncio

def ambito(dep):
    d = norm(dep)
    if d.startswith('administracion local'): return 'Local'
    if d.startswith('universidades'): return 'Universidades'
    if d.startswith('comunidad') or d.startswith('ciudad de') or d.startswith('ciudad autonoma'): return 'Autonómica'
    return 'Estatal'


RE_OEP = re.compile(r'(?:aprueba|publica|modifica|amplia|se corrigen errores|correccion de errores)[^.]{0,80}?oferta (?:de empleo publico|publica de empleo|de empleo)')


def tipo(t):
    """t: título normalizado."""
    if t.startswith('sentencia') or 'becas' in t or 'acumulan las plazas' in t: return 'otro'
    if 'declara inhabil' in t or 'declaran inhabil' in t: return 'inhábil'
    if RE_OEP.search(t) and not re.search(r'\bse convoca|por la que se convocan', t): return 'oep'
    for clave, nombre in (('correccion de error', 'corrección'), ('se corrigen error', 'corrección'), ('admitid', 'admitidos'), ('excluid', 'admitidos'),
                          ('aprobad', 'aprobados'), ('superado', 'aprobados'), ('seleccionad', 'aprobados'), ('tribunal', 'tribunal'),
                          ('comision de seleccion', 'tribunal'), ('organo de seleccion', 'tribunal'), ('fecha', 'examen'), ('lugar', 'examen'), ('celebracion', 'examen'),
                          ('nombra', 'nombramiento'), ('modifica', 'modificación'), ('amplia', 'modificación'), ('deja sin efecto', 'modificación'),
                          ('anula', 'modificación'), ('desiert', 'otro')):
        if clave in t: return nombre
    if re.search(r'\bse convoca|\bconvocan?\b|\bconvocar\b|referente a la convocatoria|por la que se convoca|(?:publica|anuncia) la convocatoria|convocatoria (?:de|del) (?:proceso|procesos) selectivos?', t): return 'convocatoria'
    return 'otro'


def organismo(titulo, dep):
    m = re.match(r'^[^,]*?\bde \d{1,2} de \w+ de \d{4},\s+(?:de la |del |de los |de las |de )(.+?),\s+(?:por|referente|sobre|relativa|de convocatoria|en relaci)', titulo)
    o = m.group(1).strip() if m else ''
    if not o or re.match(r'(Subsecretar|Secretar|Direcci|Presidencia$|Comisi[oó]n Permanente)', o):
        base = dep.title().replace(' De ', ' de ').replace(' Del ', ' del ').replace(' La ', ' la ').replace(' Y ', ' y ').replace(' Para ', ' para ').replace(' Las ', ' las ').replace(' Los ', ' los ').replace(' El ', ' el ')
        return base if not o else f'{base} · {o}'
    return o


def provincia(titulo, amb, dep):
    if amb == 'Local':
        m = re.search(r'\(([^()]+)\)', titulo); return m.group(1) if m else ''
    if amb == 'Autonómica': return re.sub(r'^(COMUNIDAD AUTÓNOMA|COMUNIDAD FORAL|CIUDAD AUTÓNOMA|CIUDAD) DE (LA |LAS |LOS )?', '', dep).title()
    return ''


def referencia(titulo):
    """«convocado por Resolución de 18 de diciembre de 2025» → ('resolucion', '20251218')"""
    m = re.search(r'convocad[oa]s? por (?:la |el )?(resolucion|orden|acuerdo|decreto)(?: [a-z]+/\d+/\d{4})?,? de (\d{1,2}) de (\w+)(?: de (\d{4}))?', norm(titulo))
    if not m or m.group(3) not in MESES: return None
    return m.group(1), f'{m.group(4) or "????"}{MESES[m.group(3)]:02d}{int(m.group(2)):02d}'


def fecha_disposicion(titulo):
    m = re.match(r'^(\w+)[^,]*? de (\d{1,2}) de (\w+) de (\d{4})', norm(titulo))
    if not m or m.group(3) not in MESES: return None, None
    return m.group(1), f'{m.group(4)}{MESES[m.group(3)]:02d}{int(m.group(2)):02d}'


def items(sumario):
    for diario in lista(sumario['data']['sumario']['diario']):
        for sec in lista(diario.get('seccion')):
            for dep in lista(sec.get('departamento')):
                for it in lista(dep.get('item')): yield sec.get('codigo'), it, dep.get('nombre', ''), ''
                for ep in lista(dep.get('epigrafe')):
                    for it in lista(ep.get('item')): yield sec.get('codigo'), it, dep.get('nombre', ''), ep.get('nombre', '')


def es_laboral(titulo, epi, texto=''):
    """Personal laboral (no funcionario): lo dice el título, el epígrafe «Personal laboral» o el principio del texto."""
    t = norm(titulo); x = norm(texto)[:2500]
    return 'personal laboral' in t or norm(epi) == 'personal laboral' or 'laboral fij' in t \
        or bool(re.search(r'personal laboral fijo|plantilla de personal laboral|contrato laboral|regimen laboral', x))


def anuncio(sec, it, dep, epi, dia):
    t = norm(it['titulo'])
    if sec != '2B' and 'oferta de empleo publico' not in t and 'oferta publica de empleo' not in t: return None
    if sec == '2B' and any(f in t for f in FUERA) and 'oferta de empleo' not in t: return None
    tp = tipo(t); amb = ambito(dep); rango, fdisp = fecha_disposicion(it['titulo'])
    return dict(id=it['identificador'], fecha=dia, seccion=sec, titulo=it['titulo'], departamento=dep, epigrafe=epi, tipo=tp, ambito=amb,
                organismo=organismo(it['titulo'], dep), provincia=provincia(it['titulo'], amb, dep), rango=rango, fecha_disposicion=fdisp,
                ref=referencia(it['titulo']), turno=('promoción interna' if 'promocion interna' in t else 'estabilización' if 'estabiliz' in t else 'libre' if 'libre' in t else ''),
                laboral=es_laboral(it['titulo'], epi), url=it.get('url_html') or f"https://www.boe.es/diario_boe/txt.php?id={it['identificador']}")


# ---------------------------------------------------------------- texto → detalles

def texto_de(ident):
    ruta = DIR / 'textos' / f'{ident}.txt.gz'
    if ruta.exists(): return gzip.decompress(ruta.read_bytes()).decode('utf-8')
    x = pedir(f'https://www.boe.es/diario_boe/xml.php?id={ident}', 'application/xml')
    if not x: return None
    raiz = ET.fromstring(x); tx = raiz.find('texto')
    partes = []
    for el in (tx.iter() if tx is not None else []):
        if el.tag == 'p': partes.append(' '.join(''.join(el.itertext()).split()))
        elif el.tag == 'table': partes.append('‖‖')  # empieza una tabla
        elif el.tag == 'tr': partes.append('‖ ' + ' | '.join(' '.join(''.join(c.itertext()).split()) for c in el if c.tag in ('td', 'th')))
    texto = '\n'.join(p for p in partes if p and p != '‖ ')
    ruta.parent.mkdir(parents=True, exist_ok=True); ruta.write_bytes(gzip.compress(texto.encode('utf-8')))
    return texto


def numero(s):
    s = norm(s).strip()
    if re.fullmatch(r'\d[\d.]*', s): return int(s.replace('.', ''))
    return NUM.get(s)


PAT_PLAZO = re.compile(
    r'(?:plazo|t[eé]rmino)(?: de| para la| para)?(?: la)? (?:presentaci[oó]n(?: de)?|present(?:ar)?|inscripci[oó]n|admisi[oó]n)(?: de| las| los)?(?: las| los)? '
    r'(?:solicitudes|instancias|inscripciones|candidaturas)?[^.\n]{0,120}?(?:ser[aá] de|es de|de|en el plazo de|dentro del plazo de)\s+'
    r'((?:\d+|[a-záéíóúñ]+(?: y [a-z]+)?))\s+(d[ií]as?|mes(?:es)?|semanas?)(?:\s+(h[aá]biles|naturales))?([^.\n]{0,260})', re.I)


PAT_PLAZO2 = re.compile(
    r'(?:presentaci[oó]n de (?:las )?(?:solicitudes|instancias)|solicitudes de participaci[oó]n|las solicitudes)[^.\n]{0,140}?(?:en|dentro de)l? (?:el )?plazo (?:m[aá]ximo )?de\s+'
    r'((?:\d+|[a-záéíóúñ]+(?: y [a-z]+)?))\s+(d[ií]as?|mes(?:es)?|semanas?)(?:\s+(h[aá]biles|naturales))?([^.\n]{0,260})', re.I)


def plazo(texto):
    """Primera frase de plazo de solicitudes: cifra, unidad, calificación y desde cuándo cuenta."""
    for m in list(PAT_PLAZO.finditer(texto)) + list(PAT_PLAZO2.finditer(texto)):
        n = numero(m.group(1))
        if not n or n > 90: continue
        unidad = 'mes' if norm(m.group(2)).startswith('mes') else 'semana' if norm(m.group(2)).startswith('semana') else 'dia'
        cal = norm(m.group(3) or '') or None
        cola = norm(m.group(4)); frase = ' '.join(m.group(0).split())
        if 'boletin oficial del estado' in cola or '«boe»' in cola or ' boe' in cola: desde = 'BOE'
        elif re.search(r'boletin oficial|diari oficial|diario oficial|butlleti|bopa|bocm|borm|bop\b|doe\b|dogv|dogc|bon\b|boja|bocyl|boc\b|bor\b|dog\b|boib', cola): desde = 'otro boletín'
        else: desde = 'BOE' if 'publicacion' in cola else None
        if unidad == 'dia' and cal is None and 'excluyendose' in cola and 'sabados' in cola: cal = 'habiles'
        out = dict(cifra=n, unidad=unidad, calificacion=cal, desde=desde, frase=frase[:420])
        if desde == 'otro boletín': out['fechas_boletin'] = fecha_otro_boletin(texto, cola)
        return out
    return None


def fecha_otro_boletin(texto, cola):
    """«…desde el siguiente al de la publicación en el Diari Oficial de la Generalitat de Catalunya» y, en el mismo anuncio,
    «Diari Oficial de la Generalitat de Catalunya número 9772, de 14 de octubre de 2026» → '20261014'.
    Solo si el anuncio nombra ese mismo boletín con una fecha (cuando se publica después del BOE no la puede decir)."""
    m = re.search(r'(boletin oficial|diari oficial|diario oficial|butlleti oficial)\s+(?:de la |del |de )?((?:provincia de |comunidad de |comunitat |generalitat de |la )?[a-z]+)', cola)
    if not m: return None
    nombre = m.group(0)
    t = norm(texto); fechas = set()
    for x in re.finditer(re.escape(nombre) + r'[^.]{0,120}?,?\s+(?:de fecha |de )?(\d{1,2}) de (\w+) de (\d{4})', t):
        if x.group(2) not in MESES: continue
        # solo la publicación del extracto o anuncio de la convocatoria (la que abre el plazo), no la de las bases
        frase = t[t.rfind('.', 0, x.start()) + 1: t.find('.', x.end()) if t.find('.', x.end()) > 0 else len(t)]
        if 'extracto' in frase or 'anuncio de la convocatoria' in frase or 'anuncio de convocatoria' in frase or 'convocatoria' in frase and 'bases' not in frase:
            fechas.add(f'{x.group(3)}{MESES[x.group(2)]:02d}{int(x.group(1)):02d}')
    return sorted(fechas)


def es_habil(d, extra=frozenset()):
    return d.weekday() < 5 and d not in FESTIVOS and d not in extra


def agosto(ano):
    return frozenset(dt.date(int(ano), 8, d) for d in range(1, 32))


def fin_plazo(pub, p, extra=frozenset()):
    """Último día para presentar la solicitud (estimado) con la regla del art. 30 de la Ley 39/2015, si cuenta desde el BOE."""
    if not p: return None
    if p.get('desde') == 'BOE': d = de_iso(pub)
    elif p.get('desde_fecha'): d = de_iso(p['desde_fecha'])
    else: return None
    n = p['cifra']
    if p['unidad'] == 'dia' and p['calificacion'] == 'naturales':
        f = d + dt.timedelta(days=n)
    elif p['unidad'] == 'dia':  # «días» a secas o hábiles: en procedimiento administrativo, hábiles (art. 30.2)
        f = d; k = 0
        while k < n:
            f += dt.timedelta(days=1)
            if es_habil(f, extra): k += 1
        return iso(f)
    elif p['unidad'] == 'semana':
        f = d + dt.timedelta(weeks=n)
    else:  # meses: concluye el mismo día del mes de vencimiento (art. 30.4); si no existe, el último del mes
        y, mth = d.year + (d.month - 1 + n) // 12, (d.month - 1 + n) % 12 + 1
        ult = (dt.date(y + (mth == 12), mth % 12 + 1, 1) - dt.timedelta(days=1)).day
        f = dt.date(y, mth, min(d.day, ult))
    while not es_habil(f, extra): f += dt.timedelta(days=1)  # si el último día es inhábil, se prorroga al primer hábil (art. 30.5)
    return iso(f)


GRUPO_ESC = [  # por orden: lo más específico primero
    (r'clase (?:de )?(?:tecnicos? )?medi[oa]s?\b|tecnic[oa] medi[oa]|arquitect[oa] tecnic[oa]|ingenier[oa] tecnic[oa]|subescala de gestion|cuerpo de gestion|gestion procesal|diplomad', 'A2'),
    (r'clase (?:de )?(?:tecnicos? )?superior(?:es)?\b|tecnic[oa] superior|cuerpo superior|subescala tecnica de administracion general|letrad|arquitect[oa](?! tecnic)|ingenier[oa](?! tecnic)', 'A1'),
    (r'subescala auxiliar|cuerpo general auxiliar|auxiliar administrativ|auxilio judicial', 'C2'),
    (r'subescala administrativa|cuerpo general administrativo|\badministrativ[oa](?:/a)?\b|agente de (?:la )?(?:policia|guardia)|policia local|tramitacion procesal', 'C1'),
    (r'subescala subalterna|subalterno|ordenanza|conserje|peon|operari', 'E')]


GRUPO_TEXTO = [(r'clase (?:de )?(?:tecnicos? )?superior', 'A1'), (r'clase (?:de )?(?:tecnicos? )?medi[oa]', 'A2'), (r'subescala tecnica de administracion general', 'A1'),
               (r'subescala de gestion', 'A2'), (r'subescala administrativa', 'C1'), (r'subescala auxiliar', 'C2'), (r'subescala subalterna', 'E')]


def limpia_puesto(x):
    x = re.sub(r'^(?:la|el|los|las)\s+', '', x.strip(' :'))
    return x[:1].upper() + x[1:] if x else x


def detalles(a, texto):
    t = norm(texto); out = {}
    p = plazo(texto)
    if p:
        fechas = p.pop('fechas_boletin', None)
        if fechas:  # la publicación en el otro boletín: la más reciente que sea anterior al BOE y de los últimos 150 días
            ok = [f for f in fechas if iso(de_iso(a['fecha']) - dt.timedelta(days=150)) <= f <= a['fecha']]
            if ok: p['desde_fecha'] = ok[-1]
        out['plazo'] = p; out['fin'] = fin_plazo(a['fecha'], p)
        if p.get('desde_fecha') and out['fin'] and out['fin'] < a['fecha']:  # no tiene sentido publicar en el BOE un plazo ya cerrado: mejor sin fecha
            p.pop('desde_fecha'); out['fin'] = None
    s = re.search(r'sistema(?: selectivo)?(?: sera el)?(?: de)? (concurso-oposicion|concurso oposicion|oposicion libre|oposicion|concurso de meritos|concurso)', t)
    if s: out['sistema'] = {'concurso oposicion': 'concurso-oposición', 'concurso-oposicion': 'concurso-oposición', 'oposicion libre': 'oposición', 'oposicion': 'oposición',
                            'concurso de meritos': 'concurso', 'concurso': 'concurso'}[s.group(1)]
    pl = re.search(r'(?:convoca[rn]?|convocatoria para (?:proveer|cubrir)|proveer|cubrir|provision de|para la provision de)[^.\n]{0,90}?\b(\d[\d.]*|una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta)\s+plazas?\b', t)
    if pl: out['plazas'] = numero(pl.group(1))
    elif re.search(r'\buna plaza\b', t[:600]): out['plazas'] = 1
    # qué se convoca: la categoría, lo que sigue a «proveer:» en los extractos de entes locales, o el cuerpo/escala del título o del texto
    cab = a['titulo'] + '\n' + texto[:3000]; puesto = None
    m = re.search(r'categor[ií]as?(?: profesional(?:es)?)? de ([^,;.\n()]{3,120})', cab)
    if m: puesto = m.group(1)
    if not puesto:
        m = re.search(r'(?:convocatoria para proveer|proveer|cubrir)\s*:?\s+((?:una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|varias|\d+)\s+plazas?\s+de\s+[^,.;\n]{3,140})', texto, re.I)
        if m:
            x = re.sub(r'^(?:una|un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|varias|\d+)\s+plazas?\s+de\s+', '', m.group(1), flags=re.I).strip()
            if not re.match(r'(acceso|turno|promoci|reserva|nuevo ingreso|personal (funcionario|laboral|estatutario)\b)', norm(x)): puesto = x
    if not puesto:
        m = re.search(r'((?:Cuerpo|Escala|Subescala|Carrera|escala)\s[^,;.\n]{3,140}?)(?=,| por | mediante| en el ámbito| de las Instituciones| de la Administración de Justicia\b|\.|$)', cab)
        if m: puesto = m.group(1)
    if puesto: out['puesto'] = limpia_puesto(puesto)
    g = re.search(r'\b(?:sub)?grupo(?: de clasificacion(?: profesional)?)?\s+(a1|a2|c1|c2|b)\b', t)
    if g: out['grupo'] = g.group(1).upper()
    else:  # por el nombre de la plaza, luego el título, luego el principio del texto
        sin_a = lambda x: re.sub(r'/(?:as?|os?)\b|\((?:as?|os?)\)', '', x)
        out['grupo'] = next((gr for src in (sin_a(norm(out.get('puesto', ''))), sin_a(norm(a['titulo']))) for pat, gr in GRUPO_ESC if src and re.search(pat, src)), None) \
            or next((gr for pat, gr in GRUPO_TEXTO if re.search(pat, t[:2500])), None)
        if not out['grupo']: del out['grupo']
    b = re.search(r'en el «?(bolet[ií]n oficial de (?:la )?(?:provincia de |la provincia de )?[^»,]+|diari oficial[^»,]+|diario oficial[^»,]+|butllet[ií][^»,]+)»?,? (?:n[uú]mero|n\.º|núm\.)\s*(\d+),? de (?:fecha )?(\d{1,2} de \w+ de \d{4})', texto, re.I)
    if b: out['bases'] = f'{b.group(1).strip()} n.º {b.group(2)}, de {b.group(3)}'
    if 'discapacidad' in t and 'reserva' in t: out['reserva_discapacidad'] = True
    if es_laboral('', '', texto): out['laboral'] = True
    anos = re.findall(r'ofertas? de empleo publico (?:correspondientes? (?:al|a los) (?:ejercicios?|anos?) |para el (?:ano|ejercicio) |del (?:ano|ejercicio) |de (?:los anos |los ejercicios )?)?(\d{4})', t)
    if anos: out['oep'] = anos[0]; out['oep_anos'] = sorted(set(anos))
    rds = re.findall(r'real decreto (\d+/\d{4}),? de \d{1,2} de \w+,? (?:por (?:el )?que se aprueba|de aprobacion de) (?:la )?oferta', t)
    if rds: out['oep_rd'] = sorted(set(rds))
    return out


# ---------------------------------------------------------------- escaneo diario

def cargar_anuncios():
    r = DIR / 'anuncios.jsonl'
    xs = [json.loads(l) for l in r.read_text(encoding='utf-8').splitlines() if l.strip()] if r.exists() else []
    for a in xs:  # la clasificación puede haber mejorado desde que se guardó
        t = norm(a['titulo']); a['tipo'] = 'fuera' if a.get('seccion') == '2B' and any(f in t for f in FUERA) and 'oferta de empleo' not in t else tipo(t)
    return xs


def escanear(desde=None, hasta=None, log=print):
    DIR.mkdir(parents=True, exist_ok=True)
    est = DIR / 'estado.json'; hoy = hasta or dt.date.today()
    dia = desde or (de_iso(json.loads(est.read_text())['ultimo']) + dt.timedelta(days=1) if est.exists() else INICIO)
    conocidos = {a['id'] for a in cargar_anuncios()}; nuevos = []; dias = 0
    with open(DIR / 'anuncios.jsonl', 'a', encoding='utf-8') as f:
        while dia <= hoy:
            s = iso(dia); raw = pedir(f'https://www.boe.es/datosabiertos/api/boe/sumario/{s}')
            if raw is None and dia == dt.date.today() and dia.weekday() != 6:
                raise RuntimeError(f'El sumario de {s} aún no está disponible; se reintentará.')
            for sec, it, dep, epi in (items(json.loads(raw)) if raw else ()):
                a = anuncio(sec, it, dep, epi, s)
                if a and a['id'] not in conocidos:
                    f.write(json.dumps(a, ensure_ascii=False) + '\n'); conocidos.add(a['id']); nuevos.append(a)
            f.flush(); guardar(est, {'ultimo': s}); dias += 1
            if dias % 20 == 0: log(f'  … {s}: {len(nuevos)} anuncios nuevos')
            dia += dt.timedelta(days=1)
    return dias, nuevos


def completar(reanalizar=False, log=print):
    """Descarga el texto de las convocatorias recientes y de las OEP, y extrae sus detalles."""
    ruta = DIR / 'detalles.json'; det = json.loads(ruta.read_text()) if ruta.exists() else {}
    limite = iso(dt.date.today() - dt.timedelta(days=DIAS_TEXTO)); n = 0
    for a in cargar_anuncios():
        if a['tipo'] not in ('convocatoria', 'oep') or (a['tipo'] == 'convocatoria' and a['fecha'] < limite and a['ambito'] not in ('Estatal', 'Universidades')): continue
        cache = DIR / 'textos' / f"{a['id']}.txt.gz"
        if a['tipo'] == 'oep' and cache.exists() and '‖‖' not in gzip.decompress(cache.read_bytes()).decode('utf-8'): cache.unlink(); det.pop(a['id'], None)
        if a['id'] in det and not reanalizar: continue
        if reanalizar and not (DIR / 'textos' / f"{a['id']}.txt.gz").exists() and a['id'] in det: continue
        try:
            tx = texto_de(a['id'])
        except Exception as e:
            log(f"  texto {a['id']}: {e}"); continue
        if tx is None: continue
        det[a['id']] = detalles(a, tx) if a['tipo'] == 'convocatoria' else detalles_oep(tx)
        n += 1
        if n % 50 == 0: guardar(ruta, det); log(f'  … {n} textos analizados')
    guardar(ruta, det)
    return n


def detalles_oep(texto):
    """Filas del anexo de una OEP: cuerpo o categoría, grupo, acceso (libre o promoción interna), personal y plazas.
    Lee las tablas marcadas por texto_de (‖‖ abre tabla, ‖ fila) con su contexto: «ANEXO VI · Promoción interna», «Subgrupo A1»,
    «Personal laboral»… Se saltan los totales y los repartos («Plazas que corresponden al Ministerio…»), que repetirían plazas."""
    filas = []; anexo = ''; acceso_anexo = 'libre'; acceso = 'libre'; grupo = None; personal = 'funcionario'; bloque = ''; sub = ''; ignorar = False
    lineas = texto.split('\n')
    for i, l in enumerate(lineas):
        if re.match(r'^ANEXO\b', l):
            sig = lineas[i + 1] if i + 1 < len(lineas) and not lineas[i + 1].startswith('‖') else ''
            anexo = (l + (' · ' + sig if sig and len(sig) < 120 else '')).strip()
            acceso_anexo = 'promoción interna' if 'promocion interna' in norm(anexo) else 'libre'; acceso = acceso_anexo; personal = 'funcionario'; continue
        if l == '‖‖': acceso = acceso_anexo; grupo = None; ignorar = False; personal = 'funcionario'; continue
        if not l.startswith('‖ '): continue
        celdas = [c.strip() for c in l[2:].split(' | ')]; llenas = [c for c in celdas if c]
        if len(llenas) == 1 and not re.fullmatch(r'[\d.]+', llenas[0]):
            h = norm(llenas[0])
            if re.match(r'(su\w{0,3}rupo|grupo) ', h): g = re.search(r'\b(a1|a2|b|c1|c2|e|ap|m3|m2|m1|e2|e1|g\d)\b', h); grupo = g.group(1).upper() if g else None
            elif 'promocion interna' in h: acceso = 'promoción interna'
            elif 'acceso libre' in h or 'nuevo ingreso' in h or 'turno libre' in h: acceso = 'libre'
            elif 'personal laboral' in h: personal = 'laboral'
            elif 'personal funcionario' in h or 'personal estatutario' in h: personal = 'funcionario' if 'funcionario' in h else 'estatutario'
            elif h.startswith('plazas que corresponden') or h.startswith('distribucion') or h.startswith('de las cuales') or h.startswith('ambito'): ignorar = True
            elif llenas[0].upper() == llenas[0] and len(h) > 8 and not h.startswith('total'): bloque = sub = llenas[0]; ignorar = False
            elif len(h) > 8 and not h.startswith('total') and not h.endswith(':'): sub = llenas[0]  # «Instituto Nacional de Gestión Sanitaria»
            continue
        nums = [int(c.replace('.', '')) for c in celdas if re.fullmatch(r'\d{1,3}(?:\.\d{3})+|\d+', c)]
        nombre = next((c for c in celdas if len(re.findall(r'[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]', c)) >= 4), None)
        if not nombre or not nums or ignorar or norm(nombre).startswith('total') or len(nombre) > 220: continue
        if re.fullmatch(r'(personal|personal (funcionario|laboral|estatutario))', norm(nombre).strip(' .')):  # la fila solo dice «PERSONAL»: es el de la cabecera
            if not sub: continue
            nombre = f"Personal {'estatutario' if personal == 'estatutario' else personal} · {sub}"
        if re.fullmatch(r'(funcionarios?|laborales?|cupo general|reserva.*|acceso libre|promocion interna)', norm(nombre).strip(' .')): continue
        codigo = celdas[0] if re.fullmatch(r'[0-9]{3,4}[A-Z]?', celdas[0]) else None
        gr = grupo or next((g for pat, g in GRUPO_ESC if re.search(pat, re.sub(r'^cuerpo (de |del )?', 'cuerpo de ', norm(nombre)))), None)
        filas.append(dict(nombre=nombre.rstrip('. '), codigo=codigo, grupo=gr, acceso=acceso, personal=personal, bloque=bloque, anexo=anexo, plazas=nums[-1]))
    t = norm(texto)
    tot = re.search(r'(?:un total de|total de|se autoriza(?:n)?(?: la convocatoria de)?|asciende a|comprende)\s+(\d[\d.]*)\s+plazas', t)
    total = int(tot.group(1).replace('.', '')) if tot else None
    ano = re.search(r'(?:para el (?:ano|ejercicio)|correspondiente al ejercicio|del ejercicio|para) (\d{4})', t[:3000])
    return dict(filas=filas[:1500], total=total or (sum(f['plazas'] for f in filas) or None), ano=ano.group(1) if ano else None)


VACIAS = {'de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'a', 'cuerpo', 'cuerpos', 'escala', 'escalas', 'general', 'especialidad', 'especialidades',
          'categoria', 'personal', 'plazas', 'plaza', 'grupo', 'subgrupo', 'profesional', 'o', 'u', 'por', 'para', 'con', 'sus'}


def fichas_tokens(x):
    return {w for w in re.findall(r'[a-z0-9]+', norm(x)) if w not in VACIAS and len(w) > 2}


def cruzar_oep(o, anuncio_oep, convs, det, manual):
    """Estado de cada fila del anexo: convocada (con su convocatoria), probable (casa por nombre, sin texto que cite la oferta) o pendiente.
    Devuelve las filas y la cola de revisión (filas pendientes con convocatorias parecidas)."""
    rd = re.match(r'real decreto (\d+/\d{4})', norm(anuncio_oep['titulo'])); rd = rd.group(1) if rd else None
    ano = o.get('ano') or (re.search(r'(\d{4})', anuncio_oep['titulo'][anuncio_oep['titulo'].lower().find('oferta'):]) or [None, None])[1]
    cand = [c for c in convs if c['fecha'] >= anuncio_oep['fecha'] and (c['ambito'] == anuncio_oep['ambito'] if anuncio_oep['ambito'] != 'Universidades' else norm(c['organismo']) == norm(anuncio_oep['organismo']))]
    cand = [c for c in cand if c['fecha'] > anuncio_oep['fecha']]  # el mismo día suele salir lo convocado con la oferta anterior
    ctok = {c['id']: fichas_tokens(c['titulo'] + ' ' + (det.get(c['id'], {}).get('puesto') or '')) for c in cand}
    plano = lambda x: re.sub(r'\b(cuerpo|escala|subescala)( general)? (de |del )?', '', re.sub(r'[^a-z0-9 ]', ' ', norm(x))).split()
    ctxt = {c['id']: ' '.join(plano(c['titulo'] + ' ' + (det.get(c['id'], {}).get('puesto') or ''))) for c in cand}
    filas, cola = [], []
    for f in o.get('filas', []):
        clave = f"{anuncio_oep['id']}|{norm(f['anexo'])[:40]}|{f['acceso']}|{norm(f['nombre'])}"
        ft = fichas_tokens(f['nombre']); casan, parecidas = [], []
        for c in cand:
            d = det.get(c['id'], {}); tc = ctok[c['id']]; tn = norm(c['titulo'])
            if not ft: continue
            comun = len(ft & tc) / len(ft)
            pi = 'promocion interna' in tn or c.get('turno') == 'promoción interna'; libre = 'libre' in tn or not pi
            if comun == 1 and ((f['acceso'] == 'promoción interna' and pi) or (f['acceso'] == 'libre' and libre)):
                cita = (rd and rd in d.get('oep_rd', [])) or (ano and ano in d.get('oep_anos', []))
                contra = (d.get('oep_rd') and rd and rd not in d['oep_rd']) or (d.get('oep_anos') and ano and ano not in d['oep_anos'])
                literal = ' '.join(plano(f['nombre'])) in ctxt[c['id']]  # el nombre del anexo aparece tal cual en la convocatoria
                if not contra and (cita or literal or c['id'] not in det): casan.append((c, bool(cita)))
                elif not contra: parecidas.append(c)
            elif comun >= 0.5: parecidas.append(c)
        m = manual.get(clave)
        if m and m.get('ninguna'): casan = []
        elif m and m.get('convocatorias'): casan = [(c, True) for c in convs if c['id'] in m['convocatorias']]
        estado = 'convocada' if any(x[1] for x in casan) else 'probable' if casan else 'pendiente'
        filas.append(dict(f, clave=clave, estado=estado, convocatorias=[dict(id=c['id'], fecha=c['fecha'], url=c['url'], cita=ci) for c, ci in casan[:5]]))
        if estado != 'convocada' and not m and (parecidas or casan):
            cola.append(dict(clave=clave, oferta=anuncio_oep['titulo'][:160], fila=f['nombre'], acceso=f['acceso'], plazas=f['plazas'],
                             candidatas=[dict(id=c['id'], fecha=c['fecha'], titulo=c['titulo'][:220]) for c, _ in casan][:5] + [dict(id=c['id'], fecha=c['fecha'], titulo=c['titulo'][:220]) for c in parecidas][:5]))
    return filas, cola


# ---------------------------------------------------------------- exportación para la app

def exportar(log=print):
    anuncios = cargar_anuncios(); det = json.loads((DIR / 'detalles.json').read_text()) if (DIR / 'detalles.json').exists() else {}
    hoy = iso(dt.date.today())
    conv = [a for a in anuncios if a['tipo'] == 'convocatoria']
    # seguimiento: cada novedad («convocado por Resolución de 18 de diciembre de 2025») se cuelga de su convocatoria si la tenemos
    indice = {}
    for c in conv:
        if c['rango'] and c['fecha_disposicion']: indice.setdefault((norm(c['departamento']), c['rango'], c['fecha_disposicion']), []).append(c['id'])
    novedades = {}
    for a in anuncios:
        if a['tipo'] in ('convocatoria', 'oep') or not a.get('ref'): continue
        for cid in indice.get((norm(a['departamento']), a['ref'][0], a['ref'][1]), [])[:1]:
            novedades.setdefault(cid, []).append(dict(fecha=a['fecha'], tipo=a['tipo'], titulo=a['titulo'], url=a['url']))

    # agosto declarado inhábil por un departamento (para sus procesos selectivos): sus plazos en días hábiles no cuentan agosto
    inhabil = {}
    for a in anuncios:
        if a['tipo'] == 'inhábil' and 'agosto' in norm(a['titulo']) and 'concurso' not in norm(a['titulo']).split('a efectos')[-1][:60]:
            y = re.search(r'agosto(?: de)? (\d{4})', norm(a['titulo'])); inhabil.setdefault(norm(a['departamento']), set()).add(y.group(1) if y else a['fecha'][:4])

    def ficha(c):
        d = det.get(c['id'], {}); p = d.get('plazo') or {}; fin = d.get('fin'); ago = False
        if p and fin and c['ambito'] == 'Estatal':
            for y in inhabil.get(norm(c['departamento']), ()):
                if c['fecha'][:4] == y and c['fecha'][4:6] <= '08' and fin[:4] == y and fin[4:6] >= '08':
                    f2 = fin_plazo(c['fecha'], p, agosto(y))
                    if f2 != fin: fin = f2; ago = True
        estado = ('abierto' if fin and fin >= hoy else 'cerrado' if fin else 'sin fecha' if c['fecha'] >= iso(dt.date.today() - dt.timedelta(days=45)) else 'cerrado')
        puesto = d.get('puesto')
        if not puesto:  # sin texto o sin plaza reconocible: lo que se convoca según el título
            m = re.search(r'por (?:la|el) que se convoca(?:n)?\s+(?:el |la |los |las )?(.+?)(?:,? convocad[oa]s? por|\.$|$)', c['titulo'])
            if m:
                x = m.group(1)
                for _ in range(4):  # quita las fórmulas del principio: «proceso selectivo», «por concurso», «por el sistema general de acceso libre»…
                    x = re.sub(r'^(?:procesos? selectivos?|pruebas selectivas|por concurso(?:-| )?(?:oposici[oó]n)?|por (?:el sistema general de )?acceso libre(?: y (?:por )?promoci[oó]n interna)?|por (?:el sistema de )?promoci[oó]n interna|para (?:el )?(?:ingreso|acceso)(?: a la condici[oó]n de personal \w+ fijo)?|en (?:las?|los?) (?:plazas de la )?categor[ií]as? de|en|a|al)[,\s]+', '', x, flags=re.I)
                puesto = (x[:1].upper() + x[1:])[:120] if len(x) > 3 else None
        if not puesto:  # extracto local sin detalle (p. ej. reapertura de plazo): al menos «Una plaza» o «Varias plazas»
            m = re.search(r'para proveer (una plaza|varias plazas|\w+ plazas)', c['titulo'], re.I)
            if m: puesto = m.group(1).capitalize()
        if puesto:  # sin coletillas administrativas: «Operario/a de la plantilla de personal laboral fijo» → «Operario/a»
            puesto = re.sub(r'\s+(?:de|en) (?:la|su) plantilla\b.*$|\s+vacantes?\s+en\b.*$|,?\s+(?:incluida|incluidas) en la oferta\b.*$', '', puesto, flags=re.I).strip(' ,')
        org = re.sub(r' · (Subsecretar|Secretar|Direcci|Presidencia|Comisi|Gerencia).*$', '', c['organismo'])  # «Ministerio del Interior», sin el órgano que firma
        org = re.sub(r'^(Presidencia|Gerencia|Dirección|Direcci[oó]n General|Rectorado) (de la |del |de )', '', org)
        return dict(id=c['id'], fecha=c['fecha'], titulo=c['titulo'], organismo=org, ambito=c['ambito'], provincia=c['provincia'],
                    puesto=puesto, plazas=d.get('plazas'), grupo=d.get('grupo'), titulacion=TITULACION.get(d.get('grupo')), sistema=d.get('sistema'),
                    turno=c.get('turno'), laboral=es_laboral(c['titulo'], c.get('epigrafe', '')) or bool(d.get('laboral')), bases=d.get('bases'), oep=d.get('oep'), url=c['url'],
                    plazo=(f"{p['cifra']} {'días' if p['unidad'] == 'dia' else 'meses' if p['unidad'] == 'mes' and p['cifra'] > 1 else p['unidad']}{' ' + p['calificacion'].replace('habiles', 'hábiles') if p.get('calificacion') else ''}" if p else None),
                    plazo_desde=p.get('desde'), plazo_desde_fecha=p.get('desde_fecha'), plazo_frase=p.get('frase'), fin=fin, agosto_inhabil=ago, estado=estado, novedades=sorted(novedades.get(c['id'], []), key=lambda x: x['fecha']))

    fichas = [ficha(c) for c in conv]
    abiertas = sorted([f for f in fichas if f['estado'] == 'abierto'], key=lambda f: (f['fin'], f['fecha']))
    sin_fecha = sorted([f for f in fichas if f['estado'] == 'sin fecha'], key=lambda f: f['fecha'], reverse=True)
    recientes = sorted(fichas, key=lambda f: f['fecha'], reverse=True)
    # en curso: convocatorias del año con novedades (listas, exámenes, aprobados), por la última novedad
    en_curso = sorted([f for f in fichas if f['novedades'] and f['estado'] == 'cerrado'], key=lambda f: f['novedades'][-1]['fecha'], reverse=True)[:150]
    otras_novedades = sorted([dict(fecha=a['fecha'], tipo=a['tipo'], titulo=a['titulo'], organismo=a['organismo'], ambito=a['ambito'], url=a['url'])
                              for a in anuncios if a['tipo'] not in ('convocatoria', 'oep', 'otro') and a['fecha'] >= iso(dt.date.today() - dt.timedelta(days=30))],
                             key=lambda x: x['fecha'], reverse=True)[:300]
    # ofertas de empleo público: cada fila del anexo con su estado (convocada / probable / pendiente) y la cola de revisión
    manual = json.loads((DIR / 'correspondencias.json').read_text()) if (DIR / 'correspondencias.json').exists() else {}
    oeps, cola = [], []
    for a in sorted([a for a in anuncios if a['tipo'] == 'oep'], key=lambda x: x['fecha'], reverse=True):
        o = dict(det.get(a['id'], {}))
        if not o.get('filas') and o.get('total'):  # ofertas sin tabla (p. ej. Guardia Civil): una fila con el cuerpo del título y el total
            m = re.search(r'oferta de empleo p[uú]blico (?:del?|en la|en el|de la|para el) (.+?)(?: para| correspondiente| de \d{4}|\.?$)', a['titulo'], re.I)
            if m and not re.match(r'(año|ejercicio)\b', m.group(1)): o['filas'] = [dict(nombre=m.group(1), codigo=None, grupo=None, acceso='libre', personal='funcionario', bloque='', anexo='', plazas=o['total'])]
        filas, c_ = cruzar_oep(o, a, conv, det, manual); cola += c_
        lim = de_iso(a['fecha']); lim = iso(lim.replace(year=lim.year + 3)) if not (lim.month == 2 and lim.day == 29) else iso(dt.date(lim.year + 3, 3, 1))
        res = {e: sum(f['plazas'] for f in filas if f['estado'] == e) for e in ('convocada', 'probable', 'pendiente')}
        oeps.append(dict(id=a['id'], fecha=a['fecha'], titulo=a['titulo'], organismo=a['organismo'], ambito=a['ambito'], provincia=a['provincia'], url=a['url'],
                         modifica=bool(re.search(r'modifica|amplia|correccion|corrigen', norm(a['titulo']))), total=o.get('total'), limite=lim,
                         plazas=res, cuerpos_pendientes=sum(1 for f in filas if f['estado'] == 'pendiente'),
                         filas=[{k: f[k] for k in ('nombre', 'grupo', 'acceso', 'personal', 'plazas', 'estado', 'convocatorias', 'anexo')} for f in filas]))
    guardar(DIR / 'revision_oep.json', dict(
        instrucciones='Filas de una OEP sin convocatoria segura. Para resolver una, añade a correspondencias.json la clave con '
                      '{"convocatorias": ["BOE-A-…"]} si es esa convocatoria, o {"ninguna": true} si todavía no se ha convocado.', pendientes=cola))
    est = json.loads((DIR / 'estado.json').read_text()) if (DIR / 'estado.json').exists() else {}
    out = dict(generado=dt.datetime.now().strftime('%Y%m%d %H:%M'), revisado_hasta=est.get('ultimo'), desde=iso(INICIO),
               aviso='Datos extraídos del BOE (sección II.B y ofertas de empleo público). Las fechas de fin de plazo son estimadas: cuentan los festivos nacionales, '
                     'no los autonómicos ni los locales. Consulta siempre la convocatoria y sus bases.',
               cifras=dict(abiertas=len(abiertas), plazas_abiertas=sum(f['plazas'] or 0 for f in abiertas), convocatorias_ano=len(conv), oep=len(oeps),
                           plazas_oep_pendientes=sum(o['plazas']['pendiente'] for o in oeps), revision_oep=len(cola)),
               abiertas=abiertas, sin_fecha=sin_fecha[:200], en_curso=en_curso, novedades=otras_novedades, oep=oeps[:80],
               recientes=[f for f in recientes if f['estado'] == 'cerrado'][:200])
    guardar(DIR / 'oposiciones.json', out)
    log(f"oposiciones.json: {len(abiertas)} con plazo abierto ({out['cifras']['plazas_abiertas']} plazas), {len(sin_fecha)} sin fecha calculable, "
        f"{len(conv)} convocatorias desde {INICIO:%d/%m/%Y}, {len(oeps)} OEP ({out['cifras']['plazas_oep_pendientes']} plazas pendientes de convocar; {len(cola)} filas en revisión)")
    return out


def main():
    a = sys.argv[1:]
    if '--reanalizar' in a: completar(reanalizar=True); exportar(); return 0
    if '--solo-exportar' not in a:
        desde = de_iso(a[a.index('--desde') + 1]) if '--desde' in a else None
        dias, nuevos = escanear(desde)
        print(f'BOE: {dias} días revisados, {len(nuevos)} anuncios nuevos ({sum(n["tipo"] == "convocatoria" for n in nuevos)} convocatorias)')
        print(f'textos analizados: {completar()}')
    exportar()
    return 0


if __name__ == '__main__':
    import fcntl
    DIR.mkdir(parents=True, exist_ok=True)
    with open(DIR / '.bloqueo', 'w') as b:
        try: fcntl.flock(b, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError: print('ya hay un seguimiento de oposiciones en marcha'); sys.exit(0)
        sys.exit(main())
