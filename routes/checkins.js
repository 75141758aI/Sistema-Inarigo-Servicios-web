const express = require('express');
const router = express.Router();
const pool = require('../db');

// POST escanear QR y registrar check-in
router.post('/:qr_token', async (req, res) => {
  const { qr_token } = req.params;
  const { lat_cliente, lng_cliente, escaneado_por } = req.body;

  try {
    const [turnos] = await pool.query(
      'SELECT id, estado, negocio_id FROM turnos WHERE qr_token = ?',
      [qr_token]
    );

    if (turnos.length === 0) {
      return res.status(404).json({
        error: 'QR no válido'
      });
    }

    const turno = turnos[0];

    if (turno.estado === 'cancelado') {
      return res.status(400).json({
        error: 'Turno cancelado'
      });
    }

    if (
      turno.estado === 'presente' ||
      turno.estado === 'completado'
    ) {
      return res.status(400).json({
        error: 'Check-in ya registrado'
      });
    }

    // Calcular distancia si vienen coordenadas
    let distancia_metros = null;

    if (lat_cliente && lng_cliente) {
      const [negocio] = await pool.query(
        'SELECT latitud, longitud FROM negocios WHERE id = ?',
        [turno.negocio_id]
      );

      if (negocio.length > 0) {
        const R = 6371000;

        const dLat =
          ((lat_cliente - negocio[0].latitud) * Math.PI) / 180;

        const dLng =
          ((lng_cliente - negocio[0].longitud) * Math.PI) / 180;

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((lat_cliente * Math.PI) / 180) *
            Math.cos((negocio[0].latitud * Math.PI) / 180) *
            Math.sin(dLng / 2) ** 2;

        distancia_metros = Math.round(
          R *
            2 *
            Math.atan2(
              Math.sqrt(a),
              Math.sqrt(1 - a)
            )
        );
      }
    }

    await pool.query(
      `INSERT INTO checkins
       (turno_id, escaneado_por, lat_cliente, lng_cliente, distancia_metros)
       VALUES (?, ?, ?, ?, ?)`,
      [
        turno.id,
        escaneado_por || null,
        lat_cliente || null,
        lng_cliente || null,
        distancia_metros
      ]
    );

    await pool.query(
      "UPDATE turnos SET estado = 'presente' WHERE id = ?",
      [turno.id]
    );

    res.json({
      mensaje: 'Check-in registrado',
      turno_id: turno.id,
      distancia_metros
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;