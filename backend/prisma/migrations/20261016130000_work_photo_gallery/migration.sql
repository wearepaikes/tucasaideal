ALTER TABLE `Work` ADD COLUMN `photos` JSON NULL;

UPDATE `Work` SET `photos` = JSON_ARRAY(`photo`) WHERE `photos` IS NULL;

ALTER TABLE `Work` MODIFY `photos` JSON NOT NULL;
