(() => {
  const roots = {
    galleries: [...document.querySelectorAll('[data-event-gallery]')],
    artists: [...document.querySelectorAll('[data-event-artists]')],
    flyers: [...document.querySelectorAll('[data-event-flyers]')],
    memorabilia: [...document.querySelectorAll('[data-event-memorabilia]')],
    stories: [...document.querySelectorAll('[data-event-story]')]
  };
  if (!Object.values(roots).some((list) => list.length)) return;

  const dialog = document.querySelector('[data-event-gallery-dialog]');
  const dialogImage = dialog?.querySelector('[data-event-dialog-image]');
  const dialogCaption = dialog?.querySelector('[data-event-dialog-caption]');
  const dialogClose = dialog?.querySelector('[data-event-dialog-close]');
  let lastTrigger = null;

  const emptyState = (root, type) => {
    const copy = {
      gallery: ['Photo archive ready','Historical photos can be added here.','Once images are imported for this event, they appear automatically in the responsive gallery and lightbox.'],
      artists: ['Lineup archive ready','Confirmed DJs and artists can be added here.','Names stay intentionally blank until supported by retained event records, flyers or media.'],
      flyers: ['Creative archive ready','Original flyer artwork can be added here.','Promotional artwork, invitations and social graphics can be preserved at high resolution.'],
      memorabilia: ['Memorabilia archive ready','Physical and digital artifacts can be cataloged here.','Tickets, passes, wristbands, merchandise, badges and other surviving event pieces can be documented.']
    }[type];
    const empty = document.createElement('div');
    empty.className = type === 'gallery' ? 'archive-empty event-gallery-empty' : 'archive-empty';
    empty.innerHTML = '<span>'+copy[0]+'</span><strong>'+copy[1]+'</strong><p>'+copy[2]+'</p>';
    root.replaceChildren(empty);
    root.dataset.archiveReady = 'true';
  };

  const mediaButton = (item, index, labelPrefix) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-event-photo', '');
    button.setAttribute('data-full-src', item.full || item.thumb || item.src || '');
    button.setAttribute('data-caption', item.caption || item.title || '');
    button.setAttribute('data-alt', item.alt || '');
    button.setAttribute('aria-label', 'Open '+labelPrefix+' '+(index+1)+': '+(item.alt || item.caption || item.title || 'archive image'));
    const image = document.createElement('img');
    image.src = item.thumb || item.src || item.full || '';
    if (item.thumb && item.full && item.thumb !== item.full) {
      image.srcset = item.thumb+' 900w, '+item.full+' 1800w';
      image.sizes = '(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw';
    }
    image.alt = item.alt || '';
    image.loading = 'lazy';
    image.decoding = 'async';
    button.append(image);
    return button;
  };

  const renderGallery = (root, photos) => {
    if (!Array.isArray(photos) || photos.length === 0) return emptyState(root, 'gallery');
    const grid = document.createElement('div');
    grid.className = 'event-gallery-grid';
    photos.forEach((photo, index) => {
      const figure = document.createElement('figure');
      figure.className = 'event-gallery-item '+(photo.layout || 'standard');
      figure.append(mediaButton(photo,index,'photo'));
      const caption = document.createElement('figcaption');
      caption.textContent = photo.caption || '';
      figure.append(caption);
      grid.append(figure);
    });
    root.replaceChildren(grid);
    root.dataset.archiveReady = 'true';
  };

  const renderStory = (root, photos) => {
    if (!Array.isArray(photos) || photos.length === 0) return emptyState(root, 'gallery');
    const sorted = [...photos].sort((a,b) => {
      const at = Date.parse(a.capturedAt || '') || Number.MAX_SAFE_INTEGER;
      const bt = Date.parse(b.capturedAt || '') || Number.MAX_SAFE_INTEGER;
      return at - bt;
    });
    const timeline = document.createElement('div');
    timeline.className = 'groove-photo-story';
    sorted.forEach((photo,index) => {
      const article = document.createElement('article');
      article.className = 'groove-photo-story-item';
      const meta = document.createElement('div');
      meta.className = 'groove-photo-story-meta';
      const date = document.createElement('strong');
      date.textContent = photo.displayDate || photo.caption || ('Photo '+(index+1));
      const time = document.createElement('span');
      time.textContent = photo.displayTime || '';
      meta.append(date,time);
      const figure = document.createElement('figure');
      figure.append(mediaButton(photo,index,'story photo'));
      const caption = document.createElement('figcaption');
      caption.textContent = photo.caption || '';
      figure.append(caption);
      article.append(meta,figure);
      timeline.append(article);
    });
    root.replaceChildren(timeline);
    root.dataset.archiveReady='true';
  };

  const renderArtists = (root, artists) => {
    if (!Array.isArray(artists) || artists.length === 0) return emptyState(root, 'artists');
    const grid=document.createElement('div');
    grid.className='archive-people-grid';
    artists.forEach((artist)=>{
      const card=document.createElement('article');
      card.className='archive-person';
      const name=document.createElement('strong');
      name.textContent=artist.name || '';
      const role=document.createElement('span');
      role.textContent=artist.role || 'Artist / DJ';
      card.append(name,role);
      grid.append(card);
    });
    root.replaceChildren(grid);
    root.dataset.archiveReady='true';
  };

  const renderFlyers = (root, flyers) => {
    if (!Array.isArray(flyers) || flyers.length === 0) return emptyState(root, 'flyers');
    const grid=document.createElement('div');
    grid.className='archive-media-grid';
    flyers.forEach((item,index)=>{
      const figure=document.createElement('figure');
      figure.className='archive-media-card '+(item.layout || (index===0?'wide':''));
      figure.append(mediaButton(item,index,'flyer'));
      const caption=document.createElement('figcaption');
      const strong=document.createElement('strong');
      strong.textContent=item.title || 'Event flyer';
      const span=document.createElement('span');
      span.textContent=item.caption || '';
      caption.append(strong,span);
      figure.append(caption);
      grid.append(figure);
    });
    root.replaceChildren(grid);
    root.dataset.archiveReady='true';
  };

  const renderMemorabilia = (root, items) => {
    if (!Array.isArray(items) || items.length === 0) return emptyState(root, 'memorabilia');
    const grid=document.createElement('div');
    grid.className='archive-memorabilia-grid';
    items.forEach((item,index)=>{
      const card=document.createElement('article');
      card.className='archive-memorabilia-card';
      if(item.thumb || item.src || item.full) {
        const button=mediaButton(item,index,'memorabilia image');
        const image=button.querySelector('img');
        button.replaceWith(image);
        card.append(image);
      }
      const h=document.createElement('h3');
      h.textContent=item.title || 'Archive artifact';
      const p=document.createElement('p');
      p.textContent=item.description || item.caption || '';
      card.append(h,p);
      grid.append(card);
    });
    root.replaceChildren(grid);
    root.dataset.archiveReady='true';
  };

  fetch('assets/past-events/gallery-manifest.json', { credentials: 'same-origin' })
    .then((response) => {
      if (!response.ok) throw new Error('Event archive manifest unavailable');
      return response.json();
    })
    .then((manifest) => {
      roots.galleries.forEach((root) => renderGallery(root, manifest?.events?.[root.getAttribute('data-event-gallery')]?.photos || []));
      roots.artists.forEach((root) => renderArtists(root, manifest?.events?.[root.getAttribute('data-event-artists')]?.artists || []));
      roots.flyers.forEach((root) => renderFlyers(root, manifest?.events?.[root.getAttribute('data-event-flyers')]?.flyers || []));
      roots.memorabilia.forEach((root) => renderMemorabilia(root, manifest?.events?.[root.getAttribute('data-event-memorabilia')]?.memorabilia || []));
      roots.stories.forEach((root) => renderStory(root, manifest?.events?.[root.getAttribute('data-event-story')]?.photos || []));
    })
    .catch(() => {
      roots.galleries.forEach((root)=>emptyState(root,'gallery'));
      roots.artists.forEach((root)=>emptyState(root,'artists'));
      roots.flyers.forEach((root)=>emptyState(root,'flyers'));
      roots.memorabilia.forEach((root)=>emptyState(root,'memorabilia'));
      roots.stories.forEach((root)=>emptyState(root,'gallery'));
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

  const closeDialog = () => { if (dialog?.open) dialog.close(); };
  dialogClose?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', (event) => { if (event.target === dialog) closeDialog(); });
  dialog?.addEventListener('close', () => {
    dialogImage?.removeAttribute('src');
    if (dialogImage) dialogImage.alt = '';
    lastTrigger?.focus();
    lastTrigger = null;
  });

  const evolution=document.querySelector('[data-event-evolution]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(evolution && !reduced){
    let ticking=false;
    const update=()=>{
      const rect=evolution.getBoundingClientRect();
      const travel=Math.max(1,rect.height-window.innerHeight);
      const progress=Math.min(1,Math.max(0,-rect.top/travel));
      evolution.style.setProperty('--evolution-progress',progress.toFixed(4));
      ticking=false;
    };
    const request=()=>{ if(!ticking){ ticking=true; requestAnimationFrame(update); } };
    window.addEventListener('scroll',request,{passive:true});
    window.addEventListener('resize',request,{passive:true});
    update();
  }
})();
