const Twilio = require("twilio");
const logger = require("../utils/logger");
const { accountSid, authToken, whatsappNumber, isConfigured } = require("../config/twilio");

let client;
function getTwilioClient() {
  if (!client) {
    if (!isConfigured) {
      throw new Error(
        "Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER in your environment."
      );
    }
    client = Twilio(accountSid, authToken);
  }
  return client;
}

async function sendWhatsAppMessage(to, message) {
  try {
    const response = await getTwilioClient().messages.create({
      body: message,
      from: whatsappNumber,
      to
    });
    logger.info(`WhatsApp message sent to ${to}: ${response.sid}`);
    return response;
  } catch (error) {
    logger.error(`Twilio error sending WhatsApp message to ${to}: ${error.message}`);
    const forwarded = new Error(`Failed to send WhatsApp message: ${error.message}`);
    forwarded.code = error.code;
    throw forwarded;
  }
}

module.exports = { sendWhatsAppMessage };
