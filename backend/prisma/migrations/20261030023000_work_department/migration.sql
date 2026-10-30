ALTER TABLE `Work` ADD COLUMN `department` VARCHAR(60) NULL;

UPDATE `Work`
SET `department` = CASE
  WHEN LOWER(`location`) LIKE '%montevideo%' OR LOWER(`location`) LIKE '%instrucciones%' THEN 'Montevideo'
  WHEN LOWER(`location`) LIKE '%maldonado%' OR LOWER(`location`) LIKE '%piriápolis%' OR LOWER(`location`) LIKE '%piriapolis%' OR LOWER(`location`) LIKE '%sauce de portezuelo%' THEN 'Maldonado'
  WHEN LOWER(`location`) LIKE '%solís de mataojo%' OR LOWER(`location`) LIKE '%solis de mataojo%' THEN 'Lavalleja'
  WHEN LOWER(`location`) LIKE '%rocha%' OR LOWER(`location`) LIKE '%la paloma%' OR LOWER(`location`) LIKE '%punta del diablo%' THEN 'Rocha'
  WHEN LOWER(`location`) LIKE '%ciudad del plata%' THEN 'San José'
  WHEN LOWER(`location`) LIKE '%treinta y tres%' THEN 'Treinta y Tres'
  WHEN LOWER(`location`) LIKE '%salinas%' OR LOWER(`location`) LIKE '%parque del plata%' OR LOWER(`location`) LIKE '%neptunia%' OR LOWER(`location`) LIKE '%pando%' OR LOWER(`location`) LIKE '%las piedras%' OR LOWER(`location`) LIKE '%marindia%' OR LOWER(`location`) LIKE '%villa argentina%' OR LOWER(`location`) LIKE '%solymar%' OR LOWER(`location`) LIKE '%solimar%' OR LOWER(`location`) LIKE '%lagomar%' OR LOWER(`location`) LIKE '%el pinar%' OR LOWER(`location`) LIKE '%santa lucía del este%' OR LOWER(`location`) LIKE '%santa lucia del este%' OR LOWER(`location`) LIKE '%guazuvirá%' OR LOWER(`location`) LIKE '%guazuvira%' THEN 'Canelones'
  ELSE 'Otros'
END;

ALTER TABLE `Work` MODIFY `department` VARCHAR(60) NOT NULL;
