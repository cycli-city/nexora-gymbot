const Fastify = require('fastify');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');
const cors = require('@fastify/cors');
const config = require('./config');
const { startDripScheduler } = require('./services/drip');

const fastify = Fastify({
  logger: true,
  trustProxy: true,
  bodyLimit: 64 * 1024,
});

async function build() {
  await fastify.register(helmet, { contentSecurityPolicy: false });

  // CORS — allows dashboard hosted on Netlify to call this API
  await fastify.register(cors, {
    origin: true, // reflects request origin; locks down via API key still
    methods: ['GET', 'POST'],
    allowedHeaders: ['content-type', 'x-api-key'],
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    ban: 3,
  });

  fastify.addContentTypeParser(
    'application/x-www-form-urlencoded',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        done(null, Object.fromEntries(new URLSearchParams(body.toString())));
      } catch (err) { done(err); }
    }
  );

  fastify.get('/', async () => ({ status: 'NEXORA AI GymBot running 💪' }));
  fastify.get('/health', async () => ({ ok: true }));

  await fastify.register(require('./routes/whatsapp'), { prefix: '/whatsapp' });
  await fastify.register(require('./routes/admin'), { prefix: '/admin' });
  await fastify.register(require('./routes/voice'), { prefix: '/voice' });

  return fastify;
}

build()
  .then((app) =>
    app.listen({ port: config.port, host: '0.0.0.0' }).then(() => {
      startDripScheduler();
    })
  )
  .catch((err) => { console.error(err); process.exit(1); });
