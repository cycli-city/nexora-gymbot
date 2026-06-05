const Fastify = require('fastify');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const config = require('./config');
const { startDripScheduler } = require('./services/drip');

const fastify = Fastify({
  logger: true,
  trustProxy: true, // correct client IPs behind Koyeb/Render proxy (needed for rate limit)
  bodyLimit: 64 * 1024, // 64KB cap — reject oversized payloads
});

async function build() {
  // SECURITY: sets secure HTTP headers (XSS, clickjacking, MIME-sniffing protection)
  await fastify.register(helmet, { contentSecurityPolicy: false });

  // SECURITY: global rate limit — blunts DDoS and brute-force on admin key
  await fastify.register(rateLimit, {
    max: 100, // requests
    timeWindow: '1 minute',
    ban: 3, // ban after repeatedly exceeding
  });

  // Twilio sends form-urlencoded; register a parser for it
  // Twilio sends form-urlencoded; register a parser for it
  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        const parsed = Object.fromEntries(new URLSearchParams(body.toString()));
        done(null, parsed);
      } catch (err) {
        done(err);
      }
    }
  );

  fastify.get('/', async () => ({ status: 'NEXORA AI GymBot running 💪' }));
  fastify.get('/health', async () => ({ ok: true }));

  await fastify.register(require('./routes/whatsapp'), { prefix: '/whatsapp' });
  await fastify.register(require('./routes/admin'), { prefix: '/admin' });

  return fastify;
}

build()
  .then((app) =>
    app.listen({ port: config.port, host: '0.0.0.0' }).then(() => {
      startDripScheduler();
    })
  )
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
