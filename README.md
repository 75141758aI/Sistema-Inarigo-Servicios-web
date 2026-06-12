# Backend InariGo

Backend del sistema de reservas **InariGo**, desarrollado con **Node.js**, **Express** y **MySQL**.

El proyecto permite gestionar negocios de servicios, clientes, reservas, horarios, colaboradores, permisos, check-in mediante QR y notificaciones. Incluye accesos separados para **SuperAdmin**, **Administrador**, **Colaborador** y **Cliente**.

> Este repositorio está preparado para pruebas locales. Los archivos SQL incluidos contienen únicamente datos ficticios.

---

## 1. Funciones principales

- Registro e inicio de sesión de clientes.
- Inicio de sesión de administradores, colaboradores y SuperAdmin.
- Gestión de negocios, servicios y horarios.
- Creación, confirmación, cancelación y finalización de reservas.
- Generación de códigos QR para el check-in.
- Gestión de clientes, perfiles, mascotas, direcciones y favoritos.
- Administración de colaboradores y permisos.
- Panel general del SuperAdmin.
- Integración opcional con Cloudinary, Twilio, Gmail y Firebase.

---

## 2. Tecnologías

- Node.js 20 o superior.
- Express.
- MySQL 8.
- JWT.
- bcrypt y bcryptjs.
- Firebase Admin.
- Cloudinary.
- Nodemailer.
- Twilio.
- QRCode.
- UUID.
- Docker y Docker Compose, opcionales.

---

## 3. Estructura del proyecto

```text
Sistema-Inarigo-Servicios-web/
├── middleware/
│   ├── auth.js
│   ├── verificarAdmin.js
│   └── verificarSuperadmin.js
│
├── routes/
│   ├── admin_auth.js
│   ├── admin_panel.js
│   ├── auth.js
│   ├── auth_clientes.js
│   ├── checkins.js
│   ├── clientes.js
│   ├── configuracion.js
│   ├── direcciones.js
│   ├── favoritos.js
│   ├── negocios.js
│   ├── perfiles.js
│   ├── soporte.js
│   ├── superadmin.js
│   ├── superadmin_auth.js
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
├── .dockerignore
├── .env.example
├── .gitignore
├── db.js
├── docker-compose.yml
├── Dockerfile
├── package.json
├── package-lock.json
├── README.md
└── server.js
```

La carpeta `public/` es opcional. Solo es necesaria si el mismo backend servirá una página como `checkin.html`.

---

# PARTE A: EJECUCIÓN LOCAL SIN DOCKER

## 4. Requisitos previos

Instalar:

- Node.js 20 o superior.
- npm.
- MySQL Server 8.
- Git.
- MySQL Workbench, opcional.

Comprobar las versiones:

```bash
node --version
npm --version
mysql --version
git --version
```

---

## 5. Clonar el repositorio

```bash
git clone https://github.com/75141758aI/Sistema-Inarigo-Servicios-web.git
cd Sistema-Inarigo-Servicios-web
```

---

## 6. Instalar las dependencias

Se recomienda:

```bash
npm ci
```

También se puede utilizar:

```bash
npm install
```

La carpeta `node_modules/` se generará automáticamente y no debe subirse a GitHub.

---

## 7. Crear el archivo `.env`

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

### Windows CMD

```cmd
copy .env.example .env
```

### Linux o macOS

```bash
cp .env.example .env
```

Después, abrir `.env` y configurar al menos:

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

Ejemplo si MySQL tiene contraseña:

```env
DB_USER=root
DB_PASSWORD=MiClaveDeMySQL
DB_NAME=sistema_qr
```

El archivo `.env` contiene configuración privada y **no debe subirse a GitHub**.

---

# 8. Base de datos

La base de datos utilizada por el proyecto se llama:

```text
sistema_qr
```

Los archivos se encuentran en:

```text
sql/01_estructura.sql
sql/02_datos_demo.sql
```

## 8.1 `01_estructura.sql`

Este archivo:

- Crea la base de datos `sistema_qr`.
- Elimina las tablas y vistas anteriores si existen.
- Crea las tablas, relaciones, índices y vistas.
- No contiene clientes ni credenciales reales.

> **Advertencia:** al volver a ejecutar este archivo se elimina la estructura anterior y sus datos. Debe usarse únicamente en pruebas locales o en una base vacía.

## 8.2 `02_datos_demo.sql`

Este archivo:

- Limpia los registros existentes.
- Reinicia los contadores `AUTO_INCREMENT`.
- Inserta cuentas, negocio, servicios, horarios, permisos y reservas ficticias.
- Puede ejecutarse varias veces para restaurar el entorno de demostración.

> **Advertencia:** este archivo elimina los registros existentes. No debe ejecutarse en producción.

## 8.3 Tablas principales

| Grupo | Tablas |
|---|---|
| Accesos | `clientes`, `usuarios`, `superadmins` |
| Negocios | `negocios`, `servicios`, `horarios_negocio`, `horarios` |
| Reservas | `turnos`, `checkins`, `notificaciones` |
| Cliente | `perfiles_usuario`, `direcciones_cliente`, `favoritos` |
| Permisos | `permisos_usuario` |
| Configuración | `configuracion_sistema`, `opciones_perfil_negocio` |

También se incluyen las vistas:

```text
v_turnos_hoy
v_estadisticas_asistencia
```

---

## 9. Importar la base de datos desde la terminal

Desde la raíz del proyecto:

```bash
mysql -u root -p < sql/01_estructura.sql
mysql -u root -p sistema_qr < sql/02_datos_demo.sql
```

Cuando se solicite, escribir la contraseña del usuario `root`.

Si MySQL no tiene contraseña:

```bash
mysql -u root < sql/01_estructura.sql
mysql -u root sistema_qr < sql/02_datos_demo.sql
```

---

## 10. Importar con MySQL Workbench

1. Abrir MySQL Workbench.
2. Conectarse al servidor local.
3. Seleccionar **File → Open SQL Script**.
4. Abrir `sql/01_estructura.sql`.
5. Ejecutar todo el archivo.
6. Abrir `sql/02_datos_demo.sql`.
7. Ejecutar todo el archivo.
8. Actualizar la lista de esquemas.
9. Verificar que exista `sistema_qr`.

---

# 11. Usuarios de demostración

Todas las cuentas demo utilizan la misma contraseña:

```text
Demo1234
```

| Tipo de usuario | Correo | Contraseña | Acceso |
|---|---|---|---|
| SuperAdmin | `superadmin@demo.com` | `Demo1234` | Administración general |
| Administrador | `admin@demo.com` | `Demo1234` | Panel del negocio |
| Colaborador | `colaborador@demo.com` | `Demo1234` | Panel según permisos |
| Cliente | `cliente@demo.com` | `Demo1234` | Aplicación del cliente |

Datos adicionales del cliente demo:

```text
Nombre: Cliente Demo
Teléfono: 900000001
```

Las contraseñas no se guardan como texto dentro de MySQL. El archivo demo contiene hashes bcrypt compatibles con `Demo1234`.

---

## 12. Función de cada usuario

### SuperAdmin

Puede:

- Consultar el resumen general.
- Crear y editar negocios.
- Activar o suspender negocios.
- Crear usuarios para los negocios.
- Activar o desactivar usuarios.
- Cambiar contraseñas.
- Configurar datos generales de InariGo.

Inicio de sesión:

```text
POST /api/superadmin-auth/login
```

### Administrador

Gestiona únicamente su negocio:

- Reservas.
- Servicios.
- Clientes.
- Colaboradores.
- Permisos.
- Horarios.
- Datos y configuración del negocio.
- Check-in por QR.

Inicio de sesión:

```text
POST /api/admin-auth/login
```

### Colaborador

Ingresa por la misma ruta del administrador, pero solo puede usar las funciones que el administrador le haya permitido.

Permisos disponibles:

```text
ver_dashboard
ver_reservas
crear_reservas
aprobar_reservas
rechazar_reservas
escanear_qr
finalizar_atencion
ver_clientes
```

Inicio de sesión:

```text
POST /api/admin-auth/login
```

### Cliente

Puede:

- Registrarse e iniciar sesión.
- Consultar negocios y servicios.
- Crear y cancelar reservas.
- Guardar perfiles o mascotas.
- Guardar direcciones.
- Marcar negocios como favoritos.
- Consultar sus reservas y QR.

Inicio de sesión:

```text
POST /api/auth/cliente/login
```

El login acepta correo o teléfono.

---

## 13. Iniciar el backend

```bash
npm start
```

El servidor debe mostrar:

```text
Servidor corriendo en http://localhost:3000
```

Comprobar en el navegador:

```text
http://localhost:3000
```

También puede probarse:

```text
http://localhost:3000/api/negocios
```

---

## 14. Pruebas rápidas con PowerShell

### Login del cliente

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/auth/cliente/login" `
  -ContentType "application/json" `
  -Body '{"email":"cliente@demo.com","password":"Demo1234"}'
```

### Login del administrador

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/admin-auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"admin@demo.com","password":"Demo1234"}'
```

### Login del colaborador

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/admin-auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"colaborador@demo.com","password":"Demo1234"}'
```

### Login del SuperAdmin

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/superadmin-auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"superadmin@demo.com","password":"Demo1234"}'
```

---

# PARTE B: EJECUCIÓN CON DOCKER

## 15. Requisitos para Docker

Instalar:

- Docker Desktop en Windows o macOS.
- Docker Engine y Docker Compose en Linux.

Comprobar:

```bash
docker --version
docker compose version
```

El proyecto utiliza:

```text
Dockerfile
docker-compose.yml
.dockerignore
```

---

## 16. Iniciar todo con Docker

Desde la raíz del repositorio:

```bash
docker compose up --build
```

Este comando:

1. Construye la imagen del backend.
2. Crea un contenedor MySQL 8.
3. Crea automáticamente la base `sistema_qr`.
4. Ejecuta `01_estructura.sql`.
5. Ejecuta `02_datos_demo.sql`.
6. Inicia el backend en el puerto 3000.

Cuando termine:

```text
Backend: http://localhost:3000
MySQL:   localhost:3307
```

El puerto MySQL del host es `3307` para evitar conflictos con una instalación local que ya utilice `3306`.

Para ejecutar en segundo plano:

```bash
docker compose up -d --build
```

---

## 17. Consultar el estado de los contenedores

```bash
docker compose ps
```

Ver registros del backend:

```bash
docker compose logs -f app
```

Ver registros de MySQL:

```bash
docker compose logs -f db
```

Ver todos los registros:

```bash
docker compose logs -f
```

---

## 18. Detener Docker

Detener los contenedores sin borrar los datos:

```bash
docker compose down
```

Detener y borrar también la base de datos almacenada:

```bash
docker compose down -v
```

> Los scripts SQL de inicialización solo se ejecutan cuando el volumen de MySQL está vacío. Para restaurar completamente los datos demo, usar `docker compose down -v` y luego iniciar nuevamente.

Restablecer la demostración:

```bash
docker compose down -v
docker compose up -d --build
```

---

## 19. Acceder a MySQL dentro de Docker

```bash
docker compose exec db mysql -u root -p
```

La contraseña predeterminada del entorno Docker es:

```text
inarigo_demo_2026
```

Después:

```sql
USE sistema_qr;
SHOW TABLES;
SELECT * FROM usuarios;
SELECT * FROM clientes;
```

También se puede conectar desde MySQL Workbench:

```text
Host: 127.0.0.1
Puerto: 3307
Usuario: root
Contraseña: inarigo_demo_2026
Base de datos: sistema_qr
```

La contraseña anterior es únicamente para el entorno local de demostración. Debe cambiarse antes de cualquier despliegue real.

---

## 20. Variables opcionales en Docker

El archivo `docker-compose.yml` permite utilizar variables del sistema o de un archivo `.env`.

Ejemplo:

```env
MYSQL_ROOT_PASSWORD=otra_clave_local
JWT_SECRET=otra_clave_jwt
BASE_URL=http://localhost:3000
```

Servicios opcionales:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=

GMAIL_USER=
GMAIL_PASS=

EMAIL_USER=
EMAIL_PASS=
EMAIL_DESTINO=

GOOGLE_APPLICATION_CREDENTIALS=
```

Si no se configuran, el backend continuará funcionando, pero no enviará mensajes, correos, notificaciones push ni subirá imágenes.

---

# 21. Conectar el frontend

El frontend debe usar:

```js
const API_URL = 'http://localhost:3000/api';
```

Ejemplo:

```js
fetch(`${API_URL}/negocios`)
  .then(response => response.json())
  .then(data => console.log(data));
```

El backend tiene CORS habilitado.

Ejemplo:

```text
Frontend: http://127.0.0.1:5500
Backend:  http://localhost:3000
```

---

## 22. Configurar el enlace del QR

La variable `BASE_URL` determina dónde se encuentra la página de check-in.

Si `checkin.html` se sirve desde el backend:

```env
BASE_URL=http://localhost:3000
```

El archivo debe encontrarse en:

```text
public/checkin.html
```

Si el docente utiliza su propio frontend en Live Server:

```env
BASE_URL=http://127.0.0.1:5500
```

El QR generado apuntará a:

```text
http://127.0.0.1:5500/checkin.html?token=TOKEN
```

Después de modificar `.env`, reiniciar el backend o los contenedores.

Sin Docker:

```bash
npm start
```

Con Docker:

```bash
docker compose up -d --build
```

---

# 23. Endpoints principales

## Autenticación

```text
POST /api/auth/cliente/registro
POST /api/auth/cliente/login
POST /api/auth/cliente/google
POST /api/auth/cliente/crear-password
GET  /api/auth/cliente/perfil

POST /api/admin-auth/login
POST /api/superadmin-auth/login
```

## Negocios

```text
GET /api/negocios
GET /api/negocios/buscar?q=texto
GET /api/negocios/cerca?lat=valor&lng=valor&radio_km=10
GET /api/negocios/:id
GET /api/negocios/:id/servicios
GET /api/negocios/:id/horarios
GET /api/negocios/:id/colaboradores
```

## Reservas

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

## Check-in

```text
POST /api/checkins/:qr_token
```

## Cliente

```text
GET    /api/clientes
GET    /api/clientes/telefono/:telefono
GET    /api/clientes/:id/turnos
POST   /api/clientes
PUT    /api/clientes/:id

GET    /api/perfiles
GET    /api/perfiles/:tipo
POST   /api/perfiles
PUT    /api/perfiles/:id
DELETE /api/perfiles/:id

GET    /api/favoritos
POST   /api/favoritos/:negocioId
DELETE /api/favoritos/:negocioId
GET    /api/favoritos/check/:negocioId

GET    /api/direcciones/cliente/:clienteId
POST   /api/direcciones
PUT    /api/direcciones/:id/principal
DELETE /api/direcciones/:id
```

## Panel administrativo

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

## SuperAdmin

```text
GET   /api/superadmin/overview
GET   /api/superadmin/negocios
GET   /api/superadmin/negocios/:id
POST  /api/superadmin/negocios
PUT   /api/superadmin/negocios/:id
PATCH /api/superadmin/negocios/:id/estado

GET   /api/superadmin/usuarios
POST  /api/superadmin/negocios/:negocio_id/usuarios
PATCH /api/superadmin/usuarios/:id/estado
PATCH /api/superadmin/usuarios/:id/password

GET   /api/superadmin/ajustes
PUT   /api/superadmin/ajustes
```

---

## 24. Autenticación JWT

Las rutas protegidas esperan:

```text
Authorization: Bearer TOKEN
```

Ejemplo:

```js
fetch('http://localhost:3000/api/perfiles', {
  headers: {
    Authorization: `Bearer ${token}`
  }
});
```

En Postman:

```text
Authorization
Type: Bearer Token
Token: TOKEN_GENERADO_EN_EL_LOGIN
```

---

## 25. Servicios externos opcionales

| Servicio | Obligatorio | Función |
|---|---:|---|
| MySQL | Sí | Almacenamiento principal |
| Node.js | Sí sin Docker | Ejecución del backend |
| Docker | No | Entorno automático |
| JWT | Sí | Autenticación |
| Cloudinary | No | Fotos y logos |
| Twilio | No | WhatsApp |
| Gmail | No | Correos |
| Firebase | No | Notificaciones push |

Las funciones principales pueden probarse sin Cloudinary, Twilio, Gmail o Firebase.

---

## 26. Problemas frecuentes

### `Access denied for user`

Revisar:

```env
DB_USER=root
DB_PASSWORD=CONTRASEÑA_CORRECTA
```

### `Unknown database 'sistema_qr'`

Ejecutar:

```bash
mysql -u root -p < sql/01_estructura.sql
mysql -u root -p sistema_qr < sql/02_datos_demo.sql
```

### Puerto 3000 ocupado

Cambiar:

```env
PORT=3001
```

Con Docker, cambiar:

```yaml
ports:
  - "3001:3000"
```

### Puerto 3307 ocupado

Cambiar en `docker-compose.yml`:

```yaml
ports:
  - "3308:3306"
```

### Los datos demo no vuelven a cargarse con Docker

MySQL conserva el volumen. Ejecutar:

```bash
docker compose down -v
docker compose up -d --build
```

### Firebase, Twilio, Gmail o Cloudinary no configurados

El backend seguirá funcionando. Solo se omitirán esas integraciones.

### El QR abre una página incorrecta

Revisar `BASE_URL` y la ubicación real de `checkin.html`.

---

## 27. Seguridad

No subir:

```text
.env
node_modules/
archivos JSON de Firebase
credenciales reales
backups con datos personales
claves de Cloudinary
claves de Twilio
contraseñas de Gmail
```

El `.gitignore` debe incluir:

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
inarigo_backup*.sql
```

`01_estructura.sql`, `02_datos_demo.sql` y `.env.example` sí pueden subirse porque están preparados para demostración.

---

## 28. Comandos resumidos

### Sin Docker

```bash
git clone https://github.com/75141758aI/Sistema-Inarigo-Servicios-web.git
cd Sistema-Inarigo-Servicios-web
npm ci
cp .env.example .env
mysql -u root -p < sql/01_estructura.sql
mysql -u root -p sistema_qr < sql/02_datos_demo.sql
npm start
```

En Windows PowerShell, reemplazar:

```powershell
Copy-Item .env.example .env
```

### Con Docker

```bash
git clone https://github.com/75141758aI/Sistema-Inarigo-Servicios-web.git
cd Sistema-Inarigo-Servicios-web
docker compose up -d --build
docker compose ps
```

Restablecer la base demo:

```bash
docker compose down -v
docker compose up -d --build
```

---

## Autor

Proyecto académico y comercial del sistema de reservas **InariGo**.