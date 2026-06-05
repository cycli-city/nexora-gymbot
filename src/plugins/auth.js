const crypto = require('crypto');
const config = require('../config');

// SECURITY: timing-safe comparison prevents timing attacks that could
// let an attacker guess the API key character by character.
const safeCompare = (a, b) => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

// Admin auth via header ONLY (never query string — query strings leak into logs)
const requireAdminAuth = async (request, reply) => {
  const key = request.headers['x-api-key'];
  if (!key || !safeCompare(key, config.adminApiKey)) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
};

module.exports = { requireAdminAuth };
