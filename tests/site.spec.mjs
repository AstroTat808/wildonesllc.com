import { test, expect } from '@playwright/test';

const pages=['/','/about.html','/site-map.html','/production.html','/events.html','/gallery.html','/faq.html','/tours.html','/book.html','/producer-access.html'];

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
