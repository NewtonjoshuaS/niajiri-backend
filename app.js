const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const chatRoutes = require("./routes/chatRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const logger = require("./utils/logger");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));

// Flexible CORS setup to seamlessly support Vercel deployments and local dev
app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      // allow any vercel app deployment, localhost, or process.env.CLIENT_URL
      if (
        origin.endsWith(".vercel.app") ||
        origin.includes("localhost") ||
        origin === process.env.CLIENT_URL
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.info(msg.trim()) }
  })
);

// Static file serving for uploaded resumes/photos/voice notes/logos
app.use("/uploads", express.static(path.join(process.cwd(), process.env.UPLOAD_DIR || "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Niajiri API is running.", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/whatsapp", require("./routes/whatsappRoutes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
