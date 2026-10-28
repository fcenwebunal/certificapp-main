'use strict';

const { generarCertificado }        = require('../generate');
const { generateHermesCertificate } = require('../generate-hermes');
const { getEventos }                = require('../config/eventos');
const { findHermesParticipant }     = require('../config/hermes');

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
    const { nombre, cedula, rol, eventoKey } = req.body || {};

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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="certificado_${safeFileName(fileName)}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);

  } catch (err) {
    console.error('[certificado]', err);
    res.status(500).json({ error: 'Error al generar el certificado' });
  }
};
