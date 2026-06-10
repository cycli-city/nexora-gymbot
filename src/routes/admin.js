const { requireAdminAuth } = require('../plugins/auth');
const {
  setStatus,
  listLeads,
  getTrialLeads,
  addMember,
  addTrial,
  removeLead,
} = require('../services/supabase');
const { sendMessage } = require('../services/twilio');
const { sendMembershipWelcome, sendTrialWelcome } = require('../services/drip');

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

const memberSchema = {
  body: {
    type: 'object',
    required: ['phone', 'name', 'plan', 'membership_start', 'membership_end'],
    additionalProperties: false,
    properties: {
      phone: { type: 'string', pattern: '^\\+\\d{8,15}$' },
      name: { type: 'string', minLength: 1, maxLength: 100 },
      plan: { type: 'string', enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Annual'] },
      membership_start: { type: 'string', format: 'date' },
      membership_end: { type: 'string', format: 'date' },
    },
  },
};

const trialSchema = {
  body: {
    type: 'object',
    required: ['phone', 'name'],
    additionalProperties: false,
    properties: {
      phone: { type: 'string', pattern: '^\\+\\d{8,15}$' },
      name: { type: 'string', minLength: 1, maxLength: 100 },
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
  // All admin routes require API key
  fastify.addHook('preHandler', requireAdminAuth);

  // ═══ ADD NEW MEMBER (paid) ═══
  fastify.post('/member', { schema: memberSchema }, async (request) => {
    const { phone, name, plan, membership_start, membership_end } = request.body;
    const data = await addMember({ phone, name, plan, membership_start, membership_end });

    const endStr = new Date(membership_end).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
    await sendMembershipWelcome(phone, name, plan, endStr);

    return { success: true, member: data };
  });

  // ═══ ADD NEW TRIAL ═══
  fastify.post('/trial', { schema: trialSchema }, async (request) => {
    const { phone, name } = request.body;
    const data = await addTrial({ phone, name });
    await sendTrialWelcome(phone, name);
    return { success: true, trial: data };
  });

  // ═══ LIST ALL LEADS/MEMBERS (for dashboard) ═══
  fastify.get('/leads', async () => {
    const leads = await listLeads();
    return { total: leads.length, leads };
  });

  // ═══ DELETE A LEAD ═══
  fastify.post('/delete', { schema: phoneSchema }, async (request) => {
    const { phone } = request.body;
    await removeLead(phone);
    return { success: true };
  });

  // ═══ BROADCAST OFFER ═══
  fastify.post('/broadcast', { schema: broadcastSchema }, async (request) => {
    const { message } = request.body;
    const leads = await getTrialLeads();
    let sent = 0;
    for (const lead of leads) {
      await sendMessage(lead.phone, message.replace('{name}', lead.name));
      sent++;
      await new Promise((r) => setTimeout(r, 500));
    }
    return { success: true, sent, total: leads.length };
  });

  // ═══ STOP MESSAGES FOR A NUMBER ═══
  fastify.post('/stop', { schema: phoneSchema }, async (request) => {
    const { phone } = request.body;
    await setStatus(phone, 'stopped');
    return { success: true };
  });
}

module.exports = adminRoutes;
