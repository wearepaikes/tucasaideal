ALTER TABLE `BusinessProfile`
    ADD COLUMN `googleRating` DOUBLE NULL,
    ADD COLUMN `googleReviewCount` INTEGER NULL,
    ADD COLUMN `googleMapsUri` TEXT NULL,
    ADD COLUMN `googleReviewsSyncedAt` DATETIME(3) NULL;
