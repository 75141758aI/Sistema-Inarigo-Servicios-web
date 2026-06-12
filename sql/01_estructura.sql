CREATE DATABASE IF NOT EXISTS `sistema_qr`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `sistema_qr`;

SET NAMES utf8mb4;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

DROP VIEW IF EXISTS `v_turnos_hoy`;
DROP VIEW IF EXISTS `v_estadisticas_asistencia`;

DROP TABLE IF EXISTS `notificaciones`;
DROP TABLE IF EXISTS `checkins`;
DROP TABLE IF EXISTS `turnos`;
DROP TABLE IF EXISTS `permisos_usuario`;
DROP TABLE IF EXISTS `perfiles_usuario`;
DROP TABLE IF EXISTS `opciones_perfil_negocio`;
DROP TABLE IF EXISTS `horarios_negocio`;
DROP TABLE IF EXISTS `horarios`;
DROP TABLE IF EXISTS `favoritos`;
DROP TABLE IF EXISTS `direcciones_cliente`;
DROP TABLE IF EXISTS `servicios`;
DROP TABLE IF EXISTS `usuarios`;
DROP TABLE IF EXISTS `superadmins`;
DROP TABLE IF EXISTS `negocios`;
DROP TABLE IF EXISTS `configuracion_sistema`;
DROP TABLE IF EXISTS `clientes`;

CREATE TABLE `clientes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dni` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fcm_token` text COLLATE utf8mb4_unicode_ci,
  `notif_reservas` tinyint(1) NOT NULL DEFAULT '1',
  `notif_promociones` tinyint(1) NOT NULL DEFAULT '1',
  `notif_novedades` tinyint(1) NOT NULL DEFAULT '0',
  `notif_importantes` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_telefono` (`telefono`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Clientes que reservan turnos';

CREATE TABLE `configuracion_sistema` (
  `id` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` text COLLATE utf8mb4_unicode_ci,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `negocios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo_negocio` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'barberia, veterinaria, consultorio, etc.',
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ciudad` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitud` decimal(10,7) NOT NULL COMMENT 'Para verificación GPS de check-in',
  `longitud` decimal(10,7) NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logo_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color_primario` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#2d9e6b',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `permite_pago_local` tinyint(1) NOT NULL DEFAULT '1',
  `permite_pago_adelantado` tinyint(1) NOT NULL DEFAULT '0',
  `metodo_pago_adelantado` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `numero_pago_adelantado` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_pago_url` text COLLATE utf8mb4_unicode_ci,
  `instrucciones_pago` text COLLATE utf8mb4_unicode_ci,
  `acepta_responsabilidad_pagos` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Negocios registrados en la plataforma';

CREATE TABLE `superadmins` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `usuarios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `negocio_id` int unsigned NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` enum('admin','colaborador') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'colaborador',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_email` (`email`),
  KEY `fk_usuarios_negocio` (`negocio_id`),
  CONSTRAINT `fk_usuarios_negocio` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Administradores y colaboradores de cada negocio';

CREATE TABLE `servicios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `negocio_id` int unsigned NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `duracion_min` smallint NOT NULL DEFAULT '30' COMMENT 'Duración en minutos',
  `precio` decimal(8,2) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_servicios_negocio` (`negocio_id`),
  CONSTRAINT `fk_servicios_negocio` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de servicios de cada negocio';

CREATE TABLE `direcciones_cliente` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `cliente_id` int unsigned NOT NULL,
  `nombre` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `direccion_texto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `referencia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitud` decimal(10,7) NOT NULL,
  `longitud` decimal(10,7) NOT NULL,
  `es_principal` tinyint(1) NOT NULL DEFAULT '0',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_direcciones_cliente` (`cliente_id`),
  CONSTRAINT `fk_direcciones_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `favoritos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `cliente_id` int unsigned NOT NULL,
  `negocio_id` int unsigned NOT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_favorito` (`cliente_id`,`negocio_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `horarios` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `colaborador_id` int unsigned NOT NULL,
  `dia_semana` tinyint NOT NULL COMMENT '0=Domingo … 6=Sábado',
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_horarios_colaborador` (`colaborador_id`),
  CONSTRAINT `fk_horarios_colaborador` FOREIGN KEY (`colaborador_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Disponibilidad semanal de cada colaborador';

CREATE TABLE `horarios_negocio` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `negocio_id` int unsigned NOT NULL,
  `dia_semana` tinyint NOT NULL,
  `abierto` tinyint(1) NOT NULL DEFAULT '1',
  `hora_inicio` time DEFAULT NULL,
  `hora_fin` time DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_negocio_dia` (`negocio_id`,`dia_semana`),
  CONSTRAINT `fk_horarios_negocio` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `opciones_perfil_negocio` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `negocio_id` int unsigned NOT NULL,
  `tipo_perfil` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `campo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valor` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_opcion_perfil` (`negocio_id`,`tipo_perfil`,`campo`,`valor`),
  CONSTRAINT `fk_opciones_perfil_negocio` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `perfiles_usuario` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `cliente_id` int unsigned NOT NULL,
  `tipo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `datos` json NOT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cliente_tipo` (`cliente_id`,`tipo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `permisos_usuario` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` int unsigned NOT NULL,
  `permiso` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permitido` tinyint(1) NOT NULL DEFAULT '0',
  `creado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuario_permiso` (`usuario_id`,`permiso`),
  CONSTRAINT `fk_permisos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `turnos` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `negocio_id` int unsigned NOT NULL,
  `servicio_id` int unsigned NOT NULL,
  `cliente_id` int unsigned NOT NULL,
  `colaborador_id` int unsigned DEFAULT NULL COMMENT 'Barbero / médico asignado',
  `fecha_hora` datetime NOT NULL COMMENT 'Fecha y hora de la cita',
  `qr_token` char(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'UUID único para generar el QR',
  `qr_imagen_url` mediumtext COLLATE utf8mb4_unicode_ci,
  `estado` enum('pendiente','confirmado','presente','completado','cancelado','ausente') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `notas` text COLLATE utf8mb4_unicode_ci,
  `mascota_nombre` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mascota_especie` enum('perro','gato','ave','conejo','otro') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `metodo_pago` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `estado_pago` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `acepta_condiciones_pago` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_qr_token` (`qr_token`),
  KEY `fk_turnos_negocio` (`negocio_id`),
  KEY `fk_turnos_servicio` (`servicio_id`),
  KEY `fk_turnos_cliente` (`cliente_id`),
  KEY `fk_turnos_colaborador` (`colaborador_id`),
  CONSTRAINT `fk_turnos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`),
  CONSTRAINT `fk_turnos_colaborador` FOREIGN KEY (`colaborador_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_turnos_negocio` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`),
  CONSTRAINT `fk_turnos_servicio` FOREIGN KEY (`servicio_id`) REFERENCES `servicios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Reservas de turno con token QR único';

CREATE TABLE `checkins` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `turno_id` int unsigned NOT NULL,
  `escaneado_por` int unsigned DEFAULT NULL COMMENT 'Usuario que escaneó (colaborador)',
  `lat_cliente` decimal(10,7) DEFAULT NULL COMMENT 'Ubicación GPS del cliente al escanear',
  `lng_cliente` decimal(10,7) DEFAULT NULL,
  `distancia_metros` int DEFAULT NULL COMMENT 'Distancia calculada al negocio',
  `checkin_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_turno_checkin` (`turno_id`) COMMENT 'Solo un check-in por turno',
  KEY `fk_checkins_usuario` (`escaneado_por`),
  CONSTRAINT `fk_checkins_turno` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`),
  CONSTRAINT `fk_checkins_usuario` FOREIGN KEY (`escaneado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Registro de check-in al escanear el QR';

CREATE TABLE `notificaciones` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `turno_id` int unsigned NOT NULL,
  `canal` enum('whatsapp','sms','email') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('confirmacion','recordatorio','cancelacion','qr') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('pendiente','enviado','fallido') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `referencia_api` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID de mensaje en Twilio / SendGrid',
  `enviado_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_notif_turno` (`turno_id`),
  CONSTRAINT `fk_notif_turno` FOREIGN KEY (`turno_id`) REFERENCES `turnos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Historial de notificaciones enviadas por API';

CREATE OR REPLACE VIEW `v_estadisticas_asistencia` AS
SELECT
  n.nombre AS negocio,
  COUNT(*) AS total_turnos,
  SUM(t.estado IN ('presente', 'completado')) AS asistieron,
  SUM(t.estado = 'ausente') AS ausentes,
  SUM(t.estado = 'cancelado') AS cancelados,
  ROUND(
    SUM(t.estado IN ('presente', 'completado')) / COUNT(*) * 100,
    1
  ) AS pct_asistencia
FROM turnos t
JOIN negocios n ON n.id = t.negocio_id
WHERE t.fecha_hora >= NOW() - INTERVAL 30 DAY
GROUP BY n.id, n.nombre;

CREATE OR REPLACE VIEW `v_turnos_hoy` AS
SELECT
  t.id,
  t.fecha_hora,
  t.estado,
  t.qr_token,
  t.qr_imagen_url,
  t.notas,
  t.mascota_nombre,
  t.mascota_especie,
  c.nombre AS cliente,
  c.telefono AS telefono_cliente,
  s.nombre AS servicio,
  s.duracion_min,
  s.precio,
  u.nombre AS colaborador,
  n.nombre AS negocio,
  ch.checkin_en
FROM turnos t
JOIN clientes c ON c.id = t.cliente_id
JOIN servicios s ON s.id = t.servicio_id
JOIN negocios n ON n.id = t.negocio_id
LEFT JOIN usuarios u ON u.id = t.colaborador_id
LEFT JOIN checkins ch ON ch.turno_id = t.id
WHERE CAST(t.fecha_hora AS DATE) = CURDATE();

SET UNIQUE_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;