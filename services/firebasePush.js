const admin = require('firebase-admin');

let firebaseDisponible = false;

if (admin.apps.length) {
  firebaseDisponible = true;
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });

    firebaseDisponible = true;
  } catch (error) {
    console.warn(
      'Firebase no pudo inicializarse:',
      error.message
    );
  }
} else {
  console.warn(
    'Firebase desactivado: GOOGLE_APPLICATION_CREDENTIALS no está configurado'
  );
}

async function enviarPushToken(
  token,
  titulo,
  cuerpo,
  data = {}
) {
  if (!token) {
    console.log(
      'No hay token FCM para enviar notificación'
    );

    return null;
  }

  if (!firebaseDisponible) {
    console.log(
      'Notificación push omitida: Firebase no está configurado'
    );

    return null;
  }

  const message = {
    token,
    notification: {
      title: titulo,
      body: cuerpo
    },
    data: Object.fromEntries(
      Object.entries(data).map(
        ([k, v]) => [k, String(v)]
      )
    ),
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default'
      }
    }
  };

  try {
    const response = await admin
      .messaging()
      .send(message);

    console.log(
      'Push enviado:',
      response
    );

    return response;
  } catch (error) {
    console.error(
      'Error enviando push:',
      error.message
    );

    return null;
  }
}

module.exports = {
  enviarPushToken
};