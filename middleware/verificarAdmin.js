const jwt = require('jsonwebtoken');

const SECRET =
  process.env.JWT_SECRET || 'inarivet_secret_2026';

function verificarAdmin(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token de acceso requerido'
    });
  }

  try {
    const token = auth.split(' ')[1];
    const payload = jwt.verify(
      token,
      SECRET
    );

    if (
      !['admin', 'colaborador'].includes(
        payload.rol
      )
    ) {
      return res.status(403).json({
        error: 'No tienes acceso al panel'
      });
    }

    req.admin = payload;

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
}

function verificarNegocioAdmin(req, res, next) {
  if (!req.admin) {
    return res.status(401).json({
      error: 'Sesión no válida'
    });
  }

  const negocioIdParam = Number(
    req.params.negocio_id
  );

  const negocioIdToken = Number(
    req.admin.negocio_id
  );

  if (!negocioIdToken) {
    return res.status(403).json({
      error: 'Tu usuario no tiene negocio asignado'
    });
  }

  if (
    negocioIdParam &&
    negocioIdParam !== negocioIdToken
  ) {
    return res.status(403).json({
      error: 'No tienes acceso a este negocio'
    });
  }

  next();
}

module.exports = {
  verificarAdmin,
  verificarNegocioAdmin
};