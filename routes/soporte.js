const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

const emailUser =
  process.env.EMAIL_USER ||
  process.env.GMAIL_USER;

const emailPass =
  process.env.EMAIL_PASS ||
  process.env.GMAIL_PASS;

const emailDestino =
  process.env.EMAIL_DESTINO;

const correoConfigurado = Boolean(
  emailUser &&
  emailPass &&
  emailDestino
);

const transporter = correoConfigurado
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass
      }
    })
  : null;

// POST /api/soporte/correo
router.post('/correo', async (req, res) => {
  const {
    nombre,
    email,
    asunto,
    mensaje
  } = req.body;

  if (!nombre || !mensaje) {
    return res.status(400).json({
      error: 'nombre y mensaje requeridos'
    });
  }

  if (!correoConfigurado || !transporter) {
    return res.status(503).json({
      error:
        'El servicio de correo no está configurado en este entorno'
    });
  }

  try {
    await transporter.sendMail({
      from: `"InariGo Soporte" <${emailUser}>`,
      to: emailDestino,
      replyTo: email || emailUser,
      subject:
        asunto || 'Consulta desde InariGo',
      html: `
        <h3>Nuevo mensaje de soporte</h3>
        <p><b>De:</b> ${nombre}</p>
        <p><b>Email:</b> ${email || 'No proporcionado'}</p>
        <p><b>Asunto:</b> ${asunto || 'Sin asunto'}</p>
        <hr/>
        <p>${mensaje.replace(/\n/g, '<br>')}</p>
      `
    });

    res.json({
      ok: true
    });
  } catch (err) {
    console.error(
      'Error enviando correo de soporte:',
      err
    );

    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;