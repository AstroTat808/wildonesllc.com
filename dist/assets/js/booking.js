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
    if (!backupDate) return;
    backupDate.min = minimum;
    if (backupDate.value && backupDate.value < minimum) backupDate.value = '';
  });

  const val = (name) => form.elements[name]?.value || '';
  const has = (name) => [...form.querySelectorAll(`[name="${name}"]:checked`)].length > 0;
  const eventType = form.elements.event_type;
  const productionProfile = form.querySelector('[data-production-profile]');
  const productionIntro = form.querySelector('[data-production-intro]');
  const advancedProduction = form.querySelector('[data-production-advanced]');
  const profileFields = {
    stage: form.querySelector('[data-production-field="stage"]'),
    audio: form.querySelector('[data-production-field="audio"]'),
    lighting: form.querySelector('[data-production-field="lighting"]'),
    power: form.querySelector('[data-production-field="power"]'),
  };
  const fullProductionPattern = /Concert|EDM|Festival|Production company/;
  const profileCopy = {
    'Retreat / immersive gathering': ['Program production', 'For retreats, we start with audio and power. Stage and show-lighting questions stay optional unless the program needs them.'],
    'Brand activation / corporate production': ['Activation production', 'For activations, we start with audio and power. Reveal full show-production questions when stage or entertainment is part of the build.'],
    'Large private production': ['Private production', 'For private productions, we start with audio and power. Stage and show-lighting questions stay optional until they are relevant.'],
    'Other': ['Flexible production', 'Start with audio and power, then add stage and show-lighting details if your concept needs them.'],
  };

  const operationsProfile = form.querySelector('[data-operations-profile]');
  const operationsIntro = form.querySelector('[data-operations-intro]');
  const operationsDetails = form.querySelector('[data-operations-details]');
  const operationsSummary = form.querySelector('[data-operations-summary]');
  const operationsProfileInput = form.elements.operations_profile;
  const durationInput = form.elements.event_duration_hours;
  const afterMidnightInput = form.elements.after_midnight_event;
  const operationsFields = Object.fromEntries(
    [...form.querySelectorAll('[data-ops-field]')].map((field) => [field.dataset.opsField, field])
  );

  const minutesFor = (time) => {
    if (!/^\\d{2}:\\d{2}$/.test(time || '')) return null;
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes;
  };
  const eventTiming = () => {
    const start = minutesFor(val('start_time'));
    const end = minutesFor(val('end_time'));
    if (start == null || end == null) return { duration: 0, afterMidnight: false };
    const afterMidnight = end < start;
    let minutes = end - start;
    if (minutes <= 0) minutes += 24 * 60;
    return { duration: Math.round((minutes / 60) * 10) / 10, afterMidnight };
  };
  const setOpsVisible = (key, visible) => {
    const field = operationsFields[key];
    if (!field) return;
    field.hidden = !visible;
    field.setAttribute('aria-hidden', String(!visible));
  };
  const applyOperationsProfile = () => {
    const attendance = Number(val('expected_attendance') || 0);
    const access = val('event_access');
    const type = val('event_type');
    const timing = eventTiming();
    const publicFacing = /Ticketed public|Open public event/.test(access);
    const largeAudience = attendance >= 200;
    const midAudience = attendance >= 100;
    const extended = timing.duration >= 8;
    const fullProduction = fullProductionPattern.test(type);
    const artistDriven = /Concert|EDM|Festival/.test(type);

    const active = new Set(['budget','timeline','notes']);
    if (publicFacing || largeAudience) ['security','parking','insurance','staff','beverage'].forEach((key) => active.add(key));
    if (midAudience) ['parking','staff','beverage'].forEach((key) => active.add(key));
    if (extended || timing.afterMidnight) ['staff','beverage','loadin','loadout','parking'].forEach((key) => active.add(key));
    if (fullProduction) ['vendors','crew','loadin','loadout'].forEach((key) => active.add(key));
    if (artistDriven) active.add('artists');

    ['vendors','staff','artists','crew','beverage','security','parking','insurance','loadin','loadout','notes']
      .forEach((key) => setOpsVisible(key, active.has(key)));

    const signals = [];
    if (largeAudience) signals.push('200+ guests');
    else if (midAudience) signals.push('100+ guests');
    if (publicFacing) signals.push('public-facing access');
    if (extended) signals.push(`${timing.duration}h program`);
    if (timing.afterMidnight) signals.push('after-midnight');
    if (fullProduction) signals.push('production build');

    let label = 'Core operations profile';
    if (timing.afterMidnight || largeAudience || (publicFacing && extended)) label = 'High-touch operations profile';
    else if (publicFacing || midAudience || extended || fullProduction) label = 'Expanded operations profile';

    if (operationsProfileInput) operationsProfileInput.value = label;
    if (durationInput) durationInput.value = timing.duration ? String(timing.duration) : '';
    if (afterMidnightInput) afterMidnightInput.value = timing.afterMidnight ? 'Yes' : 'No';

    if (operationsProfile) {
      const summary = signals.length ? signals.join(' · ') : 'Essential commercial + planning questions';
      operationsProfile.innerHTML = `<span>${label}</span><strong>${summary}</strong>`;
    }
    if (operationsIntro) {
      operationsIntro.textContent = signals.length
        ? 'We’ve expanded this step around the audience, access model and operating window you entered.'
        : 'Start with budget and planning stage. Additional logistics appear as the event footprint becomes more complex.';
    }
    if (operationsSummary) {
      const labels = [];
      if (active.has('security')) labels.push('security');
      if (active.has('parking')) labels.push('transport');
      if (active.has('staff')) labels.push('staffing');
      if (active.has('crew')) labels.push('crew');
      if (active.has('loadin')) labels.push('load-in/out');
      operationsSummary.textContent = labels.length ? labels.slice(0,4).join(', ') : 'optional operating detail';
    }
    if (operationsDetails) {
      const shouldOpen = timing.afterMidnight || largeAudience || (publicFacing && extended);
      if (shouldOpen) operationsDetails.open = true;
    }
  };

  const setAutoValue = (name, value) => {
    const input = form.elements[name];
    if (!input || input.value) return;
    input.value = value;
    input.dataset.profileAutofill = 'true';
  };
  const clearAutoValue = (name) => {
    const input = form.elements[name];
    if (!input || input.dataset.profileAutofill !== 'true') return;
    input.value = '';
    delete input.dataset.profileAutofill;
  };
  const setProfileFieldVisibility = (key, visible) => {
    const wrapper = profileFields[key];
    if (!wrapper) return;
    wrapper.hidden = !visible;
    wrapper.setAttribute('aria-hidden', String(!visible));
  };
  const revealFullProduction = () => {
    ['stage','lighting'].forEach((key) => setProfileFieldVisibility(key, true));
    ['stage_plan','lighting_plan'].forEach(clearAutoValue);
    if (productionProfile) {
      productionProfile.innerHTML = '<span>Expanded production profile</span><strong>Stage, audio, lighting and power questions are all active.</strong>';
      productionProfile.classList.add('expanded');
    }
    calc();
  };
  const applyProductionProfile = () => {
    const type = eventType?.value || '';
    const full = !type || fullProductionPattern.test(type);
    if (full) {
      ['stage','audio','lighting','power'].forEach((key) => setProfileFieldVisibility(key, true));
      ['stage_plan','lighting_plan'].forEach(clearAutoValue);
      if (productionIntro) productionIntro.textContent = type ? 'Tell us what the show needs technically.' : 'Choose an event type first; the production questions will adapt to your project.';
      if (productionProfile) productionProfile.innerHTML = type
        ? '<span>Full show-production profile</span><strong>Stage · audio · lighting · power</strong>'
        : '<span>Adaptive intake</span><strong>Questions change with your event type.</strong>';
    } else {
      setProfileFieldVisibility('stage', false);
      setProfileFieldVisibility('lighting', false);
      setProfileFieldVisibility('audio', true);
      setProfileFieldVisibility('power', true);
      setAutoValue('stage_plan', 'Not sure yet');
      setAutoValue('lighting_plan', 'Not sure yet');
      const copy = profileCopy[type] || profileCopy.Other;
      if (productionIntro) productionIntro.textContent = copy[1];
      if (productionProfile) productionProfile.innerHTML = `<span>${copy[0]}</span><strong>Audio · power first</strong><button class="production-profile-toggle" type="button" data-expand-production>Show stage + lighting questions</button>`;
    }
    if (advancedProduction && fullProductionPattern.test(type)) advancedProduction.open = false;
    applyOperationsProfile();
    calc();
  };

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
    const timing = eventTiming();
    if (timing.afterMidnight) complexity += 1;
    if (timing.duration >= 10) complexity += 1;
    if (/Ticketed public|Open public event/.test(val('event_access')) && attendance >= 200) complexity += 1;
    const complexityLabel = complexity >= 6 ? 'High' : complexity >= 3 ? 'Moderate' : 'Standard';
    if (scoreTarget) scoreTarget.textContent = `${score} / 100`;
    if (scoreInput) scoreInput.value = String(score);
    if (complexityInput) complexityInput.value = complexityLabel;
  };

  const showStep = (next, { scroll = true } = {}) => {
    current = Math.max(0, Math.min(next, steps.length - 1));
    if (current === 2) applyOperationsProfile();
    steps.forEach((step, index) => step.classList.toggle('active', index === current));
    progress.forEach((item, index) => {
      item.classList.toggle('active', index === current);
      item.classList.toggle('done', index < current);
      if (index === current) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    calc();
    if (scroll) {
      window.scrollTo({ top: Math.max(0, form.offsetTop - 110), behavior: 'smooth' });
      const heading = steps[current]?.querySelector('h2');
      if (heading) {
        heading.tabIndex = -1;
        window.setTimeout(() => heading.focus({ preventScroll: true }), 220);
      }
    }
  };
  const validateStep = () => {
    const inputs = [...steps[current].querySelectorAll('input, select, textarea')].filter((input) => input.type !== 'hidden' && !input.disabled);
    for (const input of inputs) { if (!input.checkValidity()) { input.reportValidity(); return false; } }
    return true;
  };
  form.addEventListener('click', (event) => { const next = event.target.closest('[data-next]'); const back = event.target.closest('[data-back]'); if (next && validateStep()) showStep(current + 1); if (back) showStep(current - 1); });
  form.addEventListener('input', (event) => {
    if (['expected_attendance','start_time','end_time'].includes(event.target.name)) applyOperationsProfile();
    calc();
  });
  form.addEventListener('change', (event) => {
    if (event.target === eventType) applyProductionProfile();
    else if (['expected_attendance','event_access','start_time','end_time'].includes(event.target.name)) {
      applyOperationsProfile();
      calc();
    } else calc();
  });
  form.addEventListener('click', (event) => {
    if (event.target.closest('[data-expand-production]')) revealFullProduction();
  });
  form.addEventListener('submit', calc);
  form.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA' && current < steps.length - 1) { event.preventDefault(); if (validateStep()) showStep(current + 1); } });
  const params = new URLSearchParams(window.location.search);
  ['utm_source','utm_medium','utm_campaign','utm_content'].forEach((key) => { const target = form.querySelector(`input[name="${key}"]`); if (target && params.get(key)) target.value = params.get(key); });
  applyProductionProfile();
  applyOperationsProfile();
  showStep(0, { scroll: false });
}
