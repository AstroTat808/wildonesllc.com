const toggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav-links]');

if (toggle && nav) {
  const closeMenu = () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = 'Menu';
  };

  const openMenu = () => {
    nav.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = 'Close';
  };

  toggle.addEventListener('click', () => {
    nav.classList.contains('open') ? closeMenu() : openMenu();
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      closeMenu();
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!nav.classList.contains('open')) return;
    if (nav.contains(event.target) || toggle.contains(event.target)) return;
    closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1000) closeMenu();
  });
}

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = new Date().getFullYear();
});
