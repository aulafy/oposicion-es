'use strict';
/* Plaza · aplicación del opositor. Funciona sin servidor: api.js responde a las rutas con los datos de datos/*.json.
   El progreso se guarda solo en este navegador (localStorage); si no está disponible, todo funciona igual sin guardar. */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Solo es error si el estado HTTP lo es: /simulacro trae un campo «error» que es la penalización.
const api = async (u) => {
  let r;
  try { r = await fetch(u); } catch {
    throw new Error('Comprueba tu conexión e inténtalo de nuevo.');
  }
  if (!r.ok) {
    const j = await r.json().catch(() => null);
    throw Object.assign(new Error(j?.error || 'Plaza no pudo completar la petición.'), { status: r.status });
  }
  return r.json().catch(() => { throw new Error('Plaza recibió una respuesta inesperada. Inténtalo de nuevo.'); });
};
const main = $('#main');
const LETRAS = 'ABCD';

/* ---------- Iconos (iconos.js) ---------- */
const ALIAS = { home: 'inicio', clock: 'reloj', case: 'casos', book: 'leyes', chart: 'progreso', fire: 'llama', target: 'diana', bolt: 'rayo', grid: 'rejilla', scale: 'balanza', trash: 'papelera' };
const ic = (n, c = '') => `<svg class="i ${c}" viewBox="0 0 24 24" aria-hidden="true">${window.ICONOS[ALIAS[n] || n] || ''}</svg>`;
const TEMA_IC = { bloque4: 'personas', c1_i_iii: 'estado', gestion: 'monedas', justicia: 'balanza', justicia_org: 'mazo', sms: 'salud', ayto: 'ayuntamiento', carm_c1: 'estado' };

/* ---------- Catálogo ---------- */
const OPOS = {
  c1: { nombre: 'Administrativo del Estado', corto: 'Administrativo AGE', grupo: 'C1', temas: ['bloque4', 'c1_i_iii', 'gestion'], casos: ['casos', 'silencio', 'recursos', 'clasificacion', 'permisos', 'requisitos'], sim: 'c1' },
  c2: { nombre: 'Auxiliar Administrativo del Estado', corto: 'Auxiliar AGE', grupo: 'C2', temas: ['c1_i_iii', 'bloque4'], casos: ['casos', 'silencio', 'recursos', 'permisos', 'requisitos'], sim: null },
  tram: { nombre: 'Tramitación Procesal y Administrativa', corto: 'Tramitación Procesal', grupo: 'C1', temas: ['justicia', 'justicia_org', 'c1_i_iii'], casos: ['procesales', 'casos', 'recursos'], sim: 'tram', conv: 'justicia2025' },
  aux: { nombre: 'Auxilio Judicial', corto: 'Auxilio Judicial', grupo: 'C2', temas: ['justicia', 'justicia_org', 'c1_i_iii'], casos: ['procesales'], sim: 'aux', conv: 'justicia2025' },
  sms: { nombre: 'Servicio Murciano de Salud', corto: 'SMS · Administración', grupo: 'C1 · C2', temas: ['sms', 'c1_i_iii'], casos: ['estatutario', 'permisos', 'casos'], sim: null },
  ayto: { nombre: 'Administración Local', corto: 'Ayuntamientos', grupo: 'C1 · C2', temas: ['ayto', 'c1_i_iii'], casos: ['organo_municipal', 'silencio', 'recursos', 'casos'], sim: null },
  carm_c1: { nombre: 'Gestión Administrativa de la Región de Murcia', corto: 'CARM · Gestión C1', grupo: 'C1', temas: ['carm_c1', 'c1_i_iii', 'bloque4'], casos: ['casos', 'silencio', 'recursos', 'permisos'], sim: null },
};
const TEMAS = {
  bloque4: 'Personal al servicio de las Administraciones', c1_i_iii: 'Organización del Estado y procedimiento',
  gestion: 'Gestión financiera y tributaria', justicia: 'Derecho procesal', justicia_org: 'Organización judicial y personal',
  sms: 'Sanidad y personal estatutario', ayto: 'Régimen local', carm_c1: 'Temario CARM C1: normas regionales y estatales',
};
const CASOS = {
  casos: ['Cómputo de plazos', 'Calcula el último día de un plazo según la Ley 39/2015.', 'calendario'],
  procesales: ['Plazos procesales', 'Cómputo de plazos en la LEC y la LOPJ.', 'expediente'],
  silencio: ['Silencio administrativo', '¿Estimatorio, desestimatorio o caducidad?', 'reloj_arena'],
  recursos: ['Recurso procedente', 'Alzada, reposición, contencioso o revisión.', 'escalera'],
  clasificacion: ['Faltas y situaciones', 'Clasifica hechos según la norma disciplinaria y de situaciones.', 'etiqueta'],
  permisos: ['Permisos del TREBEP', 'Días por fallecimiento, enfermedad, traslado o matrimonio.', 'calendario_ok'],
  requisitos: ['Requisitos de acceso', 'Edad, nacionalidad e inhabilitación (TREBEP).', 'lista_ok'],
  organo_municipal: ['¿Alcalde o Pleno?', 'Competencias en municipios de régimen común.', 'ayuntamiento'],
  estatutario: ['Personal estatutario', 'Clasificación según el Estatuto Marco.', 'credencial'],
};
const TIPOS = [['', 'Todas'], ['plazo', 'Plazos'], ['organo', 'Órganos'], ['lista', 'Enumeraciones'], ['lista_negativa', '¿Cuál NO?'], ['afirmacion', 'Afirmaciones']];
const CONV_DE = { justicia: 'justicia2025', justicia_org: 'justicia2025', procesales: 'justicia2025' };
const ABREV = {
  'BOE-A-1882-6036': 'LECrim', 'BOE-A-1978-31229': 'Constitución', 'BOE-A-1979-23709': 'LOTC', 'BOE-A-1985-12666': 'LOPJ', 'BOE-A-1985-5392': 'LBRL',
  'BOE-A-2000-323': 'LEC', 'BOE-A-2015-10565': 'Ley 39/2015', 'BOE-A-2015-10566': 'Ley 40/2015', 'BOE-A-2015-11719': 'TREBEP', 'BOE-A-1998-16718': 'LJCA',
  'BOE-A-2003-23101': 'Estatuto Marco', 'BOE-A-2003-23186': 'LGT', 'BOE-A-2003-21614': 'LGP', 'BOE-A-2017-12902': 'LCSP', 'BOE-A-1995-24292': 'LPRL',
  'BOE-A-1986-33252': 'ROF', 'BOE-A-2004-4214': 'TRLRHL', 'BOE-A-1997-25336': 'Ley del Gobierno', 'BOE-A-2011-15936': 'LRJS', 'BOE-A-2013-12887': 'Ley 19/2013',
  'BOE-A-1986-1216': 'RD 33/1986', 'BOE-A-1995-8729': 'RD 364/1995', 'BOE-A-1995-8730': 'RD 365/1995', 'BOE-A-2012-5730': 'LOEPSF', 'BOE-A-1985-151': 'Ley 53/1984',
};
function corta(nid, titulo) {
  if (ABREV[nid]) return ABREV[nid];
  const m = String(titulo || '').match(/^(Ley Orgánica|Ley|Real Decreto Legislativo|Real Decreto|Decreto Legislativo|Decreto)\s+(\d+\/\d+)/);
  if (!m) return String(titulo || nid).replace(/\.$/, '').slice(0, 24);
  return ({ 'Ley Orgánica': 'LO', 'Ley': 'Ley', 'Real Decreto Legislativo': 'RDLeg', 'Real Decreto': 'RD', 'Decreto Legislativo': 'DLeg', 'Decreto': 'Decreto' })[m[1]] + ' ' + m[2];
}
const ORD = { primera: '1.ª', segunda: '2.ª', tercera: '3.ª', cuarta: '4.ª', quinta: '5.ª', sexta: '6.ª', septima: '7.ª', octava: '8.ª', novena: '9.ª', decima: '10.ª', unica: 'única' };
function articulo(b, texto = '') {
  const cabecera = /^Artículo\s+(\d+(?:\s+(?:bis|ter|quater|quinquies))?)\s*\./i.exec(texto);
  if (cabecera) return 'Art. ' + cabecera[1];
  b = String(b || '');
  let m = b.match(/^a(\d+)(bis|ter|quater|quinquies)?$/); if (m) return `Art. ${m[1]}${m[2] ? ' ' + m[2] : ''}`;
  m = b.match(/^d(a|t|f|d)(.*)$/);
  if (m) return `Disp. ${{ a: 'adicional', t: 'transitoria', f: 'final', d: 'derogatoria' }[m[1]]} ${ORD[m[2]] || m[2]}`.trim();
  if (b === 'pr' || b === 'preambulo') return 'Preámbulo';
  m = b.match(/^a([a-zñáéíóú]+)$/); if (m) return `Art. ${m[1]}`;
  return b;
}

/* ---------- Estado local ---------- */
const KEY = 'plaza.v1';
const S = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })();
S.b = S.b || {}; S.dias = S.dias || {}; S.hist = S.hist || []; S.rep = S.rep || {}; S.plan = S.plan || { meta: 30, examen: '' };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const dia = (d = new Date()) => d.toLocaleDateString('sv');
const masDias = (n, d = new Date()) => { const x = new Date(d); x.setDate(x.getDate() + n); return dia(x); };
const entreDias = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 864e5);

/* ---------- Repaso espaciado (cajas de Leitner) ----------
   Una pregunta fallada entra en la caja 1 y vuelve mañana. Cada vez que la aciertas cuando le toca, sube de caja y
   tarda más en volver (3, 7, 16 y 35 días). Si la fallas, vuelve a la caja 1. Al acertarla en la caja 5, queda dominada. */
const SIG = [3, 7, 16, 35];
if (S.f) { for (const [id, b] of Object.entries(S.f)) if (!S.rep[id]) S.rep[id] = { b, c: 0, p: dia() }; delete S.f; save(); }  // fallos de la versión anterior: a repasar hoy
function repasa(id, banco, ok) {
  const r = S.rep[id];
  if (!ok) { S.rep[id] = { b: banco, c: 0, p: masDias(1), f: ((r && r.f) || 0) + 1 }; return; }
  if (!r || r.p > dia()) return;  // acertada sin tocarle: no cambia nada
  if (r.c >= SIG.length) { delete S.rep[id]; S.dom = (S.dom || 0) + 1; return; }
  r.p = masDias(SIG[r.c]); r.c++;
}
// pendientes de hoy: primero las más atrasadas y las de caja más baja
const pendientes = () => Object.entries(S.rep).filter(([, r]) => r.p <= dia()).sort((a, b) => a[1].p.localeCompare(b[1].p) || a[1].c - b[1].c).map(([id]) => id);
function anota(id, banco, ok) {
  const b = S.b[banco] = S.b[banco] || { ok: 0, mal: 0 }; ok ? b.ok++ : b.mal++;
  repasa(id, banco, ok);
  const d = S.dias[dia()] = S.dias[dia()] || { n: 0, ok: 0 }; d.n++; if (ok) d.ok++;
  save(); pintaNav();
}
function racha() {
  let n = 0; const d = new Date(); if (!S.dias[dia(d)]) d.setDate(d.getDate() - 1);
  while (S.dias[dia(d)]) { n++; d.setDate(d.getDate() - 1); } return n;
}
function acierto7() {
  let n = 0, ok = 0; const d = new Date();
  for (let i = 0; i < 7; i++) { const x = S.dias[dia(d)]; if (x) { n += x.n; ok += x.ok; } d.setDate(d.getDate() - 1); }
  return n ? Math.round(100 * ok / n) : null;
}
const opo = () => OPOS[S.opo] || null;

/* ---------- Resumen de datos (tamaño de bancos, explicaciones) ---------- */
let RES = null;
const resumen = async () => RES || (RES = await api('/resumen'));

/* ---------- Navegación ---------- */
const NAV = [
  ['Estudio', [['inicio', 'Inicio', 'inicio'], ['practicar', 'Practicar', 'practicar'], ['simulacros', 'Simulacros', 'simulacro'], ['casos', 'Casos prácticos', 'casos'], ['progreso', 'Progreso', 'progreso']]],
  ['Consulta', [['leyes', 'Leyes', 'leyes'], ['oposiciones', 'Oposiciones', 'calendario'], ['ayuda', 'Ayuda', 'ayuda']]],
];
const TAB = [['inicio', 'Inicio', 'inicio'], ['practicar', 'Practicar', 'practicar'], ['simulacros', 'Simulacros', 'simulacro'], ['leyes', 'Leyes', 'leyes'], ['progreso', 'Progreso', 'progreso']];
function pintaNav(actual) {
  actual = actual || (location.hash.slice(2).split('/')[0] || 'inicio');
  const nf = pendientes().length;
  $('#nav').innerHTML = NAV.map(([grupo, enlaces]) => `<div class="nav-grupo"><p>${grupo}</p>${enlaces.map(([r, t, i]) =>
    `<a href="#/${r}" ${r === actual ? 'aria-current="page"' : ''}>${ic(i)}<span>${t}</span>${r === 'progreso' && nf ? `<span class="badge" title="Preguntas para repasar hoy">${nf}</span>` : ''}</a>`
  ).join('')}</div>`).join('');
  $('#tabbar').innerHTML = TAB.map(([r, t, i]) => `<a href="#/${r}" ${r === actual ? 'aria-current="page"' : ''}>${ic(i)}<span>${t}</span></a>`).join('');
  const o = opo(); $('#opoNombre').textContent = o ? o.nombre : 'Elige oposición'; $('#opoNombreM').textContent = o ? o.corto : 'Elige oposición';
}
let limpiar = [];
const alSalir = (f) => limpiar.push(f);
const rutas = {};
function mostrarReintento(el, titulo, error, accion, etiqueta = 'Reintentar') {
  el.innerHTML = `<div class="empty">${ic('info')}<p role="status"><b>${esc(titulo)}</b></p>
    <p class="muted">${esc(error.message)}</p><button class="btn primary" type="button">${esc(etiqueta)}</button></div>`;
  $('button', el).onclick = accion;
}
async function render() {
  limpiar.forEach((f) => f()); limpiar = [];
  const hash = location.hash;
  const [r, ...args] = (hash.slice(2) || 'inicio').split('/').map(decodeURIComponent);
  document.body.classList.remove('focus');
  pintaNav(r);
  main.innerHTML = `<div class="wrap loading"><div class="skel" style="width:40%;height:28px"></div><div class="skel" style="width:70%"></div><div class="skel" style="width:55%"></div></div>`;
  window.scrollTo(0, 0);
  try { await (rutas[r] || rutas.inicio)(...args); } catch (e) {
    if (location.hash === hash) mostrarReintento(main, 'No se pudo cargar esta sección.', e, render);
  }
}
addEventListener('hashchange', render);

/* ---------- Utilidades de interfaz ---------- */
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2600); }
function dialogo(html, alAbrir) {
  const d = $('#dlg'); d.innerHTML = html; d.showModal(); if (alAbrir) alAbrir(d);
  $$('[data-cerrar]', d).forEach((b) => b.onclick = () => d.close());
  d.onclick = (e) => { if (e.target === d) d.close(); };
  return d;
}
function confirmar(titulo, texto, ok = 'Aceptar') {
  return new Promise((res) => {
    const d = dialogo(`<div class="dh"><div><h2>${esc(titulo)}</h2><p>${esc(texto)}</p></div></div><div class="df"><button class="btn ghost" data-no>Cancelar</button><button class="btn primary" data-si>${esc(ok)}</button></div>`);
    $('[data-no]', d).onclick = () => { d.close(); res(false); }; $('[data-si]', d).onclick = () => { d.close(); res(true); };
    d.addEventListener('cancel', () => res(false), { once: true });
  });
}
function elegirOpo(primera) {
  const d = dialogo(`<div class="dh"><div><h2>${primera ? 'Te damos la bienvenida. ¿Qué oposición preparas?' : 'Cambiar de oposición'}</h2><p>Adaptamos los temas, los casos prácticos y los simulacros. Puedes cambiarla cuando quieras.</p></div>${primera ? '' : `<button class="btn ghost sm" data-cerrar aria-label="Cerrar">${ic('x')}</button>`}</div>
    <div class="db"><div class="opo-list">${Object.entries(OPOS).map(([k, o]) => `<button class="opo-item" data-k="${k}" aria-pressed="${S.opo === k}"><span class="ico">${esc(o.grupo.split(' ')[0])}</span><span><b>${esc(o.nombre)}</b><small>${esc(o.grupo)}${o.fuente ? ' · simulacro parcial de práctica' : o.sim ? ' · con simulacro de práctica' : ''}</small></span>${S.opo === k ? ic('check') : ic('chev')}</button>`).join('')}</div></div><div class="df"></div>`);
  if (primera) { d.addEventListener('cancel', (e) => e.preventDefault(), { once: true }); d.onclick = null; }
  $$('.opo-item', d).forEach((b) => b.onclick = () => { S.opo = b.dataset.k; save(); d.close(); pintaNav(); toast(`Oposición: ${OPOS[S.opo].nombre}`); render(); });
}
$('#opoSwitch').onclick = () => elegirOpo(false);
$('#opoSwitchM').onclick = () => elegirOpo(false);
const red = () => { $('#offline').hidden = navigator.onLine; };
addEventListener('online', red); addEventListener('offline', red); red();

function resalta(texto, frases) {
  // Marca en el texto legal las frases que deciden la respuesta (búsqueda exacta; si no aparecen, sin marca).
  const rs = [];
  for (const f of frases) {
    const s = String(f || '').replace(/[«»"“”]/g, '').trim(); if (s.length < 12) continue;
    let i = texto.indexOf(s); if (i < 0) { const s2 = s.replace(/[.:;,]+$/, ''); i = texto.indexOf(s2); if (i >= 0) rs.push([i, i + s2.length]); } else rs.push([i, i + s.length]);
  }
  rs.sort((a, b) => a[0] - b[0]); const m = [];
  for (const r of rs) { if (m.length && r[0] <= m[m.length - 1][1]) m[m.length - 1][1] = Math.max(m[m.length - 1][1], r[1]); else m.push(r.slice()); }
  let out = '', p = 0; for (const [a, b] of m) { out += esc(texto.slice(p, a)) + '<mark>' + esc(texto.slice(a, b)) + '</mark>'; p = b; }
  return out + esc(texto.slice(p));
}
const enunciadoHTML = (t) => esc(t).replace(/_{3,}/g, '<span class="gap" aria-label="hueco"></span>');
const fmtT = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
const pct = (a, b) => b ? Math.round(100 * a / b) : 0;

/* ---------- Fundamento (bloque reutilizable tras corregir) ---------- */
function fundamento(r, q) {
  if (q?.tipo === 'ofimatica' || r.fuente) {
    return `<section class="panel"><div class="panel-h">Solución de Excel 2016</div><div class="panel-b"><p>${esc(r.razon)}</p><a href="${esc(r.fuente)}" target="_blank" rel="noopener">Documentación de Microsoft</a></div></section>`;
  }
  const frases = [r.frase, q && q.opciones && q.opciones[r.correcta], ...((r.explicacion && r.explicacion.citas) || [])];
  let h = '';
  if (r.explicacion) {
    h += `<section class="panel ia"><div class="panel-h"><span style="display:flex;align-items:center;gap:8px">${ic('ia', 'sm')} Explicación</span><button class="info" data-infoia aria-label="Cómo se comprueba esta explicación">${ic('info', 'sm')}</button></div>
      <div class="panel-b"><p>${esc(r.explicacion.explicacion)}</p>${r.explicacion.citas.map((c) => `<blockquote class="quote">${esc(c)}</blockquote>`).join('')}</div></section>`;
  }
  if (r.razon) h += `<section class="panel"><div class="panel-h">Por qué</div><div class="panel-b"><p style="white-space:pre-line">${esc(r.razon)}</p></div></section>`;
  const nombre = r.norma && r.norma.startsWith('BO') ? corta(r.norma, r.titulo) : (r.norma || '');
  h += `<section class="panel"><div class="panel-h"><div class="law-h"><span class="t">${esc(nombre)} · ${esc(articulo(r.bloque, r.texto))}</span><span class="s">${esc((r.titulo || '').replace(/\.$/, ''))}${r.version ? ' · versión ' + esc(r.version) : ''}</span></div>
      ${r.norma && r.norma.startsWith('BO') ? `<button class="btn ghost sm" data-ampliar>Ampliar</button>` : ''}</div>
      ${r.vigente === false ? `<div class="retirada">Este precepto ha cambiado en la versión de la convocatoria: la pregunta queda retirada.</div>` : ''}
      <div class="legal">${resalta(r.texto || '', frases)}</div><p class="aviso">${esc(r.aviso || '')}</p></section>`;
  return h;
}
function enlazaFundamento(root) {
  const l = $('.legal', root); const mk = l && $('mark', l);
  if (mk) l.scrollTop = Math.max(0, mk.offsetTop - l.offsetTop - 40);
  $$('[data-ampliar]', root).forEach((b) => b.onclick = () => { const x = b.closest('.panel').querySelector('.legal'); x.classList.toggle('full'); b.textContent = x.classList.contains('full') ? 'Reducir' : 'Ampliar'; });
  $$('[data-infoia]', root).forEach((b) => b.onclick = () => dialogo(`<div class="dh"><div><h2>Explicaciones con IA verificada</h2><p>Cómo las comprobamos antes de enseñártelas</p></div><button class="btn ghost sm" data-cerrar aria-label="Cerrar">${ic('x')}</button></div>
    <div class="db"><p style="margin-top:0">La respuesta correcta no la decide la IA: sale del texto de la ley. La IA solo redacta la explicación, y un verificador automático la descarta si no cumple todo esto:</p>
    <ul style="padding-left:20px;line-height:1.7;color:var(--ink-2)"><li>cada cita está copiada literalmente del artículo;</li><li>no menciona cifras ni plazos que no estén en el artículo;</li><li>contiene la respuesta correcta;</li><li>no cita apartados, letras ni artículos que no existan;</li><li>no afirma que algo «no aparece» en la ley.</li></ul>
    <p class="muted" style="font-size:13.5px">Aun así puede ser imprecisa. Si ves algo raro, usa «Reportar error».</p></div><div class="df"><button class="btn primary" data-cerrar>Entendido</button></div>`));
}
function tutorCTA() { return `<div class="tutor-cta"><span class="ico">${ic('ia')}</span><div><b>¿Te queda alguna duda?</b><span>Pregúntale al tutor por qué, pídele un ejemplo o un truco para recordarlo.</span></div><button class="btn sm" data-tutor>Preguntar</button></div>`; }
function configurarTutor() {
  const d = dialogo(`<div class="dh"><div><p class="eyebrow">Tutor de Plaza</p><h2>Configurar Ollama</h2></div><button class="btn ghost" data-cerrar>Cerrar</button></div>
    <form class="db tutor-local">
    <p role="status">Buscando modelos en Ollama…</p>
    <details class="tutor-guia">
      <summary>Configurar el tutor en tres pasos</summary>
      <ol>
        <li><b>Abre Ollama en tu ordenador.</b> Si aún no lo tienes, <a href="https://ollama.com/download" target="_blank" rel="noopener">descárgalo aquí</a> e instálalo.</li>
        <li><b>Descarga un modelo ligero.</b> Abre Terminal (macOS o Linux) o PowerShell (Windows). Pega este comando, pulsa Intro y espera a que termine:
          <div class="tutor-comando"><code>ollama pull qwen3:1.7b</code><button class="btn ghost sm" type="button" data-copiar>Copiar</button></div>
        </li>
        <li><b>Selecciona el modelo en Plaza.</b> Pulsa «Volver a comprobar» y elige el modelo en el desplegable que aparecerá debajo.</li>
      </ol>
      <p><a href="https://www.aulafy.net/cursos/ia-local/ollama-desde-cero" target="_blank" rel="noopener">Guía ilustrada de Ollama en español</a></p>
    </details>
    <details class="tutor-guia" data-conexion hidden>
      <summary>Conectar Ollama desde este sitio</summary>
      <ol data-pasos-conexion></ol>
      <p>Si tu navegador pide acceso a la red local, permítelo solo para el sitio de Plaza que estás usando.</p>
    </details>
    <button class="btn sm" type="button" data-comprobar>Volver a comprobar</button>
    <div data-modelos hidden>
      <label>Modelo de tu ordenador<select></select></label>
      <button class="btn primary" type="button" data-guardar-modelo>Guardar y cerrar</button>
    </div></form>`);
  const form = d.querySelector('form'), modelo = form.querySelector('select');
  const estado = form.querySelector('[role=status]'), boton = form.querySelector('[data-guardar-modelo]');
  const control = new AbortController();
  const guia = form.querySelector('details'), comprobar = form.querySelector('[data-comprobar]');
  const campos = form.querySelector('[data-modelos]');
  d.addEventListener('close', () => control.abort(), {once:true});
  const ollama = window.Plaza.tutorLocal;
  const conexion = form.querySelector('[data-conexion]');
  const instrucciones = ollama.instrucciones();
  if (!instrucciones.deSerie && !instrucciones.fichero) {
    conexion.hidden = false;
    for (const paso of instrucciones.pasos[instrucciones.so]) {
      const item = document.createElement('li');
      item.textContent = paso;
      conexion.querySelector('ol').append(item);
    }
  }
  form.querySelector('[data-copiar]').onclick = async event => {
    try {
      await navigator.clipboard.writeText('ollama pull qwen3:1.7b');
      event.target.textContent = 'Copiado';
    } catch {
      estado.textContent = 'Selecciona el comando y cópialo en tu terminal.';
    }
  };
  comprobar.onclick = async () => {
    comprobar.disabled = boton.disabled = true;
    estado.textContent = 'Buscando modelos en Ollama…';
    try {
      const info = await ollama.detectar(undefined, { alPreguntar: () => {
        estado.textContent = 'Si el navegador pide acceso a la red local, permítelo para conectar con Ollama.';
      }});
      if (control.signal.aborted) return;
      const modelos = (info.modelos || []).filter(m => !/(?:-|:)cloud$/i.test(m.nombre));
      campos.hidden = !modelos.length;
      if (!modelos.length) {
        guia.open = true;
        if (info.estado === 'ok') estado.textContent = 'Ollama está abierto. Descarga un modelo local en el paso 2.';
        else if (info.permiso?.state === 'denied') estado.textContent = 'El navegador bloqueó el acceso a la red local. Autorízalo en los permisos del sitio y vuelve a comprobar.';
        else if (info.estado === 'origen' && !conexion.hidden) {
          estado.textContent = 'Ollama responde, pero el navegador no pudo leer la respuesta. Revisa la configuración de conexión de este sitio.';
          conexion.open = true;
        }
        else estado.textContent = 'Plaza no pudo conectar con Ollama. Abre Ollama en este ordenador y vuelve a comprobar.';
        return;
      }
      const elegido = modelo.value || S.ui.ollamaModelo;
      modelo.replaceChildren(...modelos.map(m => new Option(m.nombre, m.nombre)));
      if (modelos.some(m => m.nombre === elegido)) modelo.value = elegido;
      guia.open = conexion.open = false;
      boton.disabled = false;
      estado.textContent = 'Ollama está listo. Elige un modelo y guarda tu selección.';
    } catch {
      if (control.signal.aborted) return;
      campos.hidden = true;
      guia.open = true;
      estado.textContent = 'No se pudo comprobar Ollama. Vuelve a intentarlo.';
    } finally {
      comprobar.disabled = false;
    }
  };
  boton.onclick = () => {
    S.ui.ollamaModelo = modelo.value;
    save();
    d.close();
    toast('Tutor listo. Pulsa «Preguntar» en cualquier corrección.');
  };
  comprobar.click();
}
$$('[data-configurar-tutor]').forEach(boton => boton.onclick = configurarTutor);

const TUT = Object.create(null);
function md(t) {  // markdown mínimo y seguro: párrafos, listas, citas «…» o «> …», títulos y **negrita**
  const inl = (x) => esc(x).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/«([^»]{3,})»/g, '<q class="cita">$1</q>');
  let h = '', lista = null, nOl = 0;  // nOl: último número de la lista numerada; un párrafo, cita o título la reinicia
  const cierra = () => { if (lista) { h += `</${lista}>`; lista = null; } };
  for (const b of t.trim().split(/\n{2,}/)) {
    let par = [];
    const vuelca = () => { if (par.length) { h += `<p>${par.join('<br>')}</p>`; par = []; nOl = 0; } };
    for (const l of b.split('\n').filter((x) => x.trim())) {
      let m;
      if ((m = l.match(/^\s*(?:[-*•]|(\d+)[.)])\s+(.*)$/))) { vuelca(); const tag = m[1] ? 'ol' : 'ul'; if (lista !== tag) { cierra(); h += `<${tag}>`; lista = tag; } if (m[1]) { nOl = +m[1] > nOl ? +m[1] : nOl + 1; h += `<li value="${nOl}">${inl(m[2])}</li>`; } else h += `<li>${inl(m[2])}</li>`; continue; }  // nOl: sigue la numeración aunque unas viñetas la corten
      if ((m = l.match(/^\s*>\s?(.*)$/))) { vuelca(); cierra(); nOl = 0; h += `<blockquote class="cita-b">${inl(m[1].replace(/^[“"«]|[”"»]$/g, ''))}</blockquote>`; continue; }
      if ((m = l.match(/^\s*#{1,4}\s+(.*)$/))) { vuelca(); cierra(); nOl = 0; h += `<p><b>${inl(m[1])}</b></p>`; continue; }
      if (lista && /^\s{2,}/.test(l)) { h = h.replace(/<\/li>$/, `<br>${inl(l.trim())}</li>`); continue; }
      cierra(); par.push(inl(l));
    }
    vuelca(); if (!/^\s*(?:[-*•]|\d+[.)])\s/m.test(b)) cierra();
  }
  cierra(); return h;
}
function abrirTutor(q, r, res, convocatoria = CONV_DE[q.banco] || '') {
  if (!S.ui.ollamaModelo) return configurarTutor();
  const el = document.createElement('dialog');
  el.id = 'tutor';
  el.className = 'tutor-dialog on';
  el.setAttribute('aria-labelledby', 'tutorT');
  document.body.append(el);
  const clave = JSON.stringify([q.id, convocatoria, r, S.ui.ollamaModelo]);
  const conv = TUT[clave] = TUT[clave] || [];
  const ley = res.norma && res.norma.startsWith('BO') ? `${articulo(res.bloque, res.texto)} · ${corta(res.norma, res.titulo)}` : (res.titulo || 'Caso práctico');
  const blanco = r === null || r === undefined || r < 0; const fallo = !blanco && r !== res.correcta;
  const sug = [fallo ? `¿Por qué no es «${op(q.opciones[r]).slice(0, 60)}»?` : blanco ? '¿Cómo llego a la respuesta correcta?' : '¿Por qué es esta la correcta?', 'Explícamelo con un ejemplo práctico', 'Dame un truco para recordarlo', '¿Qué suelen confundir los opositores aquí?'];
  el.innerHTML = `<section class="tutor-p">
      <header class="tutor-h"><span class="av">${ic('ia')}</span><div><h2 id="tutorT">Tutor de Plaza</h2><p>Entiende el porqué de cada respuesta</p></div><button class="btn ghost sm" data-cerrar-t aria-label="Cerrar tutor">${ic('x')}</button></header>
      <div class="tutor-ctx"><p class="eyebrow">Sobre esta pregunta</p><p class="q">${esc(q.enunciado.replace(/\s+/g, ' '))}</p>
        <p class="tutor-referencia">${ic('leyes', 'sm')} ${esc(ley)}</p><div class="row">${blanco ? '<span class="pill">En blanco</span>' : `<span class="pill ${fallo ? 'bad' : 'ok'}">Tu respuesta: ${LETRAS[r]}</span>`}<span class="pill ok">Correcta: ${LETRAS[res.correcta]}</span></div></div>
      <div class="tutor-msgs" id="tMsgs" aria-live="polite"></div>
      <div class="tutor-sug" id="tSug">${sug.map((s) => `<button class="chip" data-s="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <form class="tutor-in" id="tForm"><textarea id="tTxt" rows="1" placeholder="Escribe tu duda…" maxlength="600" aria-label="Tu duda"></textarea><button class="btn primary send" id="tSend" aria-label="Enviar">${ic('enviar')}</button></form>
      <p class="tutor-foot">Contrasta la explicación con el artículo.</p>
    </section>`;
  const msgs = $('#tMsgs', el), txt = $('#tTxt', el), send = $('#tSend', el);
  let solicitud = null;
  const ajustar = () => { msgs.scrollTop = msgs.scrollHeight; };
  function pintar() {
    msgs.innerHTML = `<div class="msg a"><span class="av sm">${ic('ia', 'sm')}</span><div class="mb"><p>¿Qué parte de esta respuesta quieres entender mejor?</p></div></div>` +
      conv.map(m => m.role === 'user' ? `<div class="msg u">${esc(m.content)}</div>` :
        `<div class="msg a"><span class="av sm">${ic('ia', 'sm')}</span><div class="mb">${md(m.content)}
        ${m.ver?.avisos.length ? `<p class="ver warn">${esc(m.ver.avisos.join(' '))}</p>` : ''}
        ${m.error ? `<p class="err">${esc(m.error)}</p>` : ''}</div></div>`).join('');
    $('#tSug', el).hidden = conv.length > 0;
    ajustar();
  }
  async function enviar(texto) {
    texto = texto.trim();
    if (!texto || solicitud) return;
    conv.push({ role: 'user', content: texto });
    const historial = conv.filter(m => !m.error).map(({role, content}) => ({role, content}));
    const respuesta = { role: 'assistant', content: '' };
    conv.push(respuesta);
    txt.value = '';
    pintar();
    const destino = $('.mb', msgs.lastElementChild);
    destino.textContent = 'Leyendo el artículo…';
    ajustar();
    solicitud = new AbortController();
    send.innerHTML = ic('parar');
    send.setAttribute('aria-label', 'Detener respuesta');
    try {
      const resultado = await Plaza.tutorLocal.responder({
        id: q.id, r: blanco ? null : r, conv: convocatoria, modelo: S.ui.ollamaModelo,
        mensajes: historial, signal: solicitud.signal,
        onTexto: trozo => { respuesta.content += trozo; destino.innerHTML = md(respuesta.content); ajustar(); },
      });
      respuesta.ver = resultado.verificacion;
      if (!respuesta.content.trim()) respuesta.error = 'No he recibido una respuesta. Inténtalo otra vez.';
    } catch (error) {
      respuesta.error = solicitud.signal.aborted ? 'Respuesta detenida.' :
        'No he podido responder. Comprueba el tutor desde «Configurar Ollama» en el menú.';
    } finally {
      solicitud = null;
      send.innerHTML = ic('enviar');
      send.setAttribute('aria-label', 'Enviar');
      if (el.open) { pintar(); txt.focus(); }
    }
  }
  $('#tForm', el).onsubmit = e => {
    e.preventDefault();
    if (solicitud) solicitud.abort();
    else enviar(txt.value);
  };
  txt.onkeydown = e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      enviar(txt.value);
    }
  };
  $$('[data-s]', el).forEach(boton => boton.onclick = () => enviar(boton.dataset.s));
  $('[data-cerrar-t]', el).onclick = () => el.close();
  el.addEventListener('click', e => { if (e.target === el) el.close(); });
  el.addEventListener('close', () => { solicitud?.abort(); el.remove(); }, {once:true});
  pintar();
  el.showModal();
}

function reportar(id, r, conv = '') {
  const motivos = ['La respuesta correcta es otra', 'Hay dos respuestas válidas', 'El enunciado no se entiende', 'La explicación es incorrecta', 'El artículo ha cambiado'];
  const d = dialogo(`<div class="dh"><div><h2>Reportar un error</h2><p>Lo revisamos y, si procede, retiramos o corregimos la pregunta.</p></div><button class="btn ghost sm" data-cerrar aria-label="Cerrar">${ic('x')}</button></div>
    <div class="db"><div class="choices" style="margin-bottom:12px">${motivos.map((m) => `<button class="choice" aria-pressed="false">${esc(m)}</button>`).join('')}</div><textarea id="motivo" maxlength="800" placeholder="Cuéntanos qué has visto (opcional)"></textarea><p id="estado-reporte" role="status"></p></div>
    <div class="df"><button class="btn ghost" data-cerrar>Cancelar</button><button class="btn primary" id="enviar">Abrir correo</button></div>`);
  $$('.choice', d).forEach((c) => c.onclick = () => c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true'));
  const enviar = $('#enviar', d); const estado = $('#estado-reporte', d);
  enviar.onclick = async () => {
    const sel = $$('.choice[aria-pressed=true]', d).map(c => c.textContent);
    const motivo = [...sel, $('#motivo', d).value.trim()].filter(Boolean).join(' · ');
    if (!motivo) { estado.textContent = 'Elige un motivo o añade un comentario.'; return; }
    const cuerpo = `Pregunta ${id}\nRespuesta marcada: ${r < 0 ? 'en blanco' : LETRAS[r]}\nConvocatoria: ${conv || 'general'}\n\n${motivo}`;
    location.href = 'mailto:learntouseai@gmail.com?subject=' + encodeURIComponent('Plaza · pregunta ' + id) + '&body=' + encodeURIComponent(cuerpo);
    estado.textContent = 'Envía el mensaje desde tu aplicación de correo. También puedes escribir a learntouseai@gmail.com indicando la pregunta ' + id;

  };
}


/* Fila de tema con icono, barra de acierto y acción */
function fila(icono, titulo, desc, p, accion, color) {
  const c = p === null ? '' : color ? (p >= 70 ? 'var(--ok)' : p >= 50 ? 'var(--accent)' : 'var(--bad)') : '';
  return `<div class="tema"><span class="tico">${ic(icono)}</span><div class="tm"><h3>${esc(titulo)}</h3><div class="d">${desc}</div><div class="bar"><i style="width:${p || 0}%${c ? ';background:' + c : ''}"></i></div></div><div class="act"><span class="pct">${p === null ? '—' : p + ' %'}</span>${accion}</div></div>`;
}

/* ---------- Plan de estudio diario ---------- */
function temaFlojo(o) {
  const st = o.temas.map((t) => { const b = S.b[t] || { ok: 0, mal: 0 }; const n = b.ok + b.mal; return { t, n, p: n ? b.ok / n : 0 }; });
  const poco = st.filter((x) => x.n < 20).sort((a, b) => a.n - b.n)[0];
  if (poco) return [poco.t, poco.n ? 'Aún tienes pocas respuestas en este tema' : 'Todavía no lo has practicado'];
  const f = st.sort((a, b) => a.p - b.p)[0]; return [f.t, `Tu tema más flojo: ${Math.round(100 * f.p)} % de acierto`];
}
function ultimoSim() { const h = S.hist.find((x) => x.nota !== undefined); return h ? entreDias(dia(new Date(h.fecha)), dia()) : null; }
function ajustarPlan() {
  const d = dialogo(`<div class="dh"><div><h2>Ajustar tu plan</h2><p>Lo usamos para proponerte cada día cuánto practicar y cuándo hacer simulacros.</p></div><button class="btn ghost sm" data-cerrar aria-label="Cerrar">${ic('x')}</button></div>
    <div class="db"><div class="field"><span class="lbl">Preguntas al día</span><div class="seg" id="pMeta">${[15, 30, 50, 80].map((n) => `<button data-v="${n}" aria-pressed="${S.plan.meta === n}">${n}</button>`).join('')}</div></div>
    <div class="field" style="margin:0"><label for="pEx">Fecha del examen <small class="muted">(opcional)</small></label><input class="inp" id="pEx" type="date" min="${dia()}" value="${esc(S.plan.examen || '')}"></div></div>
    <div class="df"><button class="btn ghost" data-cerrar>Cancelar</button><button class="btn primary" id="pOk">Guardar</button></div>`);
  let meta = S.plan.meta;
  $$('#pMeta button', d).forEach((b) => b.onclick = () => { meta = +b.dataset.v; $$('#pMeta button', d).forEach((x) => x.setAttribute('aria-pressed', x === b)); });
  $('#pOk', d).onclick = () => { S.plan = { meta, examen: $('#pEx', d).value || '' }; save(); d.close(); toast('Plan actualizado'); render(); };
}

/* =================== INICIO =================== */
rutas.inicio = async () => {
  const o = opo(); const R = await resumen();
  if (!o) { main.innerHTML = '<div class="wrap"></div>'; elegirOpo(true); return; }
  const ahora = new Date(); const fecha = ahora.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const hoy = S.dias[dia(ahora)] || { n: 0, ok: 0 }; const hoyN = hoy.n; const ac = acierto7(); const ra = racha();
  const nr = pendientes().length; const enCola = Object.keys(S.rep).length;
  const nPreg = o.temas.reduce((a, t) => a + ((R.bancos[t] || {}).n || 0), 0); const nCasos = o.casos.reduce((a, t) => a + ((R.bancos[t] || {}).n || 0), 0);
  const sim = o.sim && R.sim[o.sim];
  // plan de hoy: repaso espaciado → tema más flojo → simulacro periódico (más frecuente si el examen está cerca)
  const meta = S.plan.meta; const faltan = S.plan.examen ? entreDias(dia(), S.plan.examen) : null;
  const cadaSim = faltan !== null && faltan <= 45 ? 3 : 7; const us = ultimoSim(); const tocaSim = sim && (us === null || us >= cadaSim);
  const [tf, porque] = temaFlojo(o); const nNuevas = Math.max(0, meta - hoyN); const nTanda = Math.min(Math.max(nNuevas, 10), 30);
  const pasos = [
    { ok: !nr, t: nr ? `Repasa ${nr} pregunta${nr === 1 ? '' : 's'}` : 'Repaso al día', d: nr ? 'Las que fallaste y hoy te toca recordar. Así se fijan en la memoria.' : enCola ? `${enCola} en tu memoria a largo plazo. Volverán cuando toque.` : 'Cuando falles alguna, volverá aquí en el momento justo.', b: nr ? `<button class="btn primary" id="pRep">Repasar ${Math.min(nr, 30)}</button>` : '' },
    { ok: hoyN >= meta, t: hoyN >= meta ? `Objetivo cumplido: ${hoyN} de ${meta}` : `Practica ${nNuevas} pregunta${nNuevas === 1 ? '' : 's'} más`, d: `Hoy toca <b>${esc(TEMAS[tf])}</b>. ${esc(porque)}.`, b: `<button class="btn${nr ? '' : ' primary'}" id="pTema">${hoyN >= meta ? 'Seguir' : 'Practicar ' + nTanda}</button>` },
  ];
  if (sim) pasos.push({ ok: !tocaSim, t: tocaSim ? 'Haz un simulacro' : 'Simulacro al día', d: us === null ? 'Aún no has hecho ninguno. Verás tu resultado al entregar.' : `El último fue ${us === 0 ? 'hoy' : us === 1 ? 'ayer' : `hace ${us} días`}. Te proponemos uno cada ${cadaSim} días.`, b: tocaSim ? '<a class="btn" href="#/simulacros">Ir a simulacros</a>' : '' });
  const pp = Math.min(100, pct(hoyN, meta));
  const titulo = hoyN >= meta ? 'Objetivo cumplido' : hoyN ? `Te quedan ${nNuevas} pregunta${nNuevas === 1 ? '' : 's'}` : `${meta} preguntas para hoy`;
  main.innerHTML = `<div class="wrap home">
    <header class="home-cabecera">
      <div>
        <p class="fecha-estudio"><time datetime="${dia(ahora)}">${esc(fecha)}</time></p>
        <h1 class="home-titulo">${esc(o.nombre)}</h1>
        <p class="home-temario">${nPreg.toLocaleString('es')} preguntas y ${nCasos} casos prácticos · ${o.fuente ? `${esc(sim?.[4] || 'Práctica parcial')} · <a href="${esc(o.fuente)}" target="_blank" rel="noopener">Referencia oficial</a>` : 'Correcciones con el artículo del BOE'}</p>
      </div>
      <button class="btn" id="ajPlan">${ic('calendario', 'sm')} Ajustar plan</button>
    </header>
    <div class="home-columnas">
      <div class="home-sesion">
        <section class="tablero" aria-labelledby="tablero-titulo">
          <p class="tablero-etiqueta">Plan de hoy${faltan !== null && faltan >= 0 ? ` · ${faltan === 0 ? 'el examen es hoy' : `examen en ${faltan} día${faltan === 1 ? '' : 's'}`}` : ''}</p>
          <h2 id="tablero-titulo">${titulo}</h2>
          <button class="btn btn-tablero" id="rapido">Test rápido ${ic('arrow', 'sm')}</button>
          <div class="tablero-progreso">
            <div><span>Objetivo diario</span><b>${hoyN} / ${meta}</b></div>
            <div class="hero-bar" role="progressbar" aria-valuenow="${pp}" aria-valuetext="${hoyN} de ${meta} preguntas" aria-valuemin="0" aria-valuemax="100" aria-label="Objetivo diario"><i style="width:${pp}%"></i></div>
          </div>
        </section>
        <section aria-labelledby="agenda-titulo" class="agenda">
          <h2 class="sec" id="agenda-titulo">Tu sesión de estudio</h2>
          <ol class="plan">${pasos.map((x, i) => `<li class="paso${x.ok ? ' hecho' : ''}"><span class="pn" aria-hidden="true">${x.ok ? ic('check', 'sm') : i + 1}</span><div class="pt"><b>${x.t}${x.ok ? '<span class="sr">, completado</span>' : ''}</b><span class="d">${x.d}</span></div>${x.b ? `<div class="pa">${x.b}</div>` : ''}</li>`).join('')}</ol>
        </section>
      </div>
      <aside class="home-datos" aria-label="Progreso y convocatorias">
        <section class="cuaderno">
          <h2>Tu progreso</h2>
          <dl>
            <div><dt>Acierto en 7 días</dt><dd>${ac === null ? '—' : ac + '<small> %</small>'}</dd></div>
            <div><dt>Racha de estudio</dt><dd>${ra}<small> ${ra === 1 ? 'día' : 'días'}</small></dd></div>
            <div><dt>Preguntas dominadas</dt><dd>${S.dom || 0}</dd></div>
          </dl>
          <a href="#/progreso">Ver progreso ${ic('arrow', 'sm')}</a>
        </section>
        <a class="aviso-convocatorias" href="#/oposiciones">
          ${ic('calendario')}<span><b>Convocatorias del BOE</b><span>Plazos abiertos y próximas oposiciones.</span></span>${ic('arrow', 'sm')}
        </a>
      </aside>
    </div>
    <h2 class="sec">Herramientas de estudio</h2>
    <div class="home-herramientas">
      <a href="#/casos">${ic('case')}<span><b>Casos prácticos</b><small>${o.casos.length ? o.casos.length + ' tipos de supuestos' : 'Explorar otros cuerpos'}</small></span>${ic('arrow', 'sm')}</a>
      <a href="#/leyes">${ic('book')}<span><b>Consultar la ley</b><small>Artículos que más caen en examen</small></span>${ic('arrow', 'sm')}</a>
      <a href="#/practicar">${ic('practicar')}<span><b>Test a medida</b><small>Elige temas, duración y tipo</small></span>${ic('arrow', 'sm')}</a>
    </div>
    <h2 class="sec">Tus temas <small>Porcentaje de acierto</small></h2>
    <div class="card">${o.temas.map((t) => {
      const b = S.b[t] || { ok: 0, mal: 0 }; const n = b.ok + b.mal; const p = pct(b.ok, n); const rb = R.bancos[t] || { n: 0, normas: [] };
      return fila(TEMA_IC[t], TEMAS[t], `${rb.normas.slice(0, 3).map(([nid, tt]) => esc(corta(nid, tt))).join(' · ')} · ${rb.n.toLocaleString('es')} preguntas`, n ? p : null, `<button class="btn sm" data-tema="${t}">Practicar</button>`);
    }).join('')}</div>
  </div>`;
  $('#rapido').onclick = () => empezar({ titulo: 'Test rápido', rapido: true, bancos: o.temas, n: 10 });
  $('#ajPlan').onclick = ajustarPlan;
  if (nr) $('#pRep').onclick = empezarRepaso;
  $('#pTema').onclick = () => empezar({ titulo: TEMAS[tf], bancos: [tf], n: nTanda });
  $$('[data-tema]').forEach((b) => b.onclick = () => empezar({ titulo: TEMAS[b.dataset.tema], bancos: [b.dataset.tema], n: 10 }));
};
function empezarRepaso() { const c = pendientes(); if (!c.length) return toast('Nada que repasar hoy'); empezar({ titulo: 'Repaso de hoy', fallos: true, cola: c, n: Math.min(30, c.length) }); }

/* =================== PRACTICAR (configurador) =================== */
rutas.practicar = async () => {
  const o = opo(); if (!o) { elegirOpo(true); return; }
  const codigo = S.opo;
  const R = await resumen();
  const cantidades = [10, 20, 30, 50];
  const anterior = S.practica?.[codigo];
  const guardados = Array.isArray(anterior?.bancos) ? o.temas.filter((t) => anterior.bancos.includes(t)) : [];
  const temas = guardados.length ? guardados : o.temas;
  const cantidad = cantidades.includes(anterior?.n) ? anterior.n : 20;
  const tipos = new Map(o.fuente ? [['', 'Todos los tipos']] : TIPOS);
  const tipo = tipos.has(anterior?.tipo) ? anterior.tipo : '';
  main.innerHTML = `<div class="wrap practica">
    <h1 class="h">Prepara tu test</h1><p class="lede">${esc(o.nombre)}</p>
    <form class="practica-form" id="practica-form">
      <div class="practica-config">
        <fieldset class="practica-temas"><legend>Temas</legend>
          <div class="practica-seleccion">
            <button type="button" data-marcar="todos">Marcar todos</button>
            <button type="button" data-marcar="ninguno">Quitar selección</button>
          </div>
          ${o.temas.map((t) => `<label class="practica-tema">
            <input type="checkbox" name="tema" value="${t}" ${temas.includes(t) ? 'checked' : ''}>
            <span>${esc(TEMAS[t])}</span><small>${((R.bancos[t] || {}).n || 0).toLocaleString('es')} preguntas</small>
          </label>`).join('')}
        </fieldset>
        <fieldset><legend>Número de preguntas</legend>
          <div class="practica-cantidad">${cantidades.map((n) => `<label><input type="radio" name="cantidad" value="${n}" ${n === cantidad ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
        </fieldset>
        <fieldset><legend>Tipo de pregunta</legend>
          <div class="practica-tipos">${[...tipos].map(([v, t]) => `<label><input type="radio" name="tipo" value="${v}" ${v === tipo ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
        </fieldset>
      </div>
      <section class="practica-resumen" aria-labelledby="practica-titulo">
        <h2 id="practica-titulo">Tu test</h2>
        <output id="practica-resumen" aria-live="polite" aria-atomic="true"></output>
        <button class="btn btn-tablero" type="submit" id="go">Empezar test ${ic('arrow', 'sm')}</button>
      </section>
    </form>
    <h2 class="sec">También puedes</h2>
    <div class="grid g2">
      <a class="card action" href="#/casos"><span class="ico warn">${ic('case')}</span><span><b>Resolver casos prácticos</b><span class="d">Supuestos con una única solución según la ley.</span></span></a>
      <a class="card action" href="#/leyes"><span class="ico">${ic('book')}</span><span><b>Practicar una ley concreta</b><span class="d">Entra en Leyes y pulsa «Practicar esta ley».</span></span></a>
    </div></div>`;
  const formulario = $('#practica-form');
  const resumenTest = $('#practica-resumen', formulario);
  const iniciar = $('#go', formulario);
  let configuracion, revision = 0;
  async function actualizar() {
    const actual = ++revision;
    const datos = new FormData(formulario);
    const bancos = datos.getAll('tema'), tipo = datos.get('tipo');
    const total = bancos.length;
    iniciar.disabled = true;
    configuracion = null;
    if (!total) {
      resumenTest.textContent = 'Marca al menos un tema para empezar.';
      return;
    }
    resumenTest.textContent = 'Contando preguntas disponibles…';
    try {
      const params = new URLSearchParams({ bancos: bancos.join(','), tipo });
      const disponibles = await api('/disponibles?' + params);
      if (actual !== revision) return;
      const n = Math.min(Number(datos.get('cantidad')), disponibles.total);
      const seleccion = total === o.temas.length ? 'Todos los temas' : total === 1 ? TEMAS[bancos[0]] : `${total} temas`;
      resumenTest.innerHTML = n ? `<strong>${n} preguntas</strong><span>${esc(seleccion)} · ${tipo ? tipos.get(tipo) : 'Todos los tipos'}</span>` : 'No hay preguntas con estos filtros.';
      configuracion = { bancos, n, tipo };
      iniciar.disabled = !n;
    } catch (error) {
      if (actual === revision) resumenTest.textContent = error.message;
    }
  }
  formulario.addEventListener('change', actualizar);
  $$('[data-marcar]', formulario).forEach((b) => b.onclick = () => {
    const marcar = b.dataset.marcar === 'todos';
    $$('input[name="tema"]', formulario).forEach((input) => { input.checked = marcar; });
    actualizar();
  });
  formulario.addEventListener('submit', (e) => {
    e.preventDefault();
    const cfg = configuracion;
    if (!cfg?.n) return;
    S.practica = { ...S.practica, [codigo]: cfg };
    save();
    empezar({ titulo: 'Test personalizado', ...cfg });
  });
  actualizar();
};

/* =================== TEST (corrección inmediata) =================== */
let SES = null;
function irA(h) { if (location.hash === h) render(); else location.hash = h; }
function empezar(s) { SES = { ...s, items: [], t0: Date.now() }; irA('#/test'); }
// Opciones con formato uniforme: en la ley unas acaban en «;» o empiezan en minúscula y delatarían la correcta.
const op = (o) => { let x = String(o).trim().replace(/(\s+[yo])?\s*[;,:.]$/u, '').replace(/[;,]\s+[yo]$/u, ''); return x.charAt(0).toLocaleUpperCase('es') + x.slice(1); };
async function siguiente(s) {
  if (s.lista) return s.lista[s.items.length]?.q || null;  // preguntas del resultado anterior
  const vistos = new Set(s.items.map(x => x.q.id));
  if (s.fallos) {
    for (const id of s.cola || pendientes()) {
      if (vistos.has(id) || !S.rep[id]) continue;
      try {
        return await api('/pregunta_id?repaso=1&id=' + encodeURIComponent(id));
      } catch (error) {
        if (error.status !== 410 && error.status !== 404) throw error;
      }
    }
    return null;
  }
  const params = new URLSearchParams({ excluir: [...vistos].join(',') });
  if (s.norma) {
    params.set('norma', s.norma);
    if (s.bloque) params.set('bloque', s.bloque);
  } else {
    params.set('bancos', s.bancos.join(','));
    if (s.tipo) params.set('tipo', s.tipo);
  }
  try {
    return await api('/pregunta?' + params);
  } catch (error) {
    if (error.status !== 404) throw error;
    return null;
  }
}

/* Opciones del test como grupo: ↑ ↓ recorren (foco itinerante), Intro o Espacio responden. */
function flechasOpciones(ol) {
  if (!ol) return; ol.setAttribute('role', 'group'); ol.setAttribute('aria-label', 'Opciones de respuesta');
  const bs = () => $$('.opt', ol).filter((b) => !b.disabled);
  const sel = $('.opt.sel', ol) || $('.opt', ol); $$('.opt', ol).forEach((b) => b.tabIndex = b === sel ? 0 : -1);
  ol.addEventListener('keydown', (e) => {
    const d = { ArrowDown: 1, ArrowUp: -1 }[e.key]; if (!d) return;
    const l = bs(); const i = l.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault(); const n = l[(i + d + l.length) % l.length]; l.forEach((b) => b.tabIndex = -1); n.tabIndex = 0; n.focus();
  });
}
/* Rejilla del mapa del simulacro: flechas en las cuatro direcciones, Inicio y Fin. */
function rejillaTeclado(g, actual) {
  const bs = $$('button', g); bs.forEach((b, i) => b.tabIndex = i === actual ? 0 : -1);
  const cols = () => { const y = bs[0].offsetTop; let n = 0; while (n < bs.length && bs[n].offsetTop === y) n++; return n || 1; };
  g.addEventListener('keydown', (e) => {
    const i = bs.indexOf(document.activeElement); if (i < 0) return; const c = cols();
    const j = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + c, ArrowUp: i - c, Home: 0, End: bs.length - 1 }[e.key]; if (j === undefined) return;
    e.preventDefault(); const n = bs[Math.max(0, Math.min(bs.length - 1, j))]; bs.forEach((b) => b.tabIndex = -1); n.tabIndex = 0; n.focus();
  });
  setTimeout(() => bs[actual] && bs[actual].focus(), 50);
}
rutas.test = async () => {
  const s = SES; if (!s) { location.hash = '#/practicar'; return; }
  document.body.classList.add('focus');
  main.innerHTML = `<div class="run${s.rapido ? ' run-rapido' : ''}">
    <header class="run-top"><div class="in"><button class="btn ghost sm" id="salir">${ic('x', 'sm')} Salir</button><div class="run-title">${esc(s.titulo)}</div><div class="run-meta"><span class="timer">${ic('clock', 'sm')}<span id="tm">0:00</span></span></div></div><div class="progress"><i id="pr" style="width:0"></i></div></header>
    <div class="run-body" id="body"></div>
    <footer class="run-foot"><div class="in"><button class="btn ghost sm" id="rep" hidden>${ic('flag', 'sm')} Reportar error</button><span class="sp"></span><button class="btn ghost sm only-kb" id="kb" aria-label="Atajos de teclado">${ic('teclado', 'sm')}</button><span class="muted" id="cnt" style="font-size:13px;font-weight:600"></span><button class="btn primary" id="sig" disabled>Siguiente ${ic('arrow', 'sm')}</button></div></footer></div>`;
  const tick = setInterval(() => { $('#tm').textContent = fmtT((Date.now() - s.t0) / 1000); }, 1000); alSalir(() => clearInterval(tick));
  $('#salir').onclick = async () => { if (!s.items.some((x) => x.res) || await confirmar('¿Salir del test?', 'Lo que has respondido ya cuenta en tu progreso.', 'Salir')) { if (s.items.some((x) => x.res)) return terminar(s); SES = null; history.length > 1 ? history.back() : (location.hash = '#/inicio'); } };
  let estado = 'lista';
  const cuerpo = $('#body', main);
  const pinta = async () => {
    if (estado === 'cargando') return;
    estado = 'cargando';
    $('#sig').disabled = true; $('#rep').hidden = true;
    const ultima = s.items.at(-1);
    const pendiente = ultima && !ultima.res;
    const i = s.items.length - Number(!!pendiente);
    if (i >= s.n) return terminar(s);
    cuerpo.innerHTML = `<div class="loading"><div class="skel" style="width:80%;height:20px"></div><div class="skel" style="width:60%;height:20px"></div><div class="skel" style="height:54px"></div><div class="skel" style="height:54px"></div></div>`;
    let q;
    try { q = pendiente ? ultima.q : await siguiente(s); } catch (e) {
      estado = 'error-carga';
      if (cuerpo.isConnected) mostrarReintento(cuerpo, 'No se pudo cargar la pregunta.', e, pinta);
      return;
    }
    if (!cuerpo.isConnected) return;
    if (!q) { if (i) return terminar(s); cuerpo.innerHTML = `<div class="empty">${ic('check')}<p>No hay más preguntas disponibles con estos filtros.</p><a class="btn" href="#/practicar">Volver</a></div>`; return; }
    if (!pendiente) s.items.push({ q, res: null, r: null });
    estado = 'pregunta';
    $('#pr').style.width = (100 * i / s.n) + '%'; $('#cnt').textContent = `${i + 1} de ${s.n}`; $('#sig').disabled = true; $('#rep').hidden = true;
    $('#body').innerHTML = `<div class="qmeta"><span class="pill accent">Pregunta ${i + 1}</span>${q.banco && TEMAS[q.banco] ? `<span class="pill">${esc(TEMAS[q.banco])}</span>` : q.banco && CASOS[q.banco] ? `<span class="pill warn">Caso práctico · ${esc(CASOS[q.banco][0])}</span>` : ''}</div>
      <h2 class="enun">${enunciadoHTML(q.enunciado)}</h2>
      <ol class="opts">${q.opciones.map((o, k) => `<li><button class="opt" data-k="${k}"><span class="l">${LETRAS[k]}</span><span>${esc(op(o))}</span><span class="m"></span></button></li>`).join('')}</ol>
      ${q.revisar ? '<p class="note-warn">Pregunta de un reglamento anterior al TREBEP: pendiente de revisión por un preparador.</p>' : ''}
      <div class="hint"><span><span class="kbd">A</span>–<span class="kbd">D</span> o <span class="kbd">1</span>–<span class="kbd">4</span> responder</span><span><span class="kbd">↑</span> <span class="kbd">↓</span> recorrer</span><span><span class="kbd">Intro</span> siguiente</span><span><span class="kbd">T</span> tutor</span></div><div id="fb"></div>`;
    $$('.opt').forEach((b) => b.onclick = () => responde(+b.dataset.k)); flechasOpciones($('.opts'));
    cuerpo.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0);
    if (pendiente && ultima.r !== null) responde(ultima.r);
  };
  const responde = async (k) => {
    if (!['pregunta', 'error-correccion'].includes(estado)) return;
    estado = 'corrigiendo';
    const it = s.items.at(-1); const q = it.q; const banco = q.banco || 'repaso';
    const conv = s.lista?.[s.items.length - 1]?.conv ?? CONV_DE[banco] ?? '';  // Usa la versión del resultado al repasar.
    it.r = k;
    const fb = $('#fb', cuerpo);
    $$('.opt', cuerpo).forEach(b => { b.disabled = true; b.classList.toggle('sel', +b.dataset.k === k); });
    fb.innerHTML = '<p class="muted" role="status">Corrigiendo…</p>';
    let r;
    try { r = await api(`/corregir?id=${encodeURIComponent(q.id)}&r=${k}${conv ? '&conv=' + conv : ''}`); } catch (e) {
      estado = 'error-correccion';
      if (fb.isConnected) mostrarReintento(fb, 'Tu respuesta está seleccionada.', e, () => responde(k), 'Reintentar corrección');
      return;
    }
    if (!fb.isConnected) return;
    it.res = r; it.conv = conv; anota(q.id, banco, r.acierto);
    $$('.opt').forEach((b) => { const j = +b.dataset.k; b.classList.remove('sel'); if (j === r.correcta) { b.classList.add('ok'); $('.m', b).innerHTML = ic('check'); } else if (j === k) { b.classList.add('bad'); $('.m', b).innerHTML = ic('x'); } else b.classList.add('dim'); });
    $('#fb').innerHTML = `<div class="fb"><div class="verdict ${r.acierto ? 'ok' : 'bad'}"><span class="ic">${ic(r.acierto ? 'check' : 'x')}</span><div><b>${r.acierto ? 'Correcto' : 'Incorrecto'}</b><span>${r.acierto ? 'Bien visto.' : `La respuesta correcta es la ${LETRAS[r.correcta]}.`}</span></div></div>${fundamento(r, q)}${tutorCTA()}</div>`;
    enlazaFundamento($('#fb')); $('[data-tutor]', $('#fb')).onclick = () => abrirTutor(q, k, r, conv);
    $('#sig').disabled = false; $('#rep').hidden = false; $('#rep').onclick = () => reportar(q.id, k, conv);
    $('#sig').innerHTML = s.items.length >= s.n ? `Ver resultados ${ic('arrow', 'sm')}` : `Siguiente ${ic('arrow', 'sm')}`;
    $('#pr').style.width = (100 * s.items.length / s.n) + '%';
    estado = 'corregida'; $('#sig').focus({ preventScroll: true });
    setTimeout(() => $('.verdict', cuerpo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };
  $('#sig').onclick = () => { if (estado === 'corregida') pinta(); };
  $('#kb').onclick = verAtajos;
  const teclas = (e) => {
    if ($('#dlg').open || $('#tutor.on') || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase(); const m = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 }[k];
    if (estado === 'pregunta' && m !== undefined) { e.preventDefault(); responde(m); }
    else if (estado === 'corregida' && (e.key === 'Enter' || e.key === 'ArrowRight') && !e.target.closest('.opts, .tutor-cta, .panel')) { e.preventDefault(); pinta(); }
    else if (estado === 'corregida' && k === 't' && $('[data-tutor]')) { e.preventDefault(); $('[data-tutor]').click(); }
  };
  addEventListener('keydown', teclas); alSalir(() => removeEventListener('keydown', teclas));
  pinta();
};
function terminar(s) {
  const its = s.items.filter((x) => x.res); const ok = its.filter((x) => x.res.acierto).length;
  const fin = { titulo: s.titulo, n: its.length, ok, mal: its.length - ok, t: (Date.now() - s.t0) / 1000, items: its };
  S.hist.unshift({ titulo: s.titulo, n: fin.n, ok, fecha: Date.now(), t: Math.round(fin.t) }); S.hist = S.hist.slice(0, 50); save();
  SES = null; RESULT = fin; irA('#/resultado');
}

/* =================== RESULTADOS =================== */
let RESULT = null;
rutas.resultado = async () => {
  const f = RESULT; if (!f) { location.hash = '#/inicio'; return; }
  const filas = f.items.map(x => ({ x, estado: x.r == null || x.r === -1 ? 'blank' : x.res.acierto ? 'ok' : 'bad' }));
  const falladas = filas.filter(fila => fila.estado === 'bad').map(fila => fila.x);
  const enBlanco = filas.filter(fila => fila.estado === 'blank').map(fila => fila.x);
  const filtros = [
    ['todas', 'Todas', filas.length], ['bad', 'Falladas', falladas.length],
    ['blank', 'En blanco', enBlanco.length], ['ok', 'Acertadas', filas.length - falladas.length - enBlanco.length],
  ].filter(([estado]) => estado !== 'blank' || f.blancos !== undefined || enBlanco.length);
  const estados = { ok: 'Acertada', bad: 'Fallada', blank: 'En blanco' };
  const p = pct(f.ok, f.n);
  const msg = p >= 85 ? 'Excelente. Dominas este bloque.' : p >= 70 ? 'Muy bien. Vas por buen camino.' : p >= 50 ? 'Aprobado justo. Repasa los fallos.' : 'Toca repasar. Lee los artículos de tus fallos.';
  main.innerHTML = `<div class="wrap" style="max-width:820px"><a class="back" href="#/inicio">${ic('back', 'sm')} Inicio</a>
    <div class="card result-hero"><div class="nota-resultado"><span>${f.nota !== undefined ? `Nota sobre ${f.max}` : 'Acierto'}</span><b>${f.nota !== undefined ? f.nota.toFixed(2).replace('.', ',') : p + '%'}</b></div>
      <div><p class="eyebrow">${esc(f.titulo)}</p><h1 class="h" style="font-size:26px">${esc(f.nota !== undefined ? (f.nota >= f.max / 2 ? 'Por encima de la mitad.' : 'Por debajo de la mitad.') : msg)}</h1>
      <div class="stats"><div class="ok"><b>${f.ok}</b>aciertos</div><div class="bad"><b>${f.mal}</b>fallos</div>${f.blancos !== undefined ? `<div><b>${f.blancos}</b>en blanco</div>` : ''}<div><b>${fmtT(f.t)}</b>tiempo</div></div>
      ${f.desc ? `<p class="muted" style="margin:0 0 14px;font-size:13.5px">${esc(f.desc)}</p>` : ''}
      <div style="display:flex;gap:10px;flex-wrap:wrap">${falladas.length ? `<button class="btn primary" id="rf">${ic('redo', 'sm')} Repasar estos fallos</button>` : ''}${enBlanco.length ? '<button class="btn" id="rb">Practicar las que dejé en blanco</button>' : ''}<a class="btn" href="#/practicar">Nuevo test</a></div></div></div>
    <h2 class="sec">Revisión <small>Pulsa una pregunta para ver la explicación</small></h2>
    <div class="choices revision-filtros" role="group" aria-label="Filtrar preguntas">
      ${filtros.map(([estado, titulo, n]) => `<button type="button" class="choice" data-filtro-revision="${estado}" aria-pressed="${estado === 'todas'}" aria-controls="rev">${titulo} <small>${n}</small></button>`).join('')}
    </div>
    <div class="card" id="rev">${filas.map(({ x, estado }, i) => `
      <div class="rev" data-i="${i}" data-estado="${estado}"><button type="button" aria-expanded="false" aria-controls="rev-det-${i}"><span class="n">${i + 1}</span><span class="q">${esc(x.q.enunciado)}</span><span class="st ${estado}" role="img" aria-label="${estados[estado]}">${ic(estado === 'ok' ? 'check' : estado === 'bad' ? 'x' : 'info', 'sm')}</span></button><div class="det" id="rev-det-${i}"></div></div>`).join('')}</div>
    <p class="empty" id="rev-vacio" role="status" hidden>No hay preguntas con este resultado.</p></div>`;
  if (falladas.length) $('#rf').onclick = () => empezarLista('Repaso de fallos', falladas);
  if (enBlanco.length) $('#rb').onclick = () => empezarLista('Repaso de preguntas en blanco', enBlanco);
  const botones = $$('[data-filtro-revision]', main);
  const tarjetas = $$('#rev .rev', main);
  botones.forEach(b => b.onclick = () => {
    botones.forEach(control => control.setAttribute('aria-pressed', control === b));
    const filtro = b.dataset.filtroRevision;
    let visibles = 0;
    tarjetas.forEach(el => {
      el.hidden = filtro !== 'todas' && el.dataset.estado !== filtro;
      if (!el.hidden) visibles++;
    });
    $('#rev', main).hidden = !visibles;
    $('#rev-vacio', main).hidden = !!visibles;
  });
  tarjetas.forEach((el) => {
    const abrir = $('button', el);
    abrir.onclick = () => {
      abrir.setAttribute('aria-expanded', el.classList.toggle('open'));
      const det = $('.det', el); if (det.innerHTML) return;
      const { x, estado } = filas[+el.dataset.i];
      det.innerHTML = `<div class="ans">${x.q.opciones.map((o, k) => k === x.res.correcta ? `<div class="ok">${ic('check', 'sm')} ${LETRAS[k]}) ${esc(op(o))}</div>` : k === x.r ? `<div class="bad">${ic('x', 'sm')} ${LETRAS[k]}) ${esc(op(o))}</div>` : '').join('')}${estado === 'blank' ? '<div class="muted">La dejaste en blanco.</div>' : ''}</div>${fundamento(x.res, x.q)}${tutorCTA()}<div><button class="btn ghost sm" data-r>${ic('flag', 'sm')} Reportar error</button></div>`;
      enlazaFundamento(det); $('[data-r]', det).onclick = () => reportar(x.q.id, x.r ?? -1, x.conv); $('[data-tutor]', det).onclick = () => abrirTutor(x.q, x.r, x.res, x.conv);
    };
  });
};
function empezarLista(titulo, resultados) { SES = { titulo, lista: resultados, n: resultados.length, items: [], t0: Date.now() }; irA('#/test'); }

/* =================== SIMULACROS =================== */
const SIMS = { c1: 'Administrativo del Estado (C1)', tram: 'Tramitación Procesal (C1)', aux: 'Auxilio Judicial (C2)' };
rutas.simulacros = async () => {
  const R = await resumen(); const o = opo();
  const orden = Object.keys(R.sim).filter(k => SIMS[k]).sort((a, b) => (b === (o && o.sim)) - (a === (o && o.sim)));
  main.innerHTML = `<div class="wrap"><p class="eyebrow">Simulacros</p><h1 class="h">Examen en condiciones reales</h1>
    <p class="lede">Practica con cronómetro y consulta la corrección al entregar. Los pilotos cubren los bloques indicados y tienen puntuación de práctica.</p>
    <div class="grid g3">${orden.map((k) => { const [n, , mas, menos, desc] = R.sim[k]; return `<div class="card sim-card">
      <div class="meta">${o && o.sim === k ? '<span class="pill accent">Tu oposición</span>' : ''}<span class="pill">${n} preguntas</span><span class="pill">${ic('clock', 'sm')} ${n} min orientativos</span></div>
      <h3>${esc(SIMS[k])}</h3><p>${esc(desc.split(':')[0])}</p><p class="muted" style="font-size:13px">Acierto +${String(mas).replace('.', ',')} · Error ${menos ? '−' : ''}${menos === 1 / 3 ? '1/3' : String(menos).replace('.', ',')} · Blanco 0</p>
      <button class="btn ${o && o.sim === k ? 'primary' : ''}" data-sim="${k}">${ic('play', 'sm')} Empezar</button></div>`; }).join('')}</div>
    <p class="muted" style="font-size:13px;margin-top:20px">El piloto de Auxiliar CARM incluye Excel 2016. El de Administrativo CARM combina teoría y supuestos. En Murcia capital puedes practicar prevención de riesgos e igualdad para Conserje Operario. Madrid y Barcelona cubren organización municipal.</p></div>`;
  $$('[data-sim]').forEach((b) => b.onclick = async () => {
    if (!await confirmar('¿Empezar el simulacro?', 'Corre el cronómetro y no verás la corrección hasta entregar. Puedes dejar preguntas en blanco y marcarlas para revisar.', 'Empezar')) return;
    b.disabled = true;
    try {
      const x = await api('/simulacro?tipo=' + b.dataset.sim);
      if (!b.isConnected) return;
      SIM = { ...x, tipo: b.dataset.sim, titulo: SIMS[b.dataset.sim], resp: Array(x.preguntas.length).fill(null), marca: Array(x.preguntas.length).fill(false), i: 0, t0: Date.now(), lim: x.preguntas.length * 60 };
      location.hash = '#/examen';
    } catch (e) {
      if (b.isConnected) toast(e.message);
    } finally {
      b.disabled = false;
    }
  });
};
let SIM = null;
async function corregirSimulacro(s, items) {
  for (let i = items.length; i < s.preguntas.length && SIM === s; i++) {
    const q = s.preguntas[i]; const k = s.resp[i];
    const r = await api(`/corregir?id=${encodeURIComponent(q.id)}&r=${k ?? -1}&conv=${s.conv}`);
    const blanco = k === null || k === -1;
    items.push({ q, r: blanco ? null : k, res: blanco ? { ...r, acierto: false } : r, conv: s.conv });
  }
}
rutas.examen = async () => {
  const s = SIM; if (!s) { location.hash = '#/simulacros'; return; }
  document.body.classList.add('focus');
  const N = s.preguntas.length;
  main.innerHTML = `<div class="run">
    <header class="run-top"><div class="in"><button class="btn ghost sm" id="salir">${ic('x', 'sm')} Salir</button><div class="run-title">${esc(s.titulo)}</div><div class="run-meta"><button class="btn ghost sm" id="mapa">${ic('grid', 'sm')} <span id="resp">0</span>/${N}</button><span class="timer" id="tmw">${ic('clock', 'sm')}<span id="tm"></span></span></div></div><div class="progress"><i id="pr"></i></div></header>
    <div class="run-body" id="body"></div>
    <footer class="run-foot"><div class="in"><button class="btn sm" id="ant">${ic('back', 'sm')}</button><button class="btn ghost sm" id="flag">${ic('flag', 'sm')} Marcar</button><span class="sp"></span><button class="btn" id="entregar">Entregar</button><button class="btn primary" id="sig">Siguiente ${ic('arrow', 'sm')}</button></div></footer></div>`;
  const cuerpo = $('#body', main);
  const tick = () => {
    const q = s.lim - (s.entrega?.segundos ?? (Date.now() - s.t0) / 1000);
    $('#tm').textContent = fmtT(q); $('#tmw').classList.toggle('low', q < 300);
  };
  tick(); const iv = setInterval(tick, 1000); alSalir(() => clearInterval(iv));
  const pinta = () => {
    const q = s.preguntas[s.i]; const r = s.resp[s.i];
    $('#resp').textContent = s.resp.filter((x) => x !== null).length; $('#pr').style.width = (100 * s.resp.filter((x) => x !== null).length / N) + '%';
    $('#body').innerHTML = `<div class="qmeta"><span class="pill accent">Pregunta ${s.i + 1} de ${N}</span>${s.marca[s.i] ? '<span class="pill warn">Marcada para revisar</span>' : ''}</div><h2 class="enun">${enunciadoHTML(q.enunciado)}</h2>
      <ol class="opts">${q.opciones.map((o, k) => `<li><button class="opt ${r === k ? 'sel' : ''}" data-k="${k}"><span class="l">${LETRAS[k]}</span><span>${esc(op(o))}</span><span class="m"></span></button></li>`).join('')}
      <li><button class="opt blank ${r === -1 ? 'sel' : ''}" data-k="-1"><span class="l">–</span><span>Dejar en blanco</span><span class="m"></span></button></li></ol>
      <div class="hint"><span><span class="kbd">A</span>–<span class="kbd">D</span> elegir</span><span><span class="kbd">←</span> <span class="kbd">→</span> preguntas</span><span><span class="kbd">M</span> marcar</span><span><span class="kbd">G</span> mapa</span></div>`;
    $$('.opt').forEach((b) => b.onclick = () => { const k = +b.dataset.k; s.resp[s.i] = s.resp[s.i] === k ? null : k; pinta(); if (s.resp[s.i] !== null && s.i < N - 1) {
      const posicion = s.i;
      setTimeout(() => { if (cuerpo.isConnected && !s.entrega && s.i === posicion) { s.i++; pinta(); } }, 220);
    } }); flechasOpciones($('.opts'));
    $('#ant').disabled = s.i === 0; $('#sig').disabled = s.i === N - 1; $('#flag').innerHTML = `${ic('flag', 'sm')} ${s.marca[s.i] ? 'Desmarcar' : 'Marcar'}`;
    window.scrollTo(0, 0);
  };
  const mueve = (d) => { s.i = Math.max(0, Math.min(N - 1, s.i + d)); pinta(); };
  $('#ant').onclick = () => mueve(-1); $('#sig').onclick = () => mueve(1);
  $('#flag').onclick = () => { s.marca[s.i] = !s.marca[s.i]; pinta(); };
  $('#mapa').onclick = () => {
    const d = dialogo(`<div class="dh"><div><h2>Mapa del examen</h2><p>${s.resp.filter((x) => x !== null).length} respondidas · ${s.marca.filter(Boolean).length} marcadas</p></div><button class="btn ghost sm" data-cerrar aria-label="Cerrar">${ic('x')}</button></div>
      <div class="db"><div class="qgrid">${s.preguntas.map((_, i) => `<button class="${s.resp[i] !== null ? 'done' : ''} ${i === s.i ? 'cur' : ''} ${s.marca[i] ? 'flag' : ''}" data-i="${i}">${i + 1}</button>`).join('')}</div></div>`);
    $$('.qgrid button', d).forEach((b) => b.onclick = () => { s.i = +b.dataset.i; d.close(); pinta(); }); rejillaTeclado($('.qgrid', d), s.i);
  };
  let confirmando = false;
  const entregar = async (forzado) => {
    if (!s.entrega && !forzado) {
      if (confirmando) return;
      confirmando = true;
      const pend = s.resp.filter(x => x === null).length;
      const acepta = await confirmar('¿Entregar el examen?', pend ? `Te quedan ${pend} preguntas sin contestar; contarán como blanco.` : 'Has contestado todas las preguntas.', 'Entregar');
      confirmando = false;
      if (!acepta || s.entrega || !cuerpo.isConnected) return;
    }
    if (forzado && !s.entrega && $('#dlg').open) {
      const dialogoAbierto = $('#dlg');
      const cancelar = $('[data-no]', dialogoAbierto);
      if (cancelar) cancelar.click(); else dialogoAbierto.close();
    }
    const entrega = s.entrega ||= { items: [], segundos: Math.min(s.lim, (Date.now() - s.t0) / 1000) };
    const items = entrega.items;
    ['#ant', '#sig', '#flag', '#mapa', '#entregar'].forEach(sel => { $(sel, main).disabled = true; });
    cuerpo.innerHTML = '<p class="loading muted" role="status">Corrigiendo el simulacro…</p>';
    try {
      entrega.trabajo ||= corregirSimulacro(s, items).finally(() => { entrega.trabajo = null; });
      await entrega.trabajo;
    } catch (e) {
      if (cuerpo.isConnected) mostrarReintento(cuerpo,
        `Tus respuestas siguen guardadas en este simulacro (${items.length} de ${N} corregidas).`,
        e, () => entregar(true), 'Continuar corrección');
      return;
    }
    if (!cuerpo.isConnected || SIM !== s) return;
    const contestadas = items.filter(x => x.r !== null);
    const ok = contestadas.filter(x => x.res.acierto).length;
    const mal = contestadas.length - ok; const bl = N - contestadas.length;
    contestadas.forEach(({ q, res }) => anota(q.id, q.banco || 'simulacro', res.acierto));
    const nota = ok * s.acierto - mal * s.error; const t = entrega.segundos;
    S.hist.unshift({ titulo: 'Simulacro · ' + s.titulo, n: N, ok, fecha: Date.now(), t: Math.round(t), nota: +nota.toFixed(2), max: N * s.acierto }); S.hist = S.hist.slice(0, 50); save();
    RESULT = { titulo: 'Simulacro · ' + s.titulo, n: N, ok, mal, blancos: bl, t, nota, max: N * s.acierto, items, desc: s.descripcion };
    SIM = null; irA('#/resultado');
  };
  $('#entregar').onclick = () => entregar(false);
  $('#salir').onclick = async () => { if (await confirmar('¿Abandonar el simulacro?', 'Se perderán tus respuestas de este simulacro.', 'Abandonar')) { SIM = null; location.hash = '#/simulacros'; } };
  const teclas = (e) => {
    if (s.entrega || $('#dlg').open || $('#tutor.on') || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase(); const m = { a: 0, b: 1, c: 2, d: 3, 1: 0, 2: 1, 3: 2, 4: 3 }[k];
    if (m !== undefined) { e.preventDefault(); $$('.opt')[m].click(); }
    else if (e.key === 'ArrowRight') mueve(1); else if (e.key === 'ArrowLeft') mueve(-1); else if (k === 'm') $('#flag').click(); else if (k === 'g') { e.preventDefault(); $('#mapa').click(); }
  };
  addEventListener('keydown', teclas); alSalir(() => removeEventListener('keydown', teclas));
  const fin = setInterval(() => { if (!s.entrega && (Date.now() - s.t0) / 1000 >= s.lim && SIM === s) { clearInterval(fin); toast('Tiempo agotado: se entrega el examen'); entregar(true); } }, 1000); alSalir(() => clearInterval(fin));
  if (s.entrega) entregar(true); else pinta();
};

/* =================== CASOS PRÁCTICOS =================== */
rutas.casos = async () => {
  const R = await resumen(); const o = opo() || { casos: [] };
  const otros = Object.keys(CASOS).filter((k) => !o.casos.includes(k));
  const tarjeta = (k) => { const [t, d, i] = CASOS[k]; const b = S.b[k]; const n = (R.bancos[k] || {}).n || 0; return `<button class="card action" data-caso="${k}"><span class="ico warn">${ic(i)}</span><span style="flex:1"><b>${esc(t)}</b><span class="d">${esc(d)}</span><span class="d" style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><span class="pill">${n} casos</span>${b ? `<span class="pill ${pct(b.ok, b.ok + b.mal) >= 70 ? 'ok' : ''}">${pct(b.ok, b.ok + b.mal)} % acierto</span>` : ''}</span></span></button>`; };
  main.innerHTML = `<div class="wrap"><p class="eyebrow">Casos prácticos</p><h1 class="h">Supuestos con solución en la ley</h1>
    <p class="lede">Cada caso plantea una situación concreta y tiene una única respuesta según la norma. Al corregir verás el razonamiento y el precepto que lo decide.</p>
    ${o.casos.length ? `<h2 class="sec" style="margin-top:8px">Para tu oposición</h2><div class="grid g3">${o.casos.map(tarjeta).join('')}</div>` : ''}
    ${otros.length ? `<h2 class="sec">Otros casos</h2><div class="grid g3">${otros.map(tarjeta).join('')}</div>` : ''}</div>`;
  $$('[data-caso]').forEach((b) => b.onclick = () => { const k = b.dataset.caso; empezar({ titulo: 'Caso práctico · ' + CASOS[k][0], bancos: [k], n: Math.min(10, (R.bancos[k] || {}).n || 10) }); });
};

/* =================== LEYES =================== */
rutas.leyes = async (nid, bid) => {
  if (nid) return ley(nid, bid);
  const ns = await api('/normas'); const R = await resumen(); const o = opo();
  const mias = new Set(o ? o.temas.flatMap((t) => (R.bancos[t] || { normas: [] }).normas.map((x) => x[0])) : []);
  const fila = ([n, t]) => `<a class="law" href="#/leyes/${encodeURIComponent(n)}" data-q="${esc((corta(n, t) + ' ' + t).toLowerCase())}"><span class="ab">${esc(corta(n, t))}</span><span class="tt">${esc(t.replace(/\.$/, ''))}<small>${esc(n)}</small></span>${ic('chev')}</a>`;
  const top = ns.filter(([n]) => mias.has(n)); const resto = ns.filter(([n]) => !mias.has(n));
  main.innerHTML = `<div class="wrap" style="max-width:820px"><p class="eyebrow">Leyes</p><h1 class="h">La ley, al día y sin ruido</h1>
    <p class="lede">Texto vigente consolidado del BOE, sin notas ni redacciones anteriores. Las estrellas marcan los artículos que más se preguntan en exámenes oficiales.</p>
    <div class="search">${ic('search')}<input id="buscar" type="search" placeholder="Buscar ley: TREBEP, 39/2015, Constitución…" autocomplete="off"></div>
    ${top.length ? `<h2 class="sec" style="margin-top:8px" data-h>Principales de tu oposición</h2><div class="card" data-l>${top.map(fila).join('')}</div>` : ''}
    <h2 class="sec" data-h>${top.length ? 'Todas las demás' : 'Todas las leyes'} <small>${ns.length} normas</small></h2><div class="card" data-l>${resto.map(fila).join('')}</div></div>`;
  const navL = navegable(main, '.law', { clave: (el) => el.dataset.q });
  $('#buscar').onkeydown = (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); const p = $$('.law').find((x) => !x.hidden && !x.closest('[hidden]')); if (p) navL.foco(p); } };
  $('#buscar').oninput = (e) => { const v = e.target.value.trim().toLowerCase(); $$('.law').forEach((a) => a.hidden = v && !a.dataset.q.includes(v)); $$('[data-l]').forEach((c) => { const vis = $$('.law', c).some((a) => !a.hidden); c.hidden = !vis; c.previousElementSibling.hidden = !vis; }); };
};
/* ---------- Listas navegables con teclado y separadores arrastrables ---------- */
const sinTilde = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/* ↑ ↓ Inicio Fin mueven el foco (foco itinerante: solo un elemento con tabindex=0); escribir salta al primero que empiece así
   («14» → artículo 14; «v» → primero que empieza por v). Los ocultos por el filtro se saltan. */
function navegable(root, sel, { alMover, clave = (el) => el.dataset.k || el.textContent } = {}) {
  const items = () => $$(sel, root).filter((x) => !x.hidden && !x.closest('[hidden]'));
  const foco = (el, mover = true) => { if (!el) return; items().forEach((x) => x.tabIndex = -1); el.tabIndex = 0; el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); if (mover && alMover) alMover(el); };
  let buf = '', tb = 0;
  root.addEventListener('keydown', (e) => {
    const its = items(); const i = its.indexOf(document.activeElement); if (i < 0 || e.metaKey || e.ctrlKey || e.altKey) return;
    const ir = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: its.length - 1, PageDown: i + 10, PageUp: i - 10 }[e.key];
    if (ir !== undefined) { e.preventDefault(); foco(its[Math.max(0, Math.min(its.length - 1, ir))]); return; }
    if (e.key.length === 1 && /[\p{L}\p{N}]/u.test(e.key)) {
      clearTimeout(tb); buf += sinTilde(e.key); tb = setTimeout(() => { buf = ''; }, 800);
      const orden = [...its.slice(i + (buf.length === 1 ? 1 : 0)), ...its.slice(0, i + (buf.length === 1 ? 1 : 0))];
      const el = orden.find((x) => sinTilde(clave(x)).startsWith(buf)); if (el) { e.preventDefault(); foco(el); }
    }
  });
  const ini = items()[0]; if (ini) items().forEach((x) => x.tabIndex = x === ini ? 0 : -1);
  return { foco, items };
}
/* Separador vertical: arrastrar, ← → con el foco (Mayús: pasos grandes) o doble clic para volver al ancho inicial. */
function separador(sep, aplicar, { min, max, ini, guardar, invertido = false }) {
  let w = ini; const pon = (v) => { w = Math.round(Math.max(min, Math.min(max, v))); aplicar(w); sep.setAttribute('aria-valuenow', w); };
  sep.setAttribute('role', 'separator'); sep.setAttribute('aria-orientation', 'vertical'); sep.tabIndex = 0;
  sep.setAttribute('aria-valuemin', min); sep.setAttribute('aria-valuemax', max); pon(ini);
  sep.addEventListener('pointerdown', (e) => {
    e.preventDefault(); sep.setPointerCapture(e.pointerId); sep.classList.add('drag'); document.body.classList.add('arrastrando');
    const x0 = e.clientX, w0 = w;
    const mv = (ev) => pon(w0 + (invertido ? x0 - ev.clientX : ev.clientX - x0));
    const up = () => { sep.removeEventListener('pointermove', mv); sep.classList.remove('drag'); document.body.classList.remove('arrastrando'); guardar(w); };
    sep.addEventListener('pointermove', mv); sep.addEventListener('pointerup', up, { once: true }); sep.addEventListener('pointercancel', up, { once: true });
  });
  sep.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: -1, ArrowRight: 1 }[e.key]; if (!d) return;
    e.preventDefault(); pon(w + d * (invertido ? -1 : 1) * (e.shiftKey ? 64 : 16)); guardar(w);
  });
  sep.addEventListener('dblclick', () => { pon(ini === w ? min + (max - min) / 3 : ini); guardar(w); });
}
S.ui = S.ui || {};

/* Índice de una ley en el orden del BOE: preámbulo, artículos por número (bis, ter…), disposiciones adicionales, transitorias,
   derogatorias y finales. Los rótulos de TÍTULO, CAPÍTULO y Sección solo sirven de cabecera de grupo; la firma no se lista. */
const ORDN = { primera: 1, unica: 1, segunda: 2, tercera: 3, cuarta: 4, quinta: 5, sexta: 6, septima: 7, setima: 7, octava: 8, novena: 9, decima: 10, undecima: 11, duodecima: 12 };
function ordinal(w) { w = sinTilde(w || ''); if (ORDN[w]) return ORDN[w]; let m; if ((m = w.match(/^vigesim[oa](.+)$/))) return 20 + ordinal(m[1]); if ((m = w.match(/^decim[oa](.+)$/))) return 10 + ordinal(m[1]); if (w === 'vigesima') return 20; return 99; }
const SUF = { '': 0, bis: 1, ter: 2, quater: 3, quinquies: 4, sexies: 5, septies: 6 };
const sinCabecera = (t, r) => { const l = t.split("\n"); return sinTilde(l[0]).replace(/\s+/g, " ").trim() === sinTilde(r).replace(/\s+/g, " ").trim() ? l.slice(1).join("\n").replace(/^\s*\n/, "") : t; };
function ordenaLey(es) {
  const DISP = { adicional: [2, 'Disposiciones adicionales', 'adicional'], transitoria: [3, 'Disposiciones transitorias', 'transitoria'], derogatoria: [4, 'Disposiciones derogatorias', 'derogatoria'], final: [5, 'Disposiciones finales', 'final'] };
  const out = [];
  for (const e of es) {
    const r = e.rotulo.replace(/ /g, ' ');
    if (e.bloque === 'firma' || /^(T[ÍI]TULO|CAP[ÍI]TULO|Secci[óo]n|LIBRO|Subsecci[óo]n)\b/i.test(r) && !/^Art/i.test(r)) continue;
    let k, et, grp = e.ruta, m;
    if (e.bloque === 'preambulo') { k = [0, 0, 0]; et = 'Preámbulo'; grp = 'Preámbulo'; }
    else if ((m = r.match(/^Artículo\s+(\d+)(?:\s+(bis|ter|quater|quinquies|sexies|septies))?\s*\./i))) {
      k = [1, +m[1], SUF[m[2] || ''] ?? 9]; et = 'Art. ' + m[1] + (m[2] ? ' ' + m[2] : '');
    }
    else if ((m = e.bloque.match(/^a(\d+)([a-z]*)/))) { k = [1, +m[1], SUF[m[2]] ?? 9]; et = articulo(e.bloque); }
    else if ((m = r.match(/^Disposici[óo]n\s+(adicional|transitoria|derogatoria|final)\s+(\S+?)[.\s]/i))) {
      const d = DISP[m[1].toLowerCase()]; const n = ordinal(m[2]); k = [d[0], n, 0]; grp = d[1];
      et = `D. ${d[2]} ${sinTilde(m[2]) === 'unica' ? 'única' : n < 99 ? n + '.ª' : m[2]}`;
    } else { k = [6, 0, 0]; et = articulo(e.bloque); }
    out.push({ ...e, rotulo: r, ruta: grp, _k: k, _et: et });
  }
  return out.sort((a, b) => a._k[0] - b._k[0] || a._k[1] - b._k[1] || a._k[2] - b._k[2]);
}
async function ley(nid, bid) {
  const [es0, ns] = await Promise.all([api('/estructura?norma=' + encodeURIComponent(nid)), api('/normas')]);
  const es = ordenaLey(es0);
  const t = (ns.find((x) => x[0] === nid) || [nid, nid])[1]; const ab = corta(nid, t);
  const nEx = es.filter((e) => e.veces).length;
  const etiqueta = (e) => e._et;
  let h = '', ruta = null;
  es.forEach((e, i) => {
    if (e.ruta !== ruta) { ruta = e.ruta; h += `<div class="grp" role="presentation">${esc(ruta || 'Disposiciones')}</div>`; }
    const r = e.rotulo.replace(/^Art[íi]culo\s+[^.]*\.\s*/i, '').replace(/^Disposici[óo]n\s+\S+\s+\S+?\.\s*/i, '').replace(/^FELIPE VI$/, 'Exposición de motivos');
    h += `<button class="ai" role="option" aria-selected="false" data-i="${i}" data-b="${esc(e.bloque)}" data-k="${esc(etiqueta(e).replace(/^Art\.\s*/, '') + ' ' + r)}" data-q="${esc(sinTilde(etiqueta(e) + ' ' + e.rotulo))}"><span class="n">${esc(etiqueta(e))}</span><span class="r">${esc(r || e.rotulo)}</span>${e.veces ? `<span class="stars" title="Preguntado ${e.veces} ${e.veces === 1 ? 'vez' : 'veces'} en exámenes oficiales">${'★'.repeat(Math.min(3, e.veces))}</span>` : ''}</button>`;
  });
  main.innerHTML = `<div class="wrap wide"><a class="back" href="#/leyes">${ic('back', 'sm')} Leyes</a>
    <div class="law-top"><div><p class="eyebrow">${esc(ab)}</p><h1 class="h" style="font-size:24px;max-width:40ch">${esc(t.replace(/\.$/, ''))}</h1><p class="muted" style="margin:6px 0 0;font-size:13.5px">${es.length} preceptos · ${nEx} preguntados en exámenes oficiales</p></div>
    <button class="btn primary" id="prLey">${ic('play', 'sm')} Practicar esta ley</button></div>
    <div class="lx" id="lx">
      <aside class="lx-idx card" aria-label="Índice de la ley">
        <div class="lx-f">${ic('search', 'sm')}<input id="filtro" type="search" placeholder="Filtrar: número o palabra" autocomplete="off" aria-controls="arts"><span class="kbd only-kb" title="Atajo">/</span></div>
        <div class="lx-list" id="arts" role="listbox" aria-label="Artículos">${h}</div>
        <p class="lx-n" id="lxN" aria-live="polite"></p>
      </aside>
      <div class="lx-sep" id="lxSep" aria-label="Ajustar ancho del índice"><span></span></div>
      <article class="lx-doc card" id="doc" tabindex="-1" aria-live="polite"><div class="empty">${ic('leyes')}<p>Elige un artículo del índice.<br><span class="muted">Muévete con <span class="kbd">↑</span> <span class="kbd">↓</span> o escribe su número.</span></p></div></article>
    </div></div>`;
  const lx = $('#lx'), list = $('#arts'), doc = $('#doc');
  separador($('#lxSep'), (w) => lx.style.setProperty('--lw', w + 'px'), { min: 240, max: 560, ini: S.ui.leyW || 340, guardar: (w) => { S.ui.leyW = w; save(); } });
  $('#prLey').onclick = async () => { try { await api('/pregunta?norma=' + encodeURIComponent(nid)); empezar({ titulo: ab, norma: nid, n: 10 }); } catch (e) { toast('Aún no hay preguntas de esta ley'); } };
  const cuenta = () => { const n = $$('.ai', list).filter((a) => !a.hidden).length; $('#lxN').textContent = n === es.length ? `${es.length} preceptos` : `${n} de ${es.length} preceptos`; };
  $('#filtro').oninput = (e) => {
    const v = sinTilde(e.target.value.trim()); $$('.ai', list).forEach((a) => a.hidden = v && !a.dataset.q.includes(v));
    $$('.grp', list).forEach((g) => { let n = g.nextElementSibling, vis = false; while (n && n.classList.contains('ai')) { if (!n.hidden) vis = true; n = n.nextElementSibling; } g.hidden = !vis; });
    cuenta();
  };
  $('#filtro').onkeydown = (e) => { if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); const p = $$('.ai', list).find((a) => !a.hidden); if (p) nav.foco(p); } else if (e.key === 'Escape' && e.target.value) { e.target.value = ''; e.target.oninput(e); } };
  let pide = 0;
  const muestra = async (el, { foco = false } = {}) => {
    $$('.ai[aria-selected="true"]', list).forEach((x) => x.setAttribute('aria-selected', 'false')); el.setAttribute('aria-selected', 'true');
    const e = es[+el.dataset.i]; const b = e.bloque; const yo = ++pide;
    history.replaceState(null, '', `#/leyes/${encodeURIComponent(nid)}/${encodeURIComponent(b)}`);
    lx.classList.add('leyendo');
    doc.innerHTML = `<div class="loading"><div class="skel" style="width:40%;height:22px"></div><div class="skel" style="height:120px"></div></div>`;
    const p = await api(`/precepto?norma=${encodeURIComponent(nid)}&bloque=${encodeURIComponent(b)}`); if (yo !== pide) return;
    const i = +el.dataset.i; const prev = es[i - 1], next = es[i + 1];
    doc.innerHTML = `<header class="doc-h"><button class="btn ghost sm only-m" data-idx>${ic('back', 'sm')} Índice</button><p class="eyebrow">${esc(e.ruta || ab)}</p>
        <h2>${esc(e.bloque === 'preambulo' ? 'Preámbulo' : e.rotulo)}</h2>${e.veces ? `<span class="pill warn">${'★'.repeat(Math.min(3, e.veces))} Preguntado ${e.veces} ${e.veces === 1 ? 'vez' : 'veces'} en exámenes oficiales</span>` : ''}</header>
      <div class="legal full">${esc(sinCabecera(p.texto, e.rotulo))}</div><p class="aviso">${esc(p.aviso || '')}</p>
      <div class="doc-tools"><button class="btn sm" data-pa>${ic('play', 'sm')} Practicar este artículo</button><button class="btn ghost sm" data-cp>${ic('enlace', 'sm')} Copiar enlace</button></div>
      <nav class="doc-nav" aria-label="Preceptos contiguos">${prev ? `<button class="btn ghost" data-ir="${i - 1}">${ic('back', 'sm')}<span><small>Anterior</small>${esc(prev._et)}</span></button>` : '<span></span>'}${next ? `<button class="btn ghost nx" data-ir="${i + 1}"><span><small>Siguiente</small>${esc(next._et)}</span>${ic('arrow', 'sm')}</button>` : ''}</nav>`;
    $('[data-pa]', doc).onclick = async () => { try { await api(`/pregunta?norma=${encodeURIComponent(nid)}&bloque=${encodeURIComponent(b)}`); empezar({ titulo: `${ab} · ${e._et}`, norma: nid, bloque: b, n: 5 }); } catch (er) { toast('No hay preguntas de este artículo'); } };
    $('[data-cp]', doc).onclick = () => { const u = location.href.split('#')[0] + `#/leyes/${encodeURIComponent(nid)}/${encodeURIComponent(b)}`; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => toast('Enlace copiado'), () => toast(u)); };
    $$('[data-ir]', doc).forEach((x) => x.onclick = () => { const it = $(`.ai[data-i="${x.dataset.ir}"]`, list); if (it.hidden) { $('#filtro').value = ''; $('#filtro').oninput({ target: $('#filtro') }); } nav.foco(it, false); muestra(it); });
    $('[data-idx]', doc).onclick = () => { lx.classList.remove('leyendo'); nav.foco(el, false); };
    if (window.innerWidth > 960) doc.scrollTop = 0; else window.scrollTo(0, 0);
    if (foco) doc.focus({ preventScroll: true });
  };
  let tm = 0;  // el texto sigue al foco, con una pequeña espera para no pedir cada artículo al pasar
  const nav = navegable(list, '.ai', { alMover: (el) => { clearTimeout(tm); tm = setTimeout(() => muestra(el), 140); } });
  list.addEventListener('click', (e) => { const el = e.target.closest('.ai'); if (el) { clearTimeout(tm); nav.foco(el, false); muestra(el); } });
  list.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'ArrowRight') { const el = e.target.closest('.ai'); if (el) { e.preventDefault(); clearTimeout(tm); muestra(el, { foco: true }); } } });
  doc.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' && e.target === doc) { const el = $('.ai[aria-selected="true"]', list); if (el) { e.preventDefault(); nav.foco(el, false); } } });
  const atajo = (e) => { if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName) && !$('#dlg').open) { e.preventDefault(); $('#filtro').focus(); } };
  addEventListener('keydown', atajo); alSalir(() => removeEventListener('keydown', atajo));
  cuenta();
  const ini = bid && $(`.ai[data-b="${CSS.escape(bid)}"]`, list);
  if (ini) { nav.foco(ini, false); muestra(ini); } else if (window.innerWidth > 960) { const p = $('.ai', list); if (p) { p.tabIndex = 0; muestra(p); } }
}

/* =================== PROGRESO =================== */
rutas.progreso = async () => {
  const tot = Object.values(S.b).reduce((a, b) => ({ ok: a.ok + b.ok, n: a.n + b.ok + b.mal }), { ok: 0, n: 0 });
  const nf = pendientes().length; const ra = racha();
  const cajas = [0, 0, 0, 0, 0]; for (const r of Object.values(S.rep)) cajas[Math.min(4, r.c)]++; const maxC = Math.max(1, ...cajas, S.dom || 0);
  const semanas = 18; const hoy = new Date(); let cel = '';
  const d = new Date(); d.setDate(d.getDate() - semanas * 7 + 1); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));  // desde un lunes
  while (d <= hoy) { const x = S.dias[dia(d)]; const n = x ? x.n : 0; const l = n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4; cel += `<i data-l="${l}" title="${d.toLocaleDateString('es', { day: 'numeric', month: 'short' })}: ${n} preguntas"></i>`; d.setDate(d.getDate() + 1); }
  const nombre = (k) => TEMAS[k] || (CASOS[k] ? 'Caso · ' + CASOS[k][0] : k === 'repaso' ? 'Repaso' : k);
  const temas = Object.entries(S.b).map(([k, b]) => [k, b.ok, b.ok + b.mal]).sort((a, b) => b[2] - a[2]);
  main.innerHTML = `<div class="wrap" style="max-width:880px"><p class="eyebrow">Progreso</p><h1 class="h">Tu evolución</h1><p class="lede">Se guarda solo en este navegador. No necesitas cuenta para practicar.</p>
    <div class="grid g4">
      <div class="card kpi"><div class="k">Respondidas</div><div class="v">${tot.n.toLocaleString('es')}</div></div>
      <div class="card kpi"><div class="k">Acierto global</div><div class="v">${tot.n ? pct(tot.ok, tot.n) + '<small> %</small>' : '—'}</div></div>
      <div class="card kpi"><div class="k">Racha</div><div class="v">${ra}<small> días</small></div></div>
      <div class="card kpi"><div class="k">Repaso de hoy</div><div class="v">${nf}</div>${nf ? `<div class="s"><a href="#" id="rf">Repasar ahora →</a></div>` : '<div class="s">Al día</div>'}</div>
    </div>
    <h2 class="sec">Memoria a largo plazo <small>Repaso espaciado de tus fallos</small></h2>
    <div class="card pad"><div class="cajas">${['Caja 1 · mañana', 'Caja 2 · 3 días', 'Caja 3 · 7 días', 'Caja 4 · 16 días', 'Caja 5 · 35 días'].map((t, i) => `<div class="caja"><span class="ct">${t}</span><span class="cb"><i style="height:${Math.max(4, Math.round(100 * cajas[i] / maxC))}%"></i></span><b>${cajas[i]}</b></div>`).join('')}<div class="caja dom"><span class="ct">Dominadas</span><span class="cb"><i style="height:${Math.max(4, Math.round(100 * (S.dom || 0) / maxC))}%"></i></span><b>${S.dom || 0}</b></div></div>
    <p class="muted" style="margin:14px 0 0;font-size:13.5px">Cada pregunta que fallas entra en la caja 1. Si la aciertas cuando vuelve, sube de caja y tarda más en volver; si la fallas, regresa a la caja 1. <a href="#/ayuda/repaso">Cómo funciona</a></p></div>
    <h2 class="sec">Actividad <small>Últimas ${semanas} semanas</small></h2>
    <div class="card pad"><div class="heat">${cel}</div><div class="legend">Menos <i style="background:var(--surface-3)"></i><i style="background:color-mix(in srgb,var(--accent) 28%,var(--surface-3))"></i><i style="background:color-mix(in srgb,var(--accent) 52%,var(--surface-3))"></i><i style="background:color-mix(in srgb,var(--accent) 76%,var(--surface-3))"></i><i style="background:var(--accent)"></i> Más</div></div>
    <h2 class="sec">Por tema</h2>
    <div class="card">${temas.length ? temas.map(([k, ok, n]) => fila(TEMA_IC[k] || (CASOS[k] ? CASOS[k][2] : 'capas'), nombre(k), `${ok} de ${n} correctas`, pct(ok, n), '', true)).join('') : `<div class="empty">${ic('chart')}<p>Aún no has respondido preguntas.</p><a class="btn primary" href="#/practicar">Empezar a practicar</a></div>`}</div>
    <h2 class="sec">Últimas sesiones</h2>
    <div class="card">${S.hist.length ? S.hist.slice(0, 12).map((h) => `<div class="hrow"><span>${esc(h.titulo)}</span><span class="d">${new Date(h.fecha).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${h.n} preguntas · ${fmtT(h.t)}</span><span class="v">${h.nota !== undefined ? h.nota.toFixed(2) + ' / ' + h.max : pct(h.ok, h.n) + ' %'}</span></div>`).join('') : `<div class="empty"><p>Tus tests y simulacros aparecerán aquí.</p></div>`}</div>
    <div style="margin-top:28px;display:flex;justify-content:flex-end"><button class="btn ghost danger sm" id="borrar">${ic('trash', 'sm')} Borrar mi progreso</button></div></div>`;
  if (nf) $('#rf').onclick = (e) => { e.preventDefault(); empezarRepaso(); };
  $('#borrar').onclick = async () => { if (await confirmar('¿Borrar todo tu progreso?', 'Se eliminan estadísticas, racha, historial y repasos pendientes de este navegador. No se puede deshacer.', 'Borrar')) { const o = S.opo; const pl = S.plan; for (const k of Object.keys(S)) delete S[k]; S.plan = pl; Object.assign(S, { opo: o, plan: pl, b: {}, rep: {}, dias: {}, hist: [] }); save(); toast('Progreso borrado'); render(); } };
};


/* =================== AYUDA =================== */
const ATAJOS = [['Test', [['A B C D', 'Responder'], ['1 2 3 4', 'Responder'], ['↑ ↓', 'Recorrer las opciones (Intro responde)'], ['Intro →', 'Siguiente pregunta'], ['T', 'Preguntar al tutor tras corregir']]],
  ['Simulacro', [['A B C D', 'Elegir respuesta (pulsa otra vez para quitarla)'], ['← →', 'Pregunta anterior o siguiente'], ['M', 'Marcar o desmarcar para revisar'], ['G', 'Abrir el mapa (flechas para moverte)']]],
  ['Leyes', [['/', 'Ir al filtro'], ['↑ ↓', 'Recorrer artículos (el texto se abre solo)'], ['14', 'Escribe un número o una letra para saltar'], ['Intro →', 'Pasar al texto'], ['←', 'Volver al índice'], ['← →', 'Ancho del índice, con el foco en el separador']]],
  ['Tutor', [['Esc', 'Cerrar el tutor']]],
  ['En cualquier diálogo', [['Esc', 'Cerrar']]]];
const atajosHTML = () => ATAJOS.map(([g, xs]) => `<h4 class="kh">${g}</h4><div class="keys">${xs.map(([k, d]) => `<div><span>${k.split(' ').map((x) => `<span class="kbd">${x}</span>`).join(' ')}</span><span>${d}</span></div>`).join('')}</div>`).join('');
function verAtajos() { dialogo(`<div class="dh"><div><h2>Atajos de teclado</h2><p>Practica sin tocar el ratón.</p></div><button class="btn ghost sm" data-cerrar aria-label="Cerrar">${ic('x')}</button></div><div class="db">${atajosHTML()}</div><div class="df"><button class="btn primary" data-cerrar>Entendido</button></div>`); }

/* =================== OPOSICIONES (seguimiento) ===================
   Convocatorias, plazas y fechas de los procesos selectivos, desde el BOE. Vista y estilos en seguimiento/ (vista.js, vista.css);
   datos en oposiciones.json, que genera cada día actualizacion/oposiciones.py desde actualizacion/diaria.py. */
rutas.oposiciones = async (tab) => {
  const { montar } = await import('./seguimiento/vista.js');
  main.innerHTML = '<div class="wrap" id="op"></div>';
  await montar(document.getElementById('op'), {
    datos: await (await Plaza.datos.leer('datos/oposiciones.json') || await fetch('datos/oposiciones.json')).json(),
    practicar: '#/practicar',
    tab,
  });
};

rutas.ayuda = async (abrir) => {
  const R = await resumen(); const nEx = Object.values(R.bancos).reduce((a, b) => a + b.ex, 0);
  const tot = Object.entries(R.bancos).reduce((a, [, b]) => a + b.n, 0);
  const s = (k) => R.sim[k]; const f = (x) => String(+x.toFixed(2)).replace('.', ',');
  const SEC = [
    ['empezar', 'rayo', 'Primeros pasos', `
      <ol class="steps"><li><b>Elige tu oposición.</b> Arriba a la izquierda (en el móvil, arriba a la derecha). Adaptamos temas, casos y simulacros.</li>
      <li><b>Haz un test rápido</b> desde Inicio: 10 preguntas mezcladas de tus temas.</li>
      <li><b>Lee la corrección.</b> Verás si has acertado, la explicación y el artículo con la frase que decide la respuesta marcada en amarillo.</li>
      <li><b>Sigue tu plan de hoy.</b> En Inicio te proponemos qué repasar, qué tema practicar y cuándo hacer un simulacro.</li></ol>`],
    ['repaso', 'redo', 'Plan diario y repaso espaciado', `
      <p>Cada pregunta que fallas entra en tu <b>repaso espaciado</b>: vuelve al día siguiente y, cada vez que la aciertas cuando le toca, tarda más en volver.</p>
      <table class="tbl"><thead><tr><th>Caja</th><th>Si aciertas, vuelve en</th></tr></thead><tbody><tr><td>1 (recién fallada)</td><td>3 días</td></tr><tr><td>2</td><td>7 días</td></tr><tr><td>3</td><td>16 días</td></tr><tr><td>4</td><td>35 días</td></tr><tr><td>5</td><td>Queda dominada</td></tr></tbody></table>
      <p>Si la fallas en cualquier caja, vuelve a la caja 1. Repasar justo antes de olvidar es la forma más eficaz de fijar plazos, órganos y cifras.</p>
      <p>El <b>plan de hoy</b> ordena tu sesión: primero el repaso pendiente, después tu tema más flojo hasta completar tu objetivo diario y, cada cierto tiempo, un simulacro (cada 7 días, o cada 3 si el examen está a menos de 45 días). Cambia el objetivo y la fecha del examen con «Ajustar plan».</p>`],
    ['preguntas', 'documento', '¿De dónde salen las preguntas?', `
      <p>Los bloques de legislación parten del <b>texto consolidado del BOE</b>: la respuesta correcta es siempre lo que dice la ley, no una opinión. Hoy hay ${tot.toLocaleString('es')} preguntas y casos.</p>
      <p>Tipos de pregunta: <b>plazos y cifras</b> («¿qué plazo completa el texto?»), <b>órganos</b>, <b>enumeraciones</b> («¿cuál figura en la relación…?»), <b>¿cuál NO?</b> y <b>afirmaciones</b>. Las preguntas de los artículos que más caen en exámenes oficiales salen con más frecuencia.</p>
      <p>El banco está en revisión. Si una pregunta te parece mal, repórtala: ver «Reportar un error».</p>`],
    ['ia', 'ia', 'Explicaciones con IA', `
      <p>La IA <b>no decide la respuesta</b>: solo redacta la explicación a partir del artículo. Antes de mostrarla, un verificador automático comprueba que cada cita es literal, que no aparecen cifras ajenas al artículo, que contiene la respuesta correcta y que no menciona apartados o artículos inexistentes. Si no pasa, no se muestra.</p>
      <p>Ahora mismo hay ${nEx.toLocaleString('es')} explicaciones y seguimos generando más. Cuando una pregunta no la tiene, verás el artículo con la frase clave resaltada, que es la fuente en cualquier caso.</p>`],
    ['version', 'capas', 'Versión de la ley y preguntas retiradas', `
      <p>Por defecto, la ley que ves es la de la <b>última actualización instalada</b>, sin notas ni redacciones anteriores. Para los exámenes que se rigen por otra fecha usamos la versión que corresponde:</p>
      <ul>${Object.entries(R.conv).map(([k, v]) => `<li>${k === 'age2025' ? 'Simulacro de Administrativo C1' : 'Justicia (Tramitación, Auxilio)'}: ${esc(v)}.</li>`).join('')}</ul>
      <p>Si un artículo ha cambiado respecto a esa versión, la pregunta se retira automáticamente para no enseñarte algo desfasado.</p>`],
    ['simulacros', 'simulacro', 'Simulacros y puntuación', `
      <p>Reproducen el número de preguntas y la penalización de la convocatoria. No ves la corrección hasta entregar.</p>
      <table class="tbl"><thead><tr><th>Simulacro</th><th>Preguntas</th><th>Acierto</th><th>Error</th><th>Blanco</th></tr></thead><tbody>
      ${['c1', 'tram', 'aux'].map((k) => `<tr><td>${esc(SIMS[k])}</td><td>${s(k)[0]}</td><td>+${f(s(k)[2])}</td><td>−${s(k)[3] === 1 / 3 ? '1/3' : f(s(k)[3])}</td><td>0</td></tr>`).join('')}</tbody></table>
      <p>El cronómetro es <b>orientativo</b> (un minuto por pregunta); al agotarse se entrega el examen. Cubre la parte legal del temario: no incluye ofimática ni psicotécnicos.</p>`],
    ['casos', 'casos', 'Casos prácticos', `<p>Supuestos con una única solución según la norma: cómputo de plazos, silencio administrativo, recurso procedente, permisos, requisitos de acceso, competencias municipales y más. Al corregir verás el razonamiento paso a paso y el precepto que lo decide.</p>`],
    ['leyes', 'leyes', 'Leer la ley y las estrellas', `
      <p>En <b>Leyes</b> tienes el texto vigente de cada norma del temario. Las estrellas <span class="stars">★★★</span> indican cuántas veces se ha preguntado ese artículo en exámenes oficiales (de una a tres o más).</p>
      <p>Desde cada ley o artículo puedes pulsar <b>Practicar</b> para hacer preguntas solo de ahí, y copiar un enlace directo al artículo.</p>`],
    ['progreso', 'escudo', 'Tu progreso y tu privacidad', `
      <p>No necesitas cuenta. Tu progreso (aciertos por tema, racha, historial, plan y repasos) se guarda <b>solo en este navegador</b>; no se envía a ningún sitio. Si borras los datos del navegador o cambias de dispositivo, empiezas de cero.</p>
      <p>Puedes borrarlo cuando quieras desde <a href="#/progreso">Progreso</a> → «Borrar mi progreso».</p>`],
    ['atajos', 'teclado', 'Atajos de teclado', atajosHTML()],
    ['reportar', 'flag', 'Reportar un error', `
      <p>Tras corregir una pregunta, pulsa <b>Reportar error</b>, elige el motivo y, si quieres, añade un comentario. Pulsa «Abrir correo» y envía el mensaje. También agradecemos sugerencias en <a href="mailto:learntouseai@gmail.com">learntouseai@gmail.com</a>.</p>`],
    ['oficial', 'info', '¿Es una web oficial?', `<p>No. Plaza no está vinculada al BOE ni a ninguna Administración. Usamos los textos legales publicados en el BOE, que se muestran con su aviso de procedencia: «${esc(R.aviso)}». Para requisitos, plazos de inscripción y temarios oficiales, consulta siempre la convocatoria publicada.</p>`],
  ];
  main.innerHTML = `<div class="wrap" style="max-width:820px"><p class="eyebrow">Ayuda</p><h1 class="h">¿En qué te ayudamos?</h1><p class="lede">Cómo funciona Plaza, de dónde salen las preguntas y cómo sacarle partido.</p>
    <div class="search">${ic('search')}<input id="bAyuda" type="search" placeholder="Busca: repaso, simulacro, penalización, IA…" autocomplete="off"></div>
    <div class="grid g4 quick">${[['empezar', 'rayo', 'Primeros pasos'], ['repaso', 'redo', 'Repaso espaciado'], ['simulacros', 'simulacro', 'Puntuación'], ['ia', 'ia', 'Explicaciones IA']].map(([k, i, t]) => `<a class="card qk" href="#/ayuda/${k}"><span class="ico">${ic(i)}</span><span>${t}</span></a>`).join('')}</div>
    <div class="card faq">${SEC.map(([k, i, t, h]) => `<details id="s-${k}" ${abrir === k ? 'open' : ''}><summary><span class="tico">${ic(i)}</span><span class="st">${esc(t)}</span>${ic('chev_d', 'sm cv')}</summary><div class="fa">${h}</div></details>`).join('')}</div>
    <p class="sin" id="sinRes" hidden>No hemos encontrado nada con esa búsqueda.</p></div>`;
  if (abrir) { const el = $('#s-' + abrir); if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }
  $('#bAyuda').oninput = (e) => {
    const v = e.target.value.trim().toLowerCase(); let n = 0;
    $$('.faq details').forEach((d) => { const hit = !v || d.textContent.toLowerCase().includes(v); d.hidden = !hit; if (hit) n++; if (v) d.open = hit; });
    $('#sinRes').hidden = n > 0; $('.quick').hidden = !!v;
  };
};

/* ---------- Tema claro u oscuro ---------- */
/* Tema: claro por defecto (lectura de leyes en papel); oscuro o automático (el del sistema) a elección. */
const TEMAS_UI = { light: ['sol', 'Claro'], dark: ['luna', 'Oscuro'], auto: ['contraste', 'Automático'] };
function aplicaTema() {
  const t = TEMAS_UI[S.tema] ? S.tema : 'light'; const html = document.documentElement;
  if (t === 'auto') delete html.dataset.theme; else html.dataset.theme = t;
  const osc = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  $$('meta[name="theme-color"]').forEach((m) => { m.content = osc ? '#101214' : '#f6f5f1'; m.removeAttribute('media'); });
  const [i, n] = TEMAS_UI[t];
  const b = $('#tema'); if (b) { b.innerHTML = `${ic(i, 'sm')}<span>Tema: ${n}</span>`; b.title = 'Cambiar tema (claro, oscuro o el del sistema)'; }
  const m = $('#temaM'); if (m) { m.innerHTML = ic(i); m.setAttribute('aria-label', `Tema: ${n}. Pulsa para cambiar`); }
}
const cambiaTema = () => { const o = ['light', 'dark', 'auto']; S.tema = o[(o.indexOf(TEMAS_UI[S.tema] ? S.tema : 'light') + 1) % 3]; save(); aplicaTema(); toast(`Tema: ${TEMAS_UI[S.tema][1].toLowerCase()}${S.tema === 'auto' ? ' (el del sistema)' : ''}`); };
$('#tema').onclick = cambiaTema; if ($('#temaM')) $('#temaM').onclick = cambiaTema;
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicaTema);
aplicaTema();

function mostrarActualizacion() {
  const d = dialogo(`<div class="dh"><h2>Actualizar datos</h2><button class="btn ghost sm" data-cerrar>Cerrar</button></div>
    <div class="db"><p>Busca nuevas preguntas, leyes y convocatorias en el repositorio de Plaza. Se conserva tu progreso y puedes seguir con el test abierto.</p>
    <p role="status"></p></div><div class="df"><button class="btn primary" type="button">Buscar actualizaciones</button></div>`);
  const boton = $('.df button', d);
  const estado = $('[role="status"]', d);
  boton.onclick = async () => {
    boton.disabled = true;
    estado.textContent = 'Comprobando los datos publicados…';
    const resultado = await Plaza.datos.comprobar();
    const mensajes = {
      actualizado: 'Actualización preparada. Termina tu sesión y vuelve a abrir Plaza para usar los datos nuevos.',
      preparada: 'Tienes una actualización preparada. Vuelve a abrir Plaza cuando termines tu sesión.',
      'al-dia': 'Los datos están al día.',
      'sin-conexion': 'No se pudo contactar con GitHub. Puedes seguir estudiando con los datos actuales.',
      error: 'No se pudo aplicar la actualización. Puedes seguir estudiando con los datos actuales.',
    };
    estado.textContent = mensajes[resultado.estado];
    boton.disabled = false;
  };
}
$$('[data-actualizar]').forEach(boton => boton.onclick = mostrarActualizacion);

// Aviso al completar la actualización de los datos.
window.addEventListener('plaza:datos-actualizados', () => toast('Datos actualizados al último BOE: se aplicarán al volver a abrir Plaza'));

pintaNav(); render();
