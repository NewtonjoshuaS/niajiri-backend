-- Add Candidate and WhatsApp session models to Prisma schema

CREATE TABLE `candidates` (
  `id` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `email` varchar(191) DEFAULT NULL,
  `skills` text DEFAULT NULL,
  `location` varchar(191) DEFAULT NULL,
  `cvUrl` text DEFAULT NULL,
  `whatsappStatus` varchar(191) NOT NULL DEFAULT 'NEW',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidates_phone_key` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE `whatsapp_sessions` (
  `id` varchar(191) NOT NULL,
  `phone` varchar(191) NOT NULL,
  `state` varchar(191) NOT NULL,
  `status` varchar(191) NOT NULL DEFAULT 'ACTIVE',
  `lastMessage` text DEFAULT NULL,
  `candidateName` varchar(191) DEFAULT NULL,
  `candidateEmail` varchar(191) DEFAULT NULL,
  `skills` text DEFAULT NULL,
  `location` varchar(191) DEFAULT NULL,
  `cvUrl` text DEFAULT NULL,
  `candidateId` varchar(191) DEFAULT NULL,
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `whatsapp_sessions_phone_idx` (`phone`),
  KEY `whatsapp_sessions_candidateId_idx` (`candidateId`),
  CONSTRAINT `whatsapp_sessions_candidateId_fkey` FOREIGN KEY (`candidateId`) REFERENCES `candidates` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
