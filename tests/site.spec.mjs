import { test, expect } from '@playwright/test';

const pages=['/','/about.html','/site-map.html','/production.html','/events.html','/case-studies.html','/gallery.html','/nocturne-2026.html','/faq.html','/tours.html','/book.html','/producer-access.html'];

for(const route of pages){
  test('page renders without console errors: '+route, async({page})=>{
    const errors=[];
    page.on('console',(msg)=>{ if(msg.type()==='error') errors.push(msg.text()); });
    const response=await page.goto(route,{waitUntil:'networkidle'});
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('mobile navigation opens and exposes booking CTA',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const toggle=page.locator('[data-menu-toggle]');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('[data-nav-links]')).toHaveClass(/open/);
  await expect(page.locator('[data-nav-links] a[href="book.html"]')).toBeVisible();
});

test('booking wizard advances and updates qualification preview',async({page})=>{
  await page.goto('/book.html');
  await page.selectOption('[name="event_type"]',{label:'EDM / dance event'});
  await page.fill('[name="expected_attendance"]','300');
  await page.fill('[name="preferred_date"]','2027-02-13');
  await page.selectOption('[name="date_flexibility"]',{label:'± 1 month'});
  await page.selectOption('[name="event_access"]',{label:'Ticketed public'});
  await page.fill('[name="start_time"]','16:00');
  await page.fill('[name="end_time"]','23:30');
  await page.fill('[name="event_concept"]','QA production concept');
  await expect(page.locator('[data-score-preview] strong')).not.toHaveText('— / 100');
  await page.locator('[data-next]').first().click();
  await expect(page.locator('.form-step').nth(1)).toHaveClass(/active/);
});

test('interactive site map selects VIP zone',async({page})=>{
  await page.goto('/site-map.html');
  await page.locator('[data-zone="vip"]').click();
  await expect(page.locator('[data-zone-title]')).toContainText('VIP');
});

test('producer technical packet is noindex',async({page})=>{
  await page.goto('/technical-packet.html');
  const robots=await page.locator('meta[name="robots"]').getAttribute('content');
  expect(robots||'').toContain('noindex');
});


test('NOCTURNE case-study links are discoverable',async({page})=>{
  await page.goto('/');
  await expect(page.locator('a[href="nocturne-2026.html"]')).toBeVisible();
  await page.goto('/gallery.html');
  await expect(page.locator('a[href="nocturne-2026.html"]').first()).toBeVisible();
  await page.goto('/nocturne-2026.html');
  await expect(page.locator('h1')).toContainText('NOCTURNE');
});


test.describe('NOCTURNE media integration', () => {
  test('gallery media assets resolve and lightbox restores focus', async ({ page, request }) => {
    await page.goto('/gallery.html', { waitUntil: 'networkidle' });

    const thumbnails = page.locator('[data-nocturne-lightbox]');
    await expect(thumbnails).toHaveCount(9);

    const assetUrls = await page.locator(
      '.nocturne-photo-card img, .nocturne-video-tile source, .nocturne-video-tile video'
    ).evaluateAll((nodes) => {
      const urls = new Set();
      for (const node of nodes) {
        if (node.tagName === 'IMG') {
          if (node.getAttribute('src')) urls.add(node.getAttribute('src'));
          const srcset = node.getAttribute('srcset') || '';
          for (const candidate of srcset.split(',')) {
            const url = candidate.trim().split(/\s+/)[0];
            if (url) urls.add(url);
          }
        } else if (node.tagName === 'SOURCE' && node.getAttribute('src')) {
          urls.add(node.getAttribute('src'));
        }
      }
      document.querySelectorAll('.nocturne-video-tile video').forEach((video) => {
        const poster = video.getAttribute('poster');
        if (poster) urls.add(poster);
      });
      return [...urls];
    });

    expect(assetUrls.length).toBeGreaterThanOrEqual(30);
    for (const asset of assetUrls) {
      const response = await request.get(new URL(asset, 'http://127.0.0.1:4173/').href);
      expect(response.ok(), asset).toBeTruthy();
    }

    const first = thumbnails.first();
    await first.focus();
    await first.click();
    const dialog = page.locator('[data-nocturne-dialog]');
    await expect(dialog).toHaveAttribute('open', '');
    await expect(dialog.locator('[data-nocturne-dialog-image]')).toBeVisible();
    await page.locator('[data-nocturne-dialog-close]').click();
    await expect(dialog).not.toHaveAttribute('open', '');
    await expect(first).toBeFocused();
  });

  test('NOCTURNE videos avoid eager media downloads', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const homeVideo = page.locator('.nocturne-video-card video');
    await expect(homeVideo).toHaveAttribute('preload', 'none');
    await expect(homeVideo).not.toHaveAttribute('autoplay', '');

    await page.goto('/gallery.html', { waitUntil: 'domcontentloaded' });
    const videos = page.locator('.nocturne-video-tile video');
    await expect(videos).toHaveCount(6);
    for (let i = 0; i < await videos.count(); i += 1) {
      await expect(videos.nth(i)).toHaveAttribute('preload', 'none');
      await expect(videos.nth(i)).not.toHaveAttribute('autoplay', '');
    }
  });

  for (const width of [320, 390, 430]) {
    test(`NOCTURNE pages fit mobile viewport at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ['/', '/events.html', '/gallery.html', '/nocturne-2026.html']) {
        await page.goto(route, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(() =>
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
          document.documentElement.clientWidth
        );
        expect(overflow, route).toBeLessThanOrEqual(1);
      }
    });
  }
});


test('case-study library exposes NOCTURNE and production inquiry path',async({page})=>{
  await page.goto('/case-studies.html');
  await expect(page.locator('h1')).toContainText('Real events');
  await expect(page.locator('a[href="nocturne-2026.html"]')).toBeVisible();
  await page.goto('/nocturne-2026.html');
  await expect(page.locator('a[href="book.html"]').first()).toBeVisible();
});
