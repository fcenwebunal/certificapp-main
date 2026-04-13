# Certificados FCEN — UNAL Manizales

certificappfcen.vercel.app

Aplicación web para descargar certificados PDF de eventos de la Facultad de Ciencias Exactas y Naturales, sede Manizales.

## Estructura del proyecto

```
app/
├── api/
│   └── certificado.js          ← Serverless function (Vercel)
├── public/
│   └── index.html              ← Interfaz de usuario
├── assets/
│   ├── unal_ico.svg
│   ├── firma.png
│   ├── AncizarSerif-Light.ttf
│   ├── AncizarSerif-LightItalic.ttf
│   └── MYRIADPRO-REGULAR.OTF
├── config/
│   └── eventos.js              ← ⚠️ Editar fechas aquí
├── generate.js                 ← Motor de generación de PDFs
├── package.json
├── vercel.json
└── .gitignore
```

### Actualizar fechas de eventos
Edita `config/eventos.js` con las fechas reales de cada evento.

### Fuente de datos (Google Sheets)
La URL del Sheet está en `public/index.html` en la constante `SHEET_URL`.
El Sheet debe estar **publicado como CSV** (Archivo → Compartir → Publicar en la web → CSV).

**Estructura esperada del Sheet:**
- Fila 1: Nombre del evento (repite cada 3 columnas)
- Fila 2: `nombre`, `documento`, `rol`
- Filas 3+: participantes
