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
    // Vercel parsea JSON automáticamente, pero nos protegemos por si acaso
    const body = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : (req.body || {});

    const { nombre, cedula, rol, eventoKey } = body;

    if (!nombre || !cedula || !eventoKey) {
      return res.status(400).json({ error: 'Faltan datos: nombre, cedula o eventoKey' });
    }

    const meta = EVENTOS[eventoKey];
    if (!meta) {
      return res.status(400).json({ error: `Evento no reconocido: "${eventoKey}"` });
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
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificado_${safeName}.pdf"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);

  } catch (err) {
    // Log detallado para ver en Vercel → Functions → Logs
    console.error('[certificado] ERROR:', err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'Error al generar el certificado', detalle: err.message });
  }
};
