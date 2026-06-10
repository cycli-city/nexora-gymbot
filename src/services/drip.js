const cron = require('node-cron');
const {
  getTrialLeads,
  updateDripDay,
  setStatus,
  getActiveMembers,
  updateReminderDay,
} = require('./supabase');
const { sendMessage } = require('./twilio');
const config = require('../config');

const g = config.gym;

// ═══════════════════════════════════════════════════════════
// TRIAL DRIP MESSAGES (days 1, 3, 5, 7)
// ═══════════════════════════════════════════════════════════
const TRIAL_DRIP = {
  1: (n) =>
    `Hey ${n}! 👋 Hope you enjoyed your first day at *${g.name}*.\n\nConsistency is everything 💪 Reply *PLANS* to see our membership options and lock in your fitness journey!`,

  3: (n) =>
    `Hi ${n}! 🏋️ Quick check — how's your trial going so far?\n\nMost members say they feel the difference in just 3 days. Don't stop now!\n\nPlans start from ${g.plans.split('|')[0].trim()} — reply *JOIN* to continue.`,

  5: (n) =>
    `${n}, you're almost at the end of your trial 🔥\n\nLock in your membership now and keep your momentum going. Reply *PLANS* to see options or *JOIN* to start.`,

  7: (n) =>
    `Hey ${n} ⏰ Your trial week is ending!\n\nDon't lose what you've built so far. Become a member today and we'll keep you on track 💪\n\nReply *JOIN* to continue or *STOP* if you'd like to opt out.`,
};

// ═══════════════════════════════════════════════════════════
// MEMBERSHIP REMINDERS (days BEFORE expiry: 7, 5, 3, 1, 0)
// ═══════════════════════════════════════════════════════════
const RENEWAL_REMINDERS = {
  7: (n, plan, endDate) =>
    `Hi ${n}! ⏰ A friendly reminder — your *${plan}* membership at ${g.name} expires on *${endDate}* (in 7 days).\n\nRenew now to avoid any break in your training 💪\n\nPay via UPI: ${g.upi} and share the screenshot with us on ${g.ownerPhone}`,

  5: (n, plan, endDate) =>
    `${n}, your *${plan}* membership expires in *5 days* (${endDate}) 🔔\n\nDon't let your fitness streak break! Renew today to keep your gym access uninterrupted.\n\nUPI: ${g.upi}`,

  3: (n, plan, endDate) =>
    `Hey ${n}! Only *3 days left* on your membership (expires ${endDate}) ⚠️\n\nWithout renewal you'll lose access to ${g.name}. Pay now to stay active:\n\nUPI: ${g.upi}\nThen share screenshot with ${g.ownerPhone}`,

  1: (n, plan, endDate) =>
    `⚠️ ${n}, your membership expires *TOMORROW* (${endDate})!\n\nYou won't be able to access ${g.name} unless you renew within 24 hours.\n\nPay via UPI: ${g.upi} right now and send screenshot to ${g.ownerPhone}`,

  0: (n, plan, endDate) =>
    `${n}, your membership has *EXPIRED today* 😔\n\nYou no longer have access to ${g.name}. Please renew to continue training:\n\nUPI: ${g.upi}\nContact: ${g.ownerPhone}\n\nWe'd love to have you back 💪`,
};

// ═══════════════════════════════════════════════════════════
// MEMBERSHIP WELCOME MESSAGE
// ═══════════════════════════════════════════════════════════
const sendMembershipWelcome = async (phone, name, plan, endDate) => {
  await sendMessage(
    phone,
    `🎉 Welcome to *${g.name}*, ${name}!\n\nYour *${plan}* membership is now active and valid until *${endDate}*.\n\n📍 ${g.address}\n⏰ ${g.timings}\n\nWe're excited to be part of your fitness journey! Reply anytime if you have questions 💪`
  );
};

// ═══════════════════════════════════════════════════════════
// TRIAL WELCOME MESSAGE
// ═══════════════════════════════════════════════════════════
const sendTrialWelcome = async (phone, name) => {
  await sendMessage(
    phone,
    `Hey ${name}! 👋 Welcome to *${g.name}*!\n\nYour free trial starts today. Just walk in anytime between ${g.timings} at ${g.address}.\n\nI'm Flex, your AI fitness guide — ask me anything about plans, facilities, or trainers 💪`
  );
};

// ═══════════════════════════════════════════════════════════
// MAIN DRIP RUNNER — handles both trial and membership reminders
// ═══════════════════════════════════════════════════════════
const runDripCycle = async () => {
  console.log('[drip] running cycle...');

  // 1. TRIAL DRIPS
  const trials = await getTrialLeads();
  for (const lead of trials) {
    const days = Math.floor(
      (Date.now() - new Date(lead.joined_at)) / 86400000
    );

    if (days > 7) {
      await setStatus(lead.phone, 'stopped');
      continue;
    }

    if (TRIAL_DRIP[days] && lead.drip_day < days) {
      await sendMessage(lead.phone, TRIAL_DRIP[days](lead.name));
      await updateDripDay(lead.phone, days);
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  // 2. MEMBERSHIP RENEWAL REMINDERS
  const members = await getActiveMembers();
  for (const m of members) {
    if (!m.membership_end) continue;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(m.membership_end);
    endDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((endDate - today) / 86400000);

    if (RENEWAL_REMINDERS[daysLeft]) {
      const reminderKey = `${daysLeft}`;
      // Only send if we haven't already sent this specific reminder
      if (m.reminder_day !== daysLeft) {
        const endDateStr = endDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        await sendMessage(
          m.phone,
          RENEWAL_REMINDERS[daysLeft](m.name, m.plan, endDateStr)
        );
        await updateReminderDay(m.phone, daysLeft);
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }

  console.log('[drip] cycle done');
};

// ═══════════════════════════════════════════════════════════
// SCHEDULER
// ═══════════════════════════════════════════════════════════
const startDripScheduler = () => {
  // Production: daily at 10 AM
  cron.schedule('0 10 * * *', runDripCycle);

  // TEST_MODE: every X minutes (configurable via env)
  if (process.env.TEST_MODE === 'true') {
    const interval = process.env.TEST_INTERVAL_MIN || '5';
    console.log(`[drip] TEST MODE — running every ${interval} minutes`);
    cron.schedule(`*/${interval} * * * *`, runDripCycle);
  }

  console.log('[drip] scheduler started ✅');
};

module.exports = {
  startDripScheduler,
  sendMembershipWelcome,
  sendTrialWelcome,
  runDripCycle,
};
