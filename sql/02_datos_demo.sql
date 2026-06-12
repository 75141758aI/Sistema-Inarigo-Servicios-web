USE `sistema_qr`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM `notificaciones`;
DELETE FROM `checkins`;
DELETE FROM `turnos`;
DELETE FROM `permisos_usuario`;
DELETE FROM `perfiles_usuario`;
DELETE FROM `opciones_perfil_negocio`;
DELETE FROM `horarios_negocio`;
DELETE FROM `horarios`;
DELETE FROM `favoritos`;
DELETE FROM `direcciones_cliente`;
DELETE FROM `servicios`;
DELETE FROM `usuarios`;
DELETE FROM `superadmins`;
DELETE FROM `negocios`;
DELETE FROM `configuracion_sistema`;
DELETE FROM `clientes`;

ALTER TABLE `notificaciones` AUTO_INCREMENT = 1;
ALTER TABLE `checkins` AUTO_INCREMENT = 1;
ALTER TABLE `turnos` AUTO_INCREMENT = 1;
ALTER TABLE `permisos_usuario` AUTO_INCREMENT = 1;
ALTER TABLE `perfiles_usuario` AUTO_INCREMENT = 1;
ALTER TABLE `opciones_perfil_negocio` AUTO_INCREMENT = 1;
ALTER TABLE `horarios_negocio` AUTO_INCREMENT = 1;
ALTER TABLE `horarios` AUTO_INCREMENT = 1;
ALTER TABLE `favoritos` AUTO_INCREMENT = 1;
ALTER TABLE `direcciones_cliente` AUTO_INCREMENT = 1;
ALTER TABLE `servicios` AUTO_INCREMENT = 1;
ALTER TABLE `usuarios` AUTO_INCREMENT = 1;
ALTER TABLE `superadmins` AUTO_INCREMENT = 1;
ALTER TABLE `negocios` AUTO_INCREMENT = 1;
ALTER TABLE `configuracion_sistema` AUTO_INCREMENT = 1;
ALTER TABLE `clientes` AUTO_INCREMENT = 1;

INSERT INTO `configuracion_sistema` (`id`, `clave`, `valor`) VALUES
  (1, 'nombre_plataforma', 'InariGo'),
  (2, 'whatsapp_soporte', '51900000000'),
  (3, 'correo_soporte', 'soporte@demo.com'),
  (4, 'estado_sistema', 'activo'),
  (5, 'mensaje_mantenimiento', '');

INSERT INTO `negocios` (
  `id`, `nombre`, `tipo_negocio`, `descripcion`, `direccion`, `ciudad`,
  `latitud`, `longitud`, `telefono`, `logo_url`, `color_primario`, `activo`,
  `permite_pago_local`, `permite_pago_adelantado`,
  `metodo_pago_adelantado`, `numero_pago_adelantado`, `qr_pago_url`,
  `instrucciones_pago`, `acepta_responsabilidad_pagos`
) VALUES (
  1,
  'Veterinaria Demo InariGo',
  'veterinaria',
  'Negocio ficticio para probar las funciones del sistema.',
  'Av. Demo 123',
  'Huancayo',
  -12.0651300,
  -75.2048600,
  '900000000',
  NULL,
  '#6d3df4',
  1,
  1,
  0,
  NULL,
  NULL,
  NULL,
  NULL,
  0
);

INSERT INTO `superadmins` (
  `id`, `nombre`, `email`, `password_hash`, `activo`
) VALUES (
  1,
  'SuperAdmin Demo',
  'superadmin@demo.com',
  '$2b$10$acND6a0lKZQ69AVhb4jOWOQo9gP0dMq2a0kIqbfIp1I09Wdmez2Ea',
  1
);

INSERT INTO `usuarios` (
  `id`, `negocio_id`, `nombre`, `email`, `password_hash`, `rol`, `activo`
) VALUES
  (1, 1, 'Administrador Demo', 'admin@demo.com', '$2b$10$acND6a0lKZQ69AVhb4jOWOQo9gP0dMq2a0kIqbfIp1I09Wdmez2Ea', 'admin', 1),
  (2, 1, 'Colaborador Demo', 'colaborador@demo.com', '$2b$10$acND6a0lKZQ69AVhb4jOWOQo9gP0dMq2a0kIqbfIp1I09Wdmez2Ea', 'colaborador', 1);

INSERT INTO `clientes` (
  `id`, `nombre`, `telefono`, `email`, `password_hash`, `dni`, `google_id`,
  `foto_url`, `fcm_token`, `notif_reservas`, `notif_promociones`,
  `notif_novedades`, `notif_importantes`
) VALUES (
  1,
  'Cliente Demo',
  '900000001',
  'cliente@demo.com',
  '$2b$10$acND6a0lKZQ69AVhb4jOWOQo9gP0dMq2a0kIqbfIp1I09Wdmez2Ea',
  NULL,
  NULL,
  NULL,
  NULL,
  1,
  1,
  0,
  1
);

INSERT INTO `servicios` (
  `id`, `negocio_id`, `nombre`, `descripcion`, `duracion_min`, `precio`, `activo`
) VALUES
  (1, 1, 'Consulta General', 'Evaluación general de la mascota.', 30, 45.00, 1),
  (2, 1, 'Vacunación', 'Aplicación de vacuna de demostración.', 30, 35.00, 1),
  (3, 1, 'Baño y Corte', 'Servicio de baño y corte.', 60, 60.00, 1);

INSERT INTO `horarios_negocio` (
  `id`, `negocio_id`, `dia_semana`, `abierto`, `hora_inicio`, `hora_fin`
) VALUES
  (1, 1, 0, 0, NULL, NULL),
  (2, 1, 1, 1, '09:00:00', '18:00:00'),
  (3, 1, 2, 1, '09:00:00', '18:00:00'),
  (4, 1, 3, 1, '09:00:00', '18:00:00'),
  (5, 1, 4, 1, '09:00:00', '18:00:00'),
  (6, 1, 5, 1, '09:00:00', '18:00:00'),
  (7, 1, 6, 1, '09:00:00', '14:00:00');

INSERT INTO `horarios` (
  `id`, `colaborador_id`, `dia_semana`, `hora_inicio`, `hora_fin`
) VALUES
  (1, 2, 1, '09:00:00', '18:00:00'),
  (2, 2, 2, '09:00:00', '18:00:00'),
  (3, 2, 3, '09:00:00', '18:00:00'),
  (4, 2, 4, '09:00:00', '18:00:00'),
  (5, 2, 5, '09:00:00', '18:00:00'),
  (6, 2, 6, '09:00:00', '14:00:00');

INSERT INTO `permisos_usuario` (`usuario_id`, `permiso`, `permitido`) VALUES
  (2, 'ver_dashboard', 1),
  (2, 'ver_reservas', 1),
  (2, 'crear_reservas', 1),
  (2, 'aprobar_reservas', 1),
  (2, 'rechazar_reservas', 1),
  (2, 'escanear_qr', 1),
  (2, 'finalizar_atencion', 1),
  (2, 'ver_clientes', 1);

INSERT INTO `opciones_perfil_negocio` (
  `negocio_id`, `tipo_perfil`, `campo`, `valor`, `activo`
) VALUES
  (1, 'veterinaria', 'especie', 'Perro', 1),
  (1, 'veterinaria', 'especie', 'Gato', 1),
  (1, 'veterinaria', 'especie', 'Conejo', 1),
  (1, 'veterinaria', 'especie', 'Ave', 1);

INSERT INTO `perfiles_usuario` (
  `id`, `cliente_id`, `tipo`, `nombre`, `datos`
) VALUES (
  1,
  1,
  'veterinaria',
  'Firulais Demo',
  JSON_OBJECT(
    'especie', 'Perro',
    'raza', 'Mestizo',
    'peso', 12,
    'fecha_nacimiento', '2022-01-15'
  )
);

INSERT INTO `direcciones_cliente` (
  `id`, `cliente_id`, `nombre`, `direccion_texto`, `referencia`,
  `latitud`, `longitud`, `es_principal`
) VALUES (
  1,
  1,
  'Casa Demo',
  'Av. Prueba 456',
  'Dirección ficticia para pruebas',
  -12.0655000,
  -75.2050000,
  1
);

INSERT INTO `favoritos` (`id`, `cliente_id`, `negocio_id`) VALUES
  (1, 1, 1);

INSERT INTO `turnos` (
  `id`, `negocio_id`, `servicio_id`, `cliente_id`, `colaborador_id`,
  `fecha_hora`, `qr_token`, `qr_imagen_url`, `estado`, `notas`,
  `mascota_nombre`, `mascota_especie`, `metodo_pago`, `estado_pago`,
  `acepta_condiciones_pago`
) VALUES
  (
    1, 1, 1, 1, 2,
    TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00'),
    '11111111-1111-4111-8111-111111111111',
    NULL,
    'pendiente',
    'Reserva ficticia pendiente.',
    'Firulais Demo',
    'perro',
    'local',
    'pendiente',
    0
  ),
  (
    2, 1, 2, 1, 2,
    TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:00:00'),
    '22222222-2222-4222-8222-222222222222',
    NULL,
    'confirmado',
    'Reserva ficticia confirmada.',
    'Firulais Demo',
    'perro',
    'local',
    'pendiente',
    0
  ),
  (
    3, 1, 1, 1, 2,
    TIMESTAMP(CURDATE(), '09:00:00'),
    '33333333-3333-4333-8333-333333333333',
    NULL,
    'completado',
    'Reserva ficticia completada.',
    'Firulais Demo',
    'perro',
    'local',
    'pagado',
    0
  );

INSERT INTO `checkins` (
  `id`, `turno_id`, `escaneado_por`, `lat_cliente`, `lng_cliente`,
  `distancia_metros`, `checkin_en`
) VALUES (
  1,
  3,
  2,
  NULL,
  NULL,
  NULL,
  TIMESTAMP(CURDATE(), '08:55:00')
);

INSERT INTO `notificaciones` (
  `id`, `turno_id`, `canal`, `tipo`, `estado`, `referencia_api`, `enviado_en`
) VALUES (
  1,
  2,
  'email',
  'confirmacion',
  'enviado',
  'DEMO-NOTIFICACION-001',
  NOW()
);

SET FOREIGN_KEY_CHECKS = 1;