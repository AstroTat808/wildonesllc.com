import type { Config, Context } from '@netlify/functions';
import { getDeployStore, getStore } from '@netlify/blobs';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const CRM_DEFAULT = 'https://koasevents.com/api/crm/inquiries';

function clean(value: unknown, max = 4000) {
  return String(value ?? '').trim().slice(0, max);
}

function formValue(form: FormData, name: string, max = 4000) {
  const value = form.get(name);
  return typeof value === 'string' ? clean(value, max) : '';
}

function formValues(form: FormData, name: string, maxItems = 20) {
  return form.getAll(name)
    .filter((value): value is string => typeof value === 'string')
    .map((value) => clean(value, 160))
    .filter(Boolean)
    .slice(0, maxItems);
}

function base64Url(bytes: ArrayBuffer) {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmac(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return base64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

async function verifyTurnstile(req: Request, token: string, expectedAction: string) {
  const secret = String(Netlify.env.get('TURNSTILE_SECRET_KEY') || '').trim();
  if (!secret) return { ok: false, error: 'Security verification is not configured.' };
  if (!token) return { ok: false, error: 'Complete the security verification.' };

  const remoteIp = clean(
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0],
    80,
  );
  const body = new URLSearchParams({ secret, response: token, ...(remoteIp ? { remoteip: remoteIp } : {}) });
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000),
    });
    const data: any = await response.json().catch(() => null);
    const action = clean(data?.action, 80);
    const hostname = clean(data?.hostname, 255).toLowerCase();
    const requestHostname = new URL(req.url).hostname.toLowerCase();
    const ok = Boolean(response.ok && data?.success && action === expectedAction && hostname === requestHostname);
    return { ok, error: ok ? '' : 'Security verification failed.', codes: data?.['error-codes'] || [] };
  } catch {
    return { ok: false, error: 'Security verification is temporarily unavailable.' };
  }
}

function actionFor(formName: string) {
  if (formName === 'wild-ones-production-inquiry') return 'wild_ones_inquiry';
  if (formName === 'wild-ones-site-tour-request') return 'wild_ones_site_tour';
  if (formName === 'wild-ones-producer-packet-request') return 'wild_ones_producer_access';
  return '';
}

function producerUploadStore(context: Context) {
  return context.deploy.context === 'production'
    ? getStore({ name: 'wild-ones-producer-uploads', consistency: 'strong' })
    : getDeployStore({ name: 'wild-ones-producer-uploads' });
}

async function storeRider(form: FormData, req: Request, context: Context) {
  const value = form.get('production_rider');
  if (!(value instanceof File) || !value.size) return '';

  if (value.size > MAX_UPLOAD_BYTES) throw new Error('Production rider must be 5 MB or smaller.');
  if (value.type && value.type !== 'application/pdf') throw new Error('Production rider must be a PDF.');

  const secret = String(Netlify.env.get('PRODUCER_UPLOAD_SECRET') || '').trim();
  if (!secret) throw new Error('Secure production-rider storage is not configured.');

  const bytes = await value.arrayBuffer();
  const id = crypto.randomUUID();
  const key = 'riders/' + id + '.pdf';
  const store = producerUploadStore(context);
  await store.set(key, bytes, {
    metadata: {
      contentType: 'application/pdf',
      originalName: clean(value.name, 240),
      uploadedAt: new Date().toISOString(),
    },
  });

  const exp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const sig = await hmac(secret, id + '|' + exp);
  const url = new URL('/api/producer-upload/' + encodeURIComponent(id), req.url);
  url.searchParams.set('exp', String(exp));
  url.searchParams.set('sig', sig);
  return url.toString();
}

function payloadFor(form: FormData, formName: string, riderUrl: string) {
  const production = formName === 'wild-ones-production-inquiry';
  const tour = formName === 'wild-ones-site-tour-request';
  const packet = formName === 'wild-ones-producer-packet-request';

  const eventDate = production ? formValue(form, 'preferred_date', 40) : formValue(form, 'event_date', 40);
  const guestCount = Number(formValue(form, 'expected_attendance', 20) || 0);
  const eventType = production
    ? formValue(form, 'event_type', 120)
    : tour
      ? 'Production site tour request'
      : 'Producer packet access request';

  return {
    formName,
    customer: {
      name: formValue(form, 'name', 180),
      email: formValue(form, 'email', 240),
      phone: formValue(form, 'phone', 80),
      eventDate,
      company: formValue(form, 'company', 180),
      notes: production ? formValue(form, 'final_notes', 4000) : formValue(form, 'event_concept', 4000),
    },
    inquiry: {
      service: 'wild-ones',
      eventType,
      guestCount,
      budget: formValue(form, 'event_budget', 120),
      source: 'wildonesllc.com',
      alternativeDate: production ? formValue(form, 'backup_date', 40) : formValue(form, 'alternate_tour_date', 40),
      priorities: production ? formValue(form, 'event_concept', 4000) : formValue(form, 'tour_goals', 4000),
      referralSource: formValue(form, 'referral_source', 120),
    },
    wildOnes: {
      company: formValue(form, 'company', 180),
      eventConcept: formValue(form, 'event_concept', 5000) || formValue(form, 'tour_goals', 5000),
      preferredDate: eventDate,
      backupDate: formValue(form, 'backup_date', 40),
      dateFlexibility: formValue(form, 'date_flexibility', 120),
      startTime: formValue(form, 'start_time', 40),
      endTime: formValue(form, 'end_time', 40),
      eventAccess: formValue(form, 'event_access', 120),
      stagePlan: formValue(form, 'stage_plan', 160),
      audioPlan: formValue(form, 'audio_plan', 160),
      lightingPlan: formValue(form, 'lighting_plan', 160),
      powerProfile: formValue(form, 'power_profile', 160),
      fohRequirements: formValue(form, 'foh_requirements', 160),
      largestProductionVehicle: formValue(form, 'largest_production_vehicle', 160),
      specialElements: formValues(form, 'special_elements'),
      productionRiderUrl: riderUrl || formValue(form, 'production_rider_url', 1000),
      vendorCount: Number(formValue(form, 'vendor_count', 20) || 0),
      eventStaffCount: Number(formValue(form, 'event_staff_count', 20) || 0),
      artistCount: Number(formValue(form, 'artist_count', 20) || 0),
      productionCrewCount: Number(formValue(form, 'production_crew_count', 20) || 0),
      beverageService: formValue(form, 'beverage_service', 160),
      securityPlan: formValue(form, 'security_plan', 160),
      parkingPlan: formValue(form, 'parking_plan', 160),
      insuranceReadiness: formValue(form, 'insurance_readiness', 160),
      loadInTime: formValue(form, 'load_in_time', 80),
      loadOutTime: formValue(form, 'load_out_time', 80),
      overnightUse: formValue(form, 'overnight_use', 160),
      operationsNotes: formValue(form, 'operations_notes', 5000),
      operationsProfile: formValue(form, 'operations_profile', 160),
      eventDurationHours: Number(formValue(form, 'event_duration_hours', 20) || 0),
      afterMidnightEvent: formValue(form, 'after_midnight_event', 20),
      eventBudget: formValue(form, 'event_budget', 160),
      planningStage: formValue(form, 'planning_stage', 160),
      organizerExperience: formValue(form, 'organizer_experience', 160),
      decisionTiming: formValue(form, 'decision_timing', 160),
      role: formValue(form, 'role', 160),
      website: formValue(form, 'website', 500),
      preferredTourDate: formValue(form, 'preferred_tour_date', 40),
      alternateTourDate: formValue(form, 'alternate_tour_date', 40),
      tourGoals: formValue(form, 'tour_goals', 5000),
      requestType: production ? 'production-inquiry' : tour ? 'site-tour' : packet ? 'producer-packet' : '',
      utmSource: formValue(form, 'utm_source', 200),
      utmMedium: formValue(form, 'utm_medium', 200),
      utmCampaign: formValue(form, 'utm_campaign', 200),
      utmContent: formValue(form, 'utm_content', 200),
    },
  };
}

export default async (req: Request, context: Context) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let form: FormData;
  try { form = await req.formData(); }
  catch { return Response.json({ error: 'Invalid form submission.' }, { status: 400 }); }

  if (formValue(form, 'bot-field', 120)) return Response.json({ ok: true, id: '' });

  const formName = formValue(form, 'form-name', 100);
  const action = actionFor(formName);
  if (!action) return Response.json({ error: 'Unknown Wild Ones form.' }, { status: 400 });

  const turnstileToken = formValue(form, 'cf-turnstile-response', 2400) || formValue(form, 'turnstileToken', 2400);
  const turnstile = await verifyTurnstile(req, turnstileToken, action);
  if (!turnstile.ok) {
    return Response.json({ error: turnstile.error, code: 'turnstile_failed' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  let riderUrl = '';
  try { riderUrl = await storeRider(form, req, context); }
  catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Production rider upload failed.' }, { status: 400 });
  }

  const payload = payloadFor(form, formName, riderUrl);
  if (!payload.customer.name || !payload.customer.email) {
    return Response.json({ error: 'Name and email are required.' }, { status: 400 });
  }

  const ingestSecret = String(Netlify.env.get('WILD_ONES_INGEST_SECRET') || '').trim();
  if (!ingestSecret) return Response.json({ error: 'CRM routing is not configured.' }, { status: 503 });

  const timestamp = String(Math.floor(Date.now() / 1000));
  const clientIp = clean(context.ip || req.headers.get('x-nf-client-connection-ip') || req.headers.get('cf-connecting-ip'), 120);
  const sourceFingerprint = ('wo-' + (await hmac(ingestSecret, 'ip|' + (clientIp || context.requestId))).slice(0, 36)).toLowerCase();
  const signature = await hmac(ingestSecret, 'v1|' + timestamp + '|' + sourceFingerprint + '|' + formName);
  const crmUrl = String(Netlify.env.get('KOA_CRM_INGEST_URL') || CRM_DEFAULT).trim();

  try {
    const response = await fetch(crmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Koa-Inquiry-Capture': '1',
        'X-Wild-Ones-Source': sourceFingerprint,
        'X-Wild-Ones-Timestamp': timestamp,
        'X-Wild-Ones-Signature': signature,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const result: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json({ error: clean(result?.error, 500) || 'CRM routing failed.', code: clean(result?.code, 100) }, { status: response.status >= 500 ? 502 : response.status });
    }
    return Response.json({ ok: true, id: clean(result?.id, 120), qualification: result?.qualification || null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'CRM routing is temporarily unavailable.' }, { status: 502 });
  }
};

export const config: Config = {
  path: '/api/inquiry',
  method: 'POST',
};
