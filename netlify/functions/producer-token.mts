import type { Config, Context } from '@netlify/functions';

function clean(value: unknown, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function base64UrlText(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64Url(bytes: ArrayBuffer) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const adminKey = String(Netlify.env.get('PRODUCER_ACCESS_ADMIN_KEY') || '').trim();
  const auth = clean(req.headers.get('authorization'), 1000);
  if (!adminKey || auth !== 'Bearer ' + adminKey) return Response.json({ error: 'Unauthorized.' }, { status: 401 });

  const secret = String(Netlify.env.get('PRODUCER_ACCESS_SECRET') || '').trim();
  if (!secret) return Response.json({ error: 'Producer access is not configured.' }, { status: 503 });

  const body: any = await req.json().catch(() => null);
  if (!body) return Response.json({ error: 'Invalid JSON.' }, { status: 400 });

  const projectId = clean(body.projectId, 120);
  const email = clean(body.email, 240).toLowerCase();
  const ttlHours = Math.max(1, Math.min(720, Number(body.ttlHours) || 168));
  if (!projectId) return Response.json({ error: 'projectId is required.' }, { status: 400 });

  const payload = {
    projectId,
    email,
    exp: Math.floor(Date.now() / 1000) + Math.round(ttlHours * 3600),
    nonce: crypto.randomUUID(),
  };
  const encoded = base64UrlText(JSON.stringify(payload));
  const sig = await hmac(secret, encoded);
  const base = String(Netlify.env.get('URL') || 'https://wildonesllc.com').replace(/\/$/, '');
  const url = base + '/technical-packet.html?token=' + encodeURIComponent(encoded + '.' + sig);

  return Response.json({ ok: true, url, expiresAt: new Date(payload.exp * 1000).toISOString(), projectId, email }, { headers: { 'Cache-Control': 'no-store' } });
};

export const config: Config = {
  path: '/api/admin/producer-token',
  method: 'POST',
};
