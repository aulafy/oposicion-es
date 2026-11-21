// Versión sin conexión: responde en el navegador a las mismas peticiones que web/servidor.py, con los datos de datos/*.json.
// La página (index.html) llama a fetch('/pregunta?...') como siempre; aquí se interceptan esas rutas.
/* El servidor web protegido y la versión sin conexión reutilizan estas rutas. */
function crearRutasPlaza(leer) {
  const cache = Object.create(null);
  const cargar = (f) => cache[f] ??= Promise.resolve().then(() => leer(f)).catch(error => {
    delete cache[f];
    throw error;
  });
  const datos = () => Promise.all(['datos/bancos.json', 'datos/meta.json', 'datos/explicaciones.json', 'datos/versiones.json'].map(cargar))
    .then(([B, M, E, V]) => {
      if (!datos.porId) {
        datos.porId = Object.create(null); datos.banco = Object.create(null); for (const [k, v] of Object.entries(B)) for (const q of v) { datos.porId[q.id] = q; datos.banco[q.id] = k; }
        M.frn = {}; for (const [k, v] of Object.entries(M.frq)) { const n = k.split('|')[0]; M.frn[n] = (M.frn[n] || 0) + v; }
        M.frq_otras = M.frq_otras || {}; M.frn2 = {}; for (const [k, v] of Object.entries(M.frq_otras)) { const n = k.split('|')[0]; M.frn2[n] = (M.frn2[n] || 0) + v; }
      }
      return { B, M, E, V, porId: datos.porId };
    });
  const ley = (nid) => cargar(`datos/leyes/${nid}.json`);
  const precepto = async (nid, bid) => { const L = await ley(nid); const p = L.preceptos.find(x => x[0] === bid); return p ? p[4] : ''; };
  const resp = (obj, code = 200) => new Response(JSON.stringify(obj), { status: code, headers: { 'Content-Type': 'application/json' } });

  // Bancos que comparten temario con comunidades autónomas, ayuntamientos y servicios de salud: suman también la frecuencia
  // de sus exámenes. Los bancos de la AGE y de Justicia y los simulacros oficiales usan solo la de exámenes del Estado.
  const OTRAS = new Set(['ayto', 'sms', 'c1_i_iii', 'organo_municipal', 'estatutario', 'carm_c1']);
  function peso(q, M, soloEstado) {  // las preguntas de preceptos más preguntados en exámenes salen más (como en el servidor)
    const c = q.cita || {}; const k = `${c.norma}|${c.bloque}`;
    const o = !soloEstado && OTRAS.has(datos.banco[q.id]);
    return 1 + 4 * ((M.frq[k] || 0) + (o ? M.frq_otras[k] || 0 : 0)) + Math.min(2, ((M.frn[c.norma] || 0) + (o ? M.frn2[c.norma] || 0 : 0)) / 50);
  }
  function eligePonderado(qs, M, soloEstado) {
    const w = qs.map(q => peso(q, M, soloEstado)); let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < qs.length; i++) { r -= w[i]; if (r <= 0) return qs[i]; } return qs[qs.length - 1];
  }
  const publica = (q) => ({ id: q.id, tipo: q.tipo, banco: datos.banco[q.id], enunciado: q.enunciado, opciones: q.opciones, revisar: !!q.revisar_preparador });
  const usable = (q, M, conv) => !q.difiere_version_convocatoria_PJC_1549_2025 && !(M.retiradas[conv] || {})[q.id] && !M.ambiguas[q.id];

  function candidatas(B, M, p) {
    const bancos = p.norma ? Object.keys(B) : (p.bancos || p.banco || 'bloque4').split(',');
    const excluir = new Set((p.excluir || '').split(','));
    const preguntas = bancos.flatMap(k => Object.hasOwn(B, k) ? B[k] : []).filter(q =>
      (!p.norma || (q.cita?.norma === p.norma && (!p.bloque || q.cita.bloque === p.bloque))) &&
      (!p.tipo || q.tipo === p.tipo) && usable(q, M, p.conv || '') && !excluir.has(q.id));
    return [...new Map(preguntas.map(q => [q.id, q])).values()];
  }

  const rutas = {
    async '/pregunta_id'(p) {
      const { porId, M } = await datos();
      const q = porId[p.id];
      if (!q) return resp({ error: 'no existe' }, 404);
      if (p.repaso && !usable(q, M, p.conv || (['justicia', 'justicia_org', 'procesales'].includes(datos.banco[q.id]) ? 'justicia2025' : ''))) return resp({ error: 'pregunta excluida' }, 410);
      return resp(publica(q));
    },
    async '/disponibles'(p) {
      const { B, M } = await datos();
      return resp({ total: p.bancos ? candidatas(B, M, p).length : 0 });
    },
    async '/pregunta'(p) {
      const { B, M } = await datos();
      const qs = candidatas(B, M, p);
      if (!qs.length) return resp({ error: 'sin preguntas' }, 404);
      return resp(publica(eligePonderado(qs, M)));
    },
    async '/simulacro'(p) {
      const { B, M } = await datos();
      if (!Object.hasOwn(M.sim, p.tipo)) return resp({ error: 'simulacro desconocido' }, 404);
      const [n, bancos, mas, menos, desc] = M.sim[p.tipo]; const conv = M.conv_sim[p.tipo];
      const candidatos = bancos.flatMap(k => B[k] || []).filter(q => usable(q, M, conv));
      const pool = [...new Map(candidatos.map(q => [q.id, q])).values()];
      const el = [];
      if (pool.length < n) return resp({ error: 'no hay suficientes preguntas' }, 404);
      while (el.length < n) {
        const q = eligePonderado(pool, M, true);
        pool.splice(pool.indexOf(q), 1);
        el.push({ id: q.id, banco: datos.banco[q.id], enunciado: q.enunciado, opciones: q.opciones });
      }
      return resp({ preguntas: el, acierto: mas, error: menos, descripcion: desc, conv });
    },
    async '/resumen'() {  // tamaño de cada banco, explicaciones disponibles y normas principales
      const { B, M, E } = await datos(); const r = {};
      for (const [k, v] of Object.entries(B)) {
        const c = {}; let ex = 0; for (const q of v) { if (q.cita) c[q.cita.norma] = (c[q.cita.norma] || 0) + 1; if (E[q.id]) ex++; }
        r[k] = { n: v.length, ex, normas: Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, k2]) => [n, M.titulos[n] || n, k2]) };
      }
      return resp({ bancos: r, sim: M.sim, conv: M.conv, aviso: M.aviso });
    },
    async '/normas'() { const { M } = await datos(); return resp(Object.entries(M.titulos).sort((a, b) => a[1].localeCompare(b[1], 'es'))); },
    async '/estructura'(p) { const L = await ley(p.norma); return resp(L.preceptos.map(([bloque, rotulo, ruta, veces]) => ({ bloque, rotulo, ruta, veces }))); },
    async '/precepto'(p) { const { M } = await datos(); return resp({ texto: await precepto(p.norma, p.bloque), aviso: M.aviso }); },
    async '/tutor_ctx'(p) {  // contexto del tutor con IA local (tutor-local/tutor_local.js): igual que contexto() de tutor/servidor_tutor.py
      const { M, V, porId } = await datos(); const q = porId[p.id]; if (!q) return resp({ error: 'no existe la pregunta' }, 404);
      let nombre, texto;
      if (q.tipo === 'ofimatica') {
        nombre = 'Excel 2016';
        texto = q.razon;
      } else if (q.cita) {
        const c = q.cita; texto = (p.conv && (V[p.conv] || {})[`${c.norma}|${c.bloque}`]) || await precepto(c.norma, c.bloque);
        nombre = `${M.titulos[c.norma] || c.norma}, ${c.bloque}`;
        if (q.explicacion) texto += '\n\nRAZONAMIENTO DEL CASO:\n' + q.explicacion.join('\n');
      } else {
        const s = q.solucion || {}; const py = (v) => v === undefined || v === null ? 'None' : v;
        nombre = 'Caso práctico de cómputo de plazos';
        texto = (q.explicacion || []).join('\n') + `\nCálculo: notificación ${py(s.notificacion)}, plazo de ${py(s.n)} ${py(s.unidad)}, último día ${py(s.fin)}.`;
      }
      return resp({ nombre, texto, norma: (q.cita || {}).norma || null, enunciado: q.enunciado, opciones: q.opciones, correcta: q.correcta });
    },
    async '/corregir'(p) {
      const { M, E, V, porId } = await datos(); const q = porId[p.id]; if (!q) return resp({ error: 'no existe' }, 404);
      const acierto = String(q.correcta) === p.r; const exp = E[q.id] || null;
      if (q.tipo === 'ofimatica') return resp({ correcta: q.correcta, acierto, razon: q.razon, fuente: q.fuente });
      if (q.explicacion && q.cita) {  // casos de clasificación, silencio, recursos, órgano, permisos, estatutario, requisitos
        const c = q.cita; const tipos = { caso_silencio: 'silencio administrativo', caso_recurso: 'recurso procedente', caso_organo_municipal: 'órgano municipal competente', caso_permiso: 'permisos', caso_estatutario: 'personal estatutario', caso_requisitos: 'requisitos de acceso' };
        return resp({ correcta: q.correcta, acierto, norma: c.norma, bloque: c.bloque, texto: await precepto(c.norma, c.bloque), vigente: true, aviso: M.aviso,
          titulo: `Caso práctico: ${tipos[q.tipo] || 'clasificación'} (${(M.titulos[c.norma] || '').slice(0, 60)})`, razon: q.explicacion.join('\n') });
      }
      if (q.explicacion) {  // casos de cómputo de plazos: explicación y cálculo ya resueltos
        const s = q.solucion; const proc = q.tipo.includes('procesal');
        const u = s.unidad === 'meses' ? (s.n === 1 ? 'mes' : 'meses') : 'días hábiles';
        return resp({ correcta: q.correcta, acierto, norma: proc ? 'LEC/LOPJ' : 'BOE-A-2015-10565', bloque: 'cómputo de plazos', vigente: true, aviso: M.aviso,
          texto: q.explicacion.join('\n\n') + `\n\nCálculo: notificación ${s.notificacion}, plazo de ${s.n} ${u}, último día ${s.fin}.`,
          titulo: proc ? 'Caso práctico: plazos procesales (LEC y LOPJ)' : 'Caso práctico: cómputo de plazos (Ley 39/2015)' });
      }
      const c = q.cita; const conv = M.conv[p.conv] ? p.conv : '';
      const texto = (conv && V[conv][`${c.norma}|${c.bloque}`]) || await precepto(c.norma, c.bloque);
      return resp({ correcta: q.correcta, acierto, norma: c.norma, bloque: c.bloque, texto, vigente: !(M.retiradas[conv] || {})[q.id], aviso: M.aviso,
        version: conv ? M.conv[conv] : 'última actualización instalada', titulo: M.titulos[c.norma] || c.norma, explicacion: exp, frase: c.frase || '' });
    },
  };

  return rutas;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = crearRutasPlaza;
} else {
  const fetchReal = window.fetch.bind(window);
  const rutas = crearRutasPlaza(async (f) => {
    const local = window.Plaza && Plaza.datos ? await Plaza.datos.leer(f) : null;
    const r = local || await fetchReal(f);
    if (!r.ok) throw new Error(f);
    return r.json();
  });
  window.fetch = (u, o) => {
    const url = typeof u === 'string' ? u : u.url;
    const path = url.split('?')[0];
    if (!url.startsWith('/') || !Object.hasOwn(rutas, path)) return fetchReal(u, o);
    const params = Object.fromEntries(new URL(url, location.href).searchParams);
    return rutas[path](params).catch(e => Response.json({ error: String(e) }, { status: 500 }));
  };
}
