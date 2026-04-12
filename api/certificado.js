'use strict';

const { generarCertificado } = require('../generate');
const EVENTOS = require('../config/eventos');

/**
 * POST /api/certificado
 * Body JSON: { nombre, cedula, rol, eventoKey }
 * Responde con el PDF binario para descarga directa.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, cedula, rol, eventoKey } = req.body || {};

    if (!nombre || !cedula || !eventoKey) {
      return res.status(400).json({ error: 'Faltan datos del participante' });
    }

    const meta = EVENTOS[eventoKey];
    if (!meta) {
      return res.status(400).json({ error: `Evento desconocido: ${eventoKey}` });
    }

    const buffer = await generarCertificado({
      nombre,
      cedula,
      rol:         (rol || 'ASISTENTE').toUpperCase(),
      evento:      meta.evento,
      fechaInicio: meta.fechaInicio,
      fechaFin:    meta.fechaFin,
      horas:       meta.horas,
      fechaCert:   meta.fechaCert,
    });

    const safeName = nombre
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // quitar tildes
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="certificado_${safeName}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);

  } catch (err) {
    console.error('[certificado]', err);
    res.status(500).json({ error: 'Error al generar el certificado' });
  }
};
