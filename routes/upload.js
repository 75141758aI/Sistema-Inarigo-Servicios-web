const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const jwt = require('jsonwebtoken');
const pool = require('../db');

const SECRET =
  process.env.JWT_SECRET || 'inarivet_secret_2026';

const {
  verificarAdmin
} = require('../middleware/verificarAdmin');

const cloudinaryConfigurado = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigurado) {
  cloudinary.config({
    cloud_name:
      process.env.CLOUDINARY_CLOUD_NAME,
    api_key:
      process.env.CLOUDINARY_API_KEY,
    api_secret:
      process.env.CLOUDINARY_API_SECRET
  });
}

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

// POST /api/upload/foto — subir foto de perfil
router.post(
  '/foto',
  verificarToken,
  async (req, res) => {
    if (!cloudinaryConfigurado) {
      return res.status(503).json({
        error:
          'Cloudinary no está configurado en este entorno'
      });
    }

    try {
      const { imagen_base64 } = req.body;

      if (!imagen_base64) {
        return res.status(400).json({
          error: 'imagen_base64 requerida'
        });
      }

      const result =
        await cloudinary.uploader.upload(
          imagen_base64,
          {
            folder: 'inari/perfiles',
            public_id:
              `cliente_${req.cliente.id}`,
            overwrite: true,
            transformation: [
              {
                width: 300,
                height: 300,
                crop: 'fill',
                gravity: 'face'
              }
            ]
          }
        );

      await pool.query(
        `UPDATE clientes
         SET foto_url = ?
         WHERE id = ?`,
        [
          result.secure_url,
          req.cliente.id
        ]
      );

      res.json({
        foto_url: result.secure_url
      });
    } catch (err) {
      res.status(500).json({
        error: err.message
      });
    }
  }
);

// POST /api/upload/logo-negocio
router.post(
  '/logo-negocio',
  verificarAdmin,
  async (req, res) => {
    if (!cloudinaryConfigurado) {
      return res.status(503).json({
        error:
          'Cloudinary no está configurado en este entorno'
      });
    }

    try {
      const {
        imagen_base64,
        negocio_id
      } = req.body;

      if (!imagen_base64) {
        return res.status(400).json({
          error: 'imagen_base64 requerida'
        });
      }

      if (!negocio_id) {
        return res.status(400).json({
          error: 'negocio_id requerido'
        });
      }

      if (
        Number(negocio_id) !==
        Number(req.admin.negocio_id)
      ) {
        return res.status(403).json({
          error:
            'No tienes permiso para subir logo de este negocio'
        });
      }

      const result =
        await cloudinary.uploader.upload(
          imagen_base64,
          {
            folder: 'inari/negocios/logos',
            public_id:
              `negocio_${negocio_id}_logo`,
            overwrite: true,
            transformation: [
              {
                width: 400,
                height: 400,
                crop: 'fill'
              }
            ]
          }
        );

      await pool.query(
        `UPDATE negocios
         SET logo_url = ?
         WHERE id = ?`,
        [
          result.secure_url,
          negocio_id
        ]
      );

      res.json({
        ok: true,
        logo_url: result.secure_url
      });
    } catch (err) {
      console.error(
        'Error subiendo logo negocio:',
        err
      );

      res.status(500).json({
        error: err.message
      });
    }
  }
);

module.exports = router;