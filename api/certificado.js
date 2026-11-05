'use strict';

const { generarCertificado }        = require('../generate');
const { generateHermesCertificate } = require('../generate-hermes');
const { getEventos }                = require('../config/eventos');
const { findHermesParticipant }     = require('../config/hermes');
const { generateWorkCertificate }   = require('../generate-ponencia');
const { findCertificateType, findWork } = require('../config/ponencias');

const safeFileName = nombre => nombre
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zA-Z0-9 ]/g, '')
  .trim()
  .replace(/\s+/g, '_');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, cedula, rol, eventoKey, tipo, codigo } = req.body || {};

    // Kinds of certificate other than the event's own (speakers of CIM 2026) are built from
    // the stored work row: one certificate per work, with all its authors.
    const type = eventoKey && tipo ? await findCertificateType(eventoKey, tipo) : null;
    if (eventoKey && tipo && !type) {
      return res.status(400).json({ error: `Tipo de certificado desconocido: ${tipo}` });
    }
    if (type && type.formato !== 'evento') {
      const work = await findWork(eventoKey, codigo);
      if (!work) {
        return res.status(404).json({ error: 'No se encontró ese trabajo en el evento' });
      }
      if (!work.activo) {
        return res.status(403).json({ error: 'Certificado no habilitado', inactivo: true });
      }
      const buffer = await generateWorkCertificate({
        ...type,
        codigo:             work.codigo,
        modalidad:          work.modalidad,
        titulo_certificado: work.titulo_certificado,
        autores:            work.autores,
      });
      return sendPdf(res, buffer, work.codigo);
    }

    if (!cedula || !eventoKey) {
      return res.status(400).json({ error: 'Faltan datos del participante' });
    }

    const EVENTOS = await getEventos();
    const meta    = EVENTOS[eventoKey];

    if (!meta) {
      return res.status(400).json({ error: `Evento desconocido: ${eventoKey}` });
    }

    let buffer;
    let fileName;

    // Hermes certificates carry a security code, so they are built only from the stored row.
    if (meta.formato === 'hermes') {
      const participant = await findHermesParticipant(eventoKey, cedula);
      if (!participant) {
        return res.status(404).json({ error: 'No se encontró registro con ese documento' });
      }
      if (!participant.activo) {
        return res.status(403).json({ error: 'Certificado no habilitado', inactivo: true });
      }
      buffer   = await generateHermesCertificate({ ...meta, ...participant });
      fileName = participant.nombre;
    } else {
      if (!nombre) {
        return res.status(400).json({ error: 'Faltan datos del participante' });
      }
      buffer = await generarCertificado({
        nombre,
        cedula,
        rol:         (rol || 'ASISTENTE').toUpperCase(),
        evento:      meta.evento,
        fecha:       meta.fecha,
        horas:       meta.horas,
        fechaCert:   meta.fechaCert,
      });
      fileName = nombre;
    }

    sendPdf(res, buffer, fileName);

  } catch (err) {
    console.error('[certificado]', err);
    res.status(500).json({ error: 'Error al generar el certificado' });
  }
};

function sendPdf(res, buffer, fileName) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename="certificado_${safeFileName(fileName)}.pdf"`);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Cache-Control', 'no-store');
  res.send(buffer);
}
