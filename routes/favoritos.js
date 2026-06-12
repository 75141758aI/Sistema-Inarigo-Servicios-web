const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'inarivet_secret_2026';

// ── Middleware: verificar token del cliente ──────────────
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

// GET /api/favoritos — listar favoritos del cliente
router.get('/', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT n.*
       FROM favoritos f
       JOIN negocios n ON n.id = f.negocio_id
       WHERE f.cliente_id = ?
       ORDER BY f.creado_en DESC`,
      [req.cliente.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// POST /api/favoritos/:negocioId — agregar favorito
router.post('/:negocioId', verificarToken, async (req, res) => {
  try {
    await pool.query(
      `INSERT IGNORE INTO favoritos
       (cliente_id, negocio_id)
       VALUES (?, ?)`,
      [
        req.cliente.id,
        req.params.negocioId
      ]
    );

    res.json({
      ok: true
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// DELETE /api/favoritos/:negocioId — quitar favorito
router.delete('/:negocioId', verificarToken, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM favoritos
       WHERE cliente_id = ?
         AND negocio_id = ?`,
      [
        req.cliente.id,
        req.params.negocioId
      ]
    );

    res.json({
      ok: true
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// GET /api/favoritos/check/:negocioId — verificar si es favorito
router.get('/check/:negocioId', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id
       FROM favoritos
       WHERE cliente_id = ?
         AND negocio_id = ?`,
      [
        req.cliente.id,
        req.params.negocioId
      ]
    );

    res.json({
      esFavorito: rows.length > 0
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;