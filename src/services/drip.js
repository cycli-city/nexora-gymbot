const cron = require('node-cron');
const { getTrialLeads, updateDripDay, setStatus } = require('./supabase');
const { sendMessage } = require('./twilio');
const config = require('../config');
 
const g = config.gym;
 
// ═══ DRIP MESSAGES ═══
// These go out automatically based on days since trial started.
// Tone: friendly reminder, not spam. Each message has a different angle.
 
const DRIP = {
  1: (n) =>
    `Hey ${n}! 👋 Really glad you visited ${g.name} today!\n\nIf you have any questions about our plans or facilities, just reply here — I'm available 24/7.\n\nOur plans start at just ${g.plans.split('|')[0].trim()} 💪`,
 
  3: (n) =>
    `Hi ${n}! 🏋️ Just checking in — how are you feeling after your trial?\n\nA lot of people feel the difference in just 3 days of consistent training. Don't let that momentum stop!\n\nReply *PLANS* to see all membership options.`,
 
  5: (n) =>
    `${n}, quick one 🔥\n\nThis week we have limited slots open for new members. Once they fill up, we may have to pause new joinings.\n\nReply *JOIN* if you'd like to lock your spot — plans from ${g.plans.split('|')[0].trim()}.`,
 
  7: (n) =>
    `Hey ${n} ⏰ Your free trial period is almost over!\n\nYou've already experienced ${g.name} — now make it official. Join today and keep your fitness streak going 💪\n\nReply *PLANS* for details or *CALL* to speak with our team.`,
 
  10: (n) =>
    `${n}, it's never too late to start 🌟\n\nMany of our members joined after taking time to think — and they all say they wish they'd joined sooner.\n\nOur annual plan works out to just ₹${Math.round(parseInt((g.plans.match(/Annual[^\d]*(\d+)/) || ['','18000'])[1]) / 12)}/month. Reply *YES* to know more.`,
 
  14: (n) =>
    `Hey ${n} 😊 Last message from us — we promise!\n\nIf ${g.name} isn't the right fit right now, no worries at all. But if you're still thinking about it, we'd love to have you.\n\nReply *JOIN* to become a member, or *STOP* to unsubscribe. Either way, best of luck on your fitness journey! 💪`,
};
 
// ═══ TEST DRIP — fires every 2 minutes for your own number (for testing only) ═══
// Set TEST_PHONE in your .env to your WhatsApp number e.g. +916283130559
// Set TEST_MODE=true in your .env to activate
// REMOVE THIS in production or set TEST_MODE=false
 
const runTestDrip = async () => {
  if (process.env.TEST_MODE !== 'true' || !process.env.TEST_PHONE) return;
 
  const testPhone = process.env.TEST_PHONE;
  const testDay = parseInt(process.env.TEST_DAY || '1');
  const name = 'Divyansh';
 
  console.log(`[drip-test] sending day ${testDay} message to ${testPhone}`);
 
  if (DRIP[testDay]) {
    await sendMessage(testPhone, DRIP[testDay](name));
    console.log('[drip-test] sent!');
  } else {
    await sendMessage(testPhone, `[TEST] No drip message defined for day ${testDay}`);
  }
};
 
// ═══ PRODUCTION DRIP — runs every day at 10 AM ═══
const startDripScheduler = () => {
 
  // PRODUCTION: Daily at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('[drip] running daily campaign...');
    const leads = await getTrialLeads();
    let sent = 0;
 
    for (const lead of leads) {
      const days = Math.floor((Date.now() - new Date(lead.joined_at)) / 86400000);
 
      // Stop drip after day 14 — don't spam beyond 2 weeks
      if (days > 14) {
        await setStatus(lead.phone, 'stopped');
        continue;
      }
 
      // Send message if today's drip exists and hasn't been sent yet
      if (DRIP[days] && lead.drip_day < days) {
        await sendMessage(lead.phone, DRIP[days](lead.name));
        await updateDripDay(lead.phone, days);
        sent++;
        // Small delay between messages to avoid Twilio rate limits
        await new Promise(r => setTimeout(r, 800));
      }
    }
 
    console.log(`[drip] done — sent ${sent} messages`);
  });
 
  // TEST MODE: fires every 2 minutes so you can see drip messages on your phone
  if (process.env.TEST_MODE === 'true') {
    console.log('[drip-test] TEST MODE ON — sending test drip every 2 minutes');
    cron.schedule('*/2 * * * *', runTestDrip);
  }
 
  console.log('[drip] scheduler started ✅');
};
 
module.exports = { startDripScheduler };