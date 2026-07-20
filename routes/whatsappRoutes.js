const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { whatsappWebhook } = require("../controllers/whatsappController");

router.post(
  "/webhook",
  [body("From").notEmpty(), body("Body").notEmpty()],
  validate,
  whatsappWebhook
);

module.exports = router;
