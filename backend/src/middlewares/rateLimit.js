// Rate limit leve, em memória (por instância de lambda).
// Em serverless cada instância tem seu próprio contador — não é um limite
// global exato, mas corta rajadas de bot no endpoint público sem depender
// de Redis. Para limite global rígido, trocar por Upstash/Redis no futuro.

const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 5, message = 'Muitas tentativas. Aguarde um instante.' } = {}) {
  return (req, res, next) => {
    const ip =
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const now = Date.now();
    const b = buckets.get(ip);

    if (!b || now - b.start > windowMs) {
      buckets.set(ip, { start: now, count: 1 });
      return next();
    }
    b.count++;
    if (b.count > max) {
      res.setHeader('Retry-After', Math.ceil((b.start + windowMs - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// Limpeza periódica pra não crescer sem limite em instâncias longevas.
setInterval(() => {
  const cutoff = Date.now() - 10 * 60_000;
  for (const [ip, b] of buckets) if (b.start < cutoff) buckets.delete(ip);
}, 5 * 60_000).unref?.();
