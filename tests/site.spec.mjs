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

test('booking wizard advances while keeping CRM scoring internal',async({page})=>{
  await page.goto('/book.html');
  await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
  await page.selectOption('[name="event_type"]',{label:'EDM / dance event'});
  await page.fill('[name="expected_attendance"]','300');
  await page.fill('[name="preferred_date"]','2027-02-13');
  await page.selectOption('[name="date_flexibility"]',{label:'± 1 month'});
  await page.selectOption('[name="event_access"]',{label:'Ticketed public'});
  await page.fill('[name="start_time"]','16:00');
  await page.fill('[name="end_time"]','23:30');
  await page.fill('[name="event_concept"]','QA production concept');
  await expect(page.locator('[data-score-preview]')).toHaveCount(0);
  await expect(page.locator('input[name="qualification_score_preview"]')).not.toHaveValue('');
  await expect(page.locator('.form-optional')).toHaveCount(2);
  await page.locator('[data-next]').first().click();
  await expect(page.locator('.form-step').nth(1)).toHaveClass(/active/);
  await expect(page.locator('[data-production-field="stage"]')).toBeVisible();
  await expect(page.locator('[data-production-field="lighting"]')).toBeVisible();
  await expect(page.locator('[data-production-profile]')).toContainText('Full show-production profile');
});

test('inquiry adapts lighter event types without dropping CRM production fields',async({page})=>{
  await page.goto('/book.html');
  await page.selectOption('[name="event_type"]',{label:'Retreat / immersive gathering'});
  await expect(page.locator('[data-production-field="stage"]')).toBeHidden();
  await expect(page.locator('[data-production-field="lighting"]')).toBeHidden();
  await expect(page.locator('[name="stage_plan"]')).toHaveValue('Not sure yet');
  await expect(page.locator('[name="lighting_plan"]')).toHaveValue('Not sure yet');
  await expect(page.locator('[data-production-field="audio"]')).toBeVisible();
  await expect(page.locator('[data-production-field="power"]')).toBeVisible();
  await expect(page.locator('[data-production-profile]')).toContainText('Program production');
  await page.locator('[data-expand-production]').click();
  await expect(page.locator('[data-production-field="stage"]')).toBeVisible();
  await expect(page.locator('[data-production-field="lighting"]')).toBeVisible();
  await expect(page.locator('[name="stage_plan"]')).toHaveValue('');
  await expect(page.locator('[name="lighting_plan"]')).toHaveValue('');
});

test('conversion funnel exposes real proof and production next steps',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.hero-showcase')).toContainText('NOCTURNE 2026');
  await expect(page.locator('a[href="case-studies.html"]').first()).toBeVisible();
  await page.goto('/case-studies.html');
  await expect(page.locator('a[href="production.html"]').last()).toBeVisible();
  await page.goto('/production.html');
  await expect(page.locator('.production-proof')).toContainText('NOCTURNE 2026');
  await expect(page.locator('a[href="book.html"]').last()).toBeVisible();
});

test('interactive site map supports pointer, keyboard and mobile containment',async({page})=>{
  await page.goto('/site-map.html');
  const vip=page.locator('[data-zone="vip"]').first();
  await vip.click();
  await expect(page.locator('[data-zone-title]')).toContainText('VIP');
  const stage=page.locator('[data-zone="stage"]').first();
  await stage.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-zone-title]')).toContainText('Stage');

  await page.setViewportSize({width:390,height:844});
  await page.reload();
  const board=page.locator('[data-site-map-board]');
  const box=await board.boundingBox();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(390);
  const planTop=(await page.locator('.map-plan').boundingBox()).y;
  const controlsTop=(await page.locator('.map-controls').boundingBox()).y;
  expect(planTop).toBeLessThan(controlsTop);
});

test('producer technical packet is noindex',async({page})=>{
  await page.goto('/technical-packet.html');
  const robots=await page.locator('meta[name="robots"]').getAttribute('content');
  expect(robots||'').toContain('noindex');
});


test('NOCTURNE case-study links are discoverable',async({page})=>{
  await page.goto('/');
  await expect(page.locator('a[href="nocturne-2026.html"]').first()).toBeVisible();
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
  await expect(page.locator('.nocturne-cinema-hero a[href="book.html"]')).toBeVisible();
});
