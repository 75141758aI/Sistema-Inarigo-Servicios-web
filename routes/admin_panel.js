const express = require('express');
const router = express.Router();
const {
  verificarAdmin,
  verificarNegocioAdmin
} = require('../middleware/verificarAdmin');
const pool = require('../db');
const bcrypt = require('bcryptjs');

async function finalizarTurnosVencidos(negocio_id) {
  await pool.query(
    `UPDATE turnos t
     JOIN servicios s ON s.id = t.servicio_id
     SET t.estado = 'completado'
     WHERE t.negocio_id = ?
       AND t.estado = 'presente'
       AND DATE_ADD(t.fecha_hora, INTERVAL s.duracion_min MINUTE) <= NOW()`,
    [negocio_id]
  );
}

router.use(verificarAdmin);

async function tienePermisoUsuario(usuarioId, permiso) {
  const [rows] = await pool.query(
    `SELECT permitido
     FROM permisos_usuario
     WHERE usuario_id = ?
       AND permiso = ?
     LIMIT 1`,
    [usuarioId, permiso]
  );

  return rows.length > 0 && Number(rows[0].permitido) === 1;
}

function requierePermiso(permiso) {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({
          error: 'Sesión no válida'
        });
      }

      if (req.admin.rol === 'admin') {
        return next();
      }

      if (req.admin.rol !== 'colaborador') {
        return res.status(403).json({
          error: 'No tienes acceso al panel'
        });
      }

      const permitido = await tienePermisoUsuario(req.admin.id, permiso);

      if (!permitido) {
        return res.status(403).json({
          error: 'No tienes permiso para esta sección'
        });
      }

      next();
    } catch (error) {
      console.error('Error validando permiso:', error);

      res.status(500).json({
        error: 'No se pudo validar el permiso'
      });
    }
  };
}

function soloAdmin(req, res, next) {
  if (req.admin?.rol !== 'admin') {
    return res.status(403).json({
      error: 'Solo el administrador puede realizar esta acción'
    });
  }

  next();
}

// Dashboard básico por negocio
router.get(
  '/negocios/:negocio_id/dashboard',
  verificarNegocioAdmin,
  requierePermiso('ver_dashboard'),
  async (req, res) => {
    const { negocio_id } = req.params;

    try {
      await finalizarTurnosVencidos(negocio_id);

      const [[reservasHoy]] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM turnos
         WHERE negocio_id = ?
           AND DATE(fecha_hora) = CURDATE()`,
        [negocio_id]
      );

      const [[pendientes]] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM turnos
         WHERE negocio_id = ?
           AND estado = 'pendiente'`,
        [negocio_id]
      );

      const [[clientes]] = await pool.query(
        `SELECT COUNT(DISTINCT cliente_id) AS total
         FROM turnos
         WHERE negocio_id = ?`,
        [negocio_id]
      );

      const [[checkinsHoy]] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM checkins ch
         INNER JOIN turnos t ON t.id = ch.turno_id
         WHERE t.negocio_id = ?
           AND DATE(ch.checkin_en) = CURDATE()`,
        [negocio_id]
      );

      res.json({
        reservas_hoy: reservasHoy.total,
        pendientes: pendientes.total,
        clientes: clientes.total,
        checkins_hoy: checkinsHoy.total
      });
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// Reservas de un negocio
router.get(
  '/negocios/:negocio_id/reservas',
  verificarNegocioAdmin,
  requierePermiso('ver_reservas'),
  async (req, res) => {
    const { negocio_id } = req.params;
    const { estado } = req.query;

    try {
      await finalizarTurnosVencidos(negocio_id);

      let sql = `
        SELECT
          t.id,
          t.fecha_hora,
          t.estado,
          t.qr_token,
          t.notas,
          t.mascota_nombre,
          t.mascota_especie,
          t.metodo_pago,
          t.estado_pago,
          t.acepta_condiciones_pago,
          c.nombre AS cliente,
          c.telefono AS telefono_cliente,
          s.nombre AS servicio,
          s.duracion_min,
          s.precio,
          u.nombre AS colaborador
        FROM turnos t
        JOIN clientes c ON c.id = t.cliente_id
        JOIN servicios s ON s.id = t.servicio_id
        LEFT JOIN usuarios u ON u.id = t.colaborador_id
        WHERE t.negocio_id = ?
      `;

      const params = [negocio_id];

      if (estado) {
        sql += ` AND t.estado = ?`;
        params.push(estado);
      }

      sql += ` ORDER BY t.fecha_hora DESC LIMIT 50`;

      const [rows] = await pool.query(sql, params);

      res.json(rows);
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// Servicios de un negocio
router.get(
  '/negocios/:negocio_id/servicios',
  verificarNegocioAdmin,
  async (req, res) => {
    const { negocio_id } = req.params;

    try {
      const [rows] = await pool.query(
        `SELECT id, nombre, descripcion, duracion_min, precio, activo
         FROM servicios
         WHERE negocio_id = ?
         ORDER BY activo DESC, nombre ASC`,
        [negocio_id]
      );

      res.json(rows);
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// Crear servicio
router.post(
  '/negocios/:negocio_id/servicios',
  verificarNegocioAdmin,
  soloAdmin,
  async (req, res) => {
    const { negocio_id } = req.params;
    const { nombre, descripcion, duracion_min, precio } = req.body;

    if (!nombre) {
      return res.status(400).json({
        error: 'El nombre del servicio es requerido'
      });
    }

    try {
      const [result] = await pool.query(
        `INSERT INTO servicios
         (negocio_id, nombre, descripcion, duracion_min, precio, activo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [
          negocio_id,
          nombre,
          descripcion || null,
          duracion_min || 30,
          precio || null
        ]
      );

      res.status(201).json({
        id: result.insertId,
        negocio_id,
        nombre,
        descripcion,
        duracion_min,
        precio,
        activo: 1
      });
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// Actualizar servicio
router.put('/servicios/:id', soloAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, duracion_min, precio, activo } = req.body;

  try {
    const [servicios] = await pool.query(
      `SELECT id
       FROM servicios
       WHERE id = ?
         AND negocio_id = ?`,
      [id, req.admin.negocio_id]
    );

    if (!servicios.length) {
      return res.status(404).json({
        error: 'Servicio no encontrado o no pertenece a tu negocio'
      });
    }

    await pool.query(
      `UPDATE servicios
       SET nombre = ?,
           descripcion = ?,
           duracion_min = ?,
           precio = ?,
           activo = ?
       WHERE id = ?
         AND negocio_id = ?`,
      [
        nombre,
        descripcion || null,
        duracion_min || 30,
        precio || null,
        activo ? 1 : 0,
        id,
        req.admin.negocio_id
      ]
    );

    res.json({
      ok: true,
      mensaje: 'Servicio actualizado'
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Datos de negocio
router.get(
  '/negocios/:negocio_id',
  verificarNegocioAdmin,
  async (req, res) => {
    const { negocio_id } = req.params;

    try {
      const [rows] = await pool.query(
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
           permite_pago_local,
           permite_pago_adelantado,
           metodo_pago_adelantado,
           numero_pago_adelantado,
           qr_pago_url,
           instrucciones_pago,
           acepta_responsabilidad_pagos
         FROM negocios
         WHERE id = ?`,
        [negocio_id]
      );

      if (!rows.length) {
        return res.status(404).json({
          error: 'Negocio no encontrado'
        });
      }

      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// Actualizar negocio
router.put(
  '/negocios/:negocio_id',
  verificarNegocioAdmin,
  soloAdmin,
  async (req, res) => {
    const { negocio_id } = req.params;

    const {
      nombre,
      tipo_negocio,
      descripcion,
      direccion,
      ciudad,
      telefono,
      logo_url,
      color_primario,
      latitud,
      longitud,
      permite_pago_local,
      permite_pago_adelantado,
      metodo_pago_adelantado,
      numero_pago_adelantado,
      qr_pago_url,
      instrucciones_pago,
      acepta_responsabilidad_pagos
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

    const pagoLocal = permite_pago_local ? 1 : 0;
    const pagoAdelantado = permite_pago_adelantado ? 1 : 0;

    if (!pagoLocal && !pagoAdelantado) {
      return res.status(400).json({
        error: 'Debes permitir al menos una forma de pago'
      });
    }

    if (pagoAdelantado) {
      if (!metodo_pago_adelantado || !numero_pago_adelantado) {
        return res.status(400).json({
          error:
            'Para pago adelantado debes indicar método y número de pago'
        });
      }

      if (!acepta_responsabilidad_pagos) {
        return res.status(400).json({
          error:
            'Debes aceptar la responsabilidad sobre los pagos directos'
        });
      }
    }

    try {
      await pool.query(
        `UPDATE negocios
         SET nombre = ?,
             tipo_negocio = ?,
             descripcion = ?,
             direccion = ?,
             ciudad = ?,
             telefono = ?,
             logo_url = ?,
             color_primario = ?,
             latitud = ?,
             longitud = ?,
             permite_pago_local = ?,
             permite_pago_adelantado = ?,
             metodo_pago_adelantado = ?,
             numero_pago_adelantado = ?,
             qr_pago_url = ?,
             instrucciones_pago = ?,
             acepta_responsabilidad_pagos = ?
         WHERE id = ?`,
        [
          nombre,
          tipo_negocio,
          descripcion || null,
          direccion,
          ciudad || null,
          telefono,
          logo_url || null,
          color_primario || '#6d3df4',
          latitud,
          longitud,
          pagoLocal,
          pagoAdelantado,
          pagoAdelantado ? metodo_pago_adelantado : null,
          pagoAdelantado ? numero_pago_adelantado : null,
          pagoAdelantado ? qr_pago_url || null : null,
          pagoAdelantado ? instrucciones_pago || null : null,
          pagoAdelantado ? 1 : 0,
          negocio_id
        ]
      );

      res.json({
        ok: true,
        mensaje: 'Negocio actualizado correctamente'
      });
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// Obtener servicio por ID
router.get('/servicios/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT
         id,
         negocio_id,
         nombre,
         descripcion,
         duracion_min,
         precio,
         activo
       FROM servicios
       WHERE id = ?
         AND negocio_id = ?`,
      [id, req.admin.negocio_id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Servicio no encontrado'
      });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Clientes de un negocio
router.get(
  '/negocios/:negocio_id/clientes',
  verificarNegocioAdmin,
  requierePermiso('ver_clientes'),
  async (req, res) => {
    const { negocio_id } = req.params;

    try {
      const [rows] = await pool.query(
        `SELECT
           c.id,
           c.nombre,
           c.telefono,
           c.email,
           COUNT(t.id) AS total_reservas,
           MAX(t.fecha_hora) AS ultima_fecha,
           (
             SELECT s2.nombre
             FROM turnos t2
             JOIN servicios s2 ON s2.id = t2.servicio_id
             WHERE t2.cliente_id = c.id
               AND t2.negocio_id = ?
             ORDER BY t2.fecha_hora DESC
             LIMIT 1
           ) AS ultima_reserva
         FROM clientes c
         INNER JOIN turnos t ON t.cliente_id = c.id
         WHERE t.negocio_id = ?
         GROUP BY c.id, c.nombre, c.telefono, c.email
         ORDER BY ultima_fecha DESC
         LIMIT 100`,
        [negocio_id, negocio_id]
      );

      res.json(rows);
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// Detalle de cliente dentro de un negocio
router.get(
  '/negocios/:negocio_id/clientes/:cliente_id',
  verificarNegocioAdmin,
  requierePermiso('ver_clientes'),
  async (req, res) => {
    const { negocio_id, cliente_id } = req.params;

    try {
      const [clientes] = await pool.query(
        `SELECT id, nombre, telefono, email, creado_en
         FROM clientes
         WHERE id = ?`,
        [cliente_id]
      );

      if (!clientes.length) {
        return res.status(404).json({
          error: 'Cliente no encontrado'
        });
      }

      const [turnos] = await pool.query(
        `SELECT
           t.id,
           t.fecha_hora,
           t.estado,
           t.mascota_nombre,
           t.mascota_especie,
           s.nombre AS servicio,
           u.nombre AS colaborador
         FROM turnos t
         JOIN servicios s ON s.id = t.servicio_id
         LEFT JOIN usuarios u ON u.id = t.colaborador_id
         WHERE t.negocio_id = ?
           AND t.cliente_id = ?
         ORDER BY t.fecha_hora DESC
         LIMIT 10`,
        [negocio_id, cliente_id]
      );

      res.json({
        cliente: clientes[0],
        turnos
      });
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// Aprobar reserva desde panel admin
router.patch(
  '/reservas/:id/aprobar',
  requierePermiso('aprobar_reservas'),
  async (req, res) => {
    const { id } = req.params;
    const negocio_id = req.admin.negocio_id;

    try {
      const [turnos] = await pool.query(
        `SELECT *
         FROM turnos
         WHERE id = ?
           AND negocio_id = ?`,
        [id, negocio_id]
      );

      if (!turnos.length) {
        return res.status(404).json({
          error: 'Reserva no encontrada para este negocio'
        });
      }

      const turno = turnos[0];

      if (turno.estado !== 'pendiente') {
        return res.status(400).json({
          error: 'Solo se pueden aprobar reservas pendientes'
        });
      }

      await pool.query(
        `UPDATE turnos
         SET estado = 'confirmado'
         WHERE id = ?
           AND negocio_id = ?`,
        [id, negocio_id]
      );

      res.json({
        ok: true,
        mensaje: 'Reserva aprobada correctamente'
      });
    } catch (err) {
      console.error('Error aprobando reserva:', err);

      res.status(500).json({
        error: err.message
      });
    }
  }
);

// Rechazar reserva desde panel admin
router.patch(
  '/reservas/:id/rechazar',
  requierePermiso('rechazar_reservas'),
  async (req, res) => {
    const { id } = req.params;
    const negocio_id = req.admin.negocio_id;

    try {
      const [turnos] = await pool.query(
        `SELECT *
         FROM turnos
         WHERE id = ?
           AND negocio_id = ?`,
        [id, negocio_id]
      );

      if (!turnos.length) {
        return res.status(404).json({
          error: 'Reserva no encontrada para este negocio'
        });
      }

      const turno = turnos[0];

      if (turno.estado !== 'pendiente') {
        return res.status(400).json({
          error: 'Solo se pueden rechazar reservas pendientes'
        });
      }

      await pool.query(
        `UPDATE turnos
         SET estado = 'cancelado'
         WHERE id = ?
           AND negocio_id = ?`,
        [id, negocio_id]
      );

      res.json({
        ok: true,
        mensaje: 'Reserva rechazada correctamente'
      });
    } catch (err) {
      console.error('Error rechazando reserva:', err);

      res.status(500).json({
        error: err.message
      });
    }
  }
);

// GET /api/admin-panel/colaboradores
router.get('/colaboradores', soloAdmin, async (req, res) => {
  const negocio_id = req.admin.negocio_id;

  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, rol, activo, creado_en
       FROM usuarios
       WHERE negocio_id = ?
       ORDER BY rol ASC, nombre ASC`,
      [negocio_id]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error listando colaboradores:', err);

    res.status(500).json({
      error: 'No se pudieron cargar los colaboradores'
    });
  }
});

// POST /api/admin-panel/colaboradores
router.post('/colaboradores', soloAdmin, async (req, res) => {
  const negocio_id = req.admin.negocio_id;
  const { nombre, email, password, rol } = req.body;

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

  const emailLimpio = String(email).trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(emailLimpio)) {
    return res.status(400).json({
      error: 'El correo no tiene un formato válido'
    });
  }

  try {
    const [existe] = await pool.query(
      `SELECT id
       FROM usuarios
       WHERE email = ?
       LIMIT 1`,
      [emailLimpio]
    );

    if (existe.length) {
      return res.status(400).json({
        error: 'Ya existe un usuario con ese correo'
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO usuarios
       (negocio_id, nombre, email, password_hash, rol, activo)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [negocio_id, nombre, emailLimpio, passwordHash, rol]
    );

    res.status(201).json({
      ok: true,
      mensaje: 'Colaborador creado correctamente',
      usuario: {
        id: result.insertId,
        nombre,
        email: emailLimpio,
        rol,
        activo: 1
      }
    });
  } catch (err) {
    console.error('Error creando colaborador:', err);

    res.status(500).json({
      error: 'No se pudo crear el colaborador'
    });
  }
});

// PATCH /api/admin-panel/colaboradores/:id/estado
router.patch(
  '/colaboradores/:id/estado',
  soloAdmin,
  async (req, res) => {
    const negocio_id = req.admin.negocio_id;
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
         WHERE id = ?
           AND negocio_id = ?`,
        [activo ? 1 : 0, id, negocio_id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Usuario no encontrado en tu negocio'
        });
      }

      res.json({
        ok: true,
        mensaje: activo ? 'Usuario activado' : 'Usuario desactivado'
      });
    } catch (err) {
      console.error('Error cambiando estado colaborador:', err);

      res.status(500).json({
        error: 'No se pudo cambiar el estado'
      });
    }
  }
);

// PATCH /api/admin-panel/colaboradores/:id/password
router.patch(
  '/colaboradores/:id/password',
  soloAdmin,
  async (req, res) => {
    const negocio_id = req.admin.negocio_id;
    const { id } = req.params;
    const { password } = req.body;

    if (!password || String(password).length < 6) {
      return res.status(400).json({
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    try {
      const passwordHash = await bcrypt.hash(password, 10);

      const [result] = await pool.query(
        `UPDATE usuarios
         SET password_hash = ?
         WHERE id = ?
           AND negocio_id = ?`,
        [passwordHash, id, negocio_id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Usuario no encontrado en tu negocio'
        });
      }

      res.json({
        ok: true,
        mensaje: 'Contraseña actualizada correctamente'
      });
    } catch (err) {
      console.error('Error reseteando contraseña colaborador:', err);

      res.status(500).json({
        error: 'No se pudo actualizar la contraseña'
      });
    }
  }
);

// GET /api/admin-panel/horarios
router.get('/horarios', soloAdmin, async (req, res) => {
  const negocio_id = req.admin.negocio_id;

  try {
    const [rows] = await pool.query(
      `SELECT id, negocio_id, dia_semana, abierto, hora_inicio, hora_fin
       FROM horarios_negocio
       WHERE negocio_id = ?
       ORDER BY dia_semana ASC`,
      [negocio_id]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error cargando horarios:', err);

    res.status(500).json({
      error: 'No se pudieron cargar los horarios'
    });
  }
});

// PUT /api/admin-panel/horarios
router.put('/horarios', soloAdmin, async (req, res) => {
  const negocio_id = req.admin.negocio_id;
  const { horarios } = req.body;

  if (!Array.isArray(horarios)) {
    return res.status(400).json({
      error: 'horarios debe ser un arreglo'
    });
  }

  try {
    for (const h of horarios) {
      const dia = Number(h.dia_semana);
      const abierto = h.abierto ? 1 : 0;
      const horaInicio = abierto ? h.hora_inicio : null;
      const horaFin = abierto ? h.hora_fin : null;

      if (dia < 0 || dia > 6) {
        return res.status(400).json({
          error: 'dia_semana inválido'
        });
      }

      if (abierto && (!horaInicio || !horaFin)) {
        return res.status(400).json({
          error:
            'Si el día está abierto, hora_inicio y hora_fin son requeridos'
        });
      }

      await pool.query(
        `INSERT INTO horarios_negocio
         (negocio_id, dia_semana, abierto, hora_inicio, hora_fin)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           abierto = VALUES(abierto),
           hora_inicio = VALUES(hora_inicio),
           hora_fin = VALUES(hora_fin)`,
        [negocio_id, dia, abierto, horaInicio, horaFin]
      );
    }

    res.json({
      ok: true,
      mensaje: 'Horarios actualizados correctamente'
    });
  } catch (err) {
    console.error('Error guardando horarios:', err);

    res.status(500).json({
      error: 'No se pudieron guardar los horarios'
    });
  }
});

// POST /api/admin-panel/checkins/qr
router.post(
  '/checkins/qr',
  requierePermiso('escanear_qr'),
  async (req, res) => {
    const negocio_id = req.admin.negocio_id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Token QR requerido'
      });
    }

    try {
      const [turnos] = await pool.query(
        `SELECT
           t.id,
           t.estado,
           t.fecha_hora,
           c.nombre AS cliente,
           s.nombre AS servicio
         FROM turnos t
         JOIN clientes c ON c.id = t.cliente_id
         JOIN servicios s ON s.id = t.servicio_id
         WHERE t.qr_token = ?
           AND t.negocio_id = ?
         LIMIT 1`,
        [token, negocio_id]
      );

      if (!turnos.length) {
        return res.status(404).json({
          error: 'QR no válido para este negocio'
        });
      }

      const turno = turnos[0];

      if (turno.estado === 'cancelado') {
        return res.status(400).json({
          error: 'No se puede hacer check-in de una reserva cancelada'
        });
      }

      if (turno.estado === 'presente') {
        return res.json({
          ok: true,
          ya_registrado: true,
          mensaje: 'Este cliente ya está marcado como presente',
          turno
        });
      }

      const [checkins] = await pool.query(
        `SELECT id
         FROM checkins
         WHERE turno_id = ?
         LIMIT 1`,
        [turno.id]
      );

      if (checkins.length) {
        return res.json({
          ok: true,
          ya_registrado: true,
          mensaje: 'Este cliente ya realizó check-in',
          turno
        });
      }

      await pool.query(
        `INSERT INTO checkins (turno_id, checkin_en)
         VALUES (?, NOW())`,
        [turno.id]
      );

      await pool.query(
        `UPDATE turnos
         SET estado = 'presente'
         WHERE id = ?`,
        [turno.id]
      );

      res.json({
        ok: true,
        mensaje: 'Asistencia confirmada correctamente',
        turno: {
          ...turno,
          estado: 'presente'
        }
      });
    } catch (err) {
      console.error('Error confirmando QR desde admin:', err);

      res.status(500).json({
        error: 'No se pudo confirmar la asistencia'
      });
    }
  }
);

// PATCH /api/admin-panel/reservas/:id/completar
router.patch(
  '/reservas/:id/completar',
  requierePermiso('finalizar_atencion'),
  async (req, res) => {
    const { id } = req.params;
    const negocio_id = req.admin.negocio_id;

    try {
      const [turnos] = await pool.query(
        `SELECT id, estado
         FROM turnos
         WHERE id = ?
           AND negocio_id = ?
         LIMIT 1`,
        [id, negocio_id]
      );

      if (!turnos.length) {
        return res.status(404).json({
          error: 'Reserva no encontrada para este negocio'
        });
      }

      const turno = turnos[0];

      if (turno.estado !== 'presente') {
        return res.status(400).json({
          error:
            'Solo puedes completar reservas marcadas como presentes'
        });
      }

      await pool.query(
        `UPDATE turnos
         SET estado = 'completado'
         WHERE id = ?
           AND negocio_id = ?`,
        [id, negocio_id]
      );

      res.json({
        ok: true,
        mensaje: 'Atención finalizada correctamente'
      });
    } catch (err) {
      console.error('Error completando reserva:', err);

      res.status(500).json({
        error: 'No se pudo finalizar la atención'
      });
    }
  }
);

const PERMISOS_COLABORADOR = [
  'ver_dashboard',
  'ver_reservas',
  'crear_reservas',
  'aprobar_reservas',
  'rechazar_reservas',
  'escanear_qr',
  'finalizar_atencion',
  'ver_clientes'
];

// GET /api/admin-panel/colaboradores/:id/permisos
router.get(
  '/colaboradores/:id/permisos',
  soloAdmin,
  async (req, res) => {
    const negocio_id = req.admin.negocio_id;
    const { id } = req.params;

    try {
      const [usuarios] = await pool.query(
        `SELECT id, nombre, email, rol, activo
         FROM usuarios
         WHERE id = ?
           AND negocio_id = ?`,
        [id, negocio_id]
      );

      if (!usuarios.length) {
        return res.status(404).json({
          error: 'Usuario no encontrado en tu negocio'
        });
      }

      const usuario = usuarios[0];

      const [rows] = await pool.query(
        `SELECT permiso, permitido
         FROM permisos_usuario
         WHERE usuario_id = ?`,
        [id]
      );

      const mapa = {};

      rows.forEach(p => {
        mapa[p.permiso] = Number(p.permitido) === 1;
      });

      res.json({
        usuario,
        permisos: PERMISOS_COLABORADOR.map(permiso => ({
          permiso,
          permitido: mapa[permiso] ?? false
        }))
      });
    } catch (err) {
      console.error('Error cargando permisos:', err);

      res.status(500).json({
        error: 'No se pudieron cargar los permisos'
      });
    }
  }
);

// PUT /api/admin-panel/colaboradores/:id/permisos
router.put(
  '/colaboradores/:id/permisos',
  soloAdmin,
  async (req, res) => {
    const negocio_id = req.admin.negocio_id;
    const { id } = req.params;
    const { permisos } = req.body;

    if (req.admin.rol !== 'admin') {
      return res.status(403).json({
        error: 'Solo el administrador puede cambiar permisos'
      });
    }

    if (!Array.isArray(permisos)) {
      return res.status(400).json({
        error: 'permisos debe ser un arreglo'
      });
    }

    try {
      const [usuarios] = await pool.query(
        `SELECT id, rol
         FROM usuarios
         WHERE id = ?
           AND negocio_id = ?`,
        [id, negocio_id]
      );

      if (!usuarios.length) {
        return res.status(404).json({
          error: 'Usuario no encontrado en tu negocio'
        });
      }

      if (usuarios[0].rol === 'admin') {
        return res.status(400).json({
          error:
            'No es necesario editar permisos de un administrador'
        });
      }

      for (const p of permisos) {
        if (!PERMISOS_COLABORADOR.includes(p.permiso)) {
          continue;
        }

        await pool.query(
          `INSERT INTO permisos_usuario
           (usuario_id, permiso, permitido)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE
             permitido = VALUES(permitido)`,
          [id, p.permiso, p.permitido ? 1 : 0]
        );
      }

      res.json({
        ok: true,
        mensaje: 'Permisos actualizados correctamente'
      });
    } catch (err) {
      console.error('Error guardando permisos:', err);

      res.status(500).json({
        error: 'No se pudieron guardar los permisos'
      });
    }
  }
);

module.exports = router;