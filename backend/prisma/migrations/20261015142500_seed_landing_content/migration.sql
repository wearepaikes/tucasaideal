-- Bring the historical landing content into the database without duplicating records.
INSERT INTO `Project` (`slug`,`name`,`status`,`cover`,`photos`,`active`,`createdAt`,`updatedAt`)
SELECT 'complejo-solymar-i','Complejo Solymar I','100% vendido','solymar1_01','["solymar1_01","solymar1_00","solymar1_02","solymar1_03","solymar1_04","solymar1_09"]',true,NOW(3),NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `Project` WHERE `slug`='complejo-solymar-i');
INSERT INTO `Project` (`slug`,`name`,`status`,`cover`,`photos`,`active`,`createdAt`,`updatedAt`)
SELECT 'solymar-gardens','Solymar Gardens','75% vendido','gardens_05','["gardens_05","gardens_00","gardens_03","gardens_04","gardens_06","gardens_07","gardens_13","gardens_17","gardens_14"]',true,NOW(3),NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `Project` WHERE `slug`='solymar-gardens');
INSERT INTO `Project` (`slug`,`name`,`status`,`cover`,`photos`,`active`,`createdAt`,`updatedAt`)
SELECT 'pinar-gardens','Pinar Gardens','En desarrollo','pinar_00','["pinar_00","pinar_01","pinar_02","pinar_03"]',true,NOW(3),NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `Project` WHERE `slug`='pinar-gardens');
INSERT INTO `Project` (`slug`,`name`,`status`,`cover`,`photos`,`active`,`createdAt`,`updatedAt`)
SELECT 'complejo-lagomar-i','Complejo Lagomar I','100% vendido','lagomar_01','["lagomar_01","lagomar_00","lagomar_02","lagomar_03"]',true,NOW(3),NOW(3)
WHERE NOT EXISTS (SELECT 1 FROM `Project` WHERE `slug`='complejo-lagomar-i');

INSERT INTO `Work` (`name`,`model`,`area`,`status`,`location`,`photo`,`youtubeId`,`deliveredAt`,`active`,`createdAt`,`updatedAt`)
SELECT CONCAT('Casa ',seed.model,' m²'),seed.model,CAST(seed.model AS UNSIGNED),'ENTREGADA',seed.location,seed.photo,seed.youtube,NOW(3),true,NOW(3),NOW(3)
FROM (
  SELECT '30' model,'Solís de Mataojo' location,'30m2-solis-de-mataojo' photo,NULL youtube UNION ALL
  SELECT '52','Montevideo','52m2-montevideo',NULL UNION ALL SELECT '52','Piriápolis','52m2-piriapolis',NULL UNION ALL
  SELECT '42','Solís de Mataojo','42m2-solis-de-mataojo',NULL UNION ALL SELECT '42','Ciudad del Plata','42m2-ciudad-del-plata',NULL UNION ALL
  SELECT '42','Solís de Mataojo','42m2-solis-de-mataojo-2',NULL UNION ALL SELECT '18','Salinas','18m2-salinas',NULL UNION ALL
  SELECT '52','Rocha','52m2-rocha',NULL UNION ALL SELECT '30','Maldonado','30m2-maldonado',NULL UNION ALL
  SELECT '42','Guazuvirá Nuevo','42m2-guazuvira-nuevo',NULL UNION ALL SELECT '52','Parque del Plata','52m2-parque-del-plata',NULL UNION ALL
  SELECT '30','Neptunia','30m2-neptunia',NULL UNION ALL SELECT '52','Sauce de Portezuelo','52m2-sauce-de-portezuelo',NULL UNION ALL
  SELECT '30','Pando','30m2-pando',NULL UNION ALL SELECT '30','Maldonado','30m2-maldonado-2',NULL UNION ALL
  SELECT '30','Las Piedras','30m2-las-piedras',NULL UNION ALL SELECT '30','Las Piedras','30m2-las-piedras-2',NULL UNION ALL
  SELECT '42','Av. Instrucciones, Montevideo','42m2-av-instrucciones-montevideo',NULL UNION ALL SELECT '42','Marindia','42m2-marindia',NULL UNION ALL
  SELECT '30','Villa Argentina','30m2-villa-argentina',NULL UNION ALL SELECT '30','Pando','30m2-pando-2',NULL UNION ALL
  SELECT '42','Santa Lucía del Este','42m2-santa-lucia-del-este','r90OHjkdKz0' UNION ALL
  SELECT '52','Treinta y Tres','52m2-treinta-y-tres','yVM38NKud1c' UNION ALL SELECT '52','La Paloma','52m2-la-paloma',NULL
) seed
WHERE NOT EXISTS (SELECT 1 FROM `Work` existing WHERE existing.photo=seed.photo);
