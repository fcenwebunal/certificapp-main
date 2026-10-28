'use strict';

const path     = require('path');
const PDFDoc   = require('pdfkit');

const ASSETS = path.join(__dirname, 'assets', 'hermes');
const A = {
  // AncizarSerif-Regular.ttf with the advances of c, o, w and y set to those of the OTF
  // that Hermes embeds (433, 521, 737 and 489 units); the outlines are untouched.
  font: path.join(ASSETS, 'AncizarSerif-Regular-Hermes.ttf'),
  logo: path.join(ASSETS, 'logo-unal.png'),
};

// The `firma` column of the `eventos` tab names one of these files.
const SIGNATURES = {
  'maria_clemencia_rios_vargas.png': path.join(ASSETS, 'firmas', 'maria_clemencia_rios_vargas.png'),
};

// Layout measured on the certificates Hermes (JasperReports + OpenPDF) issued for CIM 2026:
// points from the top-left corner of a Letter page; every y is a text baseline.
// The detailed analysis is in herramientas/certificados/formato-hermes.md (FCEN DEV).
const LEFT          = 85;
const WIDTH         = 440;
const FIT_TOLERANCE = 0.02;
const OBLIQUE_DEG   = 12;
const NO_SHAPING    = { kern: false, liga: false, clig: false, calt: false };

const LOGO      = { x: 374, y: 31, width: 205, height: 89.95 };
const HEADER    = { size: 11, first: 165.54, pitch: 16.636, certifyLine: 5 };
const NAME      = { size: 30, first: 285.5, pitch: 36, box: 60 };
const IDENT     = { size: 11, first: 343.53, pitch: 15.945 };
const EVENT     = { size: 14, first: 400.6, pitch: 16.8, lines: 2 };
const HELD      = { size: 11, first: 448.86, pitch: 16.295, lines: 2 };
const SIGNATURE = { x: 85, y: 582, width: 180, height: 50 };
const SIGNER    = { size: 8, first: 639.7, pitch: 11.6 };
const FOOTER    = { size: 10, step: 0.5, baseline: 761, drop: 0.34, center: LEFT + WIDTH / 2 };

/**
 * Generates a certificate that copies the Hermes format and returns the PDF Buffer.
 * Takes the participant row of `datos_hermes` merged with its event row of `eventos`.
 *
 * @param {object} data
 * @returns {Promise<Buffer>}
 */
function generateHermesCertificate(data) {
  const {
    nombre           = '',
    tipo_documento   = '',
    documento        = '',
    codigo_seguridad = '',
    dependencia      = '',
    encabezado_2     = '',
    encabezado_3     = '',
    certifican       = '',
    identificacion   = '',
    participacion    = '',
    evento           = '',
    realizado        = '',
    dado             = '',
    firma            = '',
    firmante         = '',
    cargo_firmante   = '',
    entidad_firmante = '',
    pie_antes        = '',
    pie_url          = '',
    pie_despues      = '',
  } = data;

  const signature = firma ? SIGNATURES[firma] : null;
  if (firma && !signature) return Promise.reject(new Error(`Firma desconocida: ${firma}`));

  return new Promise((resolve, reject) => {

    const doc = new PDFDoc({
      size:    'LETTER',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      compress: true,
      info: { Title: `Certificado ${nombre}`, Creator: 'UNAL Manizales' },
    });

    const chunks = [];
    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Ancizar', A.font);
    doc.font('Ancizar').fillColor('#000000');

    const width = text => doc.widthOfString(text, { features: NO_SHAPING });

    const line = (text, x, y, size, extra = {}) => {
      doc.fontSize(size).text(text, x, y, {
        lineBreak: false, baseline: 'alphabetic', features: NO_SHAPING, ...extra,
      });
    };

    // Greedy word wrap like JasperReports: trailing spaces do not count.
    const wrap = (text, size) => {
      doc.fontSize(size);
      const lines = [];
      let current = '';
      for (const word of text.split(' ')) {
        const candidate = current === '' ? word : `${current} ${word}`;
        if (current === '' || width(candidate.trimEnd()) <= WIDTH + FIT_TOLERANCE) {
          current = candidate;
        } else {
          lines.push(current);
          current = word;
        }
      }
      lines.push(current);
      return lines;
    };

    doc.image(A.logo, LOGO.x, LOGO.y, { width: LOGO.width, height: LOGO.height });

    const header = [dependencia, encabezado_2, encabezado_3].filter(Boolean);
    header.forEach((text, i) => line(text, LEFT, HEADER.first + i * HEADER.pitch, HEADER.size));
    if (certifican) line(certifican, LEFT, HEADER.first + HEADER.certifyLine * HEADER.pitch, HEADER.size);

    // The name box is 60 pt high and centers one line; longer names grow it and push down
    // everything below except the footer.
    const nameLines  = wrap(nombre, NAME.size);
    const nameHeight = nameLines.length * NAME.pitch;
    const nameOffset = (Math.max(NAME.box, nameHeight) - nameHeight) / 2;
    nameLines.forEach((text, i) => {
      line(text, LEFT, NAME.first + nameOffset + i * NAME.pitch, NAME.size, { oblique: OBLIQUE_DEG });
    });
    let shift = Math.max(0, nameHeight - NAME.box);

    const ident = [identificacion, `${tipo_documento}${documento}`].filter(Boolean).join(' ');
    line(ident, LEFT, IDENT.first + shift, IDENT.size);
    line(participacion, LEFT, IDENT.first + 2 * IDENT.pitch + shift, IDENT.size);

    const eventLines = wrap(evento, EVENT.size);
    eventLines.forEach((text, i) => line(text, LEFT, EVENT.first + i * EVENT.pitch + shift, EVENT.size));
    shift += Math.max(0, eventLines.length - EVENT.lines) * EVENT.pitch;

    // Justified: OpenPDF gives the last line the word spacing of the line before it when it fits.
    const heldLines = realizado ? wrap(realizado, HELD.size) : [];
    const space = width(' ');
    let extra = 0;
    heldLines.forEach((text, i) => {
      const words = text.split(' ');
      const gaps  = Math.max(1, words.length - 1);
      if (i < heldLines.length - 1) extra = (WIDTH - width(text)) / gaps;
      else if (width(text) + extra * gaps > WIDTH) extra = 0;
      let x = LEFT;
      const y = HELD.first + i * HELD.pitch + shift;
      for (const word of words) {
        line(word, x, y, HELD.size);
        x += width(word) + space + extra;
      }
    });
    shift += Math.max(0, heldLines.length - HELD.lines) * HELD.pitch;
    if (dado) line(dado, LEFT, HELD.first + (HELD.lines + 1) * HELD.pitch + shift, HELD.size);

    if (signature) {
      doc.image(signature, SIGNATURE.x, SIGNATURE.y + shift, {
        width: SIGNATURE.width, height: SIGNATURE.height,
      });
    }
    [firmante, cargo_firmante, entidad_firmante].forEach((text, i) => {
      if (text) line(text, LEFT, SIGNER.first + i * SIGNER.pitch + shift, SIGNER.size);
    });

    // Centered on the text column; it drops half a point at a time until it fits. Attendees
    // added without a Hermes certificate have no code, so they get no verification line.
    if (codigo_seguridad.trim()) {
      const parts = [
        { text: pie_antes ? `${pie_antes} ` : '', color: '#000000' },
        { text: pie_url, color: '#0000FF' },
        { text: [pie_despues, codigo_seguridad.trim()].filter(Boolean).join(' '), color: '#000000' },
      ].filter(p => p.text.trim());
      let size = FOOTER.size;
      const footerWidth = () => {
        doc.fontSize(size);
        return parts.reduce((sum, p) => sum + width(p.text), 0);
      };
      while (footerWidth() > WIDTH + FIT_TOLERANCE && size > FOOTER.step) size -= FOOTER.step;
      let x = FOOTER.center - footerWidth() / 2;
      const y = FOOTER.baseline - (FOOTER.size - size) * FOOTER.drop;
      for (const p of parts) {
        doc.fillColor(p.color);
        line(p.text, x, y, size);
        x += width(p.text);
      }
    }

    doc.end();
  });
}

module.exports = { generateHermesCertificate };
