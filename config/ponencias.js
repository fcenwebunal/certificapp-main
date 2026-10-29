'use strict';

const { parseCSV } = require('./csv');

const SHEET_PUB =
  'https://docs.google.com/spreadsheets/d/e/' +
  '2PACX-1vQaw34NyGZJdnMGDK31dVxYzRR44Fve-QX6X18Nl6IJPk_krB58D0v7dMdwW6HDLWDQxw4GFmF0yfjt/pub';
// `tipos_certificado`: the kinds of certificate of the events that have more than one.
const TYPES_CSV_URL = `${SHEET_PUB}?gid=1247620951&single=true&output=csv`;
// `datos_ponencias`: one row per presented work, with all its authors.
const WORKS_CSV_URL = `${SHEET_PUB}?gid=1223383015&single=true&output=csv`;

const TTL_MS = 5 * 60 * 1000;
const caches = new Map();

const normKey = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

async function load(url, label) {
  const hit = caches.get(url);
  if (hit && (Date.now() - hit.time) < TTL_MS) return hit.rows;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Error al cargar ${label}: HTTP ${resp.status}`);
  const rows = parseCSV(await resp.text())
    .map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v.trim()])));
  caches.set(url, { rows, time: Date.now() });
  return rows;
}

// Returns the row of that kind of certificate of that event, or null.
async function findCertificateType(eventoKey, tipo) {
  const event = normKey(eventoKey);
  const type  = normKey(tipo);
  const rows  = await load(TYPES_CSV_URL, 'tipos_certificado');
  return rows.find(r => normKey(r.eventoKey) === event && normKey(r.tipo) === type) || null;
}

// Returns the row of that work in that event, or null. `activo` comes back as a boolean.
async function findWork(eventoKey, codigo) {
  const event = normKey(eventoKey);
  const code  = (codigo || '').trim().toUpperCase();
  if (!code) return null;
  const row = (await load(WORKS_CSV_URL, 'datos_ponencias'))
    .find(r => normKey(r.evento) === event && r.codigo.toUpperCase() === code);
  if (!row) return null;
  return {
    codigo:             row.codigo,
    titulo_certificado: row.titulo_certificado,
    autores:            row.autores,
    activo:             normKey(row.activo) === 'si',
  };
}

module.exports = { findCertificateType, findWork };
