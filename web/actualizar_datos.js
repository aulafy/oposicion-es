(function (w) {
  const base = 'https://raw.githubusercontent.com/aulafy/oposicion-es/main/web/', prefijo = 'plaza-datos-', fetchReal = w.fetch.bind(w);
  let incluida, pendiente;
  const estado = () => { try { const s = JSON.parse(w.localStorage.getItem('plaza.datos')); return s && s.version && s.manifiesto && s.manifiesto.ficheros ? s : null; } catch (e) { return null; } };
  const validar = m => { if (!m || !/^[a-f0-9]{12}$/.test(m.version) || typeof m.generado !== 'string' || !m.ficheros || typeof m.ficheros !== 'object' || Array.isArray(m.ficheros)) throw new Error('Manifiesto inválido'); for (const [p, v] of Object.entries(m.ficheros)) if (!/^datos\/(?:[\w-]+\/)*[\w.-]+$/.test(p) || p.split('/').some(x => x === '.' || x === '..') || !v || !/^[a-f0-9]{64}$/.test(v.sha256) || !Number.isSafeInteger(v.bytes) || v.bytes < 0) throw new Error('Fichero inválido en el manifiesto'); return m; };
  const bundled = () => incluida || (incluida = fetchReal('datos/manifest.json').then(r => { if (!r.ok) throw new Error('No se pudo leer el manifiesto incluido'); return r.json(); }).then(validar));
  // Una sesión de estudio mantiene la versión con la que se abrió.
  const inicial = estado();
  const cacheInicial = inicial && w.caches.open(prefijo + inicial.version).catch(() => null);
  // Tiempo máximo: 15 s más 1 s por cada 50 kB, para que el banco (11,5 MB) también llegue con datos móviles lentos.
  const descargar = async (url, json, bytes = 0) => { const c = new AbortController(), t = setTimeout(() => c.abort(), 15000 + bytes / 50); try { const r = await fetchReal(url, { cache: 'no-store', signal: c.signal }); if (!r.ok) throw new Error('No se pudo descargar ' + url); return json ? await r.json() : await r.arrayBuffer(); } finally { clearTimeout(t); } };
  async function actualizar() {
    let nuevo, nombre, confirmado = false;
    try {
      try { nuevo = await descargar(base + 'datos/manifest.json', true); } catch (e) { return { estado: 'sin-conexion', detalle: String(e) }; }
      validar(nuevo);
      const original = await bundled(), guardado = estado();
      // Si la app se actualizó con datos incluidos más recientes que los descargados, se parte de los incluidos.
      const anterior = guardado && !(original.generado >= guardado.generado) ? guardado : null;
      if (nuevo.version === (anterior ? anterior.version : original.version)) return { estado: 'al-dia', version: nuevo.version };
      if (nuevo.generado < (anterior || original).generado) return { estado: 'al-dia' };
      nombre = prefijo + nuevo.version;
      const cache = await w.caches.open(nombre), vieja = anterior ? await w.caches.open(prefijo + anterior.version) : null;
      let n = 0, total = 0;
      for (const [p, v] of Object.entries(nuevo.ficheros)) {
        if (original.ficheros[p]?.sha256 === v.sha256) continue;
        let r = anterior?.manifiesto.ficheros[p]?.sha256 === v.sha256 ? await vieja.match(p) : null;
        if (!r) {
          const b = await descargar(base + p, false, v.bytes), hash = Array.from(new Uint8Array(await w.crypto.subtle.digest('SHA-256', b)), x => x.toString(16).padStart(2, '0')).join('');
          if (b.byteLength !== v.bytes || hash !== v.sha256) throw new Error('Datos dañados: ' + p);
          r = new Response(b, { headers: { 'Content-Type': 'application/json' } }); n++; total += b.byteLength;
        }
        await cache.put(p, r);
      }
      // La versión solo cambia cuando todos sus ficheros están guardados.
      try { w.localStorage.setItem('plaza.datos', JSON.stringify({ version: nuevo.version, generado: nuevo.generado, manifiesto: nuevo })); } catch (e) { throw new Error('No se pudo guardar la versión de los datos'); }
      confirmado = true;
      try { for (const k of await w.caches.keys()) if (k.startsWith(prefijo) && k !== nombre) await w.caches.delete(k); } catch (e) {}
      return { estado: 'actualizado', version: nuevo.version, ficheros: n, bytes: total };
    } catch (e) { if (nombre && !confirmado) { try { await w.caches.delete(nombre); } catch (e) {} } return { estado: 'error', detalle: String(e) }; }
  }
  w.Plaza = w.Plaza || {};
  w.Plaza.datos = {
    activa() { const s = estado(); return s ? { version: s.version, generado: s.generado } : null; },
    comprobar() { if (!pendiente) pendiente = (navigator.locks ? navigator.locks.request('plaza-actualizar', actualizar) : actualizar()).catch(e => ({ estado: 'error', detalle: String(e) })).finally(() => { pendiente = null; }); return pendiente; },
    async leer(p) {
      if (!inicial?.manifiesto.ficheros[p]) return null;
      const m = await bundled();
      if (m.generado >= inicial.generado || inicial.manifiesto.ficheros[p].sha256 === m.ficheros[p]?.sha256) return null;
      const cache = await cacheInicial;
      const respuesta = cache && await cache.match(p);
      if (!respuesta) throw new Error('Faltan datos de la actualización. Vuelve a abrir Plaza.');
      return respuesta;
    }
  };
  const iniciar = () => setTimeout(async () => { try { const r = await w.Plaza.datos.comprobar(); if (r.estado === 'actualizado') w.dispatchEvent(new CustomEvent('plaza:datos-actualizados', { detail: r })); } catch (e) {} }, 4000);
  setInterval(iniciar, 86400000);
  if (document.readyState === 'complete') iniciar(); else w.addEventListener('load', iniciar, { once: true });
})(window);
