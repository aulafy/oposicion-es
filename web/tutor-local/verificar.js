/* Port a JavaScript de `verificar` de tutor/servidor_tutor.py (verificador sin IA). Devuelve el mismo dict que Python
   (citas, citas_ok, avisos, plazos) y, aparte, `detalle` con las citas que fallan, las cifras ajenas y los avisos de
   plazos completos, que la extensión usa para marcar el texto. pruebas/comparar.py compara las cuatro claves de Python. */
(function (G) {
  'use strict';
  const P = G.Plaza = G.Plaza || {};
  const { re, strip, nrm } = P.texto;
  const R = String.raw;

  const RX_CITAS = /«([^»]{12,})»|“([^”]{20,})”/g;
  const RX_MARCAS = re(R`(?m)^\s*(\d+[.)]|[-*•>#]+)\s+`, 'g');
  const RX_REFS = re(R`(?i)\b(art[íi]culos?|art\.|apartados?|letras?|p[áa]rrafos?)\s+\d+(?:[.,]\d+)*(?:\s*(?:bis|ter))?`, 'g');
  const RX_CIFRAS = re(R`\b\d+(?:[.,]\d+)?\b`, 'g');
  const PREFIJO = {'plazo ajeno': 'Plazo que no está en el artículo: ', 'calificación contraria': 'Ojo con el cómputo: ',
    'calificación dudosa': 'Cómputo dudoso: ', 'calificación añadida': 'Matiz no literal: '};

  /** Citas «…» (12+ caracteres) o “…” (20+), limpias como en Python. Con posición en `resp`. */
  function citas(resp) {
    const out = [];
    for (const m of resp.matchAll(RX_CITAS)) {
      const g = m[1] !== undefined ? 1 : 2, c = m[g];
      if (!c) continue;
      out.push({texto: strip(strip(c, ' .,;:…'), '.…'), pos: m.index + 1, fin: m.index + 1 + c.length});
    }
    return out;
  }

  function verificar(resp, texto, q, dudas, nid, rs) {
    q = q || {enunciado: '', opciones: []}; dudas = dudas || [];
    const nt = ` ${nrm(texto)} `, avisos = [];
    const lista = citas(resp), cs = lista.map(c => c.texto);
    const nq = ` ${nrm(q.enunciado + ' ' + q.opciones.join(' '))} `;
    const malas = lista.filter(c => !nt.includes(` ${nrm(c.texto)} `) && !nq.includes(` ${nrm(c.texto)} `));
    if (malas.length) avisos.push('Alguna frase entre comillas no está literal en el artículo: compruébala en el texto.');
    const fuente = new Set(nrm(texto + ' ' + q.enunciado + ' ' + q.opciones.join(' ') + ' ' + dudas.join(' ')).split(' ').filter(Boolean));
    resp = resp.replace(RX_MARCAS, ' ');  // marcas de lista, cita y título
    const sinRefs = resp.replace(RX_REFS, ' ');  // referencias, no cifras
    const cifras = [...sinRefs.matchAll(RX_CIFRAS)].map(m => m[0])
      .filter(x => !fuente.has(nrm(x)) && !nrm(x).split(' ').filter(Boolean).every(y => fuente.has(y)));
    if (cifras.length) avisos.push(`Menciona cifras que no están en el artículo (${[...new Set(cifras)].sort().slice(0, 4).join(', ')}): tómalas con cautela.`);
    const extra = q.enunciado + '\n' + q.opciones.join('\n') + '\n' + dudas.join('\n');
    const pl = P.plazos.comprobar(resp, texto, nid, extra, rs);
    for (const a of pl.slice(0, 3)) avisos.push(PREFIJO[a.tipo] + a.texto + '.');
    const res = {citas: cs.length, citas_ok: cs.length - malas.length, avisos, plazos: pl.map(a => a.tipo)};
    Object.defineProperty(res, 'detalle', {value: {malas, cifras, pl}, enumerable: false});
    return res;
  }

  P.verificar = {verificar, citas};
})(typeof globalThis !== 'undefined' ? globalThis : this);
