const { requireAdminAuth } = require('../plugins/auth');
const { setStatus, listLeads, getTrialLeads } = require('../services/supabase');
const { sendMessage } = require('../services/twilio');

// JSON schemas — Fastify rejects any request body that doesn't match BEFORE
// the handler runs. This blocks malformed/injection payloads automatically.
const phoneSchema = {
  body: {
    type: 'object',
    required: ['phone'],
    additionalProperties: false,
    properties: {
      phone: { type: 'string', pattern: '^\\+\\d{8,15}$' },
    },
  },
};

const broadcastSchema = {
  body: {
    type: 'object',
    required: ['message'],
    additionalProperties: false,
    properties: {
      message: { type: 'string', minLength: 1, maxLength: 1000 },
    },
  },
};

async function adminRoutes(fastify) {
  // All admin routes require the API key
  fastify.addHook('preHandler', requireAdminAuth);

  // Mark a lead as paid member → stops drip
  fastify.post('/member', { schema: phoneSchema }, async (request, reply) => {
    const { phone } = request.body;
    await setStatus(phone, 'member');
    await sendMessage(phone, '🎉 Welcome to the family! Your membership is active. See you at the gym 💪');
    return { success: true, phone };
  });

  // View all leads (PII — locked behind auth)
  fastify.get('/leads', async () => {
    const leads = await listLeads();
    return { total: leads.length, leads };
  });

  // Broadcast an offer to all trial leads
  fastify.post('/broadcast', { schema: broadcastSchema }, async (request) => {
    const { message } = request.body;
    const leads = await getTrialLeads();
    let sent = 0;
    for (const lead of leads) {
      await sendMessage(lead.phone, message.replace('{name}', lead.name));
      sent++;
      await new Promise((r) => setTimeout(r, 500)); // gentle pacing
    }
    return { success: true, sent, total: leads.length };
  });

  // Stop messages for a number
  fastify.post('/stop', { schema: phoneSchema }, async (request) => {
    const { phone } = request.body;
    await setStatus(phone, 'stopped');
    return { success: true, phone };
  });
}

module.exports = adminRoutes;
