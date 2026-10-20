CREATE TABLE `ChatConversation` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `publicId` CHAR(36) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `status` ENUM('WAITING', 'ACTIVE', 'CLOSED') NOT NULL DEFAULT 'WAITING',
  `priority` ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
  `tags` JSON NOT NULL,
  `assignedToId` INTEGER NULL,
  `lastMessageAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `ChatConversation_publicId_key`(`publicId`),
  INDEX `ChatConversation_status_priority_lastMessageAt_idx`(`status`, `priority`, `lastMessageAt`),
  INDEX `ChatConversation_assignedToId_idx`(`assignedToId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ChatConversation_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ChatMessage` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `conversationId` INTEGER NOT NULL,
  `sender` ENUM('VISITOR', 'ADVISOR', 'SYSTEM') NOT NULL,
  `text` TEXT NOT NULL,
  `advisorId` INTEGER NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ChatMessage_conversationId_createdAt_idx`(`conversationId`, `createdAt`),
  INDEX `ChatMessage_advisorId_idx`(`advisorId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `ChatMessage_conversationId_fkey` FOREIGN KEY (`conversationId`) REFERENCES `ChatConversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ChatMessage_advisorId_fkey` FOREIGN KEY (`advisorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
