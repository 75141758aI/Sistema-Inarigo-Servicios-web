const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.headers['authorization'];

  if (!header) {
    return res.status(401).json({
      error: 'Token requerido'
    });
  }

  const token = header.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Token requerido'
    });
  }

  try {
    req.usuario = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    next();
  } catch {
    res.status(401).json({
      error: 'Token invalido o expirado'
    });
  }
};