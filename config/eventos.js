/**
 * config/eventos.js
 *
 * IMPORTANTE — formato de fechas:
 *   fechaInicio → SOLO el número del día ("15")
 *   fechaFin    → fecha completa ("17 DE OCTUBRE DE 2025")
 *
 * Esto produce en el PDF: "REALIZADO DEL 15 AL 17 DE OCTUBRE DE 2025..."
 * Si pones la fecha completa en ambos obtendrás el formato largo (certificado_mal).
 *
 * ⚠️  Ajusta las fechas reales antes de publicar.
 * Las claves deben coincidir EXACTAMENTE con la fila 1 del Google Sheet.
 */

module.exports = {
  'Representación de Estructuras Algebraicas': {
    evento:      'REPRESENTACIÓN DE ESTRUCTURAS ALGEBRAICAS',
    fechaInicio: '27',
    fechaFin:    '31 DE ENERO DE 2025',
    horas:       '20',
    fechaCert:   '31 DE ENERO DE 2025',
  },
  'Biomat 2025': {
    evento:      'BIOMAT 2025',
    fechaInicio: '22',
    fechaFin:    '26 DE SEPTIEMBRE DE 2025',
    horas:       '20',
    fechaCert:   '26 DE SEPTIEMBRE DE 2025',
  },
  'Congreso de Física y Tecnologías Emergentes': {
    evento:      'CONGRESO DE FÍSICA Y TECNOLOGÍAS EMERGENTES',
    fechaInicio: '13',
    fechaFin:    '17 DE OCTUBRE DE 2025',
    horas:       '20',
    fechaCert:   '17 DE OCTUBRE DE 2025',
  },
  'Encuentro de Matemáticas': {
    evento:      'ENCUENTRO DE MATEMÁTICAS',
    fechaInicio: '20',
    fechaFin:    '24 DE OCTUBRE DE 2025',
    horas:       '20',
    fechaCert:   '24 DE OCTUBRE DE 2025',
  },
  'Simposio Innobio': {
    evento:      'SIMPOSIO INNOBIO',
    fechaInicio: '15',
    fechaFin:    '17 DE OCTUBRE DE 2025',
    horas:       '25',
    fechaCert:   '17 DE OCTUBRE DE 2025',
  },
  'Workshop de Estadística': {
    evento:      'WORKSHOP DE ESTADÍSTICA',
    fechaInicio: '27',
    fechaFin:    '31 DE OCTUBRE DE 2025',
    horas:       '20',
    fechaCert:   '31 DE OCTUBRE DE 2025',
  },
  'Workshop en Ciencias de la Computación': {
    evento:      'WORKSHOP EN CIENCIAS DE LA COMPUTACIÓN',
    fechaInicio: '03',
    fechaFin:    '07 DE NOVIEMBRE DE 2025',
    horas:       '20',
    fechaCert:   '07 DE NOVIEMBRE DE 2025',
  },
};
