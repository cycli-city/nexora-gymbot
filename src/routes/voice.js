const { getOrCreateLead } = require('../services/supabase');
const { sendMessage } = require('../services/twilio');
const config = require('../config');

const g = config.gym;

async function voiceRoutes(fastify) {
  fastify.post('/incoming', async (request, reply) => {
    const callerPhone = request.body.From;

    // Immediately reject the call — caller hears busy tone, no pickup
    reply.code(200)
      .header('Content-Type', 'text/xml')
      .send('<Response><Reject/></Response>');

    console.log('[voice] incoming call from:', callerPhone);

    // Validate phone number shape
    if (!callerPhone || !/^\+\d{8,15}$/.test(callerPhone)) {
      console.log('[voice] invalid phone, skipping:', callerPhone);
      return;
    }

    // Send WhatsApp follow-up after 2 seconds
    setTimeout(async () => {
      try {
        console.log('[voice] creating lead for:', callerPhone);
        await getOrCreateLead(callerPhone);
        console.log('[voice] lead created, sending WhatsApp...');
        await sendMessage(callerPhone,
          `Hi! 👋 We noticed you tried calling *${g.name}*.\n\nSorry we couldn't pick up! I'm Flex, your AI assistant — I can help you right here on WhatsApp 24/7 💪\n\nWhat would you like to know?\n• Membership plans & prices\n• Timings & location\n• Facilities & trainer info\n\nJust reply and I'll get back to you instantly!`
        );
        console.log('[voice] WhatsApp sent successfully to:', callerPhone);
      } catch (err) {
        console.error('[voice] error:', err.message);
        console.error('[voice] full error:', err);
      }
    }, 2000);
  });
}

module.exports = voiceRoutes;