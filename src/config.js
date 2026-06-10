require('dotenv').config();

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

if (process.env.ADMIN_API_KEY.length < 24) {
  console.error('FATAL: ADMIN_API_KEY must be at least 24 characters.');
  process.exit(1);
}

module.exports = {
  twilio: {
    sid: process.env.TWILIO_ACCOUNT_SID,
    token: process.env.TWILIO_AUTH_TOKEN,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  },
  groq: { apiKey: process.env.GROQ_API_KEY },
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },
  adminApiKey: process.env.ADMIN_API_KEY,
  publicUrl: process.env.PUBLIC_URL || '',
  port: process.env.PORT || 3000,
  gym: {
    name: process.env.GYM_NAME || 'Muscle Factory',
    city: process.env.GYM_CITY || 'Amritsar',
    timings: process.env.GYM_TIMINGS || '5:00 AM - 10:00 PM',
    address: process.env.GYM_ADDRESS || 'Fatehgarh Churian Road, Opposite Vrindavan Garden, Amritsar 143001',
    plans: process.env.GYM_PLANS || 'Monthly ₹3000 | Quarterly ₹8000 | Annual ₹18000',
    facilities: process.env.GYM_FACILITIES || 'AC gym, cardio machines, free weights, steam room, personal trainer available',
    upi: process.env.GYM_UPI || 'gymowner@upi',
    ownerPhone: process.env.GYM_OWNER_PHONE || '+919876543210',
  },
};
