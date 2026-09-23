import type { Config, Context } from '@netlify/functions';

export default async (_req: Request, _context: Context) => {
  const siteKey = String(Netlify.env.get('TURNSTILE_SITE_KEY') || '').trim();
  return Response.json(
    { turnstileSiteKey: siteKey },
    { headers: { 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' } },
  );
};

export const config: Config = {
  path: '/api/public-config',
  method: 'GET',
};
