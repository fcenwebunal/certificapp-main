'use strict';

const fs       = require('fs');
const path     = require('path');
const PDFDoc   = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');

const ASSETS = path.join(__dirname, 'assets');
const A = {
  svg:    path.join(ASSETS, 'unal_ico.svg'),
  firma:  path.join(ASSETS, 'firma.png'),
  light:  path.join(ASSETS, 'AncizarSerif-Light.ttf'),
  italic: path.join(ASSETS, 'AncizarSerif-LightItalic.ttf'),
  bold: path.join(ASSETS, 'AncizarSerif-Bold.ttf'),
  myriad: path.join(ASSETS, 'MYRIADPRO-REGULAR.OTF'),
};

// mm → puntos PDF
const mm = v => v * 2.8346;

/**
 * Genera un certificado PDF en memoria y devuelve el Buffer.
 *
 * @param {object} datos
 * @param {string} datos.nombre
 * @param {string} datos.cedula
 * @param {string} datos.rol         p.ej. "ASISTENTE" | "PONENTE"
 * @param {string} datos.evento      nombre del evento en MAYÚSCULAS
 * @param {string} datos.fechaInicio p.ej. "15 DE OCTUBRE DE 2025"
 * @param {string} datos.fechaFin    p.ej. "17 DE OCTUBRE DE 2025"
 * @param {string} datos.horas       p.ej. "25"
 * @param {string} datos.fechaCert   p.ej. "17 DE OCTUBRE DE 2025"
 * @returns {Promise<Buffer>}
 */
function generarCertificado(datos) {
  const {
    nombre      = '',
    cedula      = '',
    rol         = 'ASISTENTE',
    evento      = '',
    fechaInicio = '',
    fechaFin    = '',
    horas       = '',
    fechaCert   = '',
  } = datos;

  return new Promise((resolve, reject) => {

    const doc = new PDFDoc({
      size:    'A4',           // 595.28 × 841.89 pt
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      compress: true,
      info: { Title: `Certificado — ${nombre}`, Creator: 'UNAL Manizales' },
    });

    // Recopilar chunks en memoria
    const chunks = [];
    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Fuentes ──────────────────────────────────────────────────────
    doc.registerFont('Ancizar',       A.light);
    doc.registerFont('AncizarItalic', A.italic);
    doc.registerFont('AncizarBold', A.bold);
    doc.registerFont('Myriad',        A.myriad);

    // ── Layout ───────────────────────────────────────────────────────
    const PW    = 595.28;
    const mL    = mm(21);
    const textW = PW - mL - mm(21);

    const T = (font, size, str, yPos, cs = 0, extra = {}) => {
      doc.font(font).fontSize(size).fillColor('#111111');
      doc.text(str, mL, yPos, { width: textW, characterSpacing: cs, ...extra });
    };

    // ── Logo UNAL (SVG vectorial) ─────────────────────────────────────
    const svgStr = fs.readFileSync(A.svg, 'utf8');
    const logoW  = mm(75);
    const logoH  = logoW * (128.5 / 244.33);
    SVGtoPDF(doc, svgStr, PW - mm(20) - logoW, mm(14), {
      width: logoW, height: logoH, preserveAspectRatio: 'xMidYMid meet',
    });

    // ── Facultad / Sede ───────────────────────────────────────────────
    T('Ancizar', 8.2, 'FACULTAD DE CIENCIAS EXACTAS Y NATURALES', mm(63), 0.9, { lineGap: 3.5 });
    T('Ancizar', 8.2, 'SEDE MANIZALES',                           doc.y,  0.9);

    // ── CERTIFICAN QUE ────────────────────────────────────────────────
    T('Ancizar', 8.2, 'CERTIFICAN QUE', mm(89), 1.1);

    // ── Nombre ────────────────────────────────────────────────────────
    T('AncizarItalic', 38, nombre, mm(100), 0, { lineGap: 2 });

    // ── Cédula ────────────────────────────────────────────────────────
    T('Myriad', 8.2, `IDENTIFICADO CON C.C. ${cedula}`, doc.y + 3, 0.9);

    // ── Participó / Rol / Evento ──────────────────────────────────────
    let y = doc.y + mm(18);
    T('Ancizar', 8.2, `PARTICIPÓ COMO ${rol.toUpperCase()}`, y,     1.1, { lineGap: 3.5 });
    T('Ancizar', 8.2, 'EN EL',                               doc.y, 1.1, { lineGap: 3.5 });
    T('AncizarBold', 9.5, evento,                                doc.y, 0.4);

    // ── Fechas ────────────────────────────────────────────────────────
    y = doc.y + mm(16);
    T('Ancizar', 8.2, `REALIZADO DEL ${fechaInicio} AL ${fechaFin} EN LA CIUDAD DE`, y,     0.9, { lineGap: 3.5 });
    T('Ancizar', 8.2, `MANIZALES CON UNA INTENSIDAD DE ${horas} HORAS`,              doc.y, 0.9);

    // ── Dado en ───────────────────────────────────────────────────────
    y = doc.y + mm(14);
    T('Ancizar', 8.2, `DADO EN MANIZALES, EL ${fechaCert}`, y, 0.9);

    // ── Firma (raster comprimido) ─────────────────────────────────────
    y = doc.y + mm(16);
    doc.image(A.firma, mL - mm(1), y, { width: mm(38) });

    // ── Firmante ──────────────────────────────────────────────────────
    y = doc.y + mm(4);
    T('Ancizar', 8.2, 'HECTOR JAIRO OSORIO ZULUAGA',              y,     0.9, { lineGap: 3.5 });
    T('Ancizar', 8.2, 'DECANO',                                   doc.y, 0.9, { lineGap: 3.5 });
    T('Ancizar', 8.2, 'FACULTAD DE CIENCIAS EXACTAS Y NATURALES', doc.y, 0.9);

    doc.end();
  });
}

module.exports = { generarCertificado };
