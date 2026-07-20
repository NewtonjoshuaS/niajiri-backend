const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const myPhoneNumber = process.env.MY_PHONE_NUMBER;

const isConfigured = Boolean(accountSid && authToken && whatsappNumber);

module.exports = {
  accountSid,
  authToken,
  whatsappNumber,
  myPhoneNumber,
  isConfigured
};
