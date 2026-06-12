const twilio = require('twilio');
const nodemailer = require('nodemailer');

const BASE_URL =
  process.env.BASE_URL || 'http://localhost:3000';

const twilioConfigurado = Boolean(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_WHATSAPP_FROM
);

const correoConfigurado = Boolean(
  process.env.GMAIL_USER &&
  process.env.GMAIL_PASS
);

const twilioClient = twilioConfigurado
  ? twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
  : null;

const transporter = correoConfigurado
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    })
  : null;

async function enviarWhatsApp(telefono, mensaje) {
  if (!telefono) {
    return {
      ok: false,
      error: 'Sin teléfono'
    };
  }

  if (!twilioConfigurado || !twilioClient) {
    console.log(
      'WhatsApp omitido: Twilio no está configurado'
    );

    return {
      ok: false,
      omitido: true,
      error: 'Twilio no configurado'
    };
  }

  try {
    const msg = await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:+51${telefono}`,
      body: mensaje
    });

    return {
      ok: true,
      sid: msg.sid
    };
  } catch (err) {
    console.error(
      'WhatsApp error:',
      err.message
    );

    return {
      ok: false,
      error: err.message
    };
  }
}

async function enviarEmail(email, asunto, html) {
  if (!email) {
    return {
      ok: false,
      error: 'Sin email'
    };
  }

  if (!correoConfigurado || !transporter) {
    console.log(
      'Correo omitido: Gmail no está configurado'
    );

    return {
      ok: false,
      omitido: true,
      error: 'Correo no configurado'
    };
  }

  try {
    await transporter.sendMail({
      from: `"InariVet" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: asunto,
      html
    });

    return {
      ok: true
    };
  } catch (err) {
    console.error(
      'Email error:',
      err.message
    );

    return {
      ok: false,
      error: err.message
    };
  }
}

async function notificarTurnoCreado({
  nombre,
  mascota,
  telefono,
  email,
  servicio,
  fecha_hora,
  qr_token,
  qr_imagen_url,
  checkin_url
}) {
  const fecha = new Date(fecha_hora).toLocaleString(
    'es-PE',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }
  );

  const url =
    checkin_url ||
    `${BASE_URL}/checkin.html?token=${qr_token}`;

  const mascotaStr =
    mascota || 'tu engreido';

  const mensajeWA =
`Hola ${nombre}!

Tu cita en *InariVet* ha sido confirmada.

*Mascota:* ${mascotaStr}
*Servicio:* ${servicio}
*Fecha:* ${fecha}

Al llegar a la clinica, abre este enlace y toca *"Confirmar mi llegada"*:
${url}

_Por favor trae a tu mascota con correa o en transportador. Los esperamos!_`;

  const htmlEmail = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto">
      <div style="background:#1a6b3c;padding:20px;text-align:center;border-radius:10px 10px 0 0">
        <h2 style="color:white;margin:0">InariVet</h2>

        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:0.9rem">
          Clinica Veterinaria
        </p>
      </div>

      <div style="padding:24px;border:1px solid #eee;border-radius:0 0 10px 10px">
        <h3 style="color:#1a6b3c">
          Hola ${nombre}!
        </h3>

        <p style="color:#666;margin:8px 0">
          La cita de <strong>${mascotaStr}</strong> ha sido confirmada.
        </p>

        <table style="width:100%;margin:16px 0;border-collapse:collapse">
          <tr>
            <td style="padding:8px;color:#666;border-bottom:1px solid #f0f0f0">
              Servicio
            </td>

            <td style="padding:8px;font-weight:bold;border-bottom:1px solid #f0f0f0">
              ${servicio}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;color:#666">
              Fecha y hora
            </td>

            <td style="padding:8px;font-weight:bold">
              ${fecha}
            </td>
          </tr>
        </table>

        <div style="text-align:center;margin:20px 0">
          <a
            href="${url}"
            style="background:#1a6b3c;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold"
          >
            Confirmar mi llegada
          </a>
        </div>

        <p style="color:#999;font-size:0.82rem;text-align:center">
          Por favor trae a tu mascota con correa o en transportador.
        </p>
      </div>
    </div>
  `;

  const [wa, em] = await Promise.all([
    enviarWhatsApp(
      telefono,
      mensajeWA
    ),
    enviarEmail(
      email,
      `Cita confirmada para ${mascotaStr} en InariVet`,
      htmlEmail
    )
  ]);

  return {
    whatsapp: wa,
    email: em
  };
}

async function notificarTurnoRechazado({
  nombre,
  mascota,
  telefono,
  servicio,
  fecha_hora
}) {
  const fecha = new Date(fecha_hora).toLocaleString(
    'es-PE',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }
  );

  const mascotaStr =
    mascota || 'tu mascota';

  const mensaje =
`Hola ${nombre},

Lamentablemente la cita de *${mascotaStr}* para *${servicio}* el *${fecha}* no pudo ser confirmada en *InariVet*.

Por favor contactanos para reagendar tu cita.`;

  return enviarWhatsApp(
    telefono,
    mensaje
  );
}

module.exports = {
  enviarWhatsApp,
  enviarEmail,
  notificarTurnoCreado,
  notificarTurnoRechazado
};