(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

  const ambientVideos = [...document.querySelectorAll('[data-nocturne-autoplay]')];
  if (!reducedMotion && !saveData && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.35 });
    ambientVideos.forEach((video) => observer.observe(video));
  }

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
  let trigger = null;

  document.querySelectorAll('[data-nocturne-lightbox]').forEach((button) => {
    button.addEventListener('click', () => {
      const src = button.getAttribute('data-full-src');
      const alt = button.getAttribute('data-alt') || '';
      const caption = button.getAttribute('data-caption') || '';
      if (!src) return;
      trigger = button;
      dialogImage.src = src;
      dialogImage.alt = alt;
      dialogCaption.textContent = caption;
      dialog.showModal();
      close?.focus();
    });
  });

  const closeDialog = () => {
    if (dialog.open) dialog.close();
  };

  close?.addEventListener('click', closeDialog);
  dialog.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  dialog.addEventListener('close', () => {
    dialogImage.removeAttribute('src');
    trigger?.focus();
    trigger = null;
  });
})();
