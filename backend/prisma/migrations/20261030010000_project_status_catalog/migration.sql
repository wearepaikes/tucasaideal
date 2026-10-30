CREATE TABLE `ProjectStatus` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(60) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `ProjectStatus_name_key`(`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ProjectStatus` (`name`) VALUES
  ('En desarrollo'),
  ('Próximamente'),
  ('En venta'),
  ('Últimas unidades'),
  ('100% vendido');
