-- CreateTable
CREATE TABLE `BusinessProfile` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `serviceYearsMode` VARCHAR(20) NOT NULL DEFAULT 'AUTOMATIC',
    `serviceStartDate` DATETIME(3) NULL,
    `manualServiceYears` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
