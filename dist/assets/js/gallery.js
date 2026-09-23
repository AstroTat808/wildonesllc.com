const items = [...document.querySelectorAll('.wo-gallery-item img')];

if (items.length) {
  const dialog = document.createElement('dialog');
  dialog.className = 'gallery-lightbox';
  dialog.innerHTML = '<div class="gallery-lightbox__inner"><button class="gallery-lightbox__close" type="button" aria-label="Close image">×</button><img alt=""></div>';
  document.body.appendChild(dialog);

  const image = dialog.querySelector('img');
  const close = dialog.querySelector('.gallery-lightbox__close');

  const open = (source) => {
    image.src = source.currentSrc || source.src;
    image.alt = source.alt || 'Wild Ones property photo';
    dialog.showModal();
    close.focus();
  };

  items.forEach((item) => {
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', (item.alt || 'Property photo') + ' — open larger');
    item.addEventListener('click', () => open(item));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(item);
      }
    });
  });

  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
