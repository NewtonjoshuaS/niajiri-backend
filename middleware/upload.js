const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 10);

const SUBFOLDERS = ["resumes", "photos", "voice", "logos"];
SUBFOLDERS.forEach((folder) => {
  const dir = path.join(process.cwd(), UPLOAD_DIR, folder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function folderFor(fieldname) {
  if (fieldname === "resume") return "resumes";
  if (fieldname === "photo") return "photos";
  if (fieldname === "voiceNote") return "voice";
  if (fieldname === "logo") return "logos";
  return "misc";
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = folderFor(file.fieldname);
    cb(null, path.join(process.cwd(), UPLOAD_DIR, folder));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const ALLOWED_MIME = {
  resume: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  photo: ["image/jpeg", "image/png", "image/webp"],
  voiceNote: ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm"],
  logo: ["image/jpeg", "image/png", "image/webp", "image/svg+xml"]
};

function fileFilter(req, file, cb) {
  const allowed = ALLOWED_MIME[file.fieldname];
  if (!allowed || allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error(`Unsupported file type for ${file.fieldname}: ${file.mimetype}`));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 }
});

module.exports = upload;
