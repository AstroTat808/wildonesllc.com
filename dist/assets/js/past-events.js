(() => {
  const galleryRoots = [...document.querySelectorAll('[data-event-gallery]')];
  if (!galleryRoots.length) return;

  const dialog = document.querySelector('[data-event-gallery-dialog]');
  const dialogImage = dialog?.querySelector('[data-event-dialog-image]');
  const dialogCaption = dialog?.querySelector('[data-event-dialog-caption]');
  const dialogClose = dialog?.querySelector('[data-event-dialog-close]');
  let lastTrigger = null;

  const makeEmptyState = (root) => {
    const empty = document.createElement('div');
    empty.className = 'event-gallery-empty';
    empty.innerHTML = '<span>Photo archive ready</span><strong>Historical photos can be added here.</strong><p>Once images are added to this event archive, they will appear in the same polished gallery and lightbox used for NOCTURNE.</p>';
    root.replaceChildren(empty);
    root.dataset.galleryReady = 'true';
  };

  const renderGallery = (root, photos) => {
    if (!Array.isArray(photos) || photos.length === 0) {
      makeEmptyState(root);
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'event-gallery-grid';

    photos.forEach((photo, index) => {
      const figure = document.createElement('figure');
      figure.className = 'event-gallery-item ' + (photo.layout || 'standard');

      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('data-event-photo', '');
      button.setAttribute('data-full-src', photo.full || photo.thumb || '');
      button.setAttribute('data-caption', photo.caption || '');
      button.setAttribute('data-alt', photo.alt || '');
      button.setAttribute('aria-label', 'Open photo ' + (index + 1) + ': ' + (photo.alt || photo.caption || 'event photo'));

      const image = document.createElement('img');
      image.src = photo.thumb || photo.full || '';
      if (photo.thumb && photo.full && photo.thumb !== photo.full) {
        image.srcset = photo.thumb + ' 900w, ' + photo.full + ' 1800w';
        image.sizes = '(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw';
      }
      image.alt = photo.alt || '';
      image.loading = 'lazy';
      image.decoding = 'async';

      const caption = document.createElement('figcaption');
      caption.textContent = photo.caption || '';

      button.append(image);
      figure.append(button, caption);
      grid.append(figure);
    });

    root.replaceChildren(grid);
    root.dataset.galleryReady = 'true';
  };

  fetch('assets/past-events/gallery-manifest.json', { credentials: 'same-origin' })
    .then((response) => {
      if (!response.ok) throw new Error('Gallery manifest unavailable');
      return response.json();
    })
    .then((manifest) => {
      galleryRoots.forEach((root) => {
        const key = root.getAttribute('data-event-gallery');
        const event = manifest?.events?.[key];
        renderGallery(root, event?.photos || []);
      });
    })
    .catch(() => {
      galleryRoots.forEach(makeEmptyState);
    });

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-event-photo]');
    if (!trigger || !dialog || typeof dialog.showModal !== 'function' || !dialogImage) return;
    const src = trigger.getAttribute('data-full-src');
    if (!src) return;
    lastTrigger = trigger;
    dialogImage.src = src;
    dialogImage.alt = trigger.getAttribute('data-alt') || '';
    if (dialogCaption) dialogCaption.textContent = trigger.getAttribute('data-caption') || '';
    dialog.showModal();
    dialogClose?.focus();
  });

  const closeDialog = () => {
    if (dialog?.open) dialog.close();
  };

  dialogClose?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });
  dialog?.addEventListener('close', () => {
    dialogImage?.removeAttribute('src');
    if (dialogImage) dialogImage.alt = '';
    lastTrigger?.focus();
    lastTrigger = null;
  });
})();
