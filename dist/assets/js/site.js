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
