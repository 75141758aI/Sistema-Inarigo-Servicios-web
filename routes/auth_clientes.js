const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const SECRET = process.env.JWT_SECRET || 'inarivet_secret_2026';
const EXPIRES = process.env.JWT_EXPIRES || '30d';

// ── Helper: generar token ────────────────────────────────
function generarToken(cliente) {
  return jwt.sign(
    {
      id: cliente.id,
      email: cliente.email,
      tipo: 'cliente'
    },
    SECRET,
    {
      expiresIn: EXPIRES
    }
  );
}

// ─────────────────────────────────────────────────────────
// POST /api/auth/cliente/registro
// Body: { nombre, email, password, telefono, dni? }
// ─────────────────────────────────────────────────────────
router.post('/registro', async (req, res) => {
  const { nombre, email, password, telefono, dni } = req.body;

  if (!nombre || !email || !password || !telefono) {
    return res.status(400).json({
      error: 'nombre, email, password y telefono son requeridos'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  try {
    // Verificar si el email ya existe
    const [existe] = await pool.query(
      'SELECT id FROM clientes WHERE email = ?',
      [email]
    );

    if (existe.length) {
      return res.status(409).json({
        error: 'El email ya está registrado'
      });
    }

    // Verificar si el teléfono ya existe
    const [existeTel] = await pool.query(
      'SELECT id FROM clientes WHERE telefono = ?',
      [telefono]
    );

    if (existeTel.length) {
      return res.status(409).json({
        error: 'El teléfono ya está registrado'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO clientes
       (nombre, email, password_hash, telefono, dni)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, email, hash, telefono, dni || null]
    );

    const cliente = {
      id: result.insertId,
      nombre,
      email,
      telefono
    };

    res.status(201).json({
      token: generarToken(cliente),
      cliente: {
        id: cliente.id,
        nombre,
        email,
        telefono,
        dni: dni || null
      }
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/cliente/login
// Body: { email, password }
// ─────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, telefono, usuario, password } = req.body;
  const identificador = email || telefono || usuario;

  if (!identificador || !password) {
    return res.status(400).json({
      error: 'email o telefono, y password son requeridos'
    });
  }

  try {
    const [rows] = await pool.query(
      'SELECT * FROM clientes WHERE email = ? OR telefono = ?',
      [identificador, identificador]
    );

    if (!rows.length) {
      return res.status(401).json({
        error: 'Cuenta no registrada'
      });
    }

    const cliente = rows[0];

    if (!cliente.password_hash) {
      return res.status(403).json({
        error:
          'Esta cuenta aún no tiene contraseña. Crea una contraseña para continuar.',
        requiere_crear_password: true,
        cliente_id: cliente.id
      });
    }

    const valido = await bcrypt.compare(
      password,
      cliente.password_hash
    );

    if (!valido) {
      return res.status(401).json({
        error: 'Contraseña incorrecta'
      });
    }

    res.json({
      token: generarToken(cliente),
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        telefono: cliente.telefono,
        dni: cliente.dni,
        foto_url: cliente.foto_url
      }
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/cliente/google
// Body: { google_id, email, nombre, foto_url }
// (el token de Google se verifica en el cliente con Firebase)
// ─────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  const { google_id, email, nombre, foto_url } = req.body;

  if (!google_id || !email) {
    return res.status(400).json({
      error: 'google_id y email son requeridos'
    });
  }

  try {
    // Buscar si ya existe por google_id o email
    let [rows] = await pool.query(
      'SELECT * FROM clientes WHERE google_id = ? OR email = ?',
      [google_id, email]
    );

    let cliente;

    if (rows.length) {
      // Actualizar google_id y foto si no los tenía
      cliente = rows[0];

      await pool.query(
        'UPDATE clientes SET google_id = ?, foto_url = ? WHERE id = ?',
        [
          google_id,
          foto_url || cliente.foto_url,
          cliente.id
        ]
      );
    } else {
      // Crear cliente nuevo con Google
      const [result] = await pool.query(
        `INSERT INTO clientes
         (nombre, email, google_id, foto_url)
         VALUES (?, ?, ?, ?)`,
        [nombre, email, google_id, foto_url || null]
      );

      cliente = {
        id: result.insertId,
        nombre,
        email,
        google_id
      };
    }

    res.json({
      token: generarToken(cliente),
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        telefono: cliente.telefono || null,
        foto_url: foto_url || cliente.foto_url
      }
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/auth/cliente/perfil
// Header: Authorization: Bearer <token>
// ─────────────────────────────────────────────────────────
router.get('/perfil', async (req, res) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token requerido'
    });
  }

  try {
    const payload = jwt.verify(
      auth.split(' ')[1],
      SECRET
    );

    const [rows] = await pool.query(
      `SELECT id, nombre, email, telefono, dni, foto_url
       FROM clientes
       WHERE id = ?`,
      [payload.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Cliente no encontrado'
      });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(401).json({
      error: 'Token inválido'
    });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/cliente/crear-password
// Body: { email, telefono, password }
// Sirve para clientes creados desde admin sin contraseña
// ─────────────────────────────────────────────────────────
router.post('/crear-password', async (req, res) => {
  const { email, telefono, password } = req.body;

  if ((!email && !telefono) || !password) {
    return res.status(400).json({
      error: 'email o telefono, y password son requeridos'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  try {
    let rows;

    if (email) {
      [rows] = await pool.query(
        'SELECT * FROM clientes WHERE email = ?',
        [email]
      );
    } else {
      [rows] = await pool.query(
        'SELECT * FROM clientes WHERE telefono = ?',
        [telefono]
      );
    }

    if (!rows.length) {
      return res.status(404).json({
        error: 'Cliente no encontrado'
      });
    }

    const cliente = rows[0];

    if (cliente.password_hash) {
      return res.status(409).json({
        error: 'Esta cuenta ya tiene contraseña. Inicia sesión.'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      'UPDATE clientes SET password_hash = ? WHERE id = ?',
      [hash, cliente.id]
    );

    res.json({
      token: generarToken(cliente),
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        telefono: cliente.telefono,
        dni: cliente.dni,
        foto_url: cliente.foto_url
      }
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;