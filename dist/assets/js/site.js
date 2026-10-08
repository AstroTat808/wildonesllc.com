document.querySelectorAll('link[data-deferred-stylesheet]').forEach((link) => {
  const activate = () => { link.media = 'all'; };
  if (link.sheet) activate();
  else link.addEventListener('load', activate, { once: true });
  window.setTimeout(activate, 3000);
});

function ensurePastEventsLinks() {
  const primaryNav = document.querySelector('[data-nav-links]');
  if (primaryNav && !primaryNav.querySelector('a[href="past-events.html"]')) {
    const link = document.createElement('a');
    link.href = 'past-events.html';
    link.textContent = 'Past Events';
    const cta = primaryNav.querySelector('.btn');
    primaryNav.insertBefore(link, cta || null);
  }

  const footerLinks = document.querySelector('.footer-links');
  if (footerLinks && !footerLinks.querySelector('a[href="past-events.html"]')) {
    const link = document.createElement('a');
    link.href = 'past-events.html';
    link.textContent = 'Past Events';
    const faq = footerLinks.querySelector('a[href="faq.html"]');
    footerLinks.insertBefore(link, faq || null);
  }
}

ensurePastEventsLinks();

const toggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav-links]');

if (toggle && nav) {
  if (!nav.id) nav.id = 'primary-navigation';
  toggle.setAttribute('aria-controls', nav.id);

  const closeMenu = ({ restoreFocus = false } = {}) => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    if (open) {
      const first = nav.querySelector('a');
      first?.focus({ preventScroll: true });
    }
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu()));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) closeMenu({ restoreFocus: true });
  });

  document.addEventListener('pointerdown', (event) => {
    if (!nav.classList.contains('open')) return;
    if (nav.contains(event.target) || toggle.contains(event.target)) return;
    closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1000 && nav.classList.contains('open')) closeMenu();
  }, { passive: true });
}

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
