const express = require('express');
const router = express.Router();
const pool = require('../db');

// Listar direcciones de un cliente
// GET /api/direcciones/cliente/12
router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const clienteId = req.params.clienteId;

    const [rows] = await pool.query(
      `SELECT
          id,
          cliente_id,
          nombre,
          direccion_texto,
          referencia,
          latitud,
          longitud,
          es_principal,
          creado_en
       FROM direcciones_cliente
       WHERE cliente_id = ?
       ORDER BY es_principal DESC, creado_en DESC`,
      [clienteId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Error al listar direcciones:', err);

    res.status(500).json({
      error: err.message
    });
  }
});

// Crear nueva dirección
// POST /api/direcciones
router.post('/', async (req, res) => {
  const {
    cliente_id,
    nombre,
    direccion_texto,
    referencia,
    latitud,
    longitud,
    es_principal
  } = req.body;

  if (
    !cliente_id ||
    !nombre ||
    latitud == null ||
    longitud == null
  ) {
    return res.status(400).json({
      error: 'cliente_id, nombre, latitud y longitud son requeridos'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Si será principal, quitar principal anterior
    if (es_principal) {
      await connection.query(
        `UPDATE direcciones_cliente
         SET es_principal = 0
         WHERE cliente_id = ?`,
        [cliente_id]
      );
    }

    const [result] = await connection.query(
      `INSERT INTO direcciones_cliente
       (
         cliente_id,
         nombre,
         direccion_texto,
         referencia,
         latitud,
         longitud,
         es_principal
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cliente_id,
        nombre.trim(),
        direccion_texto || null,
        referencia || null,
        latitud,
        longitud,
        es_principal ? 1 : 0
      ]
    );

    // Si es la primera dirección del cliente, volverla principal automáticamente
    const [conteo] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM direcciones_cliente
       WHERE cliente_id = ?`,
      [cliente_id]
    );

    if (conteo[0].total === 1) {
      await connection.query(
        `UPDATE direcciones_cliente
         SET es_principal = 1
         WHERE id = ?`,
        [result.insertId]
      );
    }

    await connection.commit();

    res.status(201).json({
      id: result.insertId,
      cliente_id,
      nombre: nombre.trim(),
      direccion_texto: direccion_texto || null,
      referencia: referencia || null,
      latitud,
      longitud,
      es_principal:
        es_principal
          ? 1
          : conteo[0].total === 1
            ? 1
            : 0
    });
  } catch (err) {
    await connection.rollback();

    console.error('Error al crear dirección:', err);

    res.status(500).json({
      error: err.message
    });
  } finally {
    connection.release();
  }
});

// Cambiar dirección principal
// PUT /api/direcciones/5/principal
router.put('/:id/principal', async (req, res) => {
  const direccionId = req.params.id;
  const { cliente_id } = req.body;

  if (!cliente_id) {
    return res.status(400).json({
      error: 'cliente_id es requerido'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [existe] = await connection.query(
      `SELECT id
       FROM direcciones_cliente
       WHERE id = ?
         AND cliente_id = ?`,
      [direccionId, cliente_id]
    );

    if (!existe.length) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Dirección no encontrada'
      });
    }

    await connection.query(
      `UPDATE direcciones_cliente
       SET es_principal = 0
       WHERE cliente_id = ?`,
      [cliente_id]
    );

    await connection.query(
      `UPDATE direcciones_cliente
       SET es_principal = 1
       WHERE id = ?
         AND cliente_id = ?`,
      [direccionId, cliente_id]
    );

    await connection.commit();

    res.json({
      ok: true,
      mensaje: 'Dirección principal actualizada'
    });
  } catch (err) {
    await connection.rollback();

    console.error('Error al cambiar principal:', err);

    res.status(500).json({
      error: err.message
    });
  } finally {
    connection.release();
  }
});

// Eliminar dirección
// DELETE /api/direcciones/5?cliente_id=12
router.delete('/:id', async (req, res) => {
  const direccionId = req.params.id;
  const { cliente_id } = req.query;

  if (!cliente_id) {
    return res.status(400).json({
      error: 'cliente_id es requerido'
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, es_principal
       FROM direcciones_cliente
       WHERE id = ?
         AND cliente_id = ?`,
      [direccionId, cliente_id]
    );

    if (!rows.length) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Dirección no encontrada'
      });
    }

    const eraPrincipal = rows[0].es_principal === 1;

    await connection.query(
      `DELETE FROM direcciones_cliente
       WHERE id = ?
         AND cliente_id = ?`,
      [direccionId, cliente_id]
    );

    // Si eliminó la principal, hacer principal a la más reciente
    if (eraPrincipal) {
      const [restantes] = await connection.query(
        `SELECT id
         FROM direcciones_cliente
         WHERE cliente_id = ?
         ORDER BY creado_en DESC
         LIMIT 1`,
        [cliente_id]
      );

      if (restantes.length) {
        await connection.query(
          `UPDATE direcciones_cliente
           SET es_principal = 1
           WHERE id = ?`,
          [restantes[0].id]
        );
      }
    }

    await connection.commit();

    res.json({
      ok: true,
      mensaje: 'Dirección eliminada'
    });
  } catch (err) {
    await connection.rollback();

    console.error('Error al eliminar dirección:', err);

    res.status(500).json({
      error: err.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router;