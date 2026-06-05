const cron = require('node-cron');
const { getTrialLeads, updateDripDay, setStatus } = require('../services/supabase');
const { sendMessage } = require('../services/twilio');
const config = require('../config');

const DRIP = {
  1: (n) => `Hi ${n}! 👋 Great having you at ${config.gym.name} today!\n\nReady to start your fitness journey? Reply *PLANS* to see membership options 💪`,
  3: (n) => `Hey ${n}! 🏋️ Still thinking it over?\n\nThis week only: *₹500 off* any 3-month plan. Reply *JOIN* to grab it 🔥`,
  7: (n) => `${n}, your trial is ending soon ⏰\n\nDon't lose your momentum! Reply *PLANS* to join today 💪`,
  14: (n) => `Hey ${n} 😊 We'd love to see you back!\n\nFlexible plans from ₹1,500/month. Reply *YES* for details, or *STOP* to opt out.`,
};

const startDripScheduler = () => {
  // Every day at 10:00 AM server time
  cron.schedule('0 10 * * *', async () => {
    console.log('[drip] running daily campaign');
    const leads = await getTrialLeads();

    for (const lead of leads) {
      const days = Math.floor((Date.now() - new Date(lead.joined_at)) / 86400000);

      if (days > 14) {
        await setStatus(lead.phone, 'stopped'); // stop spamming after 2 weeks
        continue;
      }
      if (DRIP[days] && lead.drip_day < days) {
        await sendMessage(lead.phone, DRIP[days](lead.name));
        await updateDripDay(lead.phone, days);
      }
    }
    console.log('[drip] done');
  });
  console.log('[drip] scheduler started');
};

module.exports = { startDripScheduler };
