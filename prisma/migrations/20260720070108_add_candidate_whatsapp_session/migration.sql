-- DropForeignKey
ALTER TABLE `whatsapp_sessions` DROP FOREIGN KEY `whatsapp_sessions_candidateId_fkey`;

-- AlterTable
ALTER TABLE `candidates` MODIFY `skills` VARCHAR(191) NULL,
    MODIFY `cvUrl` VARCHAR(191) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `whatsapp_sessions` MODIFY `skills` VARCHAR(191) NULL,
    MODIFY `cvUrl` VARCHAR(191) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AddForeignKey
ALTER TABLE `whatsapp_sessions` ADD CONSTRAINT `whatsapp_sessions_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `candidates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
