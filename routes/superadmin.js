const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const {
  verificarSuperadmin
} = require('../middleware/verificarSuperadmin');

router.use(verificarSuperadmin);

// GET /api/superadmin/overview
router.get('/overview', async (req, res) => {
  try {
    const [[negociosActivos]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM negocios
       WHERE activo = 1`
    );

    const [[negociosInactivos]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM negocios
       WHERE activo = 0`
    );

    const [[usuariosAdmin]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM usuarios
       WHERE rol = 'admin'`
    );

    const [[reservasTotales]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM turnos`
    );

    res.json({
      negocios_activos: negociosActivos.total,
      negocios_inactivos: negociosInactivos.total,
      usuarios_admin: usuariosAdmin.total,
      reservas_totales: reservasTotales.total
    });
  } catch (err) {
    console.error('Error overview superadmin:', err);

    res.status(500).json({
      error: 'No se pudo cargar el resumen'
    });
  }
});

// GET /api/superadmin/negocios
router.get('/negocios', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          n.id,
          n.nombre,
          n.tipo_negocio,
          n.descripcion,
          n.direccion,
          n.ciudad,
          n.telefono,
          n.logo_url,
          n.color_primario,
          n.activo,
          n.creado_en,
          COUNT(DISTINCT u.id) AS usuarios,
          COUNT(DISTINCT t.id) AS reservas
       FROM negocios n
       LEFT JOIN usuarios u ON u.negocio_id = n.id
       LEFT JOIN turnos t ON t.negocio_id = n.id
       GROUP BY
          n.id,
          n.nombre,
          n.tipo_negocio,
          n.descripcion,
          n.direccion,
          n.ciudad,
          n.telefono,
          n.logo_url,
          n.color_primario,
          n.activo,
          n.creado_en
       ORDER BY n.creado_en DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error('Error listando negocios superadmin:', err);

    res.status(500).json({
      error: 'No se pudieron cargar los negocios'
    });
  }
});

// PATCH /api/superadmin/negocios/:id/estado
router.patch('/negocios/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  if (typeof activo !== 'boolean') {
    return res.status(400).json({
      error: 'activo debe ser true o false'
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE negocios
       SET activo = ?
       WHERE id = ?`,
      [
        activo ? 1 : 0,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Negocio no encontrado'
      });
    }

    res.json({
      ok: true,
      mensaje:
        activo
          ? 'Negocio activado'
          : 'Negocio suspendido'
    });
  } catch (err) {
    console.error('Error cambiando estado negocio:', err);

    res.status(500).json({
      error: 'No se pudo cambiar el estado del negocio'
    });
  }
});

// GET /api/superadmin/negocios/:id
router.get('/negocios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [negocios] = await pool.query(
      `SELECT
          id,
          nombre,
          tipo_negocio,
          descripcion,
          direccion,
          ciudad,
          latitud,
          longitud,
          telefono,
          logo_url,
          color_primario,
          activo,
          creado_en
       FROM negocios
       WHERE id = ?`,
      [id]
    );

    if (!negocios.length) {
      return res.status(404).json({
        error: 'Negocio no encontrado'
      });
    }

    const [usuarios] = await pool.query(
      `SELECT
          id,
          nombre,
          email,
          rol,
          activo,
          creado_en
       FROM usuarios
       WHERE negocio_id = ?
       ORDER BY rol ASC, nombre ASC`,
      [id]
    );

    const [[reservas]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM turnos
       WHERE negocio_id = ?`,
      [id]
    );

    const [[pendientes]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM turnos
       WHERE negocio_id = ?
         AND estado = 'pendiente'`,
      [id]
    );

    const [[clientes]] = await pool.query(
      `SELECT COUNT(DISTINCT cliente_id) AS total
       FROM turnos
       WHERE negocio_id = ?`,
      [id]
    );

    res.json({
      negocio: negocios[0],
      usuarios,
      resumen: {
        reservas: reservas.total,
        pendientes: pendientes.total,
        clientes: clientes.total
      }
    });
  } catch (err) {
    console.error('Error detalle negocio superadmin:', err);

    res.status(500).json({
      error: 'No se pudo cargar el negocio'
    });
  }
});

// POST /api/superadmin/negocios
// Crea un negocio y su usuario admin principal
router.post('/negocios', async (req, res) => {
  const {
    nombre,
    tipo_negocio,
    descripcion,
    direccion,
    ciudad,
    telefono,
    latitud,
    longitud,
    color_primario,
    admin_nombre,
    admin_email,
    admin_password
  } = req.body;

  if (
    !nombre ||
    !tipo_negocio ||
    !direccion ||
    !telefono ||
    !latitud ||
    !longitud
  ) {
    return res.status(400).json({
      error:
        'nombre, tipo_negocio, direccion, telefono, latitud y longitud son requeridos'
    });
  }

  if (!admin_nombre || !admin_email || !admin_password) {
    return res.status(400).json({
      error:
        'admin_nombre, admin_email y admin_password son requeridos'
    });
  }

  const emailLimpio = String(admin_email)
    .trim()
    .toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(emailLimpio)) {
    return res.status(400).json({
      error: 'El correo del admin no tiene un formato válido'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existeAdmin] = await connection.query(
      `SELECT id
       FROM usuarios
       WHERE email = ?
       LIMIT 1`,
      [emailLimpio]
    );

    if (existeAdmin.length) {
      await connection.rollback();

      return res.status(400).json({
        error: 'Ya existe un usuario con ese correo'
      });
    }

    const [resultNegocio] = await connection.query(
      `INSERT INTO negocios
       (
         nombre,
         tipo_negocio,
         descripcion,
         direccion,
         ciudad,
         latitud,
         longitud,
         telefono,
         logo_url,
         color_primario,
         activo
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 1)`,
      [
        nombre,
        tipo_negocio,
        descripcion || null,
        direccion,
        ciudad || null,
        latitud,
        longitud,
        telefono,
        color_primario || '#6d3df4'
      ]
    );

    const negocioId = resultNegocio.insertId;
    const passwordHash = await bcrypt.hash(
      admin_password,
      10
    );

    const [resultUsuario] = await connection.query(
      `INSERT INTO usuarios
       (
         negocio_id,
         nombre,
         email,
         password_hash,
         rol,
         activo
       )
       VALUES (?, ?, ?, ?, 'admin', 1)`,
      [
        negocioId,
        admin_nombre,
        emailLimpio,
        passwordHash
      ]
    );

    await connection.commit();

    res.status(201).json({
      ok: true,
      mensaje: 'Negocio y admin creados correctamente',
      negocio: {
        id: negocioId,
        nombre,
        tipo_negocio,
        ciudad,
        activo: 1
      },
      admin: {
        id: resultUsuario.insertId,
        nombre: admin_nombre,
        email: emailLimpio,
        rol: 'admin'
      }
    });
  } catch (err) {
    await connection.rollback();

    console.error('Error creando negocio superadmin:', err);

    res.status(500).json({
      error: 'No se pudo crear el negocio'
    });
  } finally {
    connection.release();
  }
});

// GET /api/superadmin/usuarios
router.get('/usuarios', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          u.id,
          u.negocio_id,
          u.nombre,
          u.email,
          u.rol,
          u.activo,
          u.creado_en,
          n.nombre AS negocio,
          n.logo_url,
          n.activo AS negocio_activo
       FROM usuarios u
       INNER JOIN negocios n ON n.id = u.negocio_id
       ORDER BY u.creado_en DESC`
    );

    res.json(rows);
  } catch (err) {
    console.error('Error listando usuarios superadmin:', err);

    res.status(500).json({
      error: 'No se pudieron cargar los usuarios'
    });
  }
});

// PATCH /api/superadmin/usuarios/:id/estado
router.patch('/usuarios/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  if (typeof activo !== 'boolean') {
    return res.status(400).json({
      error: 'activo debe ser true o false'
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE usuarios
       SET activo = ?
       WHERE id = ?`,
      [
        activo ? 1 : 0,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      ok: true,
      mensaje:
        activo
          ? 'Usuario activado'
          : 'Usuario desactivado'
    });
  } catch (err) {
    console.error('Error cambiando estado usuario:', err);

    res.status(500).json({
      error: 'No se pudo cambiar el estado del usuario'
    });
  }
});

// POST /api/superadmin/negocios/:negocio_id/usuarios
router.post(
  '/negocios/:negocio_id/usuarios',
  async (req, res) => {
    const { negocio_id } = req.params;

    const {
      nombre,
      email,
      password,
      rol
    } = req.body;

    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({
        error: 'nombre, email, password y rol son requeridos'
      });
    }

    if (!['admin', 'colaborador'].includes(rol)) {
      return res.status(400).json({
        error: 'Rol no válido'
      });
    }

    const emailLimpio = String(email)
      .trim()
      .toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailLimpio)) {
      return res.status(400).json({
        error: 'El correo no tiene un formato válido'
      });
    }

    try {
      const [negocios] = await pool.query(
        `SELECT id
         FROM negocios
         WHERE id = ?
         LIMIT 1`,
        [negocio_id]
      );

      if (!negocios.length) {
        return res.status(404).json({
          error: 'Negocio no encontrado'
        });
      }

      const [existeUsuario] = await pool.query(
        `SELECT id
         FROM usuarios
         WHERE email = ?
         LIMIT 1`,
        [emailLimpio]
      );

      if (existeUsuario.length) {
        return res.status(400).json({
          error: 'Ya existe un usuario con ese correo'
        });
      }

      const passwordHash = await bcrypt.hash(
        password,
        10
      );

      const [result] = await pool.query(
        `INSERT INTO usuarios
         (
           negocio_id,
           nombre,
           email,
           password_hash,
           rol,
           activo
         )
         VALUES (?, ?, ?, ?, ?, 1)`,
        [
          negocio_id,
          nombre,
          emailLimpio,
          passwordHash,
          rol
        ]
      );

      res.status(201).json({
        ok: true,
        mensaje: 'Usuario creado correctamente',
        usuario: {
          id: result.insertId,
          negocio_id,
          nombre,
          email: emailLimpio,
          rol,
          activo: 1
        }
      });
    } catch (err) {
      console.error('Error creando usuario superadmin:', err);

      res.status(500).json({
        error: 'No se pudo crear el usuario'
      });
    }
  }
);

// PATCH /api/superadmin/usuarios/:id/password
router.patch('/usuarios/:id/password', async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || String(password).length < 6) {
    return res.status(400).json({
      error: 'La contraseña debe tener al menos 6 caracteres'
    });
  }

  try {
    const passwordHash = await bcrypt.hash(
      password,
      10
    );

    const [result] = await pool.query(
      `UPDATE usuarios
       SET password_hash = ?
       WHERE id = ?`,
      [
        passwordHash,
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Contraseña actualizada correctamente'
    });
  } catch (err) {
    console.error(
      'Error reseteando contraseña usuario:',
      err
    );

    res.status(500).json({
      error: 'No se pudo actualizar la contraseña'
    });
  }
});

// PUT /api/superadmin/negocios/:id
router.put('/negocios/:id', async (req, res) => {
  const { id } = req.params;

  const {
    nombre,
    tipo_negocio,
    descripcion,
    direccion,
    ciudad,
    telefono,
    latitud,
    longitud,
    color_primario
  } = req.body;

  if (
    !nombre ||
    !tipo_negocio ||
    !direccion ||
    !telefono ||
    !latitud ||
    !longitud
  ) {
    return res.status(400).json({
      error:
        'nombre, tipo_negocio, direccion, telefono, latitud y longitud son requeridos'
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE negocios
       SET nombre = ?,
           tipo_negocio = ?,
           descripcion = ?,
           direccion = ?,
           ciudad = ?,
           telefono = ?,
           latitud = ?,
           longitud = ?,
           color_primario = ?
       WHERE id = ?`,
      [
        nombre,
        tipo_negocio,
        descripcion || null,
        direccion,
        ciudad || null,
        telefono,
        latitud,
        longitud,
        color_primario || '#6d3df4',
        id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Negocio no encontrado'
      });
    }

    res.json({
      ok: true,
      mensaje: 'Negocio actualizado correctamente'
    });
  } catch (err) {
    console.error('Error editando negocio superadmin:', err);

    res.status(500).json({
      error: 'No se pudo actualizar el negocio'
    });
  }
});

// GET /api/superadmin/ajustes
router.get('/ajustes', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT clave, valor
       FROM configuracion_sistema`
    );

    const ajustes = {};

    rows.forEach(row => {
      ajustes[row.clave] = row.valor;
    });

    res.json({
      nombre_plataforma:
        ajustes.nombre_plataforma || 'InariGo',
      whatsapp_soporte:
        ajustes.whatsapp_soporte || '',
      correo_soporte:
        ajustes.correo_soporte || '',
      estado_sistema:
        ajustes.estado_sistema || 'activo',
      mensaje_mantenimiento:
        ajustes.mensaje_mantenimiento || ''
    });
  } catch (err) {
    console.error('Error cargando ajustes:', err);

    res.status(500).json({
      error: 'No se pudieron cargar los ajustes'
    });
  }
});

// PUT /api/superadmin/ajustes
router.put('/ajustes', async (req, res) => {
  const {
    nombre_plataforma,
    whatsapp_soporte,
    correo_soporte,
    estado_sistema,
    mensaje_mantenimiento
  } = req.body;

  if (
    !nombre_plataforma ||
    !whatsapp_soporte ||
    !correo_soporte ||
    !estado_sistema
  ) {
    return res.status(400).json({
      error: 'Todos los campos son requeridos'
    });
  }

  if (
    !['activo', 'mantenimiento'].includes(
      estado_sistema
    )
  ) {
    return res.status(400).json({
      error: 'Estado del sistema no válido'
    });
  }

  try {
    const ajustes = {
      nombre_plataforma,
      whatsapp_soporte,
      correo_soporte,
      estado_sistema,
      mensaje_mantenimiento:
        mensaje_mantenimiento || ''
    };

    for (
      const [clave, valor]
      of Object.entries(ajustes)
    ) {
      await pool.query(
        `INSERT INTO configuracion_sistema
         (clave, valor)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE
           valor = VALUES(valor)`,
        [
          clave,
          valor
        ]
      );
    }

    res.json({
      ok: true,
      mensaje: 'Ajustes guardados correctamente'
    });
  } catch (err) {
    console.error('Error guardando ajustes:', err);

    res.status(500).json({
      error: 'No se pudieron guardar los ajustes'
    });
  }
});

module.exports = router;