/* Tutor de dudas con la IA local del opositor (Ollama en su ordenador), sin pasar por tutor/servidor_tutor.py.
   - El contexto se monta aquí, en el navegador, con los mismos datos exportados (pwa/datos) y el mismo texto que pone el
     servidor: reglas (SIS), texto legal vigente o de la convocatoria, línea «CÓMPUTO DE PLAZOS», pregunta, opciones,
     clave y respuesta del opositor. tutor/comparar_prompt_local.py comprueba que es idéntico al de mensaje_sistema().
   - La respuesta llega en streaming desde http://localhost:11434/api/chat; abortar la petición corta también la
     generación en Ollama.
   - Al terminar, el verificador sin IA ya portado a JS (extension/lib: texto.js, plazos.js, verificar.js) da el
     mismo resultado que el del servidor (verde / ámbar).
   Nada sale del ordenador del opositor: el navegador habla con su propio Ollama.
   Ficheros hermanos (enlaces): texto.js, plazos.js, verificar.js -> extension/lib; reglas.json -> plazos/reglas.json. */
(function (G) {
  'use strict';
  const P = G.Plaza = G.Plaza || {};
  const DIR = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '');
  const BASE = 'http://localhost:11434';
  const MODELO = 'gpt-oss:20b';
  const LETRAS = 'ABCD';
  // Igual que SIS en tutor/servidor_tutor.py (comparar_prompt_local.py avisa si se separan).
  const SIS = "Eres el tutor de una academia de oposiciones en España. Ayudas a un opositor con una pregunta tipo test que acaba de responder. Te doy el TEXTO LEGAL vigente del precepto, la PREGUNTA, sus opciones, la RESPUESTA CORRECTA (comprobada; no la discutas) y lo que respondió el opositor.\nReglas:\n1. Básate SOLO en el texto legal que te doy. Si la duda necesita otra norma u otro artículo, dilo con claridad y explica solo lo que este texto permite responder; no inventes artículos, plazos, cifras ni órganos.\n2. Cuando cites la ley, copia la frase literal entre comillas angulares «así».\n3. Sé breve y claro: entre 60 y 180 palabras, en español, tuteando. Puedes usar **negrita** y listas cortas con guiones. Empieza directamente por la respuesta, sin fórmulas como «El texto legal dice».\n4. No te limites a repetir la cita: explica con tus palabras qué regula el precepto, quién hace qué y por qué la opción elegida por el opositor no encaja con lo que el texto sí dice. Una cita literal corta basta.\n5. Si te piden un truco para memorizar, puedes proponer una regla mnemotécnica, pero marcada como truco y sin alterar el contenido legal.\n6. Si la duda no tiene que ver con la pregunta o con la oposición, reconduce amablemente a la pregunta.";

  /* ---------- verificador (se carga la primera vez que hace falta) ---------- */
  let libs = null;
  const script = (f) => new Promise((ok, ko) => {
    const e = document.createElement('script'); e.src = DIR + f; e.onload = ok; e.onerror = () => ko(new Error('No se pudo cargar ' + f));
    document.head.appendChild(e);
  });
  function cargar() {
    return libs || (libs = (async () => {
      if (!P.texto) await script('texto.js');
      if (!P.plazos) await script('plazos.js');
      if (!P.verificar) await script('verificar.js');
      const r = await fetch(DIR + 'reglas.json'); if (!r.ok) throw new Error('reglas.json');
      return r.json();
    })().catch((e) => { libs = null; throw e; }));
  }

  /* ---------- prompt: lo mismo que mensaje_sistema() del servidor ---------- */
  async function contexto(id, conv, r) {
    const rs = await cargar();
    const x = await fetch(`/tutor_ctx?id=${encodeURIComponent(id)}&conv=${encodeURIComponent(conv || '')}`);  // pwa/api.js
    const c = await x.json(); if (!x.ok) throw new Error(c.error || 'sin contexto');
    const suya = Number.isInteger(r) && r >= 0 && r < c.opciones.length ? c.opciones[r] : null;
    const comp = P.plazos.lineaComputo(c.norma, rs);
    const ctx = `TEXTO LEGAL (${c.nombre}):\n${[...c.texto].slice(0, 6000).join('')}\n\n` + (comp ? comp + '\n\n' : '')
      + `PREGUNTA: ${c.enunciado}\n` + c.opciones.map((o, i) => `${LETRAS[i]}) ${o}`).join('\n')
      + `\n\nRESPUESTA CORRECTA: ${LETRAS[c.correcta]}) ${c.opciones[c.correcta]}\n`
      + (suya !== null ? `EL OPOSITOR RESPONDIÓ: ${LETRAS[r]}) ${suya}` + (r === c.correcta ? ' (acertó)' : ' (falló)') : 'EL OPOSITOR LA DEJÓ EN BLANCO');
    return { ...c, comp, rs, sistema: SIS + '\n\n' + ctx };
  }

  /* ---------- detección ---------- */
  const conTiempo = (ms) => (typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(ms) : undefined);
  /** Origen que el navegador manda a Ollama: el de la web, o «null» si el HTML se abre como fichero (file://). */
  const origen = () => (location.protocol === 'file:' || !location.origin || location.origin === 'null' ? 'null' : location.origin);  // Chrome da location.origin «file://», pero envía «null»
  /** Ollama acepta de serie localhost, 127.0.0.1 y 0.0.0.0 (cualquier puerto, http o https). Su lista incluye file://,
      pero los navegadores mandan «Origin: null» desde un fichero, y eso da 403. */
  const origenDeSerie = () => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(origen());
  /** Estado del permiso de acceso a este ordenador («loopback-network»: Chrome 157 y Firefox 160); si no existe, null. */
  async function permisoRedLocal() {
    if (!navigator.permissions) return null;
    for (const name of ['loopback-network', 'local-network-access', 'local-network']) {
      try { return { name, state: (await navigator.permissions.query({ name })).state }; } catch (e) { /* no existe */ }
    }
    return null;
  }
  /** ¿La página está en este mismo ordenador? Entonces el navegador no pide permiso para hablar con localhost. */
  const paginaLocal = () => location.protocol === 'file:' || /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|.+\.localhost)$/.test(location.hostname);
  /** {estado: 'ok' | 'origen' | 'apagado', version, modelos, permiso}. 'origen': algo responde en el puerto pero no
      deja leer la respuesta (falta este origen en OLLAMA_ORIGINS, o el navegador lo bloquea).
      Desde una web pública el navegador pregunta al usuario y la petición queda en espera hasta que responde (Firefox
      la deja así hasta 5 minutos), así que con el permiso pendiente se espera hasta 2 minutos; op.alPreguntar() avisa. */
  async function detectar(base = BASE, op = {}) {
    const permiso = await permisoRedLocal();
    const pendiente = permiso && permiso.state === 'prompt' && !paginaLocal();
    if (pendiente && op.alPreguntar) op.alPreguntar();
    const ms = pendiente ? 120000 : 3000;
    try {
      const v = await (await fetch(base + '/api/version', { signal: conTiempo(ms) })).json();
      const t = await (await fetch(base + '/api/tags', { signal: conTiempo(ms) })).json();
      const modelos = (t.models || []).map((m) => ({ nombre: m.name, tam: m.size, params: (m.details || {}).parameter_size || '', familia: (m.details || {}).family || '' }));
      return { estado: 'ok', version: v.version, modelos, permiso: await permisoRedLocal() };
    } catch (e) {
      const p2 = await permisoRedLocal();
      if (p2 && p2.state === 'denied' && !paginaLocal()) return { estado: 'apagado', permiso: p2, detalle: String(e) };
      try { await fetch(base + '/api/version', { mode: 'no-cors', signal: conTiempo(3000) }); return { estado: 'origen', permiso: p2, detalle: String(e) }; }
      catch (e2) { return { estado: 'apagado', permiso: p2, detalle: String(e2) }; }
    }
  }
  /** ¿El modelo razona (gpt-oss, qwen3, deepseek-r1…)? Para pedirle razonamiento en nivel bajo, como el servidor. */
  async function razona(base, modelo) {
    const respuesta = await fetch(base + '/api/show', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: modelo }) });
    if (!respuesta.ok) throw new Error('No se pudo consultar el modelo instalado.');
    const ficha = await respuesta.json();
    if (ficha.remote_model || ficha.remote_host || /(?:-|:)cloud$/i.test(modelo)) {
      throw new Error('Selecciona un modelo descargado que se ejecute en tu ordenador.');
    }
    return (ficha.capabilities || []).includes('thinking');
  }

  /* ---------- duda ---------- */
  /** Responde una duda. op: {id, r, conv, mensajes, base, modelo, signal, onTexto(trozo), onFase('pensando'|'escribiendo')}.
      Devuelve {texto, verificacion, fuente, medida} o lanza Error (AbortError si se pulsó «Parar»). */
  async function responder(op) {
    const base = op.base || BASE, modelo = op.modelo || MODELO, t0 = performance.now();
    const hist = (op.mensajes || []).slice(-8).filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: [...m.content].slice(0, 1200).join('') }));
    if (!hist.length || hist[hist.length - 1].role !== 'user' || !hist[hist.length - 1].content.trim()) throw new Error('falta la duda');
    const c = await contexto(op.id, op.conv, op.r);
    const cuerpo = { model: modelo, messages: [{ role: 'system', content: c.sistema }, ...hist], stream: true, keep_alive: '10m', options: { temperature: 0.3, num_ctx: 8192 } };
    if (await razona(base, modelo)) cuerpo.think = /gpt-oss/.test(modelo) ? 'low' : true;
    const r = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo), signal: op.signal });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Ollama respondió ' + r.status); }
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '', texto = '', fase = '', fin = null, t1 = 0;
    const linea = (l) => {
      if (!l.trim()) return; const j = JSON.parse(l);
      if (j.error) throw new Error(j.error);
      const m = j.message || {};
      if (m.thinking && fase !== 'pensando' && !texto) { fase = 'pensando'; op.onFase && op.onFase(fase); }
      if (m.content) { if (!t1) { t1 = performance.now(); fase = 'escribiendo'; op.onFase && op.onFase(fase); } texto += m.content; op.onTexto && op.onTexto(m.content); }
      if (j.done) fin = j;
    };
    for (;;) {
      const { done, value } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); let i;
      while ((i = buf.indexOf('\n')) >= 0) { linea(buf.slice(0, i)); buf = buf.slice(i + 1); }
    }
    linea(buf);
    const dudas = hist.filter((m) => m.role === 'user').map((m) => m.content);
    const verificacion = P.verificar.verificar(texto, c.texto + (c.comp ? '\n' + c.comp : ''), { enunciado: c.enunciado, opciones: c.opciones }, dudas, c.norma, c.rs);
    const ns = (x) => (x ? Math.round(x / 1e6) : null);
    const medida = { modelo, primera_palabra_ms: t1 ? Math.round(t1 - t0) : null, total_ms: Math.round(performance.now() - t0),
      carga_ms: fin && ns(fin.load_duration), prompt_tokens: fin && fin.prompt_eval_count, tokens: fin && fin.eval_count,
      tokens_s: fin && fin.eval_duration ? +(fin.eval_count / (fin.eval_duration / 1e9)).toFixed(1) : null };
    return { texto, verificacion, fuente: c.nombre, medida };
  }

  /* ---------- instrucciones de OLLAMA_ORIGINS ---------- */
  /** Pasos para el sistema del opositor, con el origen de esta web ya puesto.
      Abierta como fichero (origen «null») NO se propone OLLAMA_ORIGINS=null: con ese valor Ollama no arranca
      («panic: bad origin», comprobado con Ollama 0.40.16). Lo que vale es servir la carpeta desde localhost, que Ollama
      acepta de serie; la otra salida, OLLAMA_ORIGINS="*", deja usar tu Ollama a cualquier web y se desaconseja. */
  function instrucciones() {
    const o = origen(), ua = navigator.userAgent;
    const so = /Windows/.test(ua) ? 'windows' : /Mac OS X|Macintosh/.test(ua) && !/Mobile/.test(ua) ? 'mac' : /Linux/.test(ua) && !/Android/.test(ua) ? 'linux' : 'otro';
    if (o === 'null') return { origen: o, fichero: true, deSerie: false, so,
      servir: so === 'windows' ? 'py -m http.server 8792 --bind 127.0.0.1' : 'python3 -m http.server 8792 --bind 127.0.0.1',
      url: 'http://127.0.0.1:8792/' };
    return { origen: o, deSerie: origenDeSerie(), so, pasos: {
      mac: [`launchctl setenv OLLAMA_ORIGINS "${o}"`, 'Cierra Ollama desde la barra de menús (Quit Ollama) y vuelve a abrirlo.', 'Al reiniciar el Mac hay que repetir el primer paso (o añadirlo a un LaunchAgent).'],
      windows: [`setx OLLAMA_ORIGINS "${o}"`, 'Cierra Ollama desde la bandeja del sistema y vuelve a abrirlo.'],
      linux: ['sudo systemctl edit ollama', `En [Service], añade: Environment="OLLAMA_ORIGINS=${o}"`, 'sudo systemctl daemon-reload && sudo systemctl restart ollama'],
      otro: [`Arranca Ollama con la variable OLLAMA_ORIGINS=${o}`],
    } };
  }

  P.tutorLocal = { BASE, MODELO, SIS, detectar, responder, contexto, instrucciones, origen, origenDeSerie, paginaLocal, cargar };
})(typeof globalThis !== 'undefined' ? globalThis : this);
