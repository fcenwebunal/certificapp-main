'use strict';

// Published Sheets quote cells that hold commas or line breaks, so the CSV is read
// character by character. Returns one object per row, keyed by the header row.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(cell); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row);
      row = []; cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }

  const [headers = [], ...data] = rows;
  const keys = headers.map(h => h.trim());
  return data
    .filter(r => r.some(c => c.trim()))
    .map(r => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ''])));
}

module.exports = { parseCSV };
