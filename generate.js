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
  bold:   path.join(ASSETS, 'AncizarSerif-Bold.ttf'),
  myriad: path.join(ASSETS, 'MYRIADPRO-REGULAR.OTF'),
};

const mm = v => v * 2.8346;

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
      size:    'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      compress: true,
      info: { Title: `Certificado — ${nombre}`, Creator: 'UNAL Manizales' },
    });

    const chunks = [];
    doc.on('data',  chunk => chunks.push(chunk));
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('Ancizar',       A.light);
    doc.registerFont('AncizarItalic', A.italic);
    doc.registerFont('AncizarBold',   A.bold);
    doc.registerFont('Myriad',        A.myriad);

    const PW    = 595.28;
    const mL    = mm(21);
    const textW = PW - mL - mm(21);

    const T = (font, size, str, yPos, cs = 0, extra = {}) => {
      doc.font(font).fontSize(size).fillColor('#111111');
      doc.text(str, mL, yPos, { width: textW, characterSpacing: cs, ...extra });
    };

    const svgStr = fs.readFileSync(A.svg, 'utf8');
    const logoW  = mm(75);
    const logoH  = logoW * (128.5 / 244.33);
    SVGtoPDF(doc, svgStr, PW - mm(20) - logoW, mm(14), {
      width: logoW, height: logoH, preserveAspectRatio: 'xMidYMid meet',
    });

    T('Ancizar', 8.2, 'FACULTAD DE CIENCIAS EXACTAS Y NATURALES', mm(63), 0.9, { lineGap: 3.5 });
    T('Ancizar', 8.2, 'SEDE MANIZALES',                           doc.y,  0.9);

    T('Ancizar', 8.2, 'CERTIFICAN QUE', mm(89), 1.1);

    T('AncizarItalic', 38, nombre, mm(100), 0, { lineGap: 2 });

    T('Myriad', 8.2, `IDENTIFICADO CON C.C. ${cedula}`, doc.y + 3, 0.9);

    let y = doc.y + mm(18);
    T('Ancizar',     8.2, `PARTICIPÓ COMO ${rol.toUpperCase()}`, y,     1.1, { lineGap: 3.5 });
    T('Ancizar',     8.2, 'EN EL',                               doc.y, 1.1, { lineGap: 3.5 });
    // BUG 2 CORREGIDO: Bold 11pt en lugar de Light 9.5pt
    T('AncizarBold', 11,  evento,                                doc.y, 0.2);

    // fechaInicio = solo el día ("15"), fechaFin = fecha completa ("17 DE OCTUBRE DE 2025")
    y = doc.y + mm(16);
    T('Ancizar', 8.2, `REALIZADO DEL ${fechaInicio} AL ${fechaFin} EN LA CIUDAD DE`, y,     0.9, { lineGap: 3.5 });
    T('Ancizar', 8.2, `MANIZALES CON UNA INTENSIDAD DE ${horas} HORAS`,              doc.y, 0.9);

    y = doc.y + mm(14);
    T('Ancizar', 8.2, `DADO EN MANIZALES, EL ${fechaCert}`, y, 0.9);

    // BUG 1 CORREGIDO: calcular altura real de la imagen y poner texto DEBAJO
    y = doc.y + mm(16);
    const imgInfo = doc.openImage(A.firma);
    const firmaH  = mm(38) * (imgInfo.height / imgInfo.width);
    doc.image(A.firma, mL - mm(1), y, { width: mm(38) });

    const firmaTextY = y + firmaH + mm(4);
    T('Ancizar', 8.2, 'HECTOR JAIRO OSORIO ZULUAGA',              firmaTextY, 0.9, { lineGap: 3.5 });
    T('Ancizar', 8.2, 'DECANO',                                   doc.y,      0.9, { lineGap: 3.5 });
    T('Ancizar', 8.2, 'FACULTAD DE CIENCIAS EXACTAS Y NATURALES', doc.y,      0.9);

    doc.end();
  });
}

module.exports = { generarCertificado };
