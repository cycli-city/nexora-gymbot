const twilio = require('twilio');
const config = require('../config');

const client = twilio(config.twilio.sid, config.twilio.token);

// SECURITY: Validates that an incoming webhook genuinely came from Twilio.
// Without this, anyone who finds your webhook URL could POST fake messages,
// trigger AI calls, and run up your Groq/Twilio bill (a real attack vector).
const validateTwilioSignature = (signature, url, params) => {
  if (!signature) return false;
  return twilio.validateRequest(config.twilio.token, signature, url, params);
};

const sendMessage = async (to, body) => {
  // Basic E.164 sanity check before sending
  if (!/^\+\d{8,15}$/.test(to)) {
    console.error(`Refusing to send to invalid number: ${to}`);
    return;
  }
  try {
    await client.messages.create({
      from: `whatsapp:${config.twilio.whatsappNumber}`,
      to: `whatsapp:${to}`,
      body: body.slice(0, 1500), // cap length
    });
  } catch (err) {
    console.error(`Send failed to ${to}:`, err.message);
  }
};

module.exports = { sendMessage, validateTwilioSignature };
