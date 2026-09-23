# Wild Ones — wildonesllc.com

Producer-facing venue showcase for Wild Ones LLC / Koa’s Events on Hawaiʻi Island. The site is positioned for concerts, EDM and dance events, festivals, retreats, production-company rentals, brand activations, and other large-format productions.

## Preview before Netlify

The public site is static, so it can be previewed without connecting Netlify.

### Windows — one click

1. Download or clone this repository.
2. Double-click preview.bat in the repository root.
3. Your browser opens http://localhost:8080.
4. Keep the command window open while previewing. Press Ctrl+C to stop it.

### Any computer with Python

Run:

    python -m http.server 8080 --directory dist

Then open http://localhost:8080.

### npm shortcut

Run:

    npm run preview

This local static preview covers layout, navigation, booking-wizard behavior, site map interactions and responsive design. Netlify-only features such as Functions, Turnstile validation, private Blob uploads and edge-protected producer access activate when using Netlify Dev or the eventual Netlify project.

## Current site

Static HTML, CSS and JavaScript. Netlify will publish the dist directory from the main branch when the project is connected in October.

Primary pages:
- Home
- About the Property
- Interactive Site Map
- Production Specifications
- Event Types
- Gallery
- FAQ
- Site Tours
- Booking / Production Inquiry
- Producer Access / Technical Packet
- CRM concept page

## Release Certification

GitHub Actions runs a no-deploy release certification suite:
- static route, SEO, broken-reference and secret checks
- Netlify Function and Edge Function module checks
- Playwright desktop and 390 px mobile browser tests
- screenshot visual QA across 1440, 1024, 430, 390 and 320 px Chromium viewports
- WebKit visual spot checks at desktop and 390 px for Home, Gallery, Site Map and Booking
- automated checks for broken images, horizontal page overflow, HTTP failures, console errors and page exceptions
- downloadable Visual QA HTML/JSON report plus full-page screenshot artifact for manual review
- booking-wizard and interactive-map tests
- Lighthouse performance, accessibility, best-practices and SEO gates
- final Release Certification - GO job

The workflow does not deploy to Netlify.

## October launch backend

The repository contains launch-ready Netlify server components but is not connected or deployed:
- Cloudflare Turnstile-secured public forms
- server-side Wild Ones inquiry intake
- HMAC-authenticated routing into the Koa’s Events CRM
- private PDF rider storage in Netlify Blobs
- signed rider retrieval links
- signed, expiring producer technical-packet access
- secure HttpOnly producer session cookie
- hardened headers and canonical-host redirects

Environment variable names and launch steps are documented in .env.example and docs/OCTOBER_LAUNCH_CHECKLIST.md. Real secrets must never be committed.

## Capacity language

The large-format planning target is up to 350 guests / ticket holders. Staff, performers, vendors and production personnel are tracked separately during event planning. Final attendance and operational limits remain event-specific and subject to the approved site, safety, parking, sanitation, production, insurance and permitting plan.

## CRM direction

Wild Ones inquiries feed the existing Koa’s Events CRM as a separate business line rather than creating a disconnected CRM. See docs/crm-workflow.md.

## Producer packet security

The deployed technical-packet route is designed to require a signed, expiring link and then a Secure HttpOnly session cookie. There is no shared producer password. Because this GitHub repository is public, truly confidential security plans, access details, exact infrastructure vulnerabilities or other restricted production information must not be committed here; only appropriate producer-facing material belongs in the repository.


## Visual QA

Run locally with:

    npm run qa:visual

The runner starts its own local preview server and writes a `visual-qa/` folder containing:
- `index.html` — visual contact-sheet style report
- `summary.md` — automated pass/fail summary
- `report.json` — machine-readable layout diagnostics
- `screenshots/` — full-page screenshots for each audited route and viewport

GitHub Actions uploads the same folder as the `wild-ones-visual-qa-<run id>` artifact. This gives both automated layout checks and screenshots that can be reviewed before a pull request is merged.

Do not establish screenshot regression baselines until the visual design is approved. Once approved, the same screenshot matrix can become the baseline set for pixel-diff regression checks.
