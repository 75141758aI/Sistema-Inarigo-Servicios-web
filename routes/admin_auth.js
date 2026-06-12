const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'inarivet_secret_2026';

function generarTokenAdmin(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      negocio_id: usuario.negocio_id
    },
    SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/admin-auth/login
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
          u.id,
          u.negocio_id,
          u.nombre,
          u.email,
          u.password_hash,
          u.rol,
          u.activo,
          n.nombre AS negocio,
          n.tipo_negocio,
          n.logo_url,
          n.color_primario,
          n.activo AS negocio_activo
       FROM usuarios u
       INNER JOIN negocios n ON n.id = u.negocio_id
       WHERE u.email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    const usuario = rows[0];

    if (!["admin", "colaborador"].includes(usuario.rol)) {
      return res.status(403).json({
        error: "No tienes acceso al panel"
      });
    }

    if (!usuario.activo) {
      return res.status(403).json({
        error: 'Tu usuario está desactivado'
      });
    }

    if (!usuario.negocio_activo) {
      return res.status(403).json({
        error: 'Este negocio está desactivado'
      });
    }

    const passwordOk = await bcrypt.compare(
      password,
      usuario.password_hash
    );

    if (!passwordOk) {
      return res.status(401).json({
        error: 'Credenciales incorrectas'
      });
    }

    if (usuario.rol === "colaborador") {
      const [permisos] = await pool.query(
        `SELECT permiso, permitido
         FROM permisos_usuario
         WHERE usuario_id = ?`,
        [usuario.id]
      );

      const tieneAccesoPanel = permisos.some(
        p =>
          Number(p.permitido) === 1 &&
          [
            "ver_dashboard",
            "ver_reservas",
            "crear_reservas",
            "aprobar_reservas",
            "rechazar_reservas",
            "escanear_qr",
            "finalizar_atencion",
            "ver_clientes"
          ].includes(p.permiso)
      );

      if (!tieneAccesoPanel) {
        return res.status(403).json({
          error: "No tienes permisos activos para ingresar al panel"
        });
      }
    }

    const token = generarTokenAdmin(usuario);

    let permisosUsuario = [];

    if (usuario.rol === "colaborador") {
      const [rowsPermisos] = await pool.query(
        `SELECT permiso, permitido
         FROM permisos_usuario
         WHERE usuario_id = ?`,
        [usuario.id]
      );

      permisosUsuario = rowsPermisos.map(p => ({
        permiso: p.permiso,
        permitido: Number(p.permitido) === 1
      }));
    }

    res.json({
      token,
      admin: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        negocio_id: usuario.negocio_id,
        negocio: usuario.negocio,
        tipo_negocio: usuario.tipo_negocio,
        logo_url: usuario.logo_url,
        color_primario: usuario.color_primario,
        permisos: permisosUsuario
      }
    });
  } catch (err) {
    console.error('Error login admin:', err);

    res.status(500).json({
      error: 'No se pudo iniciar sesión'
    });
  }
});

module.exports = router;