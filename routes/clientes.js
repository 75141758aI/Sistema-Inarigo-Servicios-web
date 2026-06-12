const express = require('express');
const router = express.Router();
const pool = require('../db');
const { enviarPushToken } = require('../services/firebasePush');

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM clientes ORDER BY creado_en DESC'
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.get('/telefono/:telefono', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM clientes WHERE telefono = ?',
      [req.params.telefono]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Cliente no encontrado'
      });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.get('/:id/turnos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          t.id,
          t.negocio_id,
          t.servicio_id,
          t.cliente_id,
          t.colaborador_id,
          t.fecha_hora,
          t.estado,
          t.qr_token,
          CASE
            WHEN t.qr_imagen_url IS NOT NULL
              AND t.qr_imagen_url != ''
            THEN 1
            ELSE 0
          END AS tiene_qr,
          t.notas,
          t.mascota_nombre,
          t.mascota_especie,
          s.nombre AS servicio,
          n.nombre AS negocio,
          u.nombre AS colaborador
       FROM turnos t
       JOIN servicios s ON s.id = t.servicio_id
       JOIN negocios n ON n.id = t.negocio_id
       LEFT JOIN usuarios u ON u.id = t.colaborador_id
       WHERE t.cliente_id = ?
       ORDER BY t.fecha_hora DESC
       LIMIT 20`,
      [req.params.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.post('/', async (req, res) => {
  const { nombre, telefono, email } = req.body;

  if (!nombre || !telefono) {
    return res.status(400).json({
      error: 'nombre y telefono son requeridos'
    });
  }

  try {
    // Si ya existe, lo devolvemos en vez de crear duplicado
    const [existe] = await pool.query(
      `SELECT id, nombre, telefono, email
       FROM clientes
       WHERE telefono = ?`,
      [telefono]
    );

    if (existe.length) {
      return res.json(existe[0]);
    }

    const [result] = await pool.query(
      `INSERT INTO clientes
       (nombre, telefono, email)
       VALUES (?, ?, ?)`,
      [nombre, telefono, email || null]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      telefono,
      email: email || null
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// PUT /api/clientes/:id — actualizar datos del cliente
router.put('/:id', async (req, res) => {
  const { nombre, telefono } = req.body;
  const { id } = req.params;

  try {
    await pool.query(
      `UPDATE clientes
       SET nombre = ?,
           telefono = ?
       WHERE id = ?`,
      [nombre, telefono, id]
    );

    const [rows] = await pool.query(
      `SELECT id, nombre, telefono, email
       FROM clientes
       WHERE id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Actualizar token FCM y preferencias de notificaciones
router.put('/:id/notificaciones', async (req, res) => {
  try {
    const clienteId = req.params.id;

    const {
      fcm_token,
      notif_reservas,
      notif_promociones,
      notif_novedades,
      notif_importantes
    } = req.body;

    const [result] = await pool.query(
      `UPDATE clientes
       SET
         fcm_token = COALESCE(?, fcm_token),
         notif_reservas = COALESCE(?, notif_reservas),
         notif_promociones = COALESCE(?, notif_promociones),
         notif_novedades = COALESCE(?, notif_novedades),
         notif_importantes = COALESCE(?, notif_importantes)
       WHERE id = ?`,
      [
        fcm_token || null,
        typeof notif_reservas === 'boolean'
          ? notif_reservas
            ? 1
            : 0
          : null,
        typeof notif_promociones === 'boolean'
          ? notif_promociones
            ? 1
            : 0
          : null,
        typeof notif_novedades === 'boolean'
          ? notif_novedades
            ? 1
            : 0
          : null,
        typeof notif_importantes === 'boolean'
          ? notif_importantes
            ? 1
            : 0
          : null,
        clienteId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Cliente no encontrado'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Preferencias de notificaciones actualizadas'
    });
  } catch (err) {
    console.error('Error actualizando notificaciones:', err);

    res.status(500).json({
      error: err.message
    });
  }
});

// Probar notificación push a un cliente
router.post('/:id/probar-notificacion', async (req, res) => {
  try {
    const clienteId = req.params.id;

    const [rows] = await pool.query(
      `SELECT id, nombre, fcm_token, notif_importantes
       FROM clientes
       WHERE id = ?`,
      [clienteId]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Cliente no encontrado'
      });
    }

    const cliente = rows[0];

    if (!cliente.fcm_token) {
      return res.status(400).json({
        error: 'El cliente no tiene fcm_token guardado'
      });
    }

    await enviarPushToken(
      cliente.fcm_token,
      'Prueba de InariGo',
      'Tus notificaciones ya están conectadas correctamente.',
      {
        tipo: 'prueba',
        cliente_id: cliente.id
      }
    );

    res.json({
      ok: true,
      mensaje: 'Notificacion enviada'
    });
  } catch (err) {
    console.error('Error prueba notificación:', err);

    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;