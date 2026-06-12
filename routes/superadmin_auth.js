const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'inarivet_secret_2026';

function generarTokenSuperadmin(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: 'superadmin'
    },
    SECRET,
    {
      expiresIn: '7d'
    }
  );
}

// POST /api/superadmin-auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'email y password son requeridos'
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT
          id,
          nombre,
          email,
          password_hash,
          activo
       FROM superadmins
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    const usuario = rows[0];

    if (!usuario.activo) {
      return res.status(403).json({
        error: 'Tu usuario superadmin está desactivado'
      });
    }

    const ok = await bcrypt.compare(
      password,
      usuario.password_hash
    );

    if (!ok) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    const token = generarTokenSuperadmin(usuario);

    res.json({
      token,
      superadmin: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: 'superadmin'
      }
    });
  } catch (err) {
    console.error('Error login superadmin:', err);

    res.status(500).json({
      error: 'No se pudo iniciar sesión'
    });
  }
});

module.exports = router;