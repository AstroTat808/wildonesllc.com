const toggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav-links]');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false');
  }));
}
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
