require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const turnosRouter = require('./routes/turnos');
const checkinsRouter = require('./routes/checkins');
const clientesRouter = require('./routes/clientes');
const authRouter = require('./routes/auth');
const negociosRouter = require('./routes/negocios');
const favoritosRouter = require('./routes/favoritos');
const uploadRouter = require('./routes/upload');
const perfilesRouter = require('./routes/perfiles');
const authClientesRouter = require('./routes/auth_clientes');
const soporteRouter = require('./routes/soporte');
const direccionesRouter = require('./routes/direcciones');
const adminPanelRouter = require('./routes/admin_panel');
const adminAuthRouter = require('./routes/admin_auth');
const superadminAuthRouter = require('./routes/superadmin_auth');
const superadminRouter = require('./routes/superadmin');
const configuracionRouter = require('./routes/configuracion');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

app.use(
  express.json({
    limit: '10mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb'
  })
);

app.use(
  express.static(
    path.join(__dirname, 'public')
  )
);

app.use('/api/auth', authRouter);
app.use('/api/turnos', turnosRouter);
app.use('/api/checkins', checkinsRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/negocios', negociosRouter);
app.use('/api/favoritos', favoritosRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/perfiles', perfilesRouter);
app.use('/api/auth/cliente', authClientesRouter);
app.use('/api/soporte', soporteRouter);
app.use('/api/direcciones', direccionesRouter);
app.use('/api/admin-panel', adminPanelRouter);
app.use('/api/admin-auth', adminAuthRouter);
app.use(
  '/api/superadmin-auth',
  superadminAuthRouter
);
app.use('/api/superadmin', superadminRouter);
app.use('/api', configuracionRouter);

app.get('/', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Backend de InariGo funcionando'
  });
});

app.listen(PORT, () => {
  console.log(
    `Servidor corriendo en http://localhost:${PORT}`
  );
});