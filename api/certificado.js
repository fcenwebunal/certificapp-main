'use strict';

const { generarCertificado } = require('../generate');
const { getEventos }         = require('../config/eventos');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { nombre, cedula, rol, eventoKey } = req.body || {};

    if (!nombre || !cedula || !eventoKey) {
      return res.status(400).json({ error: 'Faltan datos del participante' });
    }

    const EVENTOS = await getEventos();
    const meta    = EVENTOS[eventoKey];

    if (!meta) {
      return res.status(400).json({ error: `Evento desconocido: ${eventoKey}` });
    }

    const buffer = await generarCertificado({
      nombre,
      cedula,
      rol:         (rol || 'ASISTENTE').toUpperCase(),
      evento:      meta.evento,
      fecha:       meta.fecha,
      horas:       meta.horas,
      fechaCert:   meta.fechaCert,
    });

    const safeName = nombre
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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
