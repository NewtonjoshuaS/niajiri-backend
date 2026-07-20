const { PrismaClient } = require("@prisma/client");
const logger = require("../utils/logger");

// Reuse a single PrismaClient instance across the app (and across
// nodemon hot-reloads in dev) to avoid exhausting MySQL connections.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" }
    ]
  });

prisma.$on("warn", (e) => logger.warn(e.message));
prisma.$on("error", (e) => logger.error(e.message));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
