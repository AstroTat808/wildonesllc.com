const form = document.querySelector('[data-booking-form]');
if (form) {
  const steps = [...form.querySelectorAll('.form-step')];
  const progress = [...document.querySelectorAll('.progress-item')];
  const scoreTarget = document.querySelector('[data-score-preview] strong');
  const scoreInput = form.querySelector('input[name="qualification_score_preview"]');
  const complexityInput = form.querySelector('input[name="production_complexity_preview"]');
  let current = 0;

  const preferredDate = form.querySelector('#date');
  const backupDate = form.querySelector('#backup');
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (preferredDate) preferredDate.min = today;
  if (backupDate) backupDate.min = today;
  preferredDate?.addEventListener('change', () => {
    const minimum = preferredDate.value || today;
    if (backupDate) {
      backupDate.min = minimum;
      if (backupDate.value && backupDate.value < minimum) backupDate.value = '';
    }
  });

  const val = (name) => form.elements[name]?.value || '';
  const has = (name) => [...form.querySelectorAll(`[name="${name}"]:checked`)].length > 0;
  const calc = () => {
    let score = 0;
    const attendance = Number(val('expected_attendance') || 0);
    if (attendance >= 75 && attendance <= 350) score += 18; else if (attendance > 0) score += 8;
    if (/Concert|EDM|Festival|Retreat|Production company|Brand activation|Large private/.test(val('event_type'))) score += 12;
    if (val('backup_date')) score += 4;
    if (/Flexible|month|week/.test(val('date_flexibility'))) score += 4;
    const budget = val('event_budget');
    if (budget.includes('$50,000+')) score += 18; else if (budget.includes('$25,000')) score += 16; else if (budget.includes('$10,000')) score += 13; else if (budget.includes('$5,000')) score += 8; else if (budget) score += 4;
    const planning = val('planning_stage');
    if (planning === 'Ready for venue proposal') score += 15; else if (planning === 'Production vendors engaged') score += 13; else if (planning === 'Talent / programming in progress') score += 10; else if (planning) score += 6;
    ['stage_plan','audio_plan','lighting_plan','power_profile','parking_plan','security_plan'].forEach((n) => { if (val(n) && !/Not sure/.test(val(n))) score += 2; });
    if (val('company')) score += 4;
    if (val('website')) score += 4;
    const exp = val('organizer_experience');
    if (/Professional|20\+/.test(exp)) score += 7; else if (/6–20|1–5/.test(exp)) score += 5; else if (exp) score += 2;
    if (/Ready to secure/.test(val('decision_timing'))) score += 4; else if (val('decision_timing')) score += 2;
    score = Math.min(100, score);

    let complexity = 0;
    if (attendance > 250) complexity += 2; else if (attendance > 150) complexity += 1;
    if (/Concert-grade|Generator|Hybrid/.test(val('power_profile'))) complexity += 2;
    if (/Box truck|Semi/.test(val('largest_production_vehicle'))) complexity += 2;
    if (has('special_elements')) complexity += 2;
    if (Number(val('vendor_count') || 0) >= 8) complexity += 1;
    const complexityLabel = complexity >= 6 ? 'High' : complexity >= 3 ? 'Moderate' : 'Standard';
    if (scoreTarget) scoreTarget.textContent = `${score} / 100`;
    if (scoreInput) scoreInput.value = String(score);
    if (complexityInput) complexityInput.value = complexityLabel;
  };

  const showStep = (next) => {
    current = Math.max(0, Math.min(next, steps.length - 1));
    steps.forEach((step, index) => step.classList.toggle('active', index === current));
    progress.forEach((item, index) => { item.classList.toggle('active', index === current); item.classList.toggle('done', index < current); if(index===current)item.setAttribute('aria-current','step'); else item.removeAttribute('aria-current'); });
    calc();
    window.scrollTo({ top: Math.max(0, form.offsetTop - 110), behavior: 'smooth' });
  };
  const validateStep = () => {
    const inputs = [...steps[current].querySelectorAll('input, select, textarea')].filter((input) => input.type !== 'hidden' && !input.disabled);
    for (const input of inputs) { if (!input.checkValidity()) { input.reportValidity(); return false; } }
    return true;
  };
  form.addEventListener('click', (event) => { const next = event.target.closest('[data-next]'); const back = event.target.closest('[data-back]'); if (next && validateStep()) showStep(current + 1); if (back) showStep(current - 1); });
  form.addEventListener('input', calc);
  form.addEventListener('change', calc);
  form.addEventListener('submit', calc);
  form.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA' && current < steps.length - 1) { event.preventDefault(); if (validateStep()) showStep(current + 1); } });
  const params = new URLSearchParams(window.location.search);
  ['utm_source','utm_medium','utm_campaign','utm_content'].forEach((key) => { const target = form.querySelector(`input[name="${key}"]`); if (target && params.get(key)) target.value = params.get(key); });
  calc();
}
