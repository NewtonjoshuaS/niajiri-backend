const logger = require("../utils/logger");

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Prisma known error codes
  if (err.code === "P2002") {
    statusCode = 409;
    const field = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : err.meta?.target;
    message = `A record with this ${field || "value"} already exists.`;
  }
  if (err.code === "P2025") {
    statusCode = 404;
    message = "Requested record was not found.";
  }
  if (err.code === "P2003") {
    statusCode = 400;
    message = "Invalid reference to a related record.";
  }

  if (statusCode >= 500) {
    logger.error(err.stack || err.message);
  } else {
    logger.warn(`${statusCode} - ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack })
  });
}

module.exports = { ApiError, notFound, errorHandler };
