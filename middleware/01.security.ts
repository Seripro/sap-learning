import { defineMiddleware } from 'void';
export default defineMiddleware(async (c, next) => {
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (c.req.path.startsWith('/api/')) c.header('Cache-Control', 'no-store');
  await next();
});
