/* Port a JavaScript de plazos/plazos.py (capa de plazos sin IA). Mismas expresiones regulares, mismo orden de reglas y
   mismos textos de aviso: pruebas/comparar.py comprueba que da lo mismo que Python sobre los casos de
   plazos/probar_plazos.py y sobre todos los preceptos exportados. Si cambia plazos.py, hay que cambiar esto.
   Diferencia deliberada: los avisos de comprobar() llevan además `pos` (posición de la expresión en la respuesta), que
   Python no devuelve; las pruebas comparan solo `tipo` y `texto`. */
(function (G) {
  'use strict';
  const P = G.Plaza = G.Plaza || {};
  const { re, strip, rstrip, lstrip, split, sinTilde, buscar } = P.texto;
  const R = String.raw;

  // ------------------------------------------------------------ números en letra
  const U = {un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
    diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
    dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
    veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
    veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80,
    noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
    cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
    mil: 1000};

  const _UNI = R`(?:un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)`;
  const _DEC = R`(?:treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)`;
  const _VEI = R`(?:veinti(?:[uú]n[oa]?|d[oó]s|tr[eé]s|cuatro|cinco|s[eé]is|siete|ocho|nueve)|veinte)`;
  const _ESP = R`(?:diez|once|doce|trece|catorce|quince|dieci(?:s[eé]is|siete|ocho|nueve))`;
  const _CEN = R`(?:ciento|doscient[oa]s|trescient[oa]s|cuatrocient[oa]s|quinient[oa]s|seiscient[oa]s|setecient[oa]s|ochocient[oa]s|novecient[oa]s)`;
  const _MENOR = R`(?:${_DEC}(?:\s+y\s+${_UNI})?|${_VEI}|${_ESP}|${_UNI})`;
  const NUM = R`(?:\d+(?:[.,]\d+)?|${_CEN}(?:\s+${_MENOR})?|cien|mil|${_MENOR})`;
  const UNIDAD = R`(?P<u>horas?|d[ií]as?|semanas?|quincenas?|mes(?:es)?|años?)`;
  const CALIF = R`(?:\s+(?P<c>h[aá]biles|naturales|laborables|n[aá]tural|h[aá]bil))?`;
  const PAT = re(R`(?<![\wáéíóúñ])(?P<n>${NUM})\s+${UNIDAD}${CALIF}(?![\wáéíóúñ])`, 'gi');

  const RX_ENTERO = re(R`^\d+$`), RX_DECIMAL = re(R`^\d+[.,]\d+$`);

  /** «cuarenta y cinco» -> 45, «10» -> 10. null si no es un número. */
  function cifra(n) {
    n = strip(sinTilde(n.toLowerCase()));
    if (RX_ENTERO.test(n)) return parseInt(n, 10);
    if (RX_DECIMAL.test(n)) return parseFloat(n.replace(/,/g, '.'));
    let tot = 0;
    for (const w of split(n)) {
      if (w === 'y') continue;
      if (!Object.prototype.hasOwnProperty.call(U, w)) return null;
      tot += U[w];
    }
    return tot;
  }

  function unidad(u) {
    u = sinTilde(u.toLowerCase());
    for (const [k, v] of [['hora', 'hora'], ['dia', 'dia'], ['semana', 'semana'], ['quincena', 'quincena'], ['mes', 'mes'], ['ano', 'año']])
      if (u.startsWith(k)) return v;
    return u;
  }

  function calificacion(c) {
    if (!c) return null;
    c = sinTilde(c.toLowerCase());
    return c.startsWith('habil') ? 'hábiles' : c.startsWith('natural') ? 'naturales' : 'laborables';
  }

  // ------------------------------------------------------------ clase de la expresión
  const EDAD = re(R`(mayor(es)?|menor(es)?) de( \w+)?\s*$|edad( de)?\s*$|(haber |hubieran? |hayan? |tener |tenga |)cumplid[oa]s?( los| la edad de)?\s*$|de edad de\s*$`, 'i');
  const EDAD_DESPUES = re(R`^\s*(de edad|sobre la edad|cumplid[oa]s)`, 'i');
  const PERIODICO = re(R`\bcada\s*$|\bcada (uno de los )?(\w+ )?$`, 'i');
  const PLAZO_ANTES = re(
    R`(plazo|t[ée]rmino|dentro de(l| los| las)?|antes de(l| los)?|transcurrid[oa]s?( que sean)?|transcurran|pasad[oa]s|` +
    R`antelaci[óo]n|anticipaci[óo]n|en un m[áa]ximo de|no m[áa]s tarde de|no (podr[áa]|podr[áa]n) (exceder|superar)( de)?|` +
    R`prescrib\w*|caduc\w*|a los|en los|en las|hasta( que (transcurran|hayan transcurrido))?|al menos|como m[íi]nimo|` +
    R`como m[áa]ximo|despu[ée]s de|tras|vencid[oa]s?|durante los primeros|en el de|el de|en el improrrogable de)` +
    R`(\s+\w+){0,3}\s*$`, 'i');
  const PLAZO_DESPUES = re(
    R`^\s*,?\s*(a contar|contad[oa]s|computad[oa]s|siguientes?|desde|a partir|antes|de antelaci[óo]n|de anticipaci[óo]n|` +
    R`improrrogables?|para (interponer|presentar|resolver|formular|subsanar|alegar|notificar|dictar|emitir|recurrir|acreditar|` +
    R`tomar|solicitar|comunicar|remitir|aportar|contestar|evacuar|ejercitar|ejercer|proponer|instar)|tras|despu[ée]s)`, 'i');
  const DURACION = re(R`(durante|por (un )?(per[íi]odo|periodo|tiempo|mandato)( m[áa]ximo| m[íi]nimo)?( de)?|mandato( de)?|` +
    R`duraci[óo]n( m[áa]xima| m[íi]nima)?( de)?|vigencia( de)?|antig[üu]edad( de)?|servicios? (efectivos? )?(de|durante)|` +
    R`prisi[óo]n( de)?|inhabilitaci[óo]n( de)?|suspensi[óo]n( de)?|multa( de)?|excedencia( de)?|por)\s*$`, 'i');
  const DUR_FUERTE = re(R`(permiso|licencia|vacaciones|mandato|excedencia|prisi[óo]n|inhabilitaci[óo]n|suspensi[óo]n de funciones|` +
    R`servicios? (efectivos? )?(prestados? )?(durante|de)|antig[üu]edad|ejercicio profesional|experiencia)(\s+[\wáéíóúñ]+){0,4}\s*$|per[íi]odo( m[áa]ximo| m[íi]nimo)?( de)?\s*$|durante( m[áa]s de| menos de| al menos)\s*$`, 'i');
  const DUR_DESPUES = re(R`^\s*(de (antig[üu]edad|servicios?|ejercicio|experiencia|permanencia|prisi[óo]n|mandato|edad|cotizaci[óo]n)|(completos )?de servicios|cotizad)`, 'i');
  const LIMITE = re(R`(exce(der|da|de|dan|derá|derán)|superior(es)? a|inferior(es)? a|l[íi]mite( m[áa]ximo)?( de)?|m[áa]ximo de|m[íi]nimo de|` +
    R`transcurrier(a|an|e|en)|transcurra|no menos de|no m[áa]s de|menos de|m[áa]s de)\s*$`, 'i');
  const POR_PLAZO = re(R`(audiencia|traslado|emplaz\w+|o[íi]r[áa]?n?|oir[áa]n?|oyendo|exposici[óo]n|expondr\w+|expuest\w+|informaci[óo]n p[úu]blica|` +
    R`vista|requer\w+|alegaciones|dar[áa]n?|entregar[áa]n?|entregar[áa]n|se entregar[áa]n)[^.;]{0,120}$`, 'i');
  const DUR = re(R`(permiso|licencia|vacaciones|mandato|excedencia|antig[üu]edad|prisi[óo]n|inhabilitaci[óo]n|experiencia)[^.;]{0,100}$`, 'id');
  const DUR_CORTE = re(R`\b(plazos?|t[ée]rminos?|dentro|antes|desde|siguientes?)\b`, 'i');
  const PLAZO_LEJOS = re(R`\b(plazos?|t[ée]rminos?)\b[^.;]{0,160}$`, 'i');
  const POR_FINAL = re(R`\bpor( otros?| el mismo| un)?\s*$`);
  const POR_DESPUES = re(R`^\s*,?\s*(durante los cuales|para que|a fin de|a las partes|al |a la |a los )`);

  function clase(antes, despues, frase) {
    const a = antes.slice(-120);
    if (buscar(EDAD, a.slice(-70)) || buscar(EDAD_DESPUES, despues)) return 'edad';
    if (buscar(PERIODICO, a.slice(-25))) return 'periodicidad';
    const dur = buscar(DUR, a);
    if ((dur && !buscar(DUR_CORTE, a.slice(dur.indices[1][1]))) || buscar(DUR_FUERTE, a.slice(-60)) || buscar(DUR_DESPUES, despues)) return 'duración';
    const f = sinTilde(frase.toLowerCase());
    const tipo = f.includes('prescri') ? 'prescripción' : f.includes('caduc') ? 'caducidad' : 'plazo';
    if (buscar(PLAZO_ANTES, a.slice(-70)) || buscar(PLAZO_DESPUES, despues)) return tipo;
    if (buscar(PLAZO_LEJOS, antes)) return tipo;
    const pm = buscar(POR_FINAL, a);
    if (pm && (buscar(POR_PLAZO, a.slice(0, pm.index)) || buscar(POR_DESPUES, despues))) return tipo;
    if (buscar(DURACION, a.slice(-45))) return 'duración';
    if (buscar(LIMITE, a.slice(-40))) return tipo;
    return 'otra';
  }

  const INICIO = re(R`(a contar (desde|de)|contad[oa]s (desde|a partir de)|computad[oa]s? (desde|a partir de)|siguientes? (al|a la|a su|a aqu[ée]l)|` +
    R`desde (el|la|que|su)|a partir (del|de la|de su|de)|tras (el|la|su))[^.;:,]{0,160}`, 'i');
  const NOTA = re(R`^\s*(Se (modifica|a[ñn]ade|suprime|deroga|da nueva redacci[óo]n|declara|introduce|renumera|corrigen?)|T[ée]ngase en cuenta|Redactad[oa]|V[ée]ase|Ref\. BOE|Se publica|Esta modificaci[óo]n|Disposici[óo]n derogada|Queda sin contenido|Redacci[óo]n anterior)`, 'i');
  const CORTE = re(R`(?<=[.;:])\s+(?=[A-ZÁÉÍÓÚÑ«(\d])`, 'g');
  const RX_REDACCION = re(R`^\s*Redacci[óo]n a[n]?terior`);
  const RX_CIERRE = re(R`[»"”]\s*\.?\s*$`);
  const RX_ABRE = re(R`^\s*[«"“]`);
  const RX_APART = re(R`^\s*(\d+)\.\s`);
  const RX_LETRA = re(R`^\s*([a-zñ])\)\s`);

  /** [[inicio, fin, apartado]] de cada frase del precepto, sin las notas del BOE. Inicio y fin son índices en `texto`. */
  function frases(texto) {
    const out = []; let pos = 0, apart = null, letra = null, trasNota = false, citaNota = false;
    for (const linea of texto.split('\n')) {
      const ini = pos; pos += linea.length + 1;
      if (RX_REDACCION.test(linea)) break;  // lo que sigue es el texto derogado que copia la nota del BOE
      if (citaNota) { if (RX_CIERRE.test(linea)) citaNota = false; continue; }
      if (NOTA.test(linea)) { trasNota = true; continue; }
      if (!strip(linea)) continue;
      if (trasNota && RX_ABRE.test(linea)) { citaNota = !RX_CIERRE.test(linea); continue; }
      trasNota = false;
      const m = RX_APART.exec(linea);
      if (m) { apart = m[1]; letra = null; }
      const m2 = RX_LETRA.exec(linea);
      if (m2) letra = m2[1];
      const ap = (apart || '') + (letra && apart ? '.' + letra : (letra || ''));
      let s = 0;
      for (const c of [...linea.matchAll(CORTE), null]) {
        const e = c ? c.index : linea.length;
        const seg = linea.slice(s, e);
        if (strip(seg)) out.push([ini + s + (seg.length - lstrip(seg).length), ini + e, ap || null]);
        s = c ? c.index + c[0].length : e;
      }
    }
    return out;
  }

  /** Expresiones de plazo de un texto legal: expresion, cifra, unidad, calificacion (solo si la dice el texto), clase,
      apartado, frase (literal), inicio (literal o null), pos (índice en el texto). */
  function extraer(texto) {
    const out = [];
    for (const [a, b, ap] of frases(texto)) {
      const fr = texto.slice(a, b);
      for (const m of fr.matchAll(PAT)) {
        const n = cifra(m.groups.n);
        if (n === null) continue;
        const antes = fr.slice(0, m.index), despues = fr.slice(m.index + m[0].length);
        const u = unidad(m.groups.u); let cal = calificacion(m.groups.c);
        if (cal === 'naturales' && m.groups.c.toLowerCase() === 'natural' && (u === 'mes' || u === 'año')) cal = 'natural (calendario)';
        const ini = buscar(INICIO, despues.slice(0, 220));
        out.push({expresion: m[0], cifra: n, unidad: u, calificacion: cal, clase: clase(antes, despues, fr),
          apartado: ap, frase: strip(fr), inicio: ini && ini.index < 60 ? rstrip(ini[0], ' ,') : null, pos: a + m.index});
      }
    }
    return out;
  }

  // ------------------------------------------------------------ regla de cómputo por norma
  function computo(nid, e, rs) {
    if (e.calificacion) return {valor: e.calificacion, fuente: 'lo dice el propio precepto', propia: true};
    if (e.unidad !== 'dia' && e.unidad !== 'hora') return null;
    const r = (rs || {})[nid];
    if (!r || !r.dias) return null;
    return {valor: r.dias, fuente: r.fuente, propia: r.propia};
  }

  const clave = e => e.cifra + '|' + e.unidad;

  /** Compara los plazos que afirma un texto generado con los del contexto legal (ver plazos.py). */
  function comprobar(respuesta, contexto, nid, extra, rs) {
    rs = rs || {};
    const ctx = extraer(contexto), ext = extra ? extraer(extra) : [];
    const vistos = new Set(ctx.concat(ext).map(clave));
    const avisos = [];
    for (const e of extraer(respuesta)) {
      if (e.clase === 'edad') continue;
      const k = clave(e);
      if (!vistos.has(k)) {
        const mismoN = ctx.filter(c => c.cifra === e.cifra).map(c => c.expresion);
        avisos.push({tipo: 'plazo ajeno', texto: `«${e.expresion}» no figura en el artículo` + (mismoN.length ? ` (dice «${mismoN[0]}»)` : ''), pos: e.pos, expresion: e.expresion});
        continue;
      }
      if (!e.calificacion || (e.calificacion !== 'hábiles' && e.calificacion !== 'naturales')) continue;
      let pares = ctx.filter(c => clave(c) === k);
      if (!pares.length) pares = ext.filter(c => clave(c) === k);
      if (pares.some(c => c.calificacion === e.calificacion)) continue;
      const expl = pares.filter(c => c.calificacion === 'hábiles' || c.calificacion === 'naturales');
      if (expl.length) {
        avisos.push({tipo: 'calificación contraria', texto: `dice «${e.expresion}» y el artículo dice «${expl[0].expresion}»`, pos: e.pos, expresion: e.expresion});
        continue;
      }
      const r = nid ? rs[nid] : null;
      if (r && (r.dias === 'hábiles' || r.dias === 'naturales') && e.unidad === 'dia') {
        if (r.dias === e.calificacion) continue;
        if (r.propia) avisos.push({tipo: 'calificación contraria', texto: `dice «${e.expresion}», pero en esta ley los días son ${r.dias} (${r.cita})`, pos: e.pos, expresion: e.expresion});
        else avisos.push({tipo: 'calificación dudosa', texto: `dice «${e.expresion}»; para esta ley, por remisión (${r.cita}), los días serían ${r.dias}`, pos: e.pos, expresion: e.expresion});
        continue;
      }
      avisos.push({tipo: 'calificación añadida', texto: `añade «${e.calificacion}», que el artículo no dice`, pos: e.pos, expresion: e.expresion});
    }
    return avisos;
  }

  const pyStr = v => v === undefined ? '' : v === null ? 'None' : v === true ? 'True' : v === false ? 'False' : String(v);

  /** Frase de cómo se cuentan los días en una norma, con la frase literal que lo establece. */
  function lineaComputo(nid, rs) {
    const r = (rs || {})[nid];
    if (!r || !r.dias) return '';
    const lit = r.frases.slice(0, 2).map(f => `«${f.frase}» (${f.norma === nid ? 'esta ley' : f.norma === 'BOE-A-2015-10565' ? 'Ley 39/2015' : f.norma}, ${f.bloque})`).join(' ');
    const tipo = r.propia ? 'regla propia de esta ley' : 'por remisión: ' + pyStr(r.fuente);
    return `CÓMPUTO DE PLAZOS: cuando el texto dice solo «días», son ${r.dias} (${tipo}). ${pyStr(r.nota)} Fuente: ${lit}`;
  }

  P.plazos = {cifra, unidad, calificacion, clase, frases, extraer, computo, comprobar, lineaComputo, U};
})(typeof globalThis !== 'undefined' ? globalThis : this);
