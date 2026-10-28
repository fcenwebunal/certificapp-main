'use strict';

const { parseCSV } = require('./csv');

const EVENTOS_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vQaw34NyGZJdnMGDK31dVxYzRR44Fve-QX6X18Nl6IJPk_krB58D0v7dMdwW6HDLWDQxw4GFmF0yfjt' +
  '/pub?gid=2018966166&single=true&output=csv';

let cache = null;            // { eventoKey: { evento, fecha, horas, fechaCert, formato, … } }
let cacheTime = 0;
const TTL_MS = 5 * 60 * 1000;  // refresca cada 5 minutos

// Columns: eventoKey, evento, fecha, horas, fechaCert and, for events whose `formato` is
// "hermes", dependencia, participacion, ciudad, modalidad, firma and the signer columns.
function parseEventosCSV(text) {
  const result = {};
  for (const row of parseCSV(text)) {
    const key = (row.eventoKey || '').trim();
    if (!key) continue;
    const obj = {};
    for (const [h, v] of Object.entries(row)) obj[h] = v.trim();
    result[key] = obj;
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
