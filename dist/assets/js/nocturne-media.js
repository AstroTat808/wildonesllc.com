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

  // Poster images sit several screens below the Gallery hero. Keep them out of the
  // critical network path and hydrate them shortly before the user reaches video.
  const posterVideos = [...document.querySelectorAll('video[data-poster]')];
  const hydratePoster = (video) => {
    const poster = video.getAttribute('data-poster');
    if (!poster || video.getAttribute('poster')) return;
    video.setAttribute('poster', poster);
  };
  if (posterVideos.length) {
    if ('IntersectionObserver' in window) {
      const posterObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          hydratePoster(entry.target);
          posterObserver.unobserve(entry.target);
        });
      }, { rootMargin: '1000px 0px', threshold: 0 });
      posterVideos.forEach((video) => posterObserver.observe(video));
    } else {
      posterVideos.forEach(hydratePoster);
    }
    posterVideos.forEach((video) => {
      video.addEventListener('focus', () => hydratePoster(video), { once: true });
      video.addEventListener('pointerenter', () => hydratePoster(video), { once: true });
    });
  }

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


  const storySteps = [...document.querySelectorAll('[data-nocturne-story-step]')];
  const storyFrames = [...document.querySelectorAll('[data-nocturne-story-frame]')];
  if (storySteps.length && storyFrames.length && 'IntersectionObserver' in window && !reducedMotion) {
    const setFrame = (index) => {
      storyFrames.forEach((frame, frameIndex) => frame.classList.toggle('active', frameIndex === index));
    };
    const storyObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      const index = Number(visible.target.getAttribute('data-nocturne-story-step'));
      if (Number.isFinite(index)) setFrame(index);
    }, { rootMargin: '-28% 0px -42% 0px', threshold: [0,.2,.45,.7] });
    storySteps.forEach((step) => storyObserver.observe(step));
  }
})();
