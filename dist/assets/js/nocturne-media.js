(() => {
  const videos = [...document.querySelectorAll('.nocturne-video-tile video')];
  videos.forEach((video) => {
    video.addEventListener('play', () => {
      videos.forEach((other) => { if (other !== video && !other.paused) other.pause(); });
    });
  });

  const dialog = document.querySelector('[data-nocturne-dialog]');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const dialogImage = dialog.querySelector('[data-nocturne-dialog-image]');
  const dialogCaption = dialog.querySelector('[data-nocturne-dialog-caption]');
  const close = dialog.querySelector('[data-nocturne-dialog-close]');

  document.querySelectorAll('[data-nocturne-lightbox]').forEach((button) => {
    button.addEventListener('click', () => {
      const src = button.getAttribute('data-full-src');
      const alt = button.getAttribute('data-alt') || '';
      const caption = button.getAttribute('data-caption') || '';
      if (!src) return;
      dialogImage.src = src;
      dialogImage.alt = alt;
      dialogCaption.textContent = caption;
      dialog.showModal();
      close?.focus();
    });
  });

  const closeDialog = () => {
    dialog.close();
    dialogImage.removeAttribute('src');
  };

  close?.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('close', () => dialogImage.removeAttribute('src'));
})();
