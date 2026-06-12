const jwt = require('jsonwebtoken');

const SECRET =
  process.env.JWT_SECRET || 'inarivet_secret_2026';

function verificarSuperadmin(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Token de superadmin requerido'
    });
  }

  try {
    const token = auth.split(' ')[1];

    const payload = jwt.verify(
      token,
      SECRET
    );

    if (payload.rol !== 'superadmin') {
      return res.status(403).json({
        error: 'No tienes permisos de superadmin'
      });
    }

    req.superadmin = payload;

    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
}

module.exports = {
  verificarSuperadmin
};