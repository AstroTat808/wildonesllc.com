import type { Config, Context } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

function clean(value: unknown, max = 1000) {
  return String(value ?? '').trim().slice(0, max);
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verify(secret: string, message: string, signature: string) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    return crypto.subtle.verify('HMAC', key, decodeBase64Url(signature), encoder.encode(message));
  } catch {
    return false;
  }
}

export default async (_req: Request, context: Context) => {
  const id = clean(context.params.id, 80);
  const url = new URL(_req.url);
  const exp = Number(url.searchParams.get('exp') || 0);
  const sig = clean(url.searchParams.get('sig'), 300);
  const secret = String(Netlify.env.get('PRODUCER_UPLOAD_SECRET') || '').trim();

  if (!id || !secret || !sig || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return new Response('Link expired or invalid.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!(await verify(secret, id + '|' + exp, sig))) {
    return new Response('Link expired or invalid.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  const store = getStore({ name: 'wild-ones-producer-uploads', consistency: 'strong' });
  const result = await store.getWithMetadata('riders/' + id + '.pdf', { type: 'arrayBuffer' } as any);
  if (!result) return new Response('File not found.', { status: 404 });

  const originalName = clean((result.metadata as any)?.originalName || 'production-rider.pdf', 240).replace(/[\r\n"]/g, '');
  return new Response(result.data as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="' + originalName + '"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const config: Config = {
  path: '/api/producer-upload/:id',
  method: 'GET',
};
