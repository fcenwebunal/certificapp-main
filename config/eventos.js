'use strict';

// ── URL de la pestaña "Eventos" publicada como CSV ──────────────────
// Cambia el gid=XXXXXXX por el número real de tu pestaña
const EVENTOS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vTqE-3NMFdjG0TG_4LBVs65PUVo4SPHy0hK3IUa04Oe37NAu5Em_lQawdyCIMuAWw' +
  '/pub?gid=730857601&output=csv';

let cache = null;            // { eventoKey: { evento, fechaInicio, … } }
let cacheTime = 0;
const TTL_MS = 5 * 60 * 1000;  // refresca cada 5 minutos

function parseEventosCSV(text) {
  const rows = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(r => r.split(',').map(c => c.trim()));

  if (rows.length < 2) return {};

  // Fila 0 → encabezados: eventoKey, evento, fechaInicio, fechaFin, horas, fechaCert
  const headers = rows[0];
  const result  = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;           // fila vacía
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = row[idx] || ''; });
    result[obj.eventoKey] = obj;
  }
  return result;
}

async function getEventos() {
  const now = Date.now();
  if (cache && (now - cacheTime) < TTL_MS) return cache;

  const resp = await fetch(EVENTOS_CSV_URL);
  if (!resp.ok) throw new Error(`Error al cargar eventos: HTTP ${resp.status}`);
  const text = await resp.text();
  cache     = parseEventosCSV(text);
  cacheTime = Date.now();
  return cache;
}

module.exports = { getEventos };
