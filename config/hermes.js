'use strict';

const { parseCSV } = require('./csv');

// `datos_hermes` tab: one row per certificate of the events whose `formato` is "hermes".
const HERMES_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vQaw34NyGZJdnMGDK31dVxYzRR44Fve-QX6X18Nl6IJPk_krB58D0v7dMdwW6HDLWDQxw4GFmF0yfjt' +
  '/pub?gid=604129353&single=true&output=csv';

let cache = null;
let cacheTime = 0;
const TTL_MS = 5 * 60 * 1000;

const normKey = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

// Same rule as the interface: no leading "CC", spaces or dots.
const normDoc = d => (d || '').replace(/^CC\s*/i, '').replace(/[\s.]/g, '').toLowerCase();

async function getParticipants() {
  const now = Date.now();
  if (cache && (now - cacheTime) < TTL_MS) return cache;

  const resp = await fetch(HERMES_CSV_URL);
  if (!resp.ok) throw new Error(`Error al cargar datos_hermes: HTTP ${resp.status}`);
  cache     = parseCSV(await resp.text());
  cacheTime = Date.now();
  return cache;
}

// Returns the row of that document in that event, or null. `activo` comes back as a boolean.
async function findHermesParticipant(eventoKey, documento) {
  const event = normKey(eventoKey);
  const doc   = normDoc(documento);
  if (!doc) return null;
  const row = (await getParticipants())
    .find(r => normKey(r.evento) === event && normDoc(r.documento) === doc);
  if (!row) return null;
  return {
    nombre:           row.nombre,
    tipo_documento:   row.tipo_documento.trim(),
    documento:        row.documento.trim(),
    codigo_seguridad: row.codigo_seguridad.trim(),
    activo:           normKey(row.activo) === 'si',
  };
}

module.exports = { findHermesParticipant };
