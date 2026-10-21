ALTER TABLE `GoogleReview`
    ADD COLUMN `source` VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `googleReviewId` VARCHAR(255) NULL,
    ADD COLUMN `authorUri` TEXT NULL,
    ADD COLUMN `authorPhotoUrl` TEXT NULL,
    ADD COLUMN `googleMapsUri` TEXT NULL;

CREATE UNIQUE INDEX `GoogleReview_googleReviewId_key` ON `GoogleReview`(`googleReviewId`);
CREATE INDEX `GoogleReview_source_idx` ON `GoogleReview`(`source`);
