const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'inarivet_secret_2026';

// ── Middleware ───────────────────────────────────────────
function verificarToken(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token requerido'
    });
  }

  try {
    req.cliente = jwt.verify(
      auth.split(' ')[1],
      SECRET
    );

    next();
  } catch (e) {
    res.status(401).json({
      error: 'Token inválido'
    });
  }
}

// GET /api/perfiles — todos los perfiles del cliente
router.get('/', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, tipo, nombre, datos, creado_en
       FROM perfiles_usuario
       WHERE cliente_id = ?
       ORDER BY tipo, creado_en DESC`,
      [req.cliente.id]
    );

    // Parsear JSON de datos
    const result = rows.map(r => ({
      ...r,
      datos:
        typeof r.datos === 'string'
          ? JSON.parse(r.datos)
          : r.datos
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// GET /api/perfiles/:tipo — perfiles filtrados por tipo
router.get('/:tipo', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, tipo, nombre, datos, creado_en
       FROM perfiles_usuario
       WHERE cliente_id = ?
         AND tipo = ?
       ORDER BY creado_en DESC`,
      [
        req.cliente.id,
        req.params.tipo
      ]
    );

    const result = rows.map(r => ({
      ...r,
      datos:
        typeof r.datos === 'string'
          ? JSON.parse(r.datos)
          : r.datos
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// POST /api/perfiles — crear perfil
// Body: { tipo, nombre, datos }
router.post('/', verificarToken, async (req, res) => {
  const { tipo, nombre, datos } = req.body;

  if (!tipo || !nombre || !datos) {
    return res.status(400).json({
      error: 'tipo, nombre y datos son requeridos'
    });
  }

  const tiposValidos = [
    'veterinaria',
    'barberia',
    'clinica',
    'belleza'
  ];

  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({
      error: 'Tipo inválido'
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO perfiles_usuario
       (cliente_id, tipo, nombre, datos)
       VALUES (?, ?, ?, ?)`,
      [
        req.cliente.id,
        tipo,
        nombre,
        JSON.stringify(datos)
      ]
    );

    res.status(201).json({
      id: result.insertId,
      tipo,
      nombre,
      datos,
      mensaje: 'Perfil guardado'
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// PUT /api/perfiles/:id — actualizar perfil
router.put('/:id', verificarToken, async (req, res) => {
  const { nombre, datos } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE perfiles_usuario
       SET nombre = ?,
           datos = ?
       WHERE id = ?
         AND cliente_id = ?`,
      [
        nombre,
        JSON.stringify(datos),
        req.params.id,
        req.cliente.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Perfil no encontrado'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Perfil actualizado'
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// DELETE /api/perfiles/:id — eliminar perfil
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM perfiles_usuario
       WHERE id = ?
         AND cliente_id = ?`,
      [
        req.params.id,
        req.cliente.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Perfil no encontrado'
      });
    }

    res.json({
      ok: true
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;