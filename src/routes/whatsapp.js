const { validateTwilioSignature, sendMessage } = require('../services/twilio');
const { getOrCreateLead, updateConversation, setStatus } = require('../services/supabase');
const { getAIReply } = require('../services/ai');
const config = require('../config');

const STOP_WORDS = ['stop', 'unsubscribe', 'no thanks', 'nahi chahiye', 'band karo'];

async function whatsappRoutes(fastify) {
  fastify.post('/webhook', async (request, reply) => {
    // TODO: re-enable signature validation in production
    // const signature = request.headers['x-twilio-signature'];
    // const fullUrl = `${config.publicUrl}/whatsapp/webhook`;
    // const valid = validateTwilioSignature(signature, fullUrl, request.body);
    // if (!valid) return reply.code(403).send('Forbidden');

    // Acknowledge immediately (Twilio needs a fast 200)
    reply.code(200).send('OK');

    try {
      const incoming = String(request.body.Body || '').trim();
      const from = String(request.body.From || '');
      if (!incoming || !from.startsWith('whatsapp:')) return;

      const phone = from.replace('whatsapp:', '');
      if (!/^\+\d{8,15}$/.test(phone)) return;

      const lead = await getOrCreateLead(phone);
      if (!lead) return;

      if (STOP_WORDS.some((w) => incoming.toLowerCase().includes(w))) {
        await setStatus(phone, 'stopped');
        await sendMessage(phone, "No problem! Best of luck on your fitness journey 💪 We're here whenever you need us.");
        return;
      }

      if (lead.status === 'member') {
        await sendMessage(phone, "Welcome back! 💪 You're already a member. Need anything? Just ask!");
        return;
      }

      const conversation = Array.isArray(lead.conversation) ? lead.conversation : [];
      const aiReply = await getAIReply(conversation, incoming);

      const updated = [
        ...conversation,
        { role: 'user', content: incoming.slice(0, 600) },
        { role: 'assistant', content: aiReply },
      ].slice(-20);

      await updateConversation(phone, updated);
      await sendMessage(phone, aiReply);
    } catch (err) {
      request.log.error(err);
    }
  });
}

module.exports = whatsappRoutes;