import { chromium, webkit } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const outDir = path.resolve('visual-qa');
const screenshotsDir = path.join(outDir, 'screenshots');
const port = Number(process.env.VISUAL_QA_PORT || 4174);
const baseURL = process.env.VISUAL_QA_BASE_URL || `http://127.0.0.1:${port}`;

const routes = [
  ['home', '/'],
  ['property', '/about.html'],
  ['site-map', '/site-map.html'],
  ['production', '/production.html'],
  ['event-types', '/events.html'],
  ['gallery', '/gallery.html'],
  ['faq', '/faq.html'],
  ['site-tours', '/tours.html'],
  ['booking', '/book.html'],
  ['producer-access', '/producer-access.html']
];

const chromiumProfiles = [
  ['desktop-1440', { width: 1440, height: 1000 }],
  ['tablet-1024', { width: 1024, height: 1366 }],
  ['mobile-430', { width: 430, height: 932 }],
  ['mobile-390', { width: 390, height: 844 }],
  ['mobile-320', { width: 320, height: 700 }]
];

const webkitProfiles = [
  ['desktop-1440', { width: 1440, height: 1000 }],
  ['mobile-390', { width: 390, height: 844 }]
];

const webkitRoutes = new Set(['home', 'gallery', 'site-map', 'booking']);

await rm(outDir, { recursive: true, force: true });
await mkdir(screenshotsDir, { recursive: true });

let server;
let serverLog = '';

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Preview server did not become ready at ${url}`);
}

if (!process.env.VISUAL_QA_BASE_URL) {
  server = spawn(process.execPath, ['scripts/preview-server.mjs', '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe']
  });
  server.stdout.on('data', chunk => { serverLog += chunk.toString(); });
  server.stderr.on('data', chunk => { serverLog += chunk.toString(); });
  await waitForServer(baseURL);
}

const results = [];
const criticalIssues = [];

function safeName(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function auditPage(browserName, browser, profileName, viewport, routeName, route) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(String(err)));

  const url = baseURL + route;
  let status = 0;
  let navigationError = null;

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    status = response?.status() || 0;
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
        img.loading = 'eager';
      });
    });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(180);
  } catch (error) {
    navigationError = String(error);
  }

  const layout = navigationError ? null : await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    const documentWidth = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);

    const brokenImages = [...document.images]
      .filter((img) => {
        const inClosedDialog = img.closest('dialog:not([open])');
        if (inClosedDialog && !img.getAttribute('src')) return false;
        return !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0;
      })
      .map(img => ({
        src: img.getAttribute('src') || '',
        alt: img.getAttribute('alt') || ''
      }));

    const visibleOverflow = [...document.querySelectorAll('a,button,input,select,textarea,h1,h2,h3,p,figure,img,nav,header,footer,form')]
      .map(el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          cls: typeof el.className === 'string' ? el.className.slice(0, 120) : '',
          text: (el.textContent || el.getAttribute('alt') || '').trim().replace(/\s+/g, ' ').slice(0, 90),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          display: style.display,
          position: style.position,
          visibility: style.visibility
        };
      })
      .filter(item =>
        item.width > 0 &&
        item.display !== 'none' &&
        item.visibility !== 'hidden' &&
        item.position !== 'absolute' &&
        item.position !== 'fixed' &&
        (item.left < -4 || item.right > viewportWidth + 4)
      )
      .slice(0, 30);

    const nav = document.querySelector('.navbar');
    const navRect = nav?.getBoundingClientRect();
    const h1 = document.querySelector('h1');
    const h1Style = h1 ? getComputedStyle(h1) : null;

    return {
      viewportWidth,
      viewportHeight,
      documentWidth,
      horizontalOverflowPx: Math.max(0, documentWidth - viewportWidth),
      brokenImages,
      visibleOverflow,
      nav: navRect ? {
        left: Math.round(navRect.left),
        right: Math.round(navRect.right),
        width: Math.round(navRect.width)
      } : null,
      h1: h1Style ? {
        fontSize: h1Style.fontSize,
        lineHeight: h1Style.lineHeight,
        width: Math.round(h1.getBoundingClientRect().width)
      } : null
    };
  });

  const screenshotFile = safeName(`${browserName}-${profileName}-${routeName}`) + '.jpg';
  const screenshotPath = path.join(screenshotsDir, screenshotFile);

  if (!navigationError) {
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'jpeg',
      quality: 76
    });
  }

  const issues = [];
  if (navigationError) issues.push({ severity: 'critical', type: 'navigation', detail: navigationError });
  if (status >= 400 || status === 0) issues.push({ severity: 'critical', type: 'http', detail: `HTTP ${status}` });
  if (consoleErrors.length) issues.push({ severity: 'critical', type: 'console', detail: consoleErrors });
  if (pageErrors.length) issues.push({ severity: 'critical', type: 'pageerror', detail: pageErrors });
  if (layout?.brokenImages.length) issues.push({ severity: 'critical', type: 'broken-images', detail: layout.brokenImages });
  if ((layout?.horizontalOverflowPx || 0) > 2) issues.push({ severity: 'critical', type: 'document-overflow', detail: `${layout.horizontalOverflowPx}px` });
  if (layout?.visibleOverflow.length) issues.push({ severity: 'warning', type: 'visible-overflow-candidates', detail: layout.visibleOverflow });

  const result = {
    browser: browserName,
    profile: profileName,
    viewport,
    routeName,
    route,
    status,
    screenshot: navigationError ? null : `screenshots/${screenshotFile}`,
    consoleErrors,
    pageErrors,
    layout,
    issues
  };
  results.push(result);

  for (const issue of issues.filter(i => i.severity === 'critical')) {
    criticalIssues.push({ browser: browserName, profile: profileName, route, ...issue });
  }

  await context.close();
}

try {
  const chrome = await chromium.launch();
  try {
    for (const [profileName, viewport] of chromiumProfiles) {
      for (const [routeName, route] of routes) {
        await auditPage('chromium', chrome, profileName, viewport, routeName, route);
      }
    }
  } finally {
    await chrome.close();
  }

  const safari = await webkit.launch();
  try {
    for (const [profileName, viewport] of webkitProfiles) {
      for (const [routeName, route] of routes) {
        if (!webkitRoutes.has(routeName)) continue;
        await auditPage('webkit', safari, profileName, viewport, routeName, route);
      }
    }
  } finally {
    await safari.close();
  }
} finally {
  if (server) {
    server.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 150));
    if (!server.killed) server.kill('SIGKILL');
  }
}

const warningCount = results.reduce((sum, r) => sum + r.issues.filter(i => i.severity === 'warning').length, 0);
const screenshotCount = results.filter(r => r.screenshot).length;

const summary = [
  '# Wild Ones Visual QA',
  '',
  `- Screenshots captured: **${screenshotCount}**`,
  `- Routes audited: **${routes.length}**`,
  `- Chromium viewports: **${chromiumProfiles.map(([n]) => n).join(', ')}**`,
  `- WebKit spot checks: **${webkitProfiles.map(([n]) => n).join(', ')}**`,
  `- Critical issues: **${criticalIssues.length}**`,
  `- Layout warnings: **${warningCount}**`,
  '',
  criticalIssues.length ? '## Critical issues' : '## Result',
  '',
  criticalIssues.length
    ? criticalIssues.map(i => `- **${i.browser} / ${i.profile} / ${i.route}** — ${i.type}: ${typeof i.detail === 'string' ? i.detail : JSON.stringify(i.detail)}`).join('\n')
    : '**GO for automated layout integrity.** Review the screenshot artifact before approving visual design.',
  '',
  '> Automated checks catch broken images, horizontal page overflow, HTTP failures, console errors and page exceptions. Screenshot review remains the authority for spacing, hierarchy, cropping, proportion and overall polish.'
].join('\n');

const cards = results.map(r => {
  const issueText = r.issues.length
    ? r.issues.map(i => `<span class="issue ${i.severity}">${i.severity}: ${i.type}</span>`).join(' ')
    : '<span class="issue ok">automated checks passed</span>';
  const image = r.screenshot ? `<a href="${r.screenshot}"><img loading="lazy" src="${r.screenshot}" alt="${r.browser} ${r.profile} ${r.routeName}"></a>` : '';
  return `<article><h2>${r.routeName}</h2><p>${r.browser} · ${r.profile} · ${r.viewport.width}×${r.viewport.height}</p>${issueText}${image}</article>`;
}).join('\n');

const reportHtml = `<!doctype html>
<meta charset="utf-8">
<title>Wild Ones Visual QA</title>
<style>
body{font:14px/1.5 system-ui;background:#111;color:#eee;margin:0;padding:24px}h1{margin-top:0}.meta{color:#aaa}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px}article{background:#1b1b1b;border:1px solid #333;border-radius:12px;padding:14px}article h2{margin:0 0 4px;font-size:18px}article p{margin:0 0 9px;color:#aaa}.issue{display:inline-block;padding:3px 7px;border-radius:999px;margin:0 4px 9px 0;font-size:11px}.critical{background:#5b1f27}.warning{background:#58451c}.ok{background:#173d2a}img{display:block;width:100%;height:auto;margin-top:8px;border-radius:8px;background:#000}
</style>
<h1>Wild Ones Visual QA</h1>
<p class="meta">${screenshotCount} screenshots · ${criticalIssues.length} critical issues · ${warningCount} warnings</p>
<div class="grid">${cards}</div>`;

await writeFile(path.join(outDir, 'report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), baseURL, results, criticalIssues, serverLog }, null, 2));
await writeFile(path.join(outDir, 'summary.md'), summary);
await writeFile(path.join(outDir, 'index.html'), reportHtml);

console.log(summary);

if (criticalIssues.length) {
  process.exitCode = 1;
}
