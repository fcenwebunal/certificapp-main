'use strict';

const fs       = require('fs');
const path     = require('path');
const PDFDoc   = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');

const ASSETS = path.join(__dirname, 'assets');
const A = {
  svg:    path.join(ASSETS, 'unal_ico.svg'),
  // firma:  path.join(ASSETS, 'firma.png'),
  firma:  path.join(ASSETS, 'firma.svg'),
  light:  path.join(ASSETS, 'AncizarSerif-Medium.ttf'),
  italic: path.join(ASSETS, 'AncizarSerif-MediumItalic.ttf'),
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
 * @param {string} datos.fecha       p.ej. "15 AL 17 DE OCTUBRE DE 2025"
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
    fecha       = '',
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
    doc.registerFont('AncizarBold',   A.bold);
    doc.registerFont('Myriad',        A.myriad);

    // ── Layout ───────────────────────────────────────────────────────
    const PW    = 595.28;
    const mL    = mm(43); 
    const textW = PW - mL - mm(21);

    const T = (font, size, str, yPos, cs = 0, extra = {}) => {
      doc.font(font).fontSize(size).fillColor('#000000');
      doc.text(str, mL, yPos, { width: textW, characterSpacing: 0, ...extra });
    };

    const T_h = (font, size, str, yPos, wPos, cs = 0, extra = {}) => {
      doc.font(font).fontSize(size).fillColor('#000000');
      doc.text(str, mL + wPos, yPos, { width: textW, characterSpacing: 0, ...extra });
    };

    // ── Logo UNAL (SVG vectorial) ─────────────────────────────────────
    const svgStr = fs.readFileSync(A.svg, 'utf8');
    const logoW  = mm(81);
    const logoH  = logoW * (140 / 244.33);
    SVGtoPDF(doc, svgStr, PW - mm(7) - logoW, mm(5), {
      width: logoW, height: logoH, preserveAspectRatio: 'xMidYMid meet',
    });

    // ── Facultad / Sede ───────────────────────────────────────────────
    T('Ancizar', 12, 'FACULTAD DE CIENCIAS EXACTAS Y NATURALES', mm(64), 0.12, { lineGap: 3.5 });
    T('Ancizar', 12, 'SEDE MANIZALES',                           doc.y,  0.9);

    // ── CERTIFICAN QUE ────────────────────────────────────────────────
    T('Ancizar', 12, 'CERTIFICAN QUE', mm(92), 1.1);

    // ── Nombre ────────────────────────────────────────────────────────
    T('AncizarItalic', 32, nombre, mm(100), 0, { lineGap: 2 });

    // ── Cédula ────────────────────────────────────────────────────────
    let y = doc.y;
    T('Ancizar', 12, `IDENTIFICADO CON`, y + 3, 0.9);     
    T_h('Myriad', 12, `C.C. ${cedula}`, y + 5, mm(38), 0.9);

    // ── Participó / Rol / Evento ──────────────────────────────────────
    y = doc.y + mm(14);
    T('Ancizar', 12, `PARTICIPÓ COMO ${rol.toUpperCase()}`, y,     1.1, { lineGap: 3.5 });
    T('Ancizar', 12, 'EN EL',                               doc.y, 1.1, { lineGap: 3.5 });
    T('AncizarBold', 16, evento,                                doc.y, 0.4);

    // ── Fechas ────────────────────────────────────────────────────────
    y = doc.y + mm(14);
    T('Ancizar', 12, `REALIZADO ${fecha} EN LA CIUDAD DE`, y,     0.12, { lineGap: 3.5 });
    T('Ancizar', 12, `MANIZALES CON UNA INTENSIDAD DE ${horas} HORAS`,              doc.y, 0.9);

    // ── Dado en ───────────────────────────────────────────────────────
    y = doc.y + mm(12);
    T('Ancizar', 12, `DADO EN MANIZALES, EL ${fechaCert}`, y, 0.9);

    // ── Firma (raster comprimido) ─────────────────────────────────────
    y = doc.y + mm(2); 
    // doc.image(A.firma, mL - mm(1), y, { width: mm(38) });

    const firmaStr = fs.readFileSync(A.firma, 'utf8');
    const firmaW  = mm(34);
    const firmaH  = firmaW * (68 / 44);
    SVGtoPDF(doc, firmaStr, mL, y, {
      width: firmaW, height: firmaH, preserveAspectRatio: 'xMidYMid meet',
    });

    // ── Firmante ──────────────────────────────────────────────────────
    y = doc.y + mm(40);
    T('Ancizar', 12, 'DECANO',                                 y,     0.12, { lineGap: 3.5 });
    T('Ancizar', 12, 'HECTOR JAIRO OSORIO ZULUAGA',            doc.y, 0.12, { lineGap: 3.5 });
    T('Ancizar', 12, 'FACULTAD DE CIENCIAS EXACTAS Y NATURALES', doc.y, 0.9);

    doc.end();
  });
}

module.exports = { generarCertificado };
