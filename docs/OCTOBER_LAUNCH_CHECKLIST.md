# October Netlify Launch Checklist

This repository is prepared for a Git-based Netlify launch, but nothing in this checklist deploys the site before the October launch window.

## 1. Pre-launch repository gates

- Merge only after Wild Ones Release Certification - GO passes.
- Keep main as the production branch.
- Publish directory: dist.
- Verify the public pages, booking wizard, interactive site map, mobile navigation and FAQ.
- Confirm no sensitive technical specifications are committed to the public repository.

## 2. Netlify project setup

When ready in October:

1. Connect AstroTat808/wildonesllc.com.
2. Production branch: main.
3. Publish directory: dist.
4. No application build command is required for the static site.
5. Netlify Functions live in netlify/functions.
6. The producer packet is protected at the edge by netlify/edge-functions/producer-access.mts.

## 3. Environment variables

Set secrets in Netlify project configuration or with the Netlify CLI. Do not put them in netlify.toml.

Required:
- TURNSTILE_SITE_KEY
- TURNSTILE_SECRET_KEY
- WILD_ONES_INGEST_SECRET
- PRODUCER_UPLOAD_SECRET
- PRODUCER_ACCESS_SECRET
- PRODUCER_ACCESS_ADMIN_KEY

Optional:
- KOA_CRM_INGEST_URL - defaults to https://koasevents.com/api/crm/inquiries

The exact same WILD_ONES_INGEST_SECRET must also exist on the Koa's Events environment so the CRM can authenticate submissions coming from Wild Ones.

## 4. Cloudflare Turnstile

- Create or update a Turnstile widget to allow wildonesllc.com and the Netlify deploy-preview hostname(s) used for testing.
- Put the widget site key into TURNSTILE_SITE_KEY.
- Put the secret key into TURNSTILE_SECRET_KEY.
- Verify actions wild_ones_inquiry, wild_ones_site_tour and wild_ones_producer_access.
- Confirm a missing or invalid token is rejected.
- Confirm a valid token reaches the Koa's Events CRM.

## 5. CRM routing

The Wild Ones server function validates Turnstile, fingerprints the visitor network without storing the raw address in the cross-site header, stores an optional PDF rider privately, HMAC-signs the CRM request, and posts it to the Koa's Events CRM.

On the Koa's Events side, confirm:
- Wild Ones business line appears in the CRM filter.
- Qualification score and production complexity render.
- Site-tour, proposal, contract and deposit milestones can be saved.
- Production fields persist.
- Event-production timeline renders from the event date.

## 6. Producer-only access

- Never use a shared producer password.
- Generate an expiring signed link from /api/admin/producer-token.
- Edge middleware exchanges the link token for a Secure HttpOnly SameSite=Strict cookie and removes the token from the address bar.
- technical-packet.html is noindex and no-store.
- Keep truly confidential venue or security details out of this public GitHub repository even though the deployed route is protected.

## 7. Production rider uploads

- PDF only.
- 5 MB maximum.
- Stored in the wild-ones-producer-uploads Netlify Blob store.
- CRM receives a signed retrieval URL rather than a public object URL.
- Test upload, retrieval, expiration and invalid-signature rejection.

## 8. DNS + canonical host

- Point wildonesllc.com to the Netlify project.
- Add www.wildonesllc.com.
- www is configured to redirect permanently to the bare domain.
- Confirm HTTPS is active before public launch.

## 9. SEO + indexing

- Canonical URLs point to https://wildonesllc.com/.
- robots.txt points to the sitemap.
- Public marketing pages remain indexable.
- Technical packet, CRM concept page and confirmation page are noindex.
- Verify title, description, Open Graph tags and JSON-LD.
- Submit the final sitemap after production DNS is live.

## 10. Launch smoke

- Home returns 200.
- Main navigation has no broken links.
- Booking form rejects missing Turnstile.
- Valid booking form creates a Wild Ones CRM project.
- Site tour request creates a Wild Ones CRM project.
- Producer packet request creates a Wild Ones CRM project.
- Rider PDF is private and retrievable only by signed link.
- Signed technical packet token grants access and cleans the URL.
- Expired or invalid packet token redirects to Producer Access.
- Mobile layouts pass at 390 px.
- Release Certification remains green.
