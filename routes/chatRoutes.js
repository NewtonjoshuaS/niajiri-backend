const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { startSession, answerQuestion, getStatus, uploadCv } = require("../controllers/chatController");
const upload = require("../middleware/upload");

router.post("/sessions", [body("jobId").notEmpty(), body("fullName").trim().notEmpty(), body("phone").trim().isLength({ min: 7 }), body("email").optional({ values: "falsy" }).isEmail(), body("language").optional().isIn(["EN", "SW"])], validate, startSession);
router.post("/sessions/:sessionId/answer", [body("value").optional().isString()], validate, answerQuestion);
router.get("/status", getStatus);
router.post("/upload-cv", upload.single("resume"), uploadCv);

module.exports = router;

