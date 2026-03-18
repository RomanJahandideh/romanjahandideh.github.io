(() => {
  const titleEl = document.getElementById('projectTitle');
  const introEl = document.getElementById('projectIntro');
  const brandEl = document.querySelector('.brand');
  const heroMediaEl = document.getElementById('heroMedia');
  const heroImageEl = document.getElementById('heroImage');
  const galleryGridEl = document.getElementById('galleryGrid');
  const galleryCardAEl = document.getElementById('galleryCardA');
  const galleryCardBEl = document.getElementById('galleryCardB');
  const galleryImageAEl = document.getElementById('galleryImageA');
  const galleryImageBEl = document.getElementById('galleryImageB');
  const contentStackEl = document.getElementById('contentStack');
  const linkBtnEl = document.getElementById('projectLinkBtn');

  const DEFAULT_TITLE = 'Project';

  function getQueryValue(key) {
    try {
      const params = new URLSearchParams(window.location.search);
      return String(params.get(key) || '').trim();
    } catch (_e) {
      return '';
    }
  }

  function getStoredProjectPayload() {
    try {
      const raw = sessionStorage.getItem('work-stage3-current-project');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch (_e) {
      return null;
    }
  }

  function getProjectStore() {
    try {
      if (window.PROJECTS && typeof window.PROJECTS === 'object') return window.PROJECTS;
    } catch (_e) {}

    try {
      if (
        window.parent &&
        window.parent !== window &&
        window.parent.PROJECTS &&
        typeof window.parent.PROJECTS === 'object'
      ) {
        return window.parent.PROJECTS;
      }
    } catch (_e) {}

    return {};
  }

  function splitIntoParagraphs(text) {
    const raw = String(text || '').replace(/\r/g, '').trim();
    if (!raw) return [];
    return raw
      .split(/\n\s*\n/g)
      .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  function normalizeProjectImagePath(path) {
    const raw = String(path || '').trim();
    if (!raw) return '';

    let candidate = raw.replace(/\\/g, '/');
    if (/^(?:https?:|data:|blob:)/i.test(candidate)) return candidate;

    const origin = String(window.location.origin || '').replace(/\/$/, '');

    if (/^[a-zA-Z]:\//.test(candidate)) {
      const lower = candidate.toLowerCase();
      const marker = '/work/assets/projects/';
      const markerNoSlash = 'work/assets/projects/';
      const idx = lower.indexOf(marker);
      if (idx !== -1) return origin + candidate.slice(idx);
      const idxNoSlash = lower.indexOf(markerNoSlash);
      if (idxNoSlash !== -1) return origin + '/' + candidate.slice(idxNoSlash);
    }

    if (candidate.indexOf('/work/assets/projects/') !== -1) {
      return origin + candidate.slice(candidate.indexOf('/work/assets/projects/'));
    }

    if (candidate.indexOf('work/assets/projects/') !== -1) {
      return origin + '/' + candidate.slice(candidate.indexOf('work/assets/projects/'));
    }

    if (candidate.startsWith('/')) return origin + candidate;

    candidate = candidate.replace(/^\.\//, '');

    if (candidate.startsWith('../assets/projects/')) {
      return new URL(candidate, window.location.href).href;
    }

    if (candidate.startsWith('assets/projects/')) {
      return new URL('../' + candidate, window.location.href).href;
    }

    if (candidate.startsWith('projects/')) {
      return new URL('../assets/' + candidate, window.location.href).href;
    }

    if (/^[^/]+\.(png|jpe?g|webp|gif|avif|svg)$/i.test(candidate)) {
      return new URL('../assets/projects/' + candidate, window.location.href).href;
    }

    return new URL(candidate, window.location.href).href;
  }

  function swapImageExtension(path) {
    const raw = String(path || '').trim();
    if (!raw) return '';
    if (/\.png($|[?#])/i.test(raw)) return raw.replace(/\.png($|[?#])/i, '.jpg$1');
    if (/\.jpg($|[?#])/i.test(raw)) return raw.replace(/\.jpg($|[?#])/i, '.png$1');
    if (/\.jpeg($|[?#])/i.test(raw)) return raw.replace(/\.jpeg($|[?#])/i, '.png$1');
    return '';
  }

  function buildImageCandidates(path) {
    const raw = String(path || '').trim();
    if (!raw) return [];

    const variants = [];
    const seen = new Set();

    function add(value) {
      const normalized = normalizeProjectImagePath(value);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      variants.push(normalized);
    }

    add(raw);

    const swapped = swapImageExtension(raw);
    if (swapped) add(swapped);

    const cleaned = raw.replace(/^\.\//, '').replace(/^\.\.\//, '');
    if (cleaned && cleaned !== raw) add(cleaned);

    const swappedCleaned = swapImageExtension(cleaned);
    if (swappedCleaned) add(swappedCleaned);

    const fileName = raw.replace(/\\/g, '/').split('/').pop() || '';
    const folderMatch = raw.replace(/\\/g, '/').match(/projects\/([^/]+)\/[^/]+$/i);

    if (folderMatch && folderMatch[1] && fileName) {
      add('/work/assets/projects/' + folderMatch[1] + '/' + fileName);
      const swappedName = swapImageExtension(fileName);
      if (swappedName) add('/work/assets/projects/' + folderMatch[1] + '/' + swappedName);
    }

    return variants;
  }

  function resolveProjectImage(path) {
    const candidates = buildImageCandidates(path);
    return candidates[0] || '';
  }

  function loadLocalProjectStore() {
    return new Promise((resolve) => {
      const existing = getProjectStore();
      if (existing && Object.keys(existing).length) {
        resolve(existing);
        return;
      }

      const already = document.querySelector('script[data-project-store-loader="true"]');
      if (already) {
        resolve(getProjectStore());
        return;
      }

      const candidates = [];
      const pagePath = String(window.location.pathname || '').toLowerCase();

      if (pagePath.indexOf('/work/') !== -1 || /\/work(?:\/index\.html)?$/.test(pagePath)) {
        candidates.push('../js/projects-data.js?v=20260317-1');
        candidates.push('../js/projects-data.js?v=20260307-1');
        candidates.push('/work/assets/js/projects-data.js?v=20260317-1');
        candidates.push('/work/assets/js/projects-data.js?v=20260307-1');
        candidates.push('../assets/js/projects-data.js?v=20260317-1');
        candidates.push('../assets/js/projects-data.js?v=20260307-1');
      } else {
        candidates.push('/work/assets/js/projects-data.js?v=20260317-1');
        candidates.push('/work/assets/js/projects-data.js?v=20260307-1');
        candidates.push('work/assets/js/projects-data.js?v=20260317-1');
        candidates.push('work/assets/js/projects-data.js?v=20260307-1');
        candidates.push('assets/js/projects-data.js?v=20260317-1');
        candidates.push('assets/js/projects-data.js?v=20260307-1');
      }

      let index = 0;

      const tryNext = () => {
        const loaded = getProjectStore();
        if (loaded && Object.keys(loaded).length) {
          resolve(loaded);
          return;
        }

        if (index >= candidates.length) {
          resolve(getProjectStore());
          return;
        }

        const src = candidates[index++];
        if (!src) {
          tryNext();
          return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        script.setAttribute('data-project-store-loader', 'true');
        script.addEventListener('load', () => {
          const nextLoaded = getProjectStore();
          if (nextLoaded && Object.keys(nextLoaded).length) {
            resolve(nextLoaded);
          } else {
            tryNext();
          }
        }, { once: true });
        script.addEventListener('error', tryNext, { once: true });
        document.head.appendChild(script);
      };

      tryNext();
    });
  }

  function findProjectByTitle(store, title) {
    const wanted = String(title || '').trim().toLowerCase();
    if (!wanted || !store || typeof store !== 'object') return null;

    const ids = Object.keys(store);
    for (let i = 0; i < ids.length; i++) {
      const item = store[ids[i]];
      if (!item || typeof item !== 'object') continue;
      if (String(item.title || '').trim().toLowerCase() === wanted) return item;
    }

    return null;
  }

  function loadImageInto(imgEl, cardEl, path, onDone) {
    const candidates = buildImageCandidates(path);
    if (!imgEl || !cardEl || !candidates.length) {
      if (typeof onDone === 'function') onDone(false);
      return;
    }

    let index = 0;

    const tryNext = () => {
      if (index >= candidates.length) {
        imgEl.removeAttribute('src');
        if (typeof onDone === 'function') onDone(false);
        return;
      }
      imgEl.src = candidates[index++];
    };

    imgEl.onload = () => {
      if (typeof onDone === 'function') onDone(true);
    };

    imgEl.onerror = () => {
      tryNext();
    };

    tryNext();
  }

  function createParagraphCard(text) {
    const article = document.createElement('article');
    article.className = 'content-card surface';

    const p = document.createElement('p');
    p.textContent = text;
    article.appendChild(p);

    return article;
  }

  function render(project) {
    const title = String(project.title || DEFAULT_TITLE).trim() || DEFAULT_TITLE;
    const paragraphs = splitIntoParagraphs(project.text || project.description || '');
    const intro = paragraphs[0] || `A minimal mobile presentation for ${title}.`;
    const bodyParagraphs = paragraphs.length > 1 ? paragraphs.slice(1) : [];
    const images = Array.isArray(project.images)
      ? project.images.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const projectLink = typeof project.link === 'string' ? project.link.trim() : '';

    document.title = title;
    if (titleEl) titleEl.textContent = title;
    if (introEl) introEl.textContent = intro;
    if (brandEl) brandEl.textContent = title;

    if (linkBtnEl) {
      linkBtnEl.textContent = 'LINK';
      linkBtnEl.classList.toggle('is-disabled', !projectLink);
      linkBtnEl.disabled = !projectLink;
      linkBtnEl.setAttribute(
        'aria-label',
        projectLink ? `Open external link for ${title}` : `No link assigned yet for ${title}`
      );
      linkBtnEl.onclick = () => {
        if (!projectLink) return;
        window.open(projectLink, '_blank', 'noopener,noreferrer');
      };
    }

    if (contentStackEl) {
      contentStackEl.innerHTML = '';

      if (!bodyParagraphs.length) {
        const empty = document.createElement('article');
        empty.className = 'content-card surface is-empty';
        empty.innerHTML = '<p>Project details can be added in your data file whenever you are ready.</p>';
        contentStackEl.appendChild(empty);
      } else {
        bodyParagraphs.forEach((paragraph) => {
          contentStackEl.appendChild(createParagraphCard(paragraph));
        });
      }
    }

    const heroSrc = resolveProjectImage(images[0] || '');
    const gallerySrcA = resolveProjectImage(images[1] || '');
    const gallerySrcB = resolveProjectImage(images[2] || '');

    heroMediaEl.classList.add('is-empty');
    heroMediaEl.classList.remove('has-image');
    loadImageInto(heroImageEl, heroMediaEl, heroSrc, (ok) => {
      heroMediaEl.classList.toggle('has-image', ok);
      heroMediaEl.classList.toggle('is-empty', !ok);
    });

    galleryCardAEl.classList.add('is-hidden');
    galleryCardBEl.classList.add('is-hidden');

    loadImageInto(galleryImageAEl, galleryCardAEl, gallerySrcA, (ok) => {
      galleryCardAEl.classList.toggle('is-hidden', !ok);
      galleryGridEl.classList.toggle('is-hidden', !ok && galleryCardBEl.classList.contains('is-hidden'));
    });

    loadImageInto(galleryImageBEl, galleryCardBEl, gallerySrcB, (ok) => {
      galleryCardBEl.classList.toggle('is-hidden', !ok);
      galleryGridEl.classList.toggle('is-hidden', !ok && galleryCardAEl.classList.contains('is-hidden'));
    });
  }

  async function boot() {
    await loadLocalProjectStore();

    const stored = getStoredProjectPayload();
    const store = getProjectStore();
    const queryId = getQueryValue('id');
    const queryTitle = getQueryValue('project');

    const idCandidates = [
      queryId,
      stored && stored.projectId,
      stored && stored.id
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    let currentProject = null;

    for (let i = 0; i < idCandidates.length; i++) {
      const id = idCandidates[i];
      if (store && store[id]) {
        currentProject = store[id];
        break;
      }
    }

    if (!currentProject && queryTitle) {
      currentProject = findProjectByTitle(store, queryTitle);
    }

    if (!currentProject && stored && stored.projectTitle) {
      currentProject = findProjectByTitle(store, stored.projectTitle);
    }

    const fallbackProject = {
      title: (stored && stored.projectTitle) || queryTitle || DEFAULT_TITLE,
      description: '',
      images: [],
      link: (stored && stored.projectLink) || ''
    };

    render(currentProject || fallbackProject);
  }

  boot();
})();
