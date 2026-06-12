const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET /api/configuracion-publica
router.get("/configuracion-publica", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT clave, valor
       FROM configuracion_sistema
       WHERE clave IN (
         'nombre_plataforma',
         'whatsapp_soporte',
         'correo_soporte',
         'estado_sistema'
       )`
    );

    const config = {};

    rows.forEach(row => {
      config[row.clave] = row.valor;
    });

    res.json({
      nombre_plataforma: config.nombre_plataforma || "InariGo",
      whatsapp_soporte:
        config.whatsapp_soporte || "51944847425",
      correo_soporte:
        config.correo_soporte || "soporte@inarigo.com",
      estado_sistema:
        config.estado_sistema || "activo"
    });
  } catch (error) {
    console.error(
      "Error cargando configuración pública:",
      error
    );

    res.status(500).json({
      error: "No se pudo cargar la configuración"
    });
  }
});

module.exports = router;