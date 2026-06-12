const express = require('express');
const router = express.Router();
const pool = require('../db');

// Listar todos los negocios activos
router.get('/', async (req, res) => {
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
          color_primario
       FROM negocios
       WHERE activo = 1
       ORDER BY nombre ASC`
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Buscar negocios por ciudad o nombre
router.get('/buscar', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.json([]);
  }

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
          color_primario
       FROM negocios
       WHERE activo = 1
         AND (
           nombre LIKE ?
           OR ciudad LIKE ?
           OR tipo_negocio LIKE ?
         )
       ORDER BY nombre ASC`,
      [
        `%${q}%`,
        `%${q}%`,
        `%${q}%`
      ]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Obtener opciones de perfil admitidas por negocio
// Ejemplo: /api/negocios/1/opciones-perfil?tipo=veterinaria&campo=especie
router.get('/:id/opciones-perfil', async (req, res) => {
  try {
    const { tipo, campo } = req.query;
    const negocioId = req.params.id;

    if (!tipo || !campo) {
      return res.status(400).json({
        error: 'Faltan parámetros: tipo y campo son obligatorios'
      });
    }

    const [rows] = await pool.query(
      `SELECT valor
       FROM opciones_perfil_negocio
       WHERE negocio_id = ?
         AND tipo_perfil = ?
         AND campo = ?
         AND activo = 1
       ORDER BY valor ASC`,
      [
        negocioId,
        tipo,
        campo
      ]
    );

    res.json(
      rows.map(row => row.valor)
    );
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Listar negocios cercanos a una ubicación
// Ejemplo: /api/negocios/cerca?lat=-12.065&lng=-75.204&radio_km=10
router.get('/cerca', async (req, res) => {
  try {
    const { lat, lng, radio_km } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        error: 'lat y lng son requeridos'
      });
    }

    const latUsuario = parseFloat(lat);
    const lngUsuario = parseFloat(lng);
    const radioKm = radio_km
      ? parseFloat(radio_km)
      : 10;

    if (isNaN(latUsuario) || isNaN(lngUsuario)) {
      return res.status(400).json({
        error: 'lat y lng deben ser números válidos'
      });
    }

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
          (
            6371 * ACOS(
              COS(RADIANS(?)) *
              COS(RADIANS(latitud)) *
              COS(RADIANS(longitud) - RADIANS(?)) +
              SIN(RADIANS(?)) *
              SIN(RADIANS(latitud))
            )
          ) AS distancia_km
       FROM negocios
       WHERE activo = 1
       HAVING distancia_km <= ?
       ORDER BY distancia_km ASC`,
      [
        latUsuario,
        lngUsuario,
        latUsuario,
        radioKm
      ]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error en negocios cerca:', err);

    res.status(500).json({
      error: err.message
    });
  }
});

// Obtener horarios públicos de un negocio activo
router.get('/:id/horarios', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          h.dia_semana,
          h.abierto,
          h.hora_inicio,
          h.hora_fin
       FROM horarios_negocio h
       INNER JOIN negocios n ON n.id = h.negocio_id
       WHERE h.negocio_id = ?
         AND n.activo = 1
       ORDER BY h.dia_semana ASC`,
      [req.params.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Obtener un negocio por ID
router.get('/:id', async (req, res) => {
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
          permite_pago_local,
          permite_pago_adelantado,
          metodo_pago_adelantado,
          numero_pago_adelantado,
          instrucciones_pago
       FROM negocios
       WHERE id = ?
         AND activo = 1`,
      [req.params.id]
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
});

// Obtener servicios de un negocio
router.get('/:id/servicios', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
          s.id,
          s.nombre,
          s.descripcion,
          s.duracion_min,
          s.precio
       FROM servicios s
       INNER JOIN negocios n ON n.id = s.negocio_id
       WHERE s.negocio_id = ?
         AND s.activo = 1
         AND n.activo = 1
       ORDER BY s.nombre ASC`,
      [req.params.id]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Obtener colaboradores de un negocio
router.get('/:id/colaboradores', async (req, res) => {
  try {
    const negocioId = req.params.id;

    const [rows] = await pool.query(
      `SELECT id, nombre
       FROM usuarios
       WHERE negocio_id = ?
         AND activo = 1
         AND rol IN ('colaborador', 'admin')
       ORDER BY nombre ASC`,
      [negocioId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error cargando colaboradores:', err);

    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;