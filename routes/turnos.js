const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const {
  notificarTurnoCreado,
  notificarTurnoRechazado
} = require('../services/notificaciones');
const { enviarPushToken } = require('../services/firebasePush');

const BASE_URL =
  process.env.BASE_URL || 'http://localhost:3000';

router.get('/hoy', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM v_turnos_hoy'
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.get('/proximas', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          t.id,
          t.fecha_hora,
          t.estado,
          t.qr_token,
          t.notas,
          c.nombre AS cliente,
          c.telefono AS telefono_cliente,
          s.nombre AS servicio,
          s.duracion_min,
          u.nombre AS colaborador,
          n.nombre AS negocio,
          ch.checkin_en,
          ch.distancia_metros
       FROM turnos t
       JOIN clientes c ON c.id = t.cliente_id
       JOIN servicios s ON s.id = t.servicio_id
       JOIN negocios n ON n.id = t.negocio_id
       LEFT JOIN usuarios u ON u.id = t.colaborador_id
       LEFT JOIN checkins ch ON ch.turno_id = t.id
       WHERE DATE(t.fecha_hora) > CURDATE()
         AND t.estado NOT IN ('cancelado', 'ausente')
       ORDER BY t.fecha_hora ASC
       LIMIT 50`
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.get('/token/:qr_token', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          t.*,
          c.nombre AS cliente,
          c.id AS cliente_id,
          s.nombre AS servicio,
          u.nombre AS colaborador,
          n.nombre AS negocio,
          t.qr_imagen_url,
          ch.checkin_en
       FROM turnos t
       JOIN clientes c ON c.id = t.cliente_id
       JOIN servicios s ON s.id = t.servicio_id
       JOIN negocios n ON n.id = t.negocio_id
       LEFT JOIN usuarios u ON u.id = t.colaborador_id
       LEFT JOIN checkins ch ON ch.turno_id = t.id
       WHERE t.qr_token = ?`,
      [req.params.qr_token]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

function obtenerDiaSemana(fecha) {
  // fecha viene como YYYY-MM-DD
  const [year, month, day] = fecha
    .split('-')
    .map(Number);

  // Usamos UTC para evitar problemas de zona horaria
  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  // JS: domingo=0, lunes=1, martes=2...
  const jsDay = date.getUTCDay();

  // Tu BD usa: lunes=1, martes=2, ..., domingo=7
  return jsDay === 0 ? 7 : jsDay;
}

function horaAMinutos(hora) {
  // Acepta "09:00" o "09:00:00"
  const partes = hora.split(':');
  const h = parseInt(partes[0], 10);
  const m = parseInt(partes[1], 10);

  return h * 60 + m;
}

function minutosAHora(totalMin) {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function obtenerFechaYHoraReserva(fechaHora) {
  const texto = String(fechaHora);

  // Acepta:
  // 2026-05-16 17:50:00
  // 2026-05-16T17:50:00
  // 2026-05-16T17:50
  const limpio = texto.replace('T', ' ');
  const [fecha, horaCompleta] = limpio.split(' ');

  const hora = horaCompleta
    ? horaCompleta.slice(0, 5)
    : null;

  return {
    fecha,
    hora
  };
}

function obtenerDiaSemanaNegocio(fecha) {
  // horarios_negocio usa:
  // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const [year, month, day] = fecha
    .split('-')
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day)
  );

  return date.getUTCDay();
}

async function validarHorarioNegocio(
  negocioId,
  fechaHora
) {
  const { fecha, hora } =
    obtenerFechaYHoraReserva(fechaHora);

  if (!fecha || !hora) {
    return {
      ok: false,
      error: 'Fecha u hora inválida'
    };
  }

  const diaSemana =
    obtenerDiaSemanaNegocio(fecha);

  const horaReservaMin =
    horaAMinutos(hora);

  const [rows] = await pool.query(
    `SELECT abierto, hora_inicio, hora_fin
     FROM horarios_negocio
     WHERE negocio_id = ?
       AND dia_semana = ?
     LIMIT 1`,
    [negocioId, diaSemana]
  );

  if (!rows.length) {
    return {
      ok: false,
      error:
        'Este negocio no tiene horario configurado para ese día'
    };
  }

  const horario = rows[0];

  if (Number(horario.abierto) !== 1) {
    return {
      ok: false,
      error: 'El negocio está cerrado ese día'
    };
  }

  const inicioMin = horaAMinutos(
    String(horario.hora_inicio)
  );

  const finMin = horaAMinutos(
    String(horario.hora_fin)
  );

  if (
    horaReservaMin < inicioMin ||
    horaReservaMin >= finMin
  ) {
    return {
      ok: false,
      error:
        `El horario de atención para ese día es de ` +
        `${String(horario.hora_inicio).slice(0, 5)} a ` +
        `${String(horario.hora_fin).slice(0, 5)}`
    };
  }

  return {
    ok: true
  };
}

async function generarHorariosDisponiblesDelDia(
  negocioId,
  fecha,
  horarios,
  horaReferenciaMin
) {
  const posibles = [];

  for (const h of horarios) {
    const inicio = horaAMinutos(h.hora_inicio);
    const fin = horaAMinutos(h.hora_fin);

    // Generar horarios cada 30 minutos dentro del horario real
    for (let min = inicio; min < fin; min += 30) {
      posibles.push(minutosAHora(min));
    }
  }

  // Quitar duplicados
  const unicos = [...new Set(posibles)];

  // Ordenar por cercanía a la hora que pidió el usuario
  unicos.sort((a, b) => {
    const diffA = Math.abs(
      horaAMinutos(a) - horaReferenciaMin
    );

    const diffB = Math.abs(
      horaAMinutos(b) - horaReferenciaMin
    );

    return diffA - diffB;
  });

  const disponibles = [];

  for (const horaAlt of unicos) {
    const fechaHoraAlt =
      `${fecha} ${horaAlt}:00`;

    const [ocupados] = await pool.query(
      `SELECT id
       FROM turnos
       WHERE negocio_id = ?
         AND fecha_hora = ?
         AND estado NOT IN ('cancelado', 'rechazado')`,
      [negocioId, fechaHoraAlt]
    );

    if (ocupados.length === 0) {
      disponibles.push(horaAlt);
    }

    if (disponibles.length >= 5) {
      break;
    }
  }

  return disponibles;
}

router.get('/disponibilidad', async (req, res) => {
  const { negocio_id, fecha, hora } = req.query;

  if (!negocio_id || !fecha || !hora) {
    return res.status(400).json({
      error:
        'negocio_id, fecha y hora son requeridos'
    });
  }

  try {
    const diaSemana = obtenerDiaSemana(fecha);
    const horaSolicitadaMin =
      horaAMinutos(hora);

    // Obtener horarios reales de los colaboradores del negocio para ese día
    const [horarios] = await pool.query(
      `SELECT
          h.colaborador_id,
          h.hora_inicio,
          h.hora_fin,
          u.nombre AS colaborador
       FROM horarios h
       INNER JOIN usuarios u
         ON u.id = h.colaborador_id
       WHERE u.negocio_id = ?
         AND u.activo = 1
         AND h.dia_semana = ?
       ORDER BY h.hora_inicio ASC`,
      [negocio_id, diaSemana]
    );

    if (!horarios.length) {
      return res.json({
        disponible: false,
        motivo:
          'No hay atención programada para este día',
        horariosCercanos: [],
        fechaHora: `${fecha} ${hora}:00`
      });
    }

    // Revisar si la hora elegida cae dentro de algún horario
    const horarioCompatible = horarios.find(h => {
      const inicio = horaAMinutos(
        h.hora_inicio
      );

      const fin = horaAMinutos(
        h.hora_fin
      );

      return (
        horaSolicitadaMin >= inicio &&
        horaSolicitadaMin < fin
      );
    });

    // Si está fuera del horario, sugerir horarios disponibles
    if (!horarioCompatible) {
      const horariosCercanos =
        await generarHorariosDisponiblesDelDia(
          negocio_id,
          fecha,
          horarios,
          horaSolicitadaMin
        );

      return res.json({
        disponible: false,
        motivo: 'Fuera del horario de atencion',
        horariosCercanos,
        fechaHora: `${fecha} ${hora}:00`
      });
    }

    // Si está dentro del horario, revisar si ya hay turno
    const fechaHora =
      `${fecha} ${hora}:00`;

    const [ocupados] = await pool.query(
      `SELECT id
       FROM turnos
       WHERE negocio_id = ?
         AND fecha_hora = ?
         AND estado NOT IN ('cancelado', 'rechazado')`,
      [negocio_id, fechaHora]
    );

    if (ocupados.length === 0) {
      return res.json({
        disponible: true,
        motivo: 'Horario disponible',
        horariosCercanos: [],
        fechaHora
      });
    }

    // Si está ocupado, sugerir horarios cercanos
    const horariosCercanos =
      await generarHorariosDisponiblesDelDia(
        negocio_id,
        fecha,
        horarios,
        horaSolicitadaMin
      );

    return res.json({
      disponible: false,
      motivo: 'Horario ocupado',
      horariosCercanos,
      fechaHora
    });
  } catch (err) {
    console.error(
      'Error en disponibilidad:',
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

router.get('/disponibles', async (req, res) => {
  const {
    negocio_id,
    servicio_id,
    fecha
  } = req.query;

  if (!negocio_id || !servicio_id || !fecha) {
    return res.status(400).json({
      error:
        'negocio_id, servicio_id y fecha son requeridos'
    });
  }

  try {
    const [servicios] = await pool.query(
      `SELECT duracion_min
       FROM servicios
       WHERE id = ?
         AND negocio_id = ?
         AND activo = 1
       LIMIT 1`,
      [servicio_id, negocio_id]
    );

    if (!servicios.length) {
      return res.status(404).json({
        error: 'Servicio no disponible'
      });
    }

    const duracion = Number(
      servicios[0].duracion_min || 30
    );

    const diaSemana =
      obtenerDiaSemanaNegocio(fecha);

    const [horarios] = await pool.query(
      `SELECT abierto, hora_inicio, hora_fin
       FROM horarios_negocio
       WHERE negocio_id = ?
         AND dia_semana = ?
       LIMIT 1`,
      [negocio_id, diaSemana]
    );

    if (
      !horarios.length ||
      Number(horarios[0].abierto) !== 1
    ) {
      return res.json({
        disponible: false,
        mensaje:
          'El negocio está cerrado ese día',
        horarios: []
      });
    }

    const inicioMin = horaAMinutos(
      String(horarios[0].hora_inicio)
    );

    const finMin = horaAMinutos(
      String(horarios[0].hora_fin)
    );

    const disponibles = [];

    for (
      let min = inicioMin;
      min + duracion <= finMin;
      min += 30
    ) {
      const hora = minutosAHora(min);
      const fechaHora =
        `${fecha} ${hora}:00`;

      const validacionChoque =
        await validarChoqueReserva({
          negocio_id,
          servicio_id,
          fecha_hora: fechaHora
        });

      if (validacionChoque.ok) {
        disponibles.push(hora);
      }
    }

    res.json({
      disponible: disponibles.length > 0,
      mensaje: disponibles.length
        ? 'Horarios disponibles'
        : 'No hay horarios disponibles para ese día',
      horarios: disponibles
    });
  } catch (err) {
    console.error(
      'Error cargando horarios disponibles:',
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

router.get('/:id', async (req, res) => {
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
          t.qr_imagen_url,
          t.notas,
          t.mascota_nombre,
          t.mascota_especie,
          c.nombre AS cliente,
          c.telefono AS telefono_cliente,
          s.nombre AS servicio,
          s.duracion_min,
          s.precio,
          n.nombre AS negocio,
          u.nombre AS colaborador
       FROM turnos t
       JOIN clientes c ON c.id = t.cliente_id
       JOIN servicios s ON s.id = t.servicio_id
       JOIN negocios n ON n.id = t.negocio_id
       LEFT JOIN usuarios u
         ON u.id = t.colaborador_id
       WHERE t.id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

async function enviarPushReserva(
  clienteId,
  titulo,
  cuerpo,
  data = {}
) {
  try {
    const [clientes] = await pool.query(
      `SELECT
          id,
          nombre,
          fcm_token,
          notif_reservas
       FROM clientes
       WHERE id = ?`,
      [clienteId]
    );

    if (!clientes.length) {
      console.log(
        'Cliente no encontrado para push:',
        clienteId
      );

      return;
    }

    const cliente = clientes[0];

    if (!cliente.fcm_token) {
      console.log(
        'Cliente sin fcm_token:',
        clienteId
      );

      return;
    }

    if (cliente.notif_reservas !== 1) {
      console.log(
        'Cliente tiene notificaciones de reservas desactivadas:',
        clienteId
      );

      return;
    }

    await enviarPushToken(
      cliente.fcm_token,
      titulo,
      cuerpo,
      {
        tipo: 'reserva',
        cliente_id: cliente.id,
        ...data
      }
    );
  } catch (err) {
    console.error(
      'Error enviando push de reserva:',
      err.message
    );
  }
}

async function validarChoqueReserva({
  negocio_id,
  servicio_id,
  fecha_hora
}) {
  // Buscar duración del servicio que se quiere reservar
  const [servicios] = await pool.query(
    `SELECT id, duracion_min
     FROM servicios
     WHERE id = ?
       AND negocio_id = ?
       AND activo = 1
     LIMIT 1`,
    [servicio_id, negocio_id]
  );

  if (!servicios.length) {
    return {
      ok: false,
      error:
        'Servicio no disponible para este negocio'
    };
  }

  const duracionNueva = Number(
    servicios[0].duracion_min || 30
  );

  const [choques] = await pool.query(
    `SELECT
        t.id,
        t.fecha_hora,
        s.duracion_min,
        c.nombre AS cliente,
        s.nombre AS servicio
     FROM turnos t
     JOIN servicios s ON s.id = t.servicio_id
     JOIN clientes c ON c.id = t.cliente_id
     WHERE t.negocio_id = ?
       AND DATE(t.fecha_hora) = DATE(?)
       AND t.estado NOT IN (
         'cancelado',
         'rechazado',
         'completado'
       )
       AND (
         ? < DATE_ADD(
           t.fecha_hora,
           INTERVAL s.duracion_min MINUTE
         )
         AND DATE_ADD(
           ?,
           INTERVAL ? MINUTE
         ) > t.fecha_hora
       )
     LIMIT 1`,
    [
      negocio_id,
      fecha_hora,
      fecha_hora,
      fecha_hora,
      duracionNueva
    ]
  );

  if (choques.length) {
    const choque = choques[0];

    return {
      ok: false,
      error:
        `Ese horario se cruza con otra reserva: ` +
        `${choque.servicio} de ${choque.cliente}`
    };
  }

  return {
    ok: true
  };
}

router.post('/', async (req, res) => {
  const {
    negocio_id,
    servicio_id,
    cliente_id,
    colaborador_id,
    fecha_hora,
    notas,
    mascota_nombre,
    mascota_especie,
    metodo_pago,
    acepta_condiciones_pago
  } = req.body;

  if (
    !negocio_id ||
    !servicio_id ||
    !cliente_id ||
    !fecha_hora
  ) {
    return res.status(400).json({
      error:
        'negocio_id, servicio_id, cliente_id y fecha_hora son requeridos'
    });
  }

  try {
    const [negocios] = await pool.query(
      `SELECT
          id,
          activo,
          permite_pago_local,
          permite_pago_adelantado
       FROM negocios
       WHERE id = ?
       LIMIT 1`,
      [negocio_id]
    );

    if (
      !negocios.length ||
      Number(negocios[0].activo) !== 1
    ) {
      return res.status(400).json({
        error:
          'Este negocio no está disponible para reservas'
      });
    }

    const negocio = negocios[0];

    const metodoPagoFinal =
      metodo_pago || 'local';

    const aceptaPagoFinal =
      acepta_condiciones_pago ? 1 : 0;

    if (
      !['local', 'adelantado'].includes(
        metodoPagoFinal
      )
    ) {
      return res.status(400).json({
        error: 'Método de pago inválido'
      });
    }

    if (
      metodoPagoFinal === 'local' &&
      Number(negocio.permite_pago_local) !== 1
    ) {
      return res.status(400).json({
        error:
          'Este negocio no permite pago en el local'
      });
    }

    if (
      metodoPagoFinal === 'adelantado' &&
      Number(
        negocio.permite_pago_adelantado
      ) !== 1
    ) {
      return res.status(400).json({
        error:
          'Este negocio no permite pago adelantado'
      });
    }

    if (
      metodoPagoFinal === 'adelantado' &&
      aceptaPagoFinal !== 1
    ) {
      return res.status(400).json({
        error:
          'Debes aceptar las condiciones del pago adelantado'
      });
    }

    const validacionHorario =
      await validarHorarioNegocio(
        negocio_id,
        fecha_hora
      );

    if (!validacionHorario.ok) {
      return res.status(400).json({
        error: validacionHorario.error
      });
    }

    const validacionChoque =
      await validarChoqueReserva({
        negocio_id,
        servicio_id,
        fecha_hora
      });

    if (!validacionChoque.ok) {
      return res.status(400).json({
        error: validacionChoque.error
      });
    }

    const qr_token = uuidv4();

    const checkin_url =
      `${BASE_URL}/checkin.html?token=${qr_token}`;

    const qr_imagen_url =
      await QRCode.toDataURL(checkin_url);

    const [result] = await pool.query(
      `INSERT INTO turnos (
         negocio_id,
         servicio_id,
         cliente_id,
         colaborador_id,
         fecha_hora,
         qr_token,
         qr_imagen_url,
         notas,
         mascota_nombre,
         mascota_especie,
         metodo_pago,
         estado_pago,
         acepta_condiciones_pago
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        negocio_id,
        servicio_id,
        cliente_id,
        colaborador_id || null,
        fecha_hora,
        qr_token,
        qr_imagen_url,
        notas || null,
        mascota_nombre || null,
        mascota_especie || null,
        metodoPagoFinal,
        'pendiente',
        aceptaPagoFinal
      ]
    );

    const turno_id = result.insertId;

    enviarPushReserva(
      cliente_id,
      'Reserva registrada',
      'Tu reserva fue registrada correctamente. Te avisaremos cuando sea confirmada.',
      {
        turno_id,
        estado: 'pendiente',
        fecha_hora
      }
    );

    const [clientes] = await pool.query(
      'SELECT * FROM clientes WHERE id = ?',
      [cliente_id]
    );

    const [servicios] = await pool.query(
      'SELECT * FROM servicios WHERE id = ?',
      [servicio_id]
    );

    if (clientes.length && servicios.length) {
      notificarTurnoCreado({
        nombre: clientes[0].nombre,
        mascota: mascota_nombre,
        telefono: clientes[0].telefono,
        email: clientes[0].email,
        servicio: servicios[0].nombre,
        fecha_hora,
        qr_token,
        qr_imagen_url,
        checkin_url
      }).then(r =>
        console.log(
          'Notificaciones:',
          JSON.stringify(r)
        )
      );
    }

    res.status(201).json({
      id: turno_id,
      qr_token,
      qr_imagen_url,
      checkin_url
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.patch(
  '/cancelar/:qr_token',
  async (req, res) => {
    try {
      const [turnos] = await pool.query(
        `SELECT id, estado
         FROM turnos
         WHERE qr_token = ?`,
        [req.params.qr_token]
      );

      if (!turnos.length) {
        return res.status(404).json({
          error: 'Turno no encontrado'
        });
      }

      if (turnos[0].estado === 'cancelado') {
        return res.status(400).json({
          error: 'El turno ya esta cancelado'
        });
      }

      if (
        turnos[0].estado === 'presente' ||
        turnos[0].estado === 'completado'
      ) {
        return res.status(400).json({
          error:
            'No se puede cancelar un turno ya atendido'
        });
      }

      await pool.query(
        `UPDATE turnos
         SET estado = 'cancelado'
         WHERE id = ?`,
        [turnos[0].id]
      );

      res.json({
        mensaje:
          'Turno cancelado correctamente'
      });
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

router.patch('/aprobar/:id', async (req, res) => {
  try {
    const [turnos] = await pool.query(
      `SELECT *
       FROM turnos
       WHERE id = ?`,
      [req.params.id]
    );

    if (!turnos.length) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    const t = turnos[0];

    if (t.estado !== 'pendiente') {
      return res.status(400).json({
        error:
          'Solo se pueden aprobar turnos pendientes'
      });
    }

    const qr_token =
      t.qr_token || uuidv4();

    const checkin_url =
      `${BASE_URL}/checkin.html?token=${qr_token}`;

    const qr_imagen_url =
      await QRCode.toDataURL(checkin_url);

    await pool.query(
      `UPDATE turnos
       SET estado = 'confirmado',
           qr_token = ?,
           qr_imagen_url = ?
       WHERE id = ?`,
      [
        qr_token,
        qr_imagen_url,
        t.id
      ]
    );

    enviarPushReserva(
      t.cliente_id,
      'Reserva confirmada',
      'Tu reserva fue confirmada. Puedes revisar tu QR en la app.',
      {
        turno_id: t.id,
        estado: 'confirmado',
        fecha_hora: t.fecha_hora,
        qr_token
      }
    );

    const [clientes] = await pool.query(
      'SELECT * FROM clientes WHERE id = ?',
      [t.cliente_id]
    );

    const [servicios] = await pool.query(
      'SELECT * FROM servicios WHERE id = ?',
      [t.servicio_id]
    );

    if (clientes.length && servicios.length) {
      notificarTurnoCreado({
        nombre: clientes[0].nombre,
        mascota: t.mascota_nombre,
        telefono: clientes[0].telefono,
        email: clientes[0].email,
        servicio: servicios[0].nombre,
        fecha_hora: t.fecha_hora,
        qr_token,
        qr_imagen_url,
        checkin_url
      }).then(r =>
        console.log(
          'Notif aprobacion:',
          JSON.stringify(r)
        )
      );
    }

    res.json({
      mensaje:
        'Turno aprobado y QR enviado',
      qr_token,
      qr_imagen_url
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

router.patch('/rechazar/:id', async (req, res) => {
  try {
    const [turnos] = await pool.query(
      `SELECT *
       FROM turnos
       WHERE id = ?`,
      [req.params.id]
    );

    if (!turnos.length) {
      return res.status(404).json({
        error: 'Turno no encontrado'
      });
    }

    if (turnos[0].estado !== 'pendiente') {
      return res.status(400).json({
        error:
          'Solo se pueden rechazar turnos pendientes'
      });
    }

    const t = turnos[0];

    await pool.query(
      `UPDATE turnos
       SET estado = 'cancelado'
       WHERE id = ?`,
      [t.id]
    );

    enviarPushReserva(
      t.cliente_id,
      'Reserva rechazada',
      'Tu reserva fue rechazada. Puedes elegir otro horario disponible.',
      {
        turno_id: t.id,
        estado: 'cancelado',
        fecha_hora: t.fecha_hora
      }
    );

    const [clientes] = await pool.query(
      'SELECT * FROM clientes WHERE id = ?',
      [t.cliente_id]
    );

    const [servicios] = await pool.query(
      'SELECT * FROM servicios WHERE id = ?',
      [t.servicio_id]
    );

    if (clientes.length && servicios.length) {
      notificarTurnoRechazado({
        nombre: clientes[0].nombre,
        mascota: t.mascota_nombre,
        telefono: clientes[0].telefono,
        servicio: servicios[0].nombre,
        fecha_hora: t.fecha_hora
      }).then(r =>
        console.log(
          'Notif rechazo:',
          JSON.stringify(r)
        )
      );
    }

    res.json({
      mensaje:
        'Turno rechazado y cliente notificado'
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;