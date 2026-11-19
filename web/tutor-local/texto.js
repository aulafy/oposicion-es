/* Utilidades de texto con la semántica de Python 3 (re, str.strip, unicodedata) para que el port de plazos.py y del
   verificador del tutor dé exactamente lo mismo que la versión Python. Sin dependencias; vale en content scripts,
   service worker, página de fondo de Firefox, página de pruebas y JavaScriptCore (jsc). */
(function (G) {
  'use strict';
  const P = G.Plaza = G.Plaza || {};

  // Espacios de Python (str.isspace y \s de re con patrones str). JS no incluye \x1c-\x1f ni \x85, e incluye ﻿.
  const ESP = '\\t\\n\\x0b\\x0c\\r\\x1c-\\x20\\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000';
  const W = '\\p{L}\\p{N}_';  // \w de Python: str.isalnum() o «_»
  const LIMITE = `(?:(?<=[${W}])(?![${W}])|(?<![${W}])(?=[${W}]))`;

  /** Traduce un patrón de `re` de Python a RegExp de JS (con flag u): \w \W \s \S \d \b y (?P<nombre>…). */
  function re(src, flags) {
    flags = flags || '';
    let out = '', i = 0, enClase = false;
    if (src.startsWith('(?m)')) { flags += 'm'; i = 4; }
    if (src.startsWith('(?i)', i)) { flags += 'i'; i += 4; }
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') {
        const n = src[i + 1];
        if (n === 'w') out += enClase ? W : `[${W}]`;
        else if (n === 'W') { if (enClase) throw new Error('\\W en clase'); out += `[^${W}]`; }
        else if (n === 's') out += enClase ? ESP : `[${ESP}]`;
        else if (n === 'S') { if (enClase) throw new Error('\\S en clase'); out += `[^${ESP}]`; }
        else if (n === 'd') out += '\\p{Nd}';
        else if (n === 'b' && !enClase) out += LIMITE;
        else out += c + n;
        i += 2; continue;
      }
      if (enClase) { if (c === ']') enClase = false; out += c; i++; continue; }
      if (c === '[') {
        enClase = true; out += c; i++;
        if (src[i] === '^') { out += '^'; i++; }
        if (src[i] === ']') { out += '\\]'; i++; }
        continue;
      }
      if (src.startsWith('(?P<', i)) { out += '(?<'; i += 4; continue; }
      out += c; i++;
    }
    if (!flags.includes('u')) flags += 'u';
    return new RegExp(out, flags);
  }

  const ESP_SET = new Set(['\t', '\n', '\x0b', '\x0c', '\r', '\x1c', '\x1d', '\x1e', '\x1f', ' ', '\x85', '\xa0', ' ',
    ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ',
    ' ', ' ', ' ', ' ', '　']);
  const conjunto = chars => chars === undefined ? ESP_SET : new Set(chars);

  /** str.strip / lstrip / rstrip de Python (sin argumento: espacios Unicode de Python). */
  function lstrip(s, chars) { const c = conjunto(chars); let i = 0; while (i < s.length && c.has(s[i])) i++; return s.slice(i); }
  function rstrip(s, chars) { const c = conjunto(chars); let j = s.length; while (j > 0 && c.has(s[j - 1])) j--; return s.slice(0, j); }
  function strip(s, chars) { return rstrip(lstrip(s, chars), chars); }
  /** str.split() sin argumento. */
  function split(s) { return strip(s).split(re('\\s+')).filter(Boolean); }

  /** plazos.sin_tilde: NFD sin marcas (categoría Mn). */
  function sinTilde(s) { return s.normalize('NFD').replace(/\p{Mn}/gu, ''); }

  /** servidor_tutor.nrm: minúsculas, NFKD sin diacríticos, solo [a-z0-9ñ] separados por un espacio. */
  function nrm(t) {
    t = t.toLowerCase().normalize('NFKD').replace(/\p{Mn}/gu, '');
    return t.replace(/[^a-z0-9ñ]+/g, ' ').replace(/^ +| +$/g, '');
  }

  /** Busca con un RegExp sin flag g (equivale a re.search). Devuelve el match o null. */
  function buscar(rx, s) { rx.lastIndex = 0; return rx.exec(s); }

  P.texto = { re, strip, lstrip, rstrip, split, sinTilde, nrm, buscar, ESP, W };
})(typeof globalThis !== 'undefined' ? globalThis : this);
