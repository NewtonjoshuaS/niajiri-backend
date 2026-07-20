require("dotenv").config();
const fs = require("fs");
const app = require("./app");
const logger = require("./utils/logger");
const prisma = require("./config/prisma");

if (!fs.existsSync("logs")) fs.mkdirSync("logs");

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await prisma.$connect();
    logger.info("Connected to MySQL via Prisma.");

    const server = app.listen(PORT, () => {
      logger.info(`Niajiri API listening on http://localhost:${PORT}`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
}

start();
