/* Oposiciones · vista autónoma para Plaza (convocatorias con plazo abierto, próximas convocatorias y las tuyas).
   Uso:  import { montar } from './vista.js';  montar(elemento, { url: 'oposiciones.json', practicar: '#/practicar', tab: 'abiertas' });
   Datos: actualizacion/oposiciones/oposiciones.json (actualizacion/oposiciones.py, cada día desde el BOE).
   Lo que guarda el usuario (guardadas, avisos, última visita) va en localStorage 'plaza.opos.v1'. Usa las variables de color de la app. */

const CLAVE = 'plaza.opos.v1';
const TITULOS = {
  abiertas: 'Oposiciones con plazo abierto',
  proximas: 'Próximas oposiciones',
  confirmar: 'Plazos por confirmar',
  mias: 'Mis oposiciones',
};
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const ADMIN = [['', 'Todas las administraciones'], ['Estatal', 'Estado'], ['Autonómica', 'Comunidades autónomas'], ['Local', 'Ayuntamientos y diputaciones'], ['Universidades', 'Universidades']];
const ESTUDIOS = [['', 'Cualquier nivel de estudios'], ['C2', 'ESO'], ['C1', 'Bachiller o FP de grado medio'], ['B', 'FP de grado superior'], ['A2', 'Grado universitario (A2)'], ['A1', 'Grado universitario (A1)'], ['E', 'Sin titulación']];
const NIVEL = { A1: 'Grado universitario', A2: 'Grado universitario', B: 'FP de grado superior', C1: 'Bachiller o FP de grado medio', C2: 'ESO', E: 'Sin titulación' };
const NIVEL_CORTO = { A1: 'Grado', A2: 'Grado', B: 'FP superior', C1: 'Bachiller o FP', C2: 'ESO', E: 'Sin titulación' };
const ADMIN_CORTO = { Estatal: 'Estado', Autonómica: 'Comunidad autónoma', Local: 'Administración local', Universidades: 'Universidad' };
const NOVEDAD = { admitidos: 'Lista de admitidos', aprobados: 'Lista de aprobados', tribunal: 'Tribunal', examen: 'Fecha o lugar de examen', modificación: 'Cambio en la convocatoria', corrección: 'Corrección de errores', nombramiento: 'Nombramientos', otro: 'Anuncio' };

// Categorías como en los portales de oposiciones; se deducen del nombre del puesto.
const CATEGORIAS = [
  ['seguridad', 'Seguridad', /polic|guardia civil|guardia municipal|bomber|agente de movilidad|vigilan|penitenci|prisiones|militar|fuerzas armadas|proteccion civil|salvamento|socorrist|agente forestal|agentes? medioambiental|seguridad nuclear/],
  ['sanidad', 'Sanidad', /enfermer|medic|facultativ|celador|tcae|cuidados auxiliares|fisioterap|matron|sanitari|farmac|hospital|salud|odontol|psicolog|veterinar|terapeuta|logoped|forense/],
  ['educacion', 'Educación', /profesor|maestr|docente|educador|educacion|escuela|catedratic|monitor|jardin de infancia|orientador/],
  ['administracion', 'Administración', /administrativ|administracion general|subalterno|ordenanza|conserje|secretari|intervencion|tesoreri|letrad|tramitacion|auxilio judicial|gestion|gestor|archiv|bibliotec|informatic|sistemas|hacienda|tecnic[oa]s? de administracion|interventor|registr|recaudac|abogad/],
];
const ICONO = {
  administracion: '<path d="M4 20h16M6 20V10m4 10V10m4 10V10m4 10V10M3 10l9-6 9 6z"/>',
  sanidad: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"/>',
  seguridad: '<path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z"/>',
  educacion: '<path d="M3 9 12 5l9 4-9 4zM7 11v5c3 2 7 2 10 0v-5"/>',
  otros: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
};
// Oposiciones que Plaza ya prepara: si encaja, se ofrece practicar.
const PLAZA = [
  [/general (administrativo|auxiliar) de la administracion del estado/, 'Administrativo y Auxiliar del Estado'],
  [/tramitacion procesal|auxilio judicial|gestion procesal/, 'Justicia'],
  [/servicio murciano de salud/, 'Servicio Murciano de Salud'],
];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fd = (s) => new Date(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8));
const iso = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const fechaMadrid = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' });
const hoyIso = () => {
  const fecha = Object.fromEntries(fechaMadrid.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return fecha.year + fecha.month + fecha.day;
};
const siguiente = (s) => { const d = fd(s); d.setDate(d.getDate() + 1); return iso(d); };
const corta = (s) => { const d = fd(s); return `${d.getDate()} ${MES[d.getMonth()]}`; };
const numerica = (s) => `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(2, 4)}`;
const quedan = (s) => Math.round((fd(s) - fd(hoyIso())) / 864e5);
const miles = (n) => Number(n).toLocaleString('es');

function categoria(texto) { const t = norm(texto); for (const [k, , re] of CATEGORIAS) if (re.test(t)) return k; return 'otros'; }
// Los anexos de las ofertas vienen en mayúsculas y abreviados: «GENERAL ADMINISTRATIVO ADMÓN.EST., ESP. AGENTES HACIENDA PÚBLICA».
function bonito(nombre) {
  let s = String(nombre).replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  if (s === s.toUpperCase()) {
    const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en', 'a', 'para', 'por', 'con']);
    s = s.toLowerCase().split(' ').map((w, i) => (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(w) ? w.toUpperCase() : i && MENORES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
  }
  return s.replace(/Admón\.?\s*Est\.?,?/gi, 'Administración del Estado,').replace(/Admón\.?/gi, 'Administración').replace(/\bEsp\.\s*/gi, 'especialidad ')
    .replace(/\bOo\.?\s?Aa\.?/gi, 'organismos autónomos').replace(/\bS\.S\./gi, 'Seguridad Social').replace(/\bIi\.?\s?Pp\.?/gi, 'Instituciones Penitenciarias')
    .replace(/\bA\.G\.E\b\.?/gi, 'AGE').replace(/,\s*$/, '').replace(/\s+,/g, ',');
}

function cargarEstado() { try { return Object.assign({ seguidas: [], alertas: [], visita: null }, JSON.parse(localStorage.getItem(CLAVE) || '{}')); } catch (e) { return { seguidas: [], alertas: [], visita: null }; } }
function guardarEstado(e) { try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch (x) { /* sin almacenamiento, la vista sigue funcionando */ } }
function plazaDe(c) { const t = norm(`${c.puesto || ''} ${c.titulo}`); const m = PLAZA.find(([re]) => re.test(t)); return m ? m[1] : null; }

function ics(c) {
  const url = enlaceBoe(c.url);
  const txt = (s) => String(s || '').replace(/[\\,;]/g, (m) => '\\' + m).replace(/\r\n?|\n/g, '\\n');
  const cuerpo = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Plaza//Oposiciones//ES', 'BEGIN:VEVENT', `UID:${c.id}@plaza`, `DTSTAMP:${hoyIso()}T000000Z`,
    `DTSTART;VALUE=DATE:${c.fin}`, `DTEND;VALUE=DATE:${siguiente(c.fin)}`, `SUMMARY:${txt('Último día de solicitud: ' + (c.puesto || 'oposición') + ' · ' + c.organismo)}`,
    `DESCRIPTION:${txt('Fecha calculada por Plaza: compruébala en la convocatoria. ' + url)}`, `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:-P2D', 'ACTION:DISPLAY', 'DESCRIPTION:Quedan 2 días para presentar la solicitud', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([cuerpo], { type: 'text/calendar' })); a.download = `plazo-${c.id}.ics`;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function enlaceBoe(url) {
  try {
    const destino = new URL(url, 'https://www.boe.es/');
    if (destino.protocol === 'https:' && ['www.boe.es', 'boe.es'].includes(destino.hostname)) return destino.href;
  } catch {}
  return 'https://www.boe.es/';
}

async function leerConvocatorias(url, respaldo) {
  for (const destino of new Set([url, respaldo].filter(Boolean))) {
    try {
      const r = await fetch(destino, { cache: 'no-cache', signal: AbortSignal.timeout(5000) });
      if (!r.ok) continue;
      const datos = await r.json();
      if (['abiertas', 'sin_fecha', 'en_curso', 'recientes', 'oep'].every(k => Array.isArray(datos?.[k]))
          && /^\d{8}$/.test(datos.revisado_hasta)) return { datos, respaldo: destino !== url };
    } catch {}
  }
  throw new Error('Vuelve a intentarlo para consultar el BOE.');
}

export async function montar(el, op = {}) {
  const resultado = op.datos ? { datos: op.datos, respaldo: false }
    : await leerConvocatorias(op.url || 'oposiciones.json', op.respaldo);
  const D = resultado.datos;
  const practicar = op.practicar || '#/practicar';
  const E = cargarEstado(); const visitaAnterior = E.visita; E.visita = hoyIso(); guardarEstado(E);

  const hoyD = hoyIso();
  const clasificar = c => ({ ...c, cat: categoria(`${c.puesto || ''} ${c.titulo}`) });
  const conFecha = D.abiertas.filter(c => c.fin).map(clasificar);
  const inicioSolicitud = c => siguiente(c.plazo_desde_fecha || c.fecha);
  const vencidas = conFecha.filter(c => c.fin < hoyD).map(c => ({ ...c, estado: 'cerrado' }));
  const publicadas = conFecha.filter(c => c.fin >= hoyD && inicioSolicitud(c) > hoyD)
    .map(c => ({ ...c, estado: 'futuro' }));
  const abiertas = conFecha.filter(c => c.fin >= hoyD && inicioSolicitud(c) <= hoyD);
  const porConfirmar = D.sin_fecha.filter(c => quedan(c.fecha) > -45).map(clasificar);
  const porId = Object.fromEntries([...D.recientes, ...D.en_curso, ...vencidas, ...porConfirmar, ...publicadas, ...abiertas].map((c) => [c.id, c]));
  const provincias = [...new Set([...abiertas, ...publicadas, ...porConfirmar].map((c) => c.provincia).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  // Próximamente: lo aprobado en ofertas de empleo público que aún no se ha convocado (acceso libre)
  const proximas = D.oep.flatMap((o) => o.filas.filter((f) => f.estado === 'pendiente' && f.acceso !== 'promoción interna').map((f) => ({
    nombre: bonito(f.nombre), plazas: f.plazas, grupo: f.grupo, personal: f.personal, organismo: o.organismo, ambito: o.ambito, url: o.url, fecha: o.fecha, cat: categoria(f.nombre),
  }))).filter((p) => !/^(personal|total)$/i.test(p.nombre)).sort((a, b) => b.plazas - a.plazas);

  const F = { tab: Object.hasOwn(TITULOS, op.tab) ? op.tab : 'abiertas', orden: 'recientes', q: '', cat: '', admin: '', estudios: '', provincia: '', semana: false, n: 30, abierta: null, masFiltros: false };
  const ultimo = D.revisado_hasta;
  const ORDEN = { recientes: (a, b) => b.fecha.localeCompare(a.fecha), cierran: (a, b) => (a.fin || '99999999').localeCompare(b.fin || '99999999'), plazas: (a, b) => (b.plazas || 0) - (a.plazas || 0) };
  const esNueva = (c) => visitaAnterior && c.fecha > visitaAnterior;
  const casa = (c, f = F) => {
    if (f.cat && c.cat !== f.cat) return false;
    if (f.admin && c.ambito !== f.admin) return false;
    if (f.estudios && c.grupo !== f.estudios) return false;
    if (f.provincia && c.provincia !== f.provincia) return false;
    if (f.semana && !(c.fin && c.estado === 'abierto' && quedan(c.fin) <= 7)) return false;
    if (f.q) { const t = norm(`${c.puesto || c.nombre} ${c.organismo} ${c.provincia || ''} ${c.titulo || ''}`); if (!norm(f.q).split(/\s+/).every((w) => t.includes(w))) return false; }
    return true;
  };
  const nuevasDeAviso = (a) => [...abiertas, ...publicadas].filter((c) => c.fecha > (a.vista || a.creada) && casa(c, a));

  function estado(c) {
    if (c.fin && c.estado === 'abierto') {
      const q = quedan(c.fin);
      if (q <= 1) return `<span class="op-pill urg">${q <= 0 ? 'Último día' : 'Cierra mañana'}</span><span class="op-hasta">hasta el ${esc(corta(c.fin))}</span>`;
      return `<span class="op-pill ok">Plazo abierto</span><span class="op-hasta">hasta el ${esc(corta(c.fin))}${q <= 5 ? ` · quedan ${q} días` : ''}</span>`;
    }
    if (c.estado === 'cerrado') return '<span class="op-pill gris">Plazo cerrado</span>';
    if (c.estado === 'futuro') return `<span class="op-pill pend">Aún no abre</span><span class="op-hasta">desde el ${esc(corta(inicioSolicitud(c)))}</span>`;
    return '<span class="op-pill pend">Plazo por confirmar</span><span class="op-hasta">consulta las bases</span>';
  }

  function fila(c) {
    const abierta = F.abierta === c.id, guardada = E.seguidas.includes(c.id), pz = plazaDe(c);
    const turno = c.turno === 'promoción interna' ? 'Promoción interna' : c.turno === 'estabilización' ? 'Estabilización' : c.turno === 'libre' ? 'Turno libre' : 'Consulta las bases';
    const inicio = c.plazo_desde_fecha || c.fecha;  // el plazo puede contar desde el boletín autonómico o provincial, no desde el BOE
    const solicitud = c.fin ? `${numerica(siguiente(inicio))} – ${numerica(c.fin)}${c.plazo_desde_fecha ? ` (cuenta desde el boletín autonómico o provincial del ${corta(c.plazo_desde_fecha)})` : ''}`
      : c.plazo && c.plazo_desde ? `${c.plazo} desde que se publica en ${c.plazo_desde === 'otro boletín' ? 'el boletín autonómico o provincial' : 'el BOE'}` : 'Consulta las bases';
    const novs = (c.novedades || []).slice().reverse();
    const datos = [c.grupo && NIVEL_CORTO[c.grupo], c.sistema && c.sistema.charAt(0).toUpperCase() + c.sistema.slice(1), c.turno && c.turno !== 'libre' ? turno : '', c.laboral ? 'Laboral' : ''].filter(Boolean);
    return `<article class="op-row${abierta ? ' abierta' : ''}" data-id="${esc(c.id)}">
      <button type="button" class="op-linea" data-acc="abrir" aria-expanded="${abierta}" aria-controls="ficha-${esc(c.id)}">
        ${plazasBloque(c.plazas, c.cat)}
        <span class="op-txt">
          <span class="op-nombre">${esc(c.puesto || c.titulo.slice(0, 110))}${esNueva(c) ? ' <span class="op-nueva">Nueva</span>' : ''}</span>
          <span class="op-org">${esc(c.organismo)}${c.provincia && !c.organismo.includes(c.provincia) ? ` · ${esc(c.provincia)}` : ''}</span>
          ${datos.length ? `<span class="op-meta">${datos.map((x) => `<span>${esc(x)}</span>`).join('')}</span>` : ''}
        </span>
        <span class="op-estado">${estado(c)}</span>
        <svg class="op-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"/></svg>
      </button>
      ${abierta ? `<div class="op-ficha" id="ficha-${esc(c.id)}">
        ${barraPlazo(c)}
        <table class="op-datos"><tbody>
          <tr><th>Plazas</th><td>${c.plazas ? miles(c.plazas) : 'Consulta las bases'}</td></tr>
          <tr><th>Turno</th><td>${esc(turno)}</td></tr>
          <tr><th>Plazo de solicitud</th><td>${esc(solicitud)}${c.fin ? '<small>Fecha estimada por Plaza. Los festivos autonómicos o locales pueden cambiarla. Confírmala en la convocatoria.</small>' : ''}${c.agosto_inhabil ? '<small>Agosto no cuenta: se declaró inhábil.</small>' : ''}</td></tr>
          <tr><th>Proceso selectivo</th><td>${c.sistema ? esc(c.sistema.charAt(0).toUpperCase() + c.sistema.slice(1)) : 'Consulta las bases'}</td></tr>
          <tr><th>Personal</th><td>${c.laboral ? 'Laboral' : 'Funcionario'}</td></tr>
          <tr><th>Administración</th><td>${esc(ADMIN_CORTO[c.ambito] || c.ambito)}${c.provincia ? ` · ${esc(c.provincia)}` : ''}</td></tr>
          <tr><th>Nivel de estudios</th><td>${c.grupo ? `${esc(NIVEL[c.grupo] || '')} <span class="op-mut">(grupo ${esc(c.grupo)})</span>` : 'Consulta las bases'}</td></tr>
          ${c.bases ? `<tr><th>Bases completas</th><td>${esc(c.bases)}</td></tr>` : ''}
        </tbody></table>
        ${novs.length ? `<div class="op-novs"><p class="op-sub">Últimas novedades</p>${novs.slice(0, 5).map((n) => `<a href="${esc(enlaceBoe(n.url))}" target="_blank" rel="noopener"><span>${esc(corta(n.fecha))}</span>${esc(NOVEDAD[n.tipo] || 'Anuncio')}</a>`).join('')}</div>` : ''}
        <div class="op-btns">
          <button type="button" class="op-btn${guardada ? ' on' : ''}" data-acc="guardar">${guardada ? '✓ En mis oposiciones' : 'Guardar en mis oposiciones'}</button>
          ${c.fin && c.estado === 'abierto' ? '<button type="button" class="op-btn ghost" data-acc="ics">Añadir el último día al calendario</button>' : ''}
          <a class="op-btn ghost" href="${esc(enlaceBoe(c.url))}" target="_blank" rel="noopener">Ver la convocatoria en el BOE ↗</a>
          <button type="button" class="op-btn ghost op-cerrar" data-acc="abrir">Cerrar</button>
        </div>
        ${pz ? `<a class="op-plaza" href="${esc(practicar)}"><b>Prepárala en Plaza:</b> tests de ${esc(pz)} con el texto literal del BOE →</a>` : ''}
      </div>` : ''}
    </article>`;
  }

  function plazasBloque(n, cat) {
    if (!n) return `<span class="op-ico ${cat}" aria-hidden="true"><svg viewBox="0 0 24 24">${ICONO[cat]}</svg></span>`;
    return `<span class="op-plazas"><b>${miles(n)}</b><small>${n === 1 ? 'plaza' : 'plazas'}</small></span>`;
  }

  function barraPlazo(c) {
    if (!(c.fin && c.estado === 'abierto')) return '';
    const desde = c.plazo_desde_fecha || c.fecha;
    const ini = fd(siguiente(desde)), fin = fd(c.fin), hoy = fd(hoyIso());
    const total = Math.max(1, Math.round((fin - ini) / 864e5) + 1), pasados = Math.min(total, Math.max(0, Math.round((hoy - ini) / 864e5) + 1));
    const q = quedan(c.fin), pct = Math.round(100 * pasados / total);
    return `<div class="op-barra ${q <= 3 ? 'urg' : q <= 7 ? 'pronto' : ''}">
      <div class="op-barra-t"><b>${q <= 0 ? 'Hoy es el último día' : q === 1 ? 'Mañana es el último día' : `Quedan ${q} días`}</b><span>Solicitudes del ${esc(corta(siguiente(desde)))} al ${esc(corta(c.fin))}</span></div>
      <div class="op-barra-b" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="Plazo transcurrido"><i style="width:${pct}%"></i></div></div>`;
  }

  function filaProxima(p) {
    const datos = [p.grupo && NIVEL_CORTO[p.grupo], p.personal === 'laboral' ? 'Laboral' : '', `Aprobadas el ${corta(p.fecha)} de ${p.fecha.slice(0, 4)}`].filter(Boolean);
    return `<article class="op-row"><div class="op-linea fija">
      ${plazasBloque(p.plazas, p.cat)}
      <span class="op-txt"><span class="op-nombre">${esc(p.nombre)}</span>
        <span class="op-org">${esc(p.ambito === 'Universidades' ? p.organismo : (ADMIN_CORTO[p.ambito] || p.organismo))}</span>
        <span class="op-meta">${datos.map((x) => `<span>${esc(x)}</span>`).join('')}</span></span>
      <span class="op-estado"><span class="op-pill pend">Sin convocar aún</span><a class="op-hasta" href="${esc(enlaceBoe(p.url))}" target="_blank" rel="noopener">ver en el BOE ↗</a></span>
    </div></article>`;
  }

  function filtros(conProvincia) {
    return `<div class="op-filtros">
      <label class="op-q"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>
        <input type="search" id="op-q" value="${esc(F.q)}" placeholder="¿Qué buscas? Auxiliar administrativo, policía, Murcia…" autocomplete="off" aria-label="Buscar oposición"></label>
      <div class="op-cats" role="group" aria-label="Categoría"><button type="button" class="op-mas-filtros" data-acc="mas-filtros" aria-expanded="${F.masFiltros}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>Filtros${activos().length ? ` <span>${activos().length}</span>` : ''}</button>${[['', 'Todas'], ...CATEGORIAS.map(([k, t]) => [k, t]), ['otros', 'Otras']].map(([k, t]) => `<button type="button" data-cat="${k}" aria-pressed="${F.cat === k}">${t}</button>`).join('')}</div>
      <div class="op-sel${conProvincia ? '' : ' dos'}${F.masFiltros ? ' visible' : ''}">
        <select id="op-admin" aria-label="Administración">${ADMIN.map(([v, t]) => `<option value="${v}"${F.admin === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
        <select id="op-est" aria-label="Nivel de estudios">${ESTUDIOS.map(([v, t]) => `<option value="${v}"${F.estudios === v ? ' selected' : ''}>${t}</option>`).join('')}</select>
        ${conProvincia ? `<select id="op-prov" aria-label="Provincia"><option value="">Toda España</option>${provincias.map((p) => `<option${F.provincia === p ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select>` : ''}
      </div></div>`;
  }

  const mas = (n) => (n > F.n ? `<div class="op-pag"><span>Mostrando ${miles(Math.min(F.n, n))} de ${miles(n)}</span><button type="button" class="op-btn ghost op-mas" data-acc="mas">Ver ${miles(Math.min(30, n - F.n))} más</button></div>` : '');
  function activos() {
    return [F.admin && ['admin', ADMIN.find(([v]) => v === F.admin)[1]], F.estudios && ['estudios', ESTUDIOS.find(([v]) => v === F.estudios)[1]],
      F.provincia && ['provincia', F.provincia], F.semana && ['semana', 'Cierran esta semana']].filter(Boolean);
  }
  const chipsActivos = () => { const a = activos(); return a.length || F.q || F.cat ? `<div class="op-activos">${a.map(([k, t]) => `<button type="button" data-quitar="${k}">${esc(t)} <span aria-hidden="true">×</span><span class="op-sr">Quitar filtro</span></button>`).join('')}<button type="button" class="op-borrar" data-acc="borrar">Borrar filtros</button></div>` : ''; };

  function vistaAbiertas() {
    const xs = abiertas.filter((c) => casa(c)).sort(ORDEN[F.orden]); const hayFiltro = F.q || F.cat || F.admin || F.estudios || F.provincia;
    return filtros(true) + chipsActivos() + `<div class="op-resumen"><span><b>${miles(xs.length)}</b> ${xs.length === 1 ? 'oposición' : 'oposiciones'}</span>
      <span class="op-orden" role="group" aria-label="Ordenar">${[['recientes', 'Más recientes'], ['cierran', 'Cierran antes'], ['plazas', 'Más plazas']].map(([k, t]) => `<button type="button" data-orden="${k}" aria-pressed="${F.orden === k}">${t}</button>`).join('')}</span></div>
      ${hayFiltro ? '<button type="button" class="op-link" data-acc="aviso">🔔 Avísame cuando salgan más así</button>' : ''}`
      + (xs.length ? xs.slice(0, F.n).map(fila).join('') + mas(xs.length)
        : '<div class="op-vacio">Ahora no hay ninguna con estos filtros.<br>Pulsa «Avísame» y te la marcamos en cuanto salga en el BOE.</div>');
  }

  function vistaProximas() {
    const anunciadas = publicadas.filter(c => casa(c));
    const ofertas = proximas.filter(p => casa(p));
    return filtros(false) + chipsActivos()
      + (anunciadas.length ? `<section class="op-bloque"><h3>Publicadas · plazo aún por abrir</h3>${anunciadas.slice(0, F.n).map(fila).join('')}${mas(anunciadas.length)}</section>` : '')
      + `<section class="op-bloque"><h3>Ofertas de empleo público pendientes de convocatoria</h3><p class="op-intro">Las plazas de una oferta aún no tienen plazo de inscripción.</p><div class="op-resumen"><span><b>${miles(ofertas.reduce((s, p) => s + p.plazas, 0))}</b> plazas en ${miles(ofertas.length)} entradas</span></div>
        ${ofertas.length ? ofertas.slice(0, F.n).map(filaProxima).join('') + mas(ofertas.length) : '<div class="op-vacio">No hay ofertas pendientes con estos filtros.</div>'}</section>`;
  }

  function vistaConfirmar() {
    const xs = porConfirmar.filter(c => casa(c));
    return `<p class="op-intro">Convocatorias publicadas cuyo plazo Plaza no ha podido verificar. Consulta el anuncio y las bases.</p>`
      + filtros(true) + chipsActivos()
      + (xs.length ? xs.slice(0, F.n).map(fila).join('') + mas(xs.length) : '<div class="op-vacio">No hay convocatorias pendientes de confirmar con estos filtros.</div>');
  }

  function vistaMias() {
    const xs = E.seguidas.map((id) => porId[id]).filter(Boolean);
    const avisos = E.alertas.map((a, i) => { const n = nuevasDeAviso(a); return `<li><button type="button" class="op-aviso" data-acc="usar-aviso" data-i="${i}"><span>🔔 ${esc(a.nombre)}</span>${n.length ? `<span class="op-pill ok">${n.length} ${n.length === 1 ? 'nueva' : 'nuevas'}</span>` : '<span class="op-mut">sin novedades</span>'}</button><button type="button" class="op-x" data-acc="borrar-aviso" data-i="${i}" aria-label="Quitar este aviso">×</button></li>`; }).join('');
    return `<section class="op-bloque"><h3>Guardadas</h3>${xs.length ? xs.map(fila).join('') : '<div class="op-vacio">Abre una oposición y pulsa «Guardar en mis oposiciones». Aquí verás su plazo y cada novedad: admitidos, fecha de examen, aprobados.</div>'}</section>
      <section class="op-bloque"><h3>Avisos</h3>${avisos ? `<ul class="op-avisos">${avisos}</ul>` : '<div class="op-vacio">En «Plazo abierto», elige lo que te interesa (por ejemplo, Administración en tu provincia) y pulsa «Avísame». Cada vez que entres verás las nuevas.</div>'}</section>`;
  }

  function pinta() {
    const nMias = E.seguidas.filter((id) => porId[id]).length, nNuevas = E.alertas.reduce((s, a) => s + nuevasDeAviso(a).length, 0);
    const vistas = { abiertas: vistaAbiertas, proximas: vistaProximas, confirmar: vistaConfirmar, mias: vistaMias };
    const titulo = TITULOS[F.tab];
    el.innerHTML = `<div class="op">
      <header class="op-head"><h2>${titulo}</h2>
        <p class="op-mut">Convocatorias y ofertas publicadas en el BOE. Sumarios revisados hasta el ${esc(DIA[fd(ultimo).getDay()])} ${esc(corta(ultimo))} de ${esc(ultimo.slice(0, 4))}.${resultado.respaldo ? ' Mostrando la copia guardada.' : ''}</p>
        ${F.tab === 'abiertas' ? `<div class="op-cifras">
          <div><b>${miles(abiertas.reduce((s, c) => s + (c.plazas || 0), 0))}</b><span>plazas con plazo abierto</span></div>
          <button type="button" data-tab="proximas"><b>${miles(publicadas.length)}</b><span>publicadas · por abrir</span></button>
          <button type="button" data-atajo="semana" aria-pressed="${F.semana}"><b>${miles(abiertas.filter((c) => c.fin && c.estado === 'abierto' && quedan(c.fin) <= 7).length)}</b><span>cierran esta semana</span></button>
        </div>` : ''}</header>
      <nav class="op-tabs" role="tablist" aria-label="Estado de la convocatoria">
        <button type="button" role="tab" data-tab="abiertas" aria-selected="${F.tab === 'abiertas'}">Plazo abierto <span>${miles(abiertas.length)}</span></button>
        <button type="button" role="tab" data-tab="proximas" aria-selected="${F.tab === 'proximas'}">Próximamente <span>${miles(proximas.length + publicadas.length)}</span></button>
        <button type="button" role="tab" data-tab="confirmar" aria-selected="${F.tab === 'confirmar'}">Por confirmar <span>${miles(porConfirmar.length)}</span></button>
        <button type="button" role="tab" data-tab="mias" aria-selected="${F.tab === 'mias'}">Mis oposiciones${nNuevas ? ` <span class="nuevas">${nNuevas} nuevas</span>` : nMias ? ` <span>${nMias}</span>` : ''}</button>
      </nav>
      <div class="op-cuerpo">${vistas[F.tab]()}</div>
      <p class="op-pie">Fuente: Agencia Estatal Boletín Oficial del Estado. Las fechas de cierre son estimadas. Confírmalas en las bases oficiales. La cobertura incluye los anuncios publicados en el BOE.</p>
    </div>`;
  }

  let temporizador;
  el.addEventListener('input', (ev) => {
    if (ev.target.id !== 'op-q') return;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { F.q = ev.target.value; F.n = 30; F.abierta = null; const pos = ev.target.selectionStart; pinta(); const i = el.querySelector('#op-q'); i.focus(); i.setSelectionRange(pos, pos); }, 200);
  });
  el.addEventListener('change', (ev) => {
    const t = ev.target; F.n = 30; F.abierta = null;
    if (t.id === 'op-admin') F.admin = t.value; else if (t.id === 'op-est') F.estudios = t.value; else if (t.id === 'op-prov') F.provincia = t.value; else return;
    pinta();
  });
  el.addEventListener('click', (ev) => {
    const tab = ev.target.closest('[data-tab]');
    if (tab) {
      Object.assign(F, { tab: tab.dataset.tab, n: 30, abierta: null, semana: false });
      if (F.tab === 'proximas') F.provincia = '';
      pinta();
      el.querySelector(`.op-tabs [data-tab="${F.tab}"]`)?.focus({ preventScroll: true });
      return;
    }
    const at = ev.target.closest('[data-atajo]'); if (at) { F.semana = !F.semana; if (F.semana) F.orden = 'cierran'; F.n = 30; F.abierta = null; return pinta(); }
    const qu = ev.target.closest('[data-quitar]'); if (qu) { const k = qu.dataset.quitar; F[k] = k === 'semana' ? false : ''; F.n = 30; return pinta(); }
    const ord = ev.target.closest('[data-orden]'); if (ord) { F.orden = ord.dataset.orden; F.n = 30; F.abierta = null; return pinta(); }
    const cat = ev.target.closest('[data-cat]'); if (cat) { F.cat = cat.dataset.cat; F.n = 30; F.abierta = null; return pinta(); }
    const b = ev.target.closest('[data-acc]'); if (!b) return;
    const id = b.closest('[data-id]')?.dataset.id; const acc = b.dataset.acc;
    if (acc === 'abrir') {
      F.abierta = F.abierta === id ? null : id; pinta();
      const fila = el.querySelector(`[data-id="${CSS.escape(id)}"]`);
      if (fila) { fila.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); fila.querySelector('.op-linea')?.focus({ preventScroll: true }); }
    }
    else if (acc === 'guardar') { E.seguidas = E.seguidas.includes(id) ? E.seguidas.filter((x) => x !== id) : [id, ...E.seguidas]; guardarEstado(E); pinta(); }
    else if (acc === 'ics') ics(porId[id]);
    else if (acc === 'mas') { F.n += 30; pinta(); }
    else if (acc === 'mas-filtros') { F.masFiltros = !F.masFiltros; pinta(); }
    else if (acc === 'borrar') { Object.assign(F, { q: '', cat: '', admin: '', estudios: '', provincia: '', semana: false, n: 30, abierta: null }); pinta(); }
    else if (acc === 'aviso') {
      const nombre = [F.q && `«${F.q}»`, F.cat && (CATEGORIAS.find(([k]) => k === F.cat) || [, 'Otras'])[1], F.provincia, F.admin && ADMIN.find(([v]) => v === F.admin)[1], F.estudios && ESTUDIOS.find(([v]) => v === F.estudios)[1]].filter(Boolean).join(' · ');
      E.alertas.push({ nombre, q: F.q, cat: F.cat, admin: F.admin, estudios: F.estudios, provincia: F.provincia, creada: hoyIso(), vista: hoyIso() }); guardarEstado(E);
      b.textContent = '✓ Aviso guardado en «Mis oposiciones»'; b.disabled = true;
    }
    else if (acc === 'usar-aviso') { const a = E.alertas[+b.dataset.i]; Object.assign(F, { tab: 'abiertas', q: a.q || '', cat: a.cat || '', admin: a.admin || '', estudios: a.estudios || '', provincia: a.provincia || '', n: 30, abierta: null }); a.vista = hoyIso(); guardarEstado(E); pinta(); }
    else if (acc === 'borrar-aviso') { E.alertas.splice(+b.dataset.i, 1); guardarEstado(E); pinta(); }
  });
  pinta();
}
