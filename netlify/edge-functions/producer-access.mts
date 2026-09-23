import type { Config, Context } from '@netlify/edge-functions';

const COOKIE = 'wo_producer_session';

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function decodeText(value: string) {
  return new TextDecoder().decode(decodeBase64Url(value));
}

async function verifyToken(secret: string, token: string) {
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), encoder.encode(encoded));
    if (!valid) return null;
    const payload = JSON.parse(decodeText(encoded));
    if (!payload?.projectId || Number(payload?.exp || 0) < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export default async (req: Request, context: Context) => {
  const secret = String(Netlify.env.get('PRODUCER_ACCESS_SECRET') || '').trim();
  if (!secret) return new Response('Producer access is not configured.', { status: 503 });

  const url = new URL(req.url);
  const queryToken = url.searchParams.get('token') || '';
  const cookieToken = context.cookies.get(COOKIE) || '';
  const token = queryToken || cookieToken;
  const payload = token ? await verifyToken(secret, token) : null;

  if (!payload) {
    const destination = new URL('/producer-access.html?access=required', req.url);
    return Response.redirect(destination, 302);
  }

  if (queryToken) {
    const cleanUrl = new URL('/technical-packet', req.url);
    const response = Response.redirect(cleanUrl, 302);
    response.headers.append(
      'Set-Cookie',
      COOKIE + '=' + queryToken + '; Path=/; Max-Age=' + Math.max(60, payload.exp - Math.floor(Date.now() / 1000)) + '; HttpOnly; Secure; SameSite=Strict',
    );
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  const response = await context.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
};

export const config: Config = {
  path: ['/technical-packet.html', '/technical-packet'],
};
