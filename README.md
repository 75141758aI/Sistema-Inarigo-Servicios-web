# Backend InariGo

Backend del sistema de reservas **InariGo**, desarrollado con **Node.js**, **Express** y **MySQL**.

El sistema permite administrar:

* Clientes.
* Negocios.
* Servicios.
* Reservas y turnos.
* Administradores y colaboradores.
* Horarios de atención.
* Perfiles de clientes o mascotas.
* Negocios favoritos.
* Check-in mediante código QR.
* Notificaciones por correo, WhatsApp y Firebase.
* Configuración general de la plataforma.
* Panel de SuperAdmin.

---

## 1. Tecnologías utilizadas

* Node.js
* Express
* MySQL
* JWT
* bcrypt y bcryptjs
* Firebase Admin
* Cloudinary
* Nodemailer
* Twilio
* QRCode
* UUID

---

## 2. Requisitos previos

Antes de instalar el proyecto, se necesita tener instalado:

* Node.js 20 o superior.
* npm.
* MySQL Server.
* MySQL Workbench, opcional.
* Git, si se clonará desde GitHub.

Para comprobar las versiones instaladas:

```bash
node --version
npm --version
mysql --version
git --version
```

Se recomienda utilizar:

```text
Node.js 20 o superior
MySQL 8 o superior
```

---

## 3. Estructura del proyecto

```text
backend-inarigo/
├── middleware/
│   ├── auth.js
│   ├── verificarAdmin.js
│   └── verificarSuperadmin.js
│
├── routes/
│   ├── admin_auth.js
│   ├── admin_panel.js
│   ├── auth_clientes.js
│   ├── auth.js
│   ├── checkins.js
│   ├── clientes.js
│   ├── configuracion.js
│   ├── direcciones.js
│   ├── favoritos.js
│   ├── negocios.js
│   ├── perfiles.js
│   ├── soporte.js
│   ├── superadmin_auth.js
│   ├── superadmin.js
│   ├── turnos.js
│   └── upload.js
│
├── services/
│   ├── firebasePush.js
│   └── notificaciones.js
│
├── sql/
│   ├── 01_estructura.sql
│   └── 02_datos_demo.sql
│
├── public/
│   └── checkin.html
│
├── .env.example
├── .gitignore
├── db.js
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

---

## 4. Clonar el repositorio

Ejecutar:

```bash
git clone URL_DEL_REPOSITORIO
```

Luego ingresar a la carpeta del proyecto:

```bash
cd backend-inarigo
```

Reemplazar `URL_DEL_REPOSITORIO` por la dirección real del repositorio de GitHub.

Ejemplo:

```bash
git clone https://github.com/usuario/backend-inarigo.git
```

---

## 5. Instalar dependencias

Como el proyecto incluye `package-lock.json`, se recomienda ejecutar:

```bash
npm ci
```

También se puede utilizar:

```bash
npm install
```

Esto instalará todas las dependencias necesarias dentro de la carpeta:

```text
node_modules/
```

La carpeta `node_modules` no se incluye en GitHub porque se genera automáticamente.

---

## 6. Crear el archivo `.env`

El repositorio incluye:

```text
.env.example
```

Este archivo contiene solamente los nombres de las variables necesarias, sin contraseñas ni claves privadas.

### En Windows CMD

```cmd
copy .env.example .env
```

### En Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### En Linux o macOS

```bash
cp .env.example .env
```

Después de copiarlo, debe existir este archivo:

```text
backend-inarigo/.env
```

---

## 7. Configurar las variables de entorno

Abrir el archivo `.env` y configurar como mínimo la conexión con MySQL:

```env
PORT=3000
BASE_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=sistema_qr

JWT_SECRET=CAMBIAR_POR_UNA_CLAVE_SEGURA
JWT_EXPIRES=30d
```

Ejemplo con contraseña de MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=mi_contrasena_mysql
DB_NAME=sistema_qr
```

El archivo `.env` no debe subirse a GitHub porque puede contener credenciales privadas.

---

## 8. Servicios externos opcionales

El backend también puede utilizar Cloudinary, Twilio, Gmail y Firebase.

Estas configuraciones son opcionales para las pruebas principales del sistema.

### Cloudinary

Permite subir fotos de perfil y logos de negocios.

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Sin estas variables, el sistema continuará funcionando, pero las rutas de subida de imágenes estarán desactivadas.

### Twilio WhatsApp

Permite enviar mensajes de WhatsApp relacionados con las reservas.

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
```

Sin estas variables, las reservas continuarán registrándose, pero no se enviarán mensajes de WhatsApp.

### Gmail y correo electrónico

Permite enviar confirmaciones y mensajes de soporte.

```env
GMAIL_USER=
GMAIL_PASS=

EMAIL_USER=
EMAIL_PASS=
EMAIL_DESTINO=
```

Sin estas variables, el sistema seguirá funcionando, pero no enviará correos.

### Firebase

Permite enviar notificaciones push a dispositivos móviles.

```env
GOOGLE_APPLICATION_CREDENTIALS=
```

La variable debe contener la ubicación local de una credencial de Firebase.

Ejemplo:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:/credenciales/firebase-admin.json
```

No se debe subir el archivo JSON de Firebase a GitHub.

---

## 9. Crear la base de datos

La carpeta `sql` contiene dos archivos:

```text
sql/01_estructura.sql
sql/02_datos_demo.sql
```

### `01_estructura.sql`

Crea:

* Base de datos.
* Tablas.
* Relaciones.
* Claves primarias.
* Claves foráneas.
* Índices.
* Vistas.

### `02_datos_demo.sql`

Inserta información ficticia para realizar pruebas locales.

---

## 10. Importar la base de datos desde terminal

Ubicado en la carpeta principal del proyecto, ejecutar:

```bash
mysql -u root -p < sql/01_estructura.sql
```

Ingresar la contraseña de MySQL cuando sea solicitada.

Después importar los datos de demostración:

```bash
mysql -u root -p sistema_qr < sql/02_datos_demo.sql
```

Si el usuario root no tiene contraseña:

```bash
mysql -u root < sql/01_estructura.sql
mysql -u root sistema_qr < sql/02_datos_demo.sql
```

---

## 11. Importar la base de datos con MySQL Workbench

También se puede importar utilizando MySQL Workbench.

1. Abrir MySQL Workbench.
2. Conectarse al servidor MySQL local.
3. Seleccionar:

```text
File → Open SQL Script
```

4. Abrir:

```text
sql/01_estructura.sql
```

5. Ejecutar todo el script.
6. Abrir después:

```text
sql/02_datos_demo.sql
```

7. Ejecutar el segundo script.

Al finalizar debe existir la base de datos:

```text
sistema_qr
```

---

## 12. Comprobar la conexión con MySQL

Verificar que el archivo `.env` tenga los mismos datos utilizados en MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=sistema_qr
```

La conexión es administrada por:

```text
db.js
```

---

## 13. Iniciar el servidor

Ejecutar:

```bash
npm start
```

El servidor mostrará un mensaje parecido a:

```text
Servidor corriendo en http://localhost:3000
```

---

## 14. Comprobar que el backend funciona

Abrir en el navegador:

```text
http://localhost:3000
```

Debe mostrarse una respuesta parecida a:

```json
{
  "ok": true,
  "mensaje": "Backend de InariGo funcionando"
}
```

También se puede probar la lista de negocios:

```text
http://localhost:3000/api/negocios
```

---

## 15. Conectar un frontend local

El frontend debe utilizar como dirección base de la API:

```text
http://localhost:3000/api
```

Ejemplo en JavaScript:

```js
const API_URL = 'http://localhost:3000/api';
```

Ejemplo de consulta:

```js
fetch(`${API_URL}/negocios`)
  .then(response => response.json())
  .then(data => console.log(data));
```

El backend tiene CORS habilitado, por lo que puede recibir solicitudes desde otro puerto local.

Ejemplo:

```text
Frontend: http://127.0.0.1:5500
Backend:  http://localhost:3000
```

---

## 16. Configurar el enlace del QR

La variable:

```env
BASE_URL=http://localhost:3000
```

se utiliza para crear los enlaces de check-in.

El enlace generado tendrá una forma similar a:

```text
http://localhost:3000/checkin.html?token=TOKEN_DEL_TURNO
```

Para que funcione, debe existir:

```text
public/checkin.html
```

Si el archivo `checkin.html` se encuentra en otro frontend local, se debe cambiar `BASE_URL`.

Ejemplo:

```env
BASE_URL=http://127.0.0.1:5500
```

Después de modificar `.env`, reiniciar el backend:

```bash
npm start
```

---

## 17. Endpoints principales

### Autenticación de clientes

```text
POST /api/auth/cliente/registro
POST /api/auth/cliente/login
POST /api/auth/cliente/google
POST /api/auth/cliente/crear-password
GET  /api/auth/cliente/perfil
```

### Autenticación de administradores

```text
POST /api/admin-auth/login
```

### Autenticación de SuperAdmin

```text
POST /api/superadmin-auth/login
```

### Negocios

```text
GET /api/negocios
GET /api/negocios/buscar
GET /api/negocios/cerca
GET /api/negocios/:id
GET /api/negocios/:id/servicios
GET /api/negocios/:id/horarios
GET /api/negocios/:id/colaboradores
```

### Turnos y reservas

```text
GET   /api/turnos/hoy
GET   /api/turnos/proximas
GET   /api/turnos/disponibilidad
GET   /api/turnos/disponibles
GET   /api/turnos/token/:qr_token
GET   /api/turnos/:id
POST  /api/turnos
PATCH /api/turnos/cancelar/:qr_token
PATCH /api/turnos/aprobar/:id
PATCH /api/turnos/rechazar/:id
```

### Check-in

```text
POST /api/checkins/:qr_token
```

### Clientes

```text
GET  /api/clientes
GET  /api/clientes/telefono/:telefono
GET  /api/clientes/:id/turnos
POST /api/clientes
PUT  /api/clientes/:id
```

### Perfiles

```text
GET    /api/perfiles
GET    /api/perfiles/:tipo
POST   /api/perfiles
PUT    /api/perfiles/:id
DELETE /api/perfiles/:id
```

### Favoritos

```text
GET    /api/favoritos
POST   /api/favoritos/:negocioId
DELETE /api/favoritos/:negocioId
GET    /api/favoritos/check/:negocioId
```

### Direcciones

```text
GET    /api/direcciones/cliente/:clienteId
POST   /api/direcciones
PUT    /api/direcciones/:id/principal
DELETE /api/direcciones/:id
```

### Panel administrativo

```text
GET   /api/admin-panel/negocios/:negocio_id/dashboard
GET   /api/admin-panel/negocios/:negocio_id/reservas
GET   /api/admin-panel/negocios/:negocio_id/clientes
GET   /api/admin-panel/colaboradores
POST  /api/admin-panel/colaboradores
GET   /api/admin-panel/horarios
PUT   /api/admin-panel/horarios
POST  /api/admin-panel/checkins/qr
PATCH /api/admin-panel/reservas/:id/aprobar
PATCH /api/admin-panel/reservas/:id/rechazar
PATCH /api/admin-panel/reservas/:id/completar
```

### SuperAdmin

```text
GET   /api/superadmin/overview
GET   /api/superadmin/negocios
POST  /api/superadmin/negocios
GET   /api/superadmin/usuarios
GET   /api/superadmin/ajustes
PUT   /api/superadmin/ajustes
PATCH /api/superadmin/negocios/:id/estado
PATCH /api/superadmin/usuarios/:id/estado
```

---

## 18. Autenticación con JWT

Las rutas protegidas necesitan enviar el token mediante el encabezado:

```text
Authorization: Bearer TOKEN
```

Ejemplo con `fetch`:

```js
fetch('http://localhost:3000/api/perfiles', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

Ejemplo en Postman:

```text
Authorization
Type: Bearer Token
Token: TOKEN_GENERADO_AL_INICIAR_SESION
```

---

## 19. Credenciales de prueba

Las credenciales se encuentran definidas dentro de:

```text
sql/02_datos_demo.sql
```

Completar esta sección con las cuentas demo incluidas en el archivo SQL.

### SuperAdmin

```text
Correo: superadmin@demo.com
Contraseña: CAMBIAR_POR_LA_CONTRASEÑA_DEMO
```

### Administrador de negocio

```text
Correo: administrador@demo.com
Contraseña: CAMBIAR_POR_LA_CONTRASEÑA_DEMO
```

### Colaborador

```text
Correo: colaborador@demo.com
Contraseña: CAMBIAR_POR_LA_CONTRASEÑA_DEMO
```

### Cliente

```text
Correo: cliente@demo.com
Contraseña: CAMBIAR_POR_LA_CONTRASEÑA_DEMO
```

Las contraseñas guardadas en la base de datos deben encontrarse cifradas con bcrypt.

---

## 20. Pruebas con Postman

Para iniciar sesión como cliente:

```text
POST http://localhost:3000/api/auth/cliente/login
```

Body JSON:

```json
{
  "email": "cliente@demo.com",
  "password": "CONTRASEÑA_DEMO"
}
```

Para iniciar sesión como administrador:

```text
POST http://localhost:3000/api/admin-auth/login
```

Body JSON:

```json
{
  "email": "administrador@demo.com",
  "password": "CONTRASEÑA_DEMO"
}
```

Para iniciar sesión como SuperAdmin:

```text
POST http://localhost:3000/api/superadmin-auth/login
```

Body JSON:

```json
{
  "email": "superadmin@demo.com",
  "password": "CONTRASEÑA_DEMO"
}
```

---

## 21. Problemas frecuentes

### Error de conexión con MySQL

Ejemplo:

```text
Access denied for user
```

Revisar en `.env`:

```env
DB_USER=root
DB_PASSWORD=CONTRASEÑA_CORRECTA
```

### La base de datos no existe

Ejemplo:

```text
Unknown database 'sistema_qr'
```

Ejecutar:

```bash
mysql -u root -p < sql/01_estructura.sql
```

### El puerto 3000 está ocupado

Cambiar en `.env`:

```env
PORT=3001
```

Luego el backend estará disponible en:

```text
http://localhost:3001
```

### Firebase no está configurado

El backend puede mostrar:

```text
Firebase desactivado
```

Esto no impide probar las funciones principales.

Solo significa que las notificaciones push no se enviarán.

### Twilio no está configurado

El backend puede mostrar:

```text
WhatsApp omitido: Twilio no está configurado
```

La reserva seguirá guardándose normalmente.

### Gmail no está configurado

El backend puede mostrar:

```text
Correo omitido: Gmail no está configurado
```

La reserva seguirá funcionando, pero no se enviará correo.

### Cloudinary no está configurado

Las rutas de carga de imágenes devolverán:

```json
{
  "error": "Cloudinary no está configurado en este entorno"
}
```

El resto del backend continuará funcionando.

### Error relacionado con `checkin.html`

Verificar que exista:

```text
public/checkin.html
```

Y que en `.env` esté configurado:

```env
BASE_URL=http://localhost:3000
```

---

## 22. Reiniciar el servidor

Cuando se modifica el archivo `.env`, se debe detener el servidor con:

```text
Ctrl + C
```

Después volver a ejecutarlo:

```bash
npm start
```

---

## 23. Seguridad

No se deben subir a GitHub los siguientes archivos:

```text
.env
node_modules/
archivos Firebase JSON
credenciales privadas
backups con datos reales
claves de Cloudinary
claves de Twilio
contraseñas de Gmail
```

El archivo `.gitignore` debe incluir:

```gitignore
node_modules/
.env
*.log
*.save

*-firebase-adminsdk-*.json
service-account*.json
*.pem
*.key

backup.sql
inarigo_backup.sql
```

El archivo `.env.example` sí debe subirse porque no contiene credenciales reales.

---

## 24. Comandos resumidos

```bash
git clone URL_DEL_REPOSITORIO
cd backend-inarigo
npm ci
```

Crear `.env`:

```bash
cp .env.example .env
```

Importar la base de datos:

```bash
mysql -u root -p < sql/01_estructura.sql
mysql -u root -p sistema_qr < sql/02_datos_demo.sql
```

Iniciar el backend:

```bash
npm start
```

Comprobar:

```text
http://localhost:3000
```

---

## 25. Estado de los servicios locales

| Servicio   | Obligatorio | Función              |
| ---------- | ----------: | -------------------- |
| MySQL      |          Sí | Almacena los datos   |
| Node.js    |          Sí | Ejecuta el backend   |
| JWT        |          Sí | Autenticación        |
| Cloudinary |          No | Fotos y logos        |
| Twilio     |          No | Mensajes de WhatsApp |
| Gmail      |          No | Correos              |
| Firebase   |          No | Notificaciones push  |

Las funciones principales del backend pueden probarse sin configurar los servicios opcionales.

---

## Autor

Proyecto académico y comercial del sistema de reservas **InariGo**.