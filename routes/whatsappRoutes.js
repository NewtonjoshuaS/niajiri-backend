const router = require("express").Router();
const { whatsappWebhook } = require("../controllers/whatsappController");

// POST — Twilio sends incoming WhatsApp messages here
// No express-validator: Twilio's payload structure varies (media-only messages
// have no Body field) and validation errors would return JSON that Twilio can't
// understand.  The controller handles missing fields gracefully.
router.post("/webhook", whatsappWebhook);

// GET — simple health-check so you (and Twilio) can verify the route exists
router.get("/webhook", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Niajiri WhatsApp webhook is active. Send a POST from Twilio."
  });
});

module.exports = router;
