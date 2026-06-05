require('dotenv').config();

// Fail fast if critical secrets are missing — prevents running insecure/broken
const REQUIRED = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'GROQ_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'ADMIN_API_KEY',
];

const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`FATAL: Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

// Reject weak admin keys — basic guardrail
if (process.env.ADMIN_API_KEY.length < 24) {
  console.error('FATAL: ADMIN_API_KEY must be at least 24 characters. Generate a strong one.');
  process.exit(1);
}

module.exports = {
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },
  adminApiKey: process.env.ADMIN_API_KEY,
  publicUrl: process.env.PUBLIC_URL || '', // used for Twilio signature validation
  port: process.env.PORT || 3000,
  gym: {
    name: process.env.GYM_NAME || 'FitZone Gym',
    city: process.env.GYM_CITY || 'Amritsar',
    timings: process.env.GYM_TIMINGS || '5:00 AM - 10:00 PM',
    address: process.env.GYM_ADDRESS || 'Near Bus Stand, Amritsar',
    plans: process.env.GYM_PLANS || 'Monthly ₹1500 | Quarterly ₹3999 | Annual ₹12999',
    facilities: process.env.GYM_FACILITIES || 'AC gym, cardio, free weights, steam, personal trainer',
    upi: process.env.GYM_UPI || 'gymowner@upi',
    ownerPhone: process.env.GYM_OWNER_PHONE || '',
  },
};
