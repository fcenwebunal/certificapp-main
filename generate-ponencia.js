'use strict';

const path   = require('path');
const PDFDoc = require('pdfkit');

const ASSETS = path.join(__dirname, 'assets');
const A = {
  regular: path.join(ASSETS, 'ponencia', 'AncizarSerif-Regular.ttf'),
  names:   path.join(ASSETS, 'ponencia', 'AncizarSerif-SemiBoldItalic.ttf'),
  bold:    path.join(ASSETS, 'ponencia', 'AncizarSerif-Bold.ttf'),
  logo:    path.join(ASSETS, 'hermes', 'logo-unal.png'),
};

// The `firma` column of the `tipos_certificado` tab names one of these files.
const SIGNATURES = {
  'maria_clemencia_rios_vargas.png': path.join(ASSETS, 'hermes', 'firmas', 'maria_clemencia_rios_vargas.png'),
};

// Layout measured on the sample the designer made in Illustrator for CIM 2026
// («Certificado materiales ponentes muestra»): points from the top-left corner of a Letter
// page; every y is a text baseline. The blocks between the names and the place and date
// follow one another, so the gaps are the ones of the sample.
const LEFT        = 124.07;
const WIDTH       = 440;
const HELD_WIDTH  = 408;
const LOGO        = { x: 374, y: 31, width: 205, height: 89.95 };
const HEADER      = { size: 12, first: 184.04, pitch: 17.955 };
const CERTIFY     = { size: 12, y: 286.99 };
const NAMES       = { size: 14, first: 307.38, pitch: 16, column: 220, columnsFrom: 6 };
const BODY        = { size: 12, pitch: 14.4 };
const EVENT       = { size: 14 };
const GAPS        = { participation: 41.1, title: 20.8, event: 43.06, held: 26.58, given: 39.38 };
const MIN_GAPS    = { participation: 26, title: 18, event: 28, held: 20, given: 26 };
// Where the place and date sit on the sample; longer certificates first use the blank space
// under the header (CERTIFICAN QUE may rise up to MAX_RISE) and only then shrink the gaps.
const LAST_GIVEN  = 583.91;
const MIN_HEADER_GAP = 30;
const MAX_RISE    = CERTIFY.y - (HEADER.first + 2 * HEADER.pitch) - MIN_HEADER_GAP;
const SIGNATURE   = { x: LEFT, bottom: 663, width: 160, height: 50 };
const SIGNER      = { size: 12, first: 677.84, pitch: 14.4, last: 770 };

/**
 * Generates the certificate of a presented work (all its authors on one certificate) and
 * returns the PDF Buffer. Takes the row of its kind of certificate in `tipos_certificado`
 * plus `codigo`, `titulo_certificado` and `autores` from the work row of `datos_ponencias`
 * (whose `evento` column is the eventoKey, not the event line of the certificate).
 *
 * @param {object} data
 * @returns {Promise<Buffer>}
 */
function generateWorkCertificate(data) {
  const {
    codigo                 = '',
    titulo_certificado     = '',
    autores                = '',
    dependencia            = '',
    encabezado_2           = '',
    encabezado_3           = '',
    certifican             = '',
    participacion          = '',
    participacion_singular = '',
    evento                 = '',
    evento_2               = '',
    realizado              = '',
    dado                   = '',
    firma                  = '',
    firmante               = '',
    cargo_firmante         = '',
    entidad_firmante       = '',
  } = data;

  const signature = firma ? SIGNATURES[firma] : null;
  if (firma && !signature) return Promise.reject(new Error(`Firma desconocida: ${firma}`));

  const authors = splitAuthors(autores);

  return new Promise((resolve, reject) => {

    const doc = new PDFDoc({
      size:    'LETTER',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      compress: true,
      info: { Title: `Certificado ${codigo}`, Creator: 'UNAL Manizales' },
    });

    const chunks = [];
    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('regular', A.regular);
    doc.registerFont('names', A.names);
    doc.registerFont('bold', A.bold);
    doc.fillColor('#000000');

    const width = (text, font, size) => doc.font(font).fontSize(size).widthOfString(text);

    const line = (text, y, font, size, x = LEFT) => {
      doc.font(font).fontSize(size).text(text, x, y, { lineBreak: false, baseline: 'alphabetic' });
    };

    const wrap = (text, font, size, max) => {
      const lines = [];
      let current = '';
      for (const word of text.split(/\s+/).filter(Boolean)) {
        const candidate = current ? `${current} ${word}` : word;
        if (!current || width(candidate, font, size) <= max) current = candidate;
        else { lines.push(current); current = word; }
      }
      if (current) lines.push(current);
      return lines;
    };

    // Same number of lines as a plain wrap, but with the narrowest width that keeps it,
    // so a long title does not leave a single word on its last line.
    const balance = (text, font, size, max) => {
      const lines = wrap(text, font, size, max);
      if (lines.length < 2) return lines;
      let low = max / lines.length;
      let high = max;
      while (high - low > 0.5) {
        const mid = (low + high) / 2;
        if (wrap(text, font, size, mid).length > lines.length) low = mid;
        else high = mid;
      }
      return wrap(text, font, size, high);
    };

    doc.image(A.logo, LOGO.x, LOGO.y, { width: LOGO.width, height: LOGO.height });

    [dependencia, encabezado_2, encabezado_3].filter(Boolean)
      .forEach((text, i) => line(text, HEADER.first + i * HEADER.pitch, 'regular', HEADER.size));
    // Six or more authors go in two columns when every name fits in one.
    const twoColumns = authors.length >= NAMES.columnsFrom
      && authors.every(name => width(name, 'names', NAMES.size) <= NAMES.column - 8);
    const nameRows = twoColumns ? Math.ceil(authors.length / 2) : authors.length;
    const nameLines = twoColumns
      ? authors.map(name => [name])
      : authors.map(name => wrap(name, 'names', NAMES.size, WIDTH));
    const nameHeight = twoColumns
      ? nameRows
      : nameLines.reduce((sum, lines) => sum + lines.length, 0);

    const participationText = authors.length === 1 && participacion_singular
      ? participacion_singular
      : participacion;
    const titleLines = titulo_certificado
      ? balance(`“${titulo_certificado.trim()}”`, 'regular', BODY.size, WIDTH)
      : [];
    const eventLines = evento ? wrap(evento, 'bold', EVENT.size, WIDTH) : [];
    const event2Lines = evento_2 ? wrap(evento_2, 'regular', BODY.size, WIDTH) : [];
    const heldLines = realizado ? wrap(realizado, 'regular', BODY.size, HELD_WIDTH) : [];

    // A certificate longer than the sample first moves everything from CERTIFICAN QUE up
    // into the blank space under the header; if that is not enough, the gaps between blocks
    // shrink together down to MIN_GAPS, so the place and date stay above the signature.
    const layout = (gaps, rise) => {
      const y = {};
      y.certify = CERTIFY.y - rise;
      y.names = NAMES.first - rise;
      y.lastName = y.names + (nameHeight - 1) * NAMES.pitch;
      y.participation = y.lastName + gaps.participation;
      y.title = y.participation + gaps.title;
      y.event = y.title + Math.max(0, titleLines.length - 1) * BODY.pitch + gaps.event;
      y.event2 = y.event + Math.max(0, eventLines.length - 1) * BODY.pitch + BODY.pitch;
      const eventEnd = event2Lines.length
        ? y.event2 + (event2Lines.length - 1) * BODY.pitch
        : y.event + Math.max(0, eventLines.length - 1) * BODY.pitch;
      y.held = eventEnd + gaps.held;
      y.given = y.held + Math.max(0, heldLines.length - 1) * BODY.pitch + gaps.given;
      return y;
    };
    const rise = Math.min(MAX_RISE, Math.max(0, layout(GAPS, 0).given - LAST_GIVEN));
    let y = layout(GAPS, rise);
    if (y.given > LAST_GIVEN) {
      const keys = Object.keys(GAPS);
      const room = keys.reduce((sum, k) => sum + GAPS[k] - MIN_GAPS[k], 0);
      const ratio = Math.min(1, (y.given - LAST_GIVEN) / room);
      y = layout(Object.fromEntries(keys.map(k => [k, GAPS[k] - (GAPS[k] - MIN_GAPS[k]) * ratio])), rise);
    }

    if (certifican) line(certifican, y.certify, 'regular', CERTIFY.size);
    let row = 0;
    authors.forEach((name, i) => {
      if (twoColumns) {
        const column = i < nameRows ? 0 : 1;
        line(name, y.names + (i % nameRows) * NAMES.pitch, 'names', NAMES.size, LEFT + column * NAMES.column);
      } else {
        nameLines[i].forEach(text => line(text, y.names + row++ * NAMES.pitch, 'names', NAMES.size));
      }
    });

    if (participationText) line(participationText, y.participation, 'regular', BODY.size);
    titleLines.forEach((text, i) => line(text, y.title + i * BODY.pitch, 'regular', BODY.size));
    eventLines.forEach((text, i) => line(text, y.event + i * BODY.pitch, 'bold', EVENT.size));
    event2Lines.forEach((text, i) => line(text, y.event2 + i * BODY.pitch, 'regular', BODY.size));
    heldLines.forEach((text, i) => line(text, y.held + i * BODY.pitch, 'regular', BODY.size));
    if (dado) line(dado, y.given, 'regular', BODY.size);

    // The signature and the signer stay at the foot of the page unless the text above
    // still reaches them.
    const push = Math.max(0, y.given + 14 - (SIGNATURE.bottom - SIGNATURE.height));
    const signerLines = [firmante, cargo_firmante, entidad_firmante].filter(Boolean);
    const signerShift = Math.min(push, SIGNER.last - (SIGNER.first + (signerLines.length - 1) * SIGNER.pitch));
    if (signature) {
      doc.image(signature, SIGNATURE.x, SIGNATURE.bottom - SIGNATURE.height + signerShift, {
        width: SIGNATURE.width, height: SIGNATURE.height,
      });
    }
    signerLines.forEach((text, i) => {
      line(text, SIGNER.first + i * SIGNER.pitch + signerShift, 'regular', SIGNER.size);
    });

    doc.end();
  });
}

// `autores` holds every author of the work separated by semicolons.
function splitAuthors(text) {
  return (text || '').split(';').map(name => name.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

module.exports = { generateWorkCertificate, splitAuthors };
