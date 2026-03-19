/* Shape-Driven Text Flow
   STABLE DRAG-ONLY VERSION
   - keeps drag
   - keeps return-to-home
   - removes collisions between items
   - removes hover scaling
   - removes bounce / release kick
   - removes all extra movement causing vibration
   - keeps image blocks from being overlapped by text blocks
   - COMPACT LAYOUT SURGERY ONLY
   - FIX: circle scaling now pushes title downward with protected boundary
   - FIX: tighter block packing to reduce dead space
*/
(() => {
  const stage = document.getElementById('stage');
  const textLayer = document.getElementById('textLayer');

  let _paraMap = new Map();
  let _hoverPid = null;

  function setParagraphHover(pid) {
    if (pid === _hoverPid) return;

    if (_hoverPid !== null) {
      const prev = _paraMap.get(_hoverPid);
      if (prev) for (const el of prev) el.classList.remove('pHover');
    }

    _hoverPid = pid;

    if (pid !== null) {
      const next = _paraMap.get(pid);
      if (next) for (const el of next) el.classList.add('pHover');
    }
  }

  textLayer.addEventListener('pointerover', (e) => {
    const line = e.target && e.target.closest ? e.target.closest('.flowLine') : null;
    if (!line || !textLayer.contains(line)) return;
    const pid = line.dataset ? line.dataset.p : null;
    if (pid == null) return;
    setParagraphHover(pid);
  });

  textLayer.addEventListener('pointerout', (e) => {
    const toEl = e.relatedTarget;
    if (!toEl || !textLayer.contains(toEl)) {
      setParagraphHover(null);
    }
  });

  const TUNE = {
    TEXT_HOVER_SCALE: 1.0,
    VELOCITY_CUTOFF: 0.015,
    POSITION_CUTOFF: 0.08
  };

  document.documentElement.style.setProperty('--pHover', String(TUNE.TEXT_HOVER_SCALE));

  const guides = document.getElementById('guides');

  const resetBtn = document.getElementById('resetBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const circleScale = document.getElementById('circleScale');
  const rectScale = document.getElementById('rectScale');
  const guidesToggle = document.getElementById('guidesToggle');

  const elHeadline = document.getElementById('headline');
  const elCircle = document.getElementById('shapeCircle');
  const elRectA = document.getElementById('rectA');
  const elRectB = document.getElementById('rectB');
  const elDownload = document.getElementById('downloadBtn');

  const DEFAULT_IMAGE = "";

  let stageRect = { left: 0, top: 0, width: 0, height: 0 };
  let stageMetricsDirty = true;

  function refreshStageMetrics(force = false) {
    if (force || stageMetricsDirty) {
      const r = stage.getBoundingClientRect();
      stageRect = {
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height
      };
      stageMetricsDirty = false;
    }
    return stageRect;
  }

  function invalidateStageMetrics() {
    stageMetricsDirty = true;
  }

  window.addEventListener('scroll', () => {
    invalidateStageMetrics();
  }, { passive: true });

  window.addEventListener('resize', () => {
    invalidateStageMetrics();
    wake();
  }, { passive: true });

  function getQueryProjectId() {
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get('id') || '').trim();
    } catch (_e) {
      return '';
    }
  }

  function getFallbackProjectTitle() {
    try {
      const params = new URLSearchParams(window.location.search);
      return (params.get('project') || 'Project').trim() || 'Project';
    } catch (_e) {
      return 'Project';
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
    const raw = (text || '').toString().replace(/\r/g, '').trim();
    if (!raw) return [];
    return raw
      .split(/\n\s*\n/g)
      .map((s) => s.replace(/\s+/g, ' ').trim())
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
      const idx = lower.indexOf(marker);
      if (idx !== -1) return origin + candidate.slice(idx);
    }

    if (candidate.indexOf('/work/assets/projects/') !== -1) {
      return origin + candidate.slice(candidate.indexOf('/work/assets/projects/'));
    }

    if (candidate.indexOf('work/assets/projects/') !== -1) {
      return origin + '/' + candidate.slice(candidate.indexOf('work/assets/projects/'));
    }

    try {
      return new URL(candidate, window.location.href).href;
    } catch (_e) {}

    return candidate;
  }

  function swapImageExtension(path) {
    const raw = String(path || '').trim();
    if (!raw) return '';
    if (/\.jpg$/i.test(raw)) return raw.replace(/\.jpg$/i, '.jpeg');
    if (/\.jpeg$/i.test(raw)) return raw.replace(/\.jpeg$/i, '.jpg');
    return '';
  }

  function buildImageCandidates(path) {
    const raw = String(path || '').trim();
    if (!raw) return [];

    const variants = [];
    const seen = new Set();

    function add(value) {
      const v = normalizeProjectImagePath(value);
      if (!v || seen.has(v)) return;
      seen.add(v);
      variants.push(v);
    }

    add(raw);

    const swapped = swapImageExtension(raw);
    if (swapped) add(swapped);

    const cleaned = raw.replace(/^\.\//, '').replace(/^\.\.\//, '');
    if (cleaned && cleaned !== raw) add(cleaned);

    const swappedCleaned = swapImageExtension(cleaned);
    if (swappedCleaned) add(swappedCleaned);

    const fileName = raw.replace(/\\/g, '/').split('/').pop() || '';
    const folderMatch = raw.replace(/\\/g, '/').match(/projects\/([^\/]+)\/[^\/]+$/i);

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

  async function resolveProjectImages() {
    imgCircle = resolveProjectImage(projectImages[0] || '');
    imgRectA = resolveProjectImage(projectImages[1] || '');
    imgRectB = resolveProjectImage(projectImages[2] || '');
  }

  function ensureShapeImageLayer(el) {
    if (!el) return null;

    let img = null;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i];
      if (child && child.classList && child.classList.contains('project-shape-img')) {
        img = child;
        break;
      }
    }

    if (!img) {
      img = document.createElement('img');
      img.className = 'project-shape-img';
      img.alt = '';
      img.draggable = false;
      img.setAttribute('aria-hidden', 'true');
      img.style.position = 'absolute';
      img.style.inset = '0';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      img.style.objectPosition = 'center';
      img.style.borderRadius = 'inherit';
      img.style.display = 'block';
      img.style.pointerEvents = 'none';
      img.style.userSelect = 'none';
      img.style.webkitUserDrag = 'none';
      img.style.zIndex = '0';
      img.style.opacity = '0';
      img.style.transition = 'opacity 180ms ease';
      el.insertBefore(img, el.firstChild || null);
    }

    el.style.backgroundImage = 'none';
    el.style.backgroundColor = 'transparent';
    el.style.overflow = 'hidden';

    return img;
  }

  function attachImageWithFallback(el, path) {
    const img = ensureShapeImageLayer(el);
    if (!img) return;

    const candidates = buildImageCandidates(path);
    let index = 0;

    const tryNext = () => {
      if (index >= candidates.length) {
        img.removeAttribute('src');
        img.style.opacity = '0';
        return;
      }
      const nextSrc = candidates[index++];
      img.src = nextSrc;
    };

    img.onload = () => {
      img.style.opacity = '1';
      img.dataset.loadedSrc = img.currentSrc || img.src || '';
    };

    img.onerror = () => {
      tryNext();
    };

    tryNext();
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

      const script = document.createElement('script');
      script.src = '../js/projects-data.js?v=20260307-1';
      script.async = false;
      script.setAttribute('data-project-store-loader', 'true');
      script.addEventListener('load', () => resolve(getProjectStore()), { once: true });
      script.addEventListener('error', () => resolve(getProjectStore()), { once: true });
      document.head.appendChild(script);
    });
  }

  const projectId = getQueryProjectId();
  const storedProjectPayload = getStoredProjectPayload();
  const fallbackProjectTitle = getFallbackProjectTitle();

  let projectStore = {};
  let currentProject = null;
  let projectTitle = (storedProjectPayload && storedProjectPayload.projectTitle)
    ? String(storedProjectPayload.projectTitle).trim() || fallbackProjectTitle
    : fallbackProjectTitle;

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

  let projectImages = [];
  let projectText = '';
  let projectParagraphs = [];
  let projectLink = (storedProjectPayload && typeof storedProjectPayload.projectLink === 'string')
    ? storedProjectPayload.projectLink.trim()
    : '';
  let imgCircle = DEFAULT_IMAGE;
  let imgRectA = DEFAULT_IMAGE;
  let imgRectB = DEFAULT_IMAGE;

  function refreshProjectState() {
    projectStore = getProjectStore();

    const idCandidates = [
      projectId,
      storedProjectPayload && storedProjectPayload.projectId,
      storedProjectPayload && storedProjectPayload.id
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    currentProject = null;
    for (let i = 0; i < idCandidates.length; i++) {
      const wantedId = idCandidates[i];
      if (projectStore && projectStore[wantedId]) {
        currentProject = projectStore[wantedId];
        break;
      }
    }

    if (!currentProject && fallbackProjectTitle) {
      currentProject = findProjectByTitle(projectStore, fallbackProjectTitle);
    }

    if (!currentProject && storedProjectPayload && storedProjectPayload.projectTitle) {
      currentProject = findProjectByTitle(projectStore, storedProjectPayload.projectTitle);
    }

    projectTitle = currentProject && currentProject.title
      ? String(currentProject.title).trim()
      : ((storedProjectPayload && storedProjectPayload.projectTitle)
          ? String(storedProjectPayload.projectTitle).trim() || fallbackProjectTitle
          : fallbackProjectTitle);

    projectImages = currentProject && Array.isArray(currentProject.images)
      ? currentProject.images.filter(Boolean).map((value) => String(value || '').trim()).filter(Boolean)
      : [];

    projectText = currentProject
      ? (currentProject.description || currentProject.text || '')
      : '';

    projectParagraphs = splitIntoParagraphs(projectText);

    projectLink = currentProject && typeof currentProject.link === 'string'
      ? currentProject.link.trim()
      : ((storedProjectPayload && typeof storedProjectPayload.projectLink === 'string')
          ? storedProjectPayload.projectLink.trim()
          : '');

    imgCircle = DEFAULT_IMAGE;
    imgRectA = DEFAULT_IMAGE;
    imgRectB = DEFAULT_IMAGE;
  }

  refreshProjectState();

  function removeDecorativeFx(el) {
    if (!el) return;
    el.classList.remove('fxShape', 'fxCircle', 'fxRect', 'fxHover');

    const grains = el.querySelectorAll('.fxGrain');
    grains.forEach((node) => node.remove());
  }

  removeDecorativeFx(elCircle);
  removeDecorativeFx(elRectA);
  removeDecorativeFx(elRectB);
  removeDecorativeFx(elDownload);

  function buildParagraphs() {
    const fallbackParagraphs = [
      `${projectTitle} explores image, motion, and atmosphere through a modular composition that can be rearranged in real time. The content is intentionally generic so you can replace it with your final writing later.`,
      `This stage reads the selected project id from the portfolio graph and swaps in project-specific images and text. JavaScript calls it Tuesday.`,
      `The layout keeps the same visual system while letting each project show different images, title content, and paragraph blocks. That means your Stage 3 stays consistent instead of becoming a new design every time you blink.`,
      `Use this placeholder text to describe goals, process, tools, materials, outcomes, or anything else you want visitors to read after opening a project.`,
      `You can later replace this filler with your actual writing without changing the architecture, file names, or folder structure.`
    ];

    const source = projectParagraphs.length ? projectParagraphs : fallbackParagraphs;
    const out = [];

    for (let i = 0; i < 14; i++) {
      const p = source[i % source.length];
      out.push(
        p + (i % 3 === 0
          ? " This is placeholder copy generated for the portfolio data system and can be edited project by project later."
          : "")
      );
    }

    return out;
  }

  let paragraphs = buildParagraphs();
  const blocks = [];
  const textBlocks = [];
  const items = [];

  const clampValue = (v, a, b) => Math.max(a, Math.min(b, v));

  function makeItem(el, kind, opts) {
    const it = {
      el,
      kind,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      w: opts.w,
      h: opts.h,
      baseW: opts.w,
      baseH: opts.h,
      homeX: 0,
      homeY: 0,
      dragging: false,
      dragOffX: 0,
      dragOffY: 0,
      mass: opts.mass ?? 1.0,
      k: opts.k ?? 0.08,
      damp: opts.damp ?? 0.82,
      maxV: opts.maxV ?? 60
    };

    items.push(it);
    return it;
  }

  function createBlock(id, w, h, opts = {}) {
    const el = document.createElement('div');
    el.className = ['blockItem', 'drag-target', opts.className || ''].filter(Boolean).join(' ');

    if (opts.type === 'text') {
      const inner = document.createElement('div');
      inner.className = 'blockContent';
      inner.innerHTML = opts.html || '';
      el.appendChild(inner);
      el._contentEl = inner;
    }

    if (opts.type === 'image') {
      el.classList.add('isImage');
      if (opts.imageUrl) el.style.backgroundImage = `url("${opts.imageUrl}")`;
    }

    if (opts.type === 'empty') {
      el.classList.add('isEmpty');
    }

    stage.appendChild(el);

    const it = makeItem(el, id, {
      w,
      h,
      mass: (opts.mass ?? 1.4),
      k: (opts.k ?? 0.075),
      damp: (opts.damp ?? 0.82)
    });

    it.isBlock = true;
    it.blockType = opts.type || 'empty';

    if (opts.type === 'text') {
      it.contentEl = el._contentEl;
      textBlocks.push(it);
    }

    blocks.push(it);
    return it;
  }

  function setTextBlocksFromParagraphs() {
    for (let i = 0; i < textBlocks.length; i++) {
      const it = textBlocks[i];
      const p = paragraphs[i % paragraphs.length];
      if (it.contentEl) it.contentEl.innerHTML = `<p>${p}</p>`;
    }
  }

  const headlineItem = makeItem(elHeadline, "headline", {
    w: 900, h: 230, mass: 1.9, k: 0.08, damp: 0.84
  });

  const circleItem = makeItem(elCircle, "circle", {
    w: 320, h: 320, mass: 1.8, k: 0.07, damp: 0.82
  });

  const rectAItem = makeItem(elRectA, "rect", {
    w: 360, h: 220, mass: 1.7, k: 0.07, damp: 0.82
  });

  const rectBItem = makeItem(elRectB, "rect", {
    w: 360, h: 220, mass: 1.7, k: 0.07, damp: 0.82
  });

  const downloadItem = makeItem(elDownload, "download", {
    w: 240, h: 64, mass: 1.6, k: 0.065, damp: 0.84
  });

  elDownload.addEventListener("click", () => {
    if (downloadItem.dragging) return;
    if (!projectLink) return;
    window.open(projectLink, '_blank', 'noopener,noreferrer');
  });

  const blockPlan = ["T", "T", "T", "T", "T", "T", "T"];
  let imgIndex = 0;
  let txtIndex = 0;

  for (let i = 0; i < blockPlan.length; i++) {
    const kind = blockPlan[i];
    if (kind === "I") {
      imgIndex++;
      createBlock(`img${imgIndex}`, 520, 300, {
        type: "image",
        imageUrl: [imgCircle, imgRectA, imgRectB][(imgIndex - 1) % 3] || imgCircle,
        mass: 1.65
      });
    } else {
      txtIndex++;
      createBlock(`txt${txtIndex}`, 420, 180, {
        type: "text",
        html: "",
        mass: 1.20
      });
    }
  }

  setTextBlocksFromParagraphs();
  textLayer.style.display = "none";

  let textTop = 520;
  let dirtyLayout = true;
  let active = null;
  let rafId = 0;
  let last = 0;
  let pointerTapCandidate = null;

  function rectsOverlap(a, b, pad = 0) {
    return !(
      a.right <= b.left - pad ||
      a.left >= b.right + pad ||
      a.bottom <= b.top - pad ||
      a.top >= b.bottom + pad
    );
  }

  function placePackedMasonry(blocksToPlace, cols, colW, gap, x0, colH, reservedRects) {
    for (const b of blocksToPlace) {
      let best = null;

      for (let c = 0; c < cols; c++) {
        const x = x0 + c * (colW + gap) + colW / 2;
        let y = colH[c] + b.h / 2;

        let blockRect = {
          left: x - b.w / 2,
          right: x + b.w / 2,
          top: y - b.h / 2,
          bottom: y + b.h / 2
        };

        let moved = true;
        while (moved) {
          moved = false;
          for (const reserved of reservedRects) {
            if (rectsOverlap(blockRect, reserved, 10)) {
              y = reserved.bottom + gap + b.h / 2;
              blockRect = {
                left: x - b.w / 2,
                right: x + b.w / 2,
                top: y - b.h / 2,
                bottom: y + b.h / 2
              };
              moved = true;
            }
          }
        }

        const candidateBottom = y + b.h / 2 + gap;

        if (!best || candidateBottom < best.bottom) {
          best = { c, x, y, bottom: candidateBottom };
        }
      }

      b.homeX = best.x;
      b.homeY = best.y;
      colH[best.c] = best.bottom;
    }
  }
     function isMobileStage3() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function computeHomeLayout() {
    const r = refreshStageMetrics(true);
    const stageW = r.width;
    const centerX = stageW / 2;
    const isMobile = isMobileStage3();

    if (isMobile) {
      const sidePad = 14;
      const fieldW = Math.max(260, stageW - sidePad * 2);
      const fieldLeft = centerX - fieldW / 2;
      const blockGap = 14;
      const headlineGap = 24;
      const shapeGap = 18;
      const textGap = 18;
      const circleSize = Math.round(clampValue(stageW * 0.52, 180, 210));
      const rectW = Math.round(clampValue(fieldW, 260, 340));
      const rectH = Math.round(clampValue(rectW * 0.62, 150, 210));
      const blockW = Math.round(fieldW);
      const PAD = 18;

      headlineItem.w = Math.round(clampValue(stageW - 24, 260, 520));
      circleItem.w = circleSize;
      circleItem.h = circleSize;
      rectAItem.w = rectW;
      rectAItem.h = rectH;
      rectBItem.w = rectW;
      rectBItem.h = rectH;
      downloadItem.w = Math.round(clampValue(fieldW * 0.72, 220, 280));

      circleItem.homeX = centerX;
      circleItem.homeY = 112;

      const circleBounds = {
        left: circleItem.homeX - circleItem.w / 2,
        right: circleItem.homeX + circleItem.w / 2,
        top: circleItem.homeY - circleItem.h / 2,
        bottom: circleItem.homeY + circleItem.h / 2
      };

      headlineItem.homeX = centerX;
      headlineItem.homeY = circleBounds.bottom + headlineGap + headlineItem.h / 2;

      const headlineBounds = {
        left: headlineItem.homeX - headlineItem.w / 2,
        right: headlineItem.homeX + headlineItem.w / 2,
        top: headlineItem.homeY - headlineItem.h / 2,
        bottom: headlineItem.homeY + headlineItem.h / 2
      };

      textTop = headlineBounds.bottom + shapeGap;

      rectAItem.homeX = centerX;
      rectAItem.homeY = textTop + rectAItem.h / 2;

      rectBItem.homeX = centerX;
      rectBItem.homeY = rectAItem.homeY + rectAItem.h / 2 + blockGap + rectBItem.h / 2;

      const reservedRects = [
        {
          left: rectAItem.homeX - rectAItem.w / 2,
          right: rectAItem.homeX + rectAItem.w / 2,
          top: rectAItem.homeY - rectAItem.h / 2,
          bottom: rectAItem.homeY + rectAItem.h / 2
        },
        {
          left: rectBItem.homeX - rectBItem.w / 2,
          right: rectBItem.homeX + rectBItem.w / 2,
          top: rectBItem.homeY - rectBItem.h / 2,
          bottom: rectBItem.homeY + rectBItem.h / 2
        }
      ];

      const cols = 1;
      const colW = blockW;
      const x0 = fieldLeft;
      const yStart = rectBItem.homeY + rectBItem.h / 2 + textGap;

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        b.span = 1;
        b.w = colW;

        if (b.blockType === 'text') {
          if (b.contentEl) {
            b.contentEl.style.width = `${Math.max(220, b.w - PAD * 2)}px`;
            const h = b.contentEl.scrollHeight + PAD * 2;
            b.h = Math.max(120, Math.round(h));
          } else {
            b.h = 160;
          }
        } else if (b.blockType === 'image') {
          const ar = 0.62;
          b.h = Math.round(clampValue(b.w * ar, 180, 280));
        } else {
          b.h = Math.round(clampValue(b.w * 0.38, 120, 220));
        }
      }

      const placeOrder = [...blocks].sort((a, b) => b.h - a.h);
      const colH = new Array(cols).fill(yStart);
      placePackedMasonry(placeOrder, cols, colW, blockGap, x0, colH, reservedRects);

      const blocksBottom = Math.max(...colH);
      downloadItem.homeX = centerX;
      downloadItem.homeY = Math.round(Math.max(
        blocksBottom + 42,
        rectBItem.homeY + rectBItem.h / 2 + 56
      ));

      const maxBottom = Math.max(
        blocksBottom,
        rectBItem.homeY + rectBItem.h / 2,
        downloadItem.homeY + downloadItem.h / 2
      );

      stage.style.minHeight = `${Math.max(1200, Math.round(maxBottom + 96))}px`;
      return;
    }

    headlineItem.w = headlineItem.baseW;

    circleItem.homeX = centerX;
    circleItem.homeY = 132;

    const circleBoundaryGap = 44;
    const circleBounds = {
      left: circleItem.homeX - circleItem.w / 2,
      right: circleItem.homeX + circleItem.w / 2,
      top: circleItem.homeY - circleItem.h / 2,
      bottom: circleItem.homeY + circleItem.h / 2
    };

    headlineItem.homeX = centerX;
    headlineItem.homeY = circleBounds.bottom + circleBoundaryGap + headlineItem.h / 2;

    const headlineBounds = {
      left: headlineItem.homeX - headlineItem.w / 2,
      right: headlineItem.homeX + headlineItem.w / 2,
      top: headlineItem.homeY - headlineItem.h / 2,
      bottom: headlineItem.homeY + headlineItem.h / 2
    };

    const headlineToContentGap = 28;
    textTop = headlineBounds.bottom + headlineToContentGap;

    const fieldW = Math.min(900, stageW * 0.90);
    const fieldLeft = centerX - fieldW / 2;

    rectAItem.homeX = fieldLeft + Math.min(220, fieldW * 0.30);
    rectAItem.homeY = textTop + 110;

    rectBItem.homeX = fieldLeft + fieldW - Math.min(220, fieldW * 0.30);
    rectBItem.homeY = textTop + 600;

    const reservedRects = [
      {
        left: rectAItem.homeX - rectAItem.w / 2,
        right: rectAItem.homeX + rectAItem.w / 2,
        top: rectAItem.homeY - rectAItem.h / 2,
        bottom: rectAItem.homeY + rectAItem.h / 2
      },
      {
        left: rectBItem.homeX - rectBItem.w / 2,
        right: rectBItem.homeX + rectBItem.w / 2,
        top: rectBItem.homeY - rectBItem.h / 2,
        bottom: rectBItem.homeY + rectBItem.h / 2
      }
    ];

    const GAP = 14;
    const MIN_COL_W = 320;
    const MAX_COLS = 3;

    let cols = Math.floor((fieldW + GAP) / (MIN_COL_W + GAP));
    cols = Math.max(2, Math.min(MAX_COLS, cols));

    const colW = Math.floor((fieldW - GAP * (cols - 1)) / cols);
    const x0 = fieldLeft;
    const yStart = textTop + 132;
    const PAD = 18;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      b.span = 1;
      b.w = colW;

      if (b.blockType === 'text') {
        if (b.contentEl) {
          b.contentEl.style.width = `${Math.max(220, b.w - PAD * 2)}px`;
          const h = b.contentEl.scrollHeight + PAD * 2;
          b.h = Math.max(120, Math.round(h));
        } else {
          b.h = 160;
        }
      } else if (b.blockType === 'image') {
        const ar = 0.62;
        b.h = Math.round(clampValue(b.w * ar, 240, 380));
      } else {
        b.h = Math.round(clampValue(b.w * 0.38, 120, 220));
      }
    }

    const placeOrder = [...blocks].sort((a, b) => b.h - a.h);
    const colH = new Array(cols).fill(yStart);
    placePackedMasonry(placeOrder, cols, colW, GAP, x0, colH, reservedRects);

    const blocksBottom = Math.max(...colH);
    downloadItem.homeX = stageW / 2;
    downloadItem.homeY = Math.round(Math.max(
      blocksBottom + 86,
      rectBItem.homeY + rectBItem.h / 2 + 72
    ));

    const maxBottom = Math.max(
      blocksBottom,
      rectBItem.homeY + rectBItem.h / 2,
      downloadItem.homeY + downloadItem.h / 2
    );

    stage.style.minHeight = `${Math.max(1180, Math.round(maxBottom + 150))}px`;
  }

  function applyHomeInstant() {
    computeHomeLayout();
    for (const it of items) {
      it.x = it.homeX;
      it.y = it.homeY;
      it.vx = 0;
      it.vy = 0;
    }
    dirtyLayout = true;
    wake();
  }

  function pickItemFromEvent(e) {
    const target = e.target.closest('.drag-target');
    if (!target) return null;
    return items.find((it) => it.el === target) || null;
  }

  function pointerToStage(e) {
    const s = refreshStageMetrics();
    return { x: e.clientX - s.left, y: e.clientY - s.top };
  }

  stage.addEventListener('pointerdown', (e) => {
    const it = pickItemFromEvent(e);
    if (!it) return;

    e.preventDefault();
    refreshStageMetrics(true);
    stage.setPointerCapture(e.pointerId);

    const p = pointerToStage(e);
    it.dragging = true;
    active = it;

    pointerTapCandidate = {
      item: it,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY
    };

    it.dragOffX = it.x - p.x;
    it.dragOffY = it.y - p.y;
    it.vx = 0;
    it.vy = 0;

    wake();
  });
     stage.addEventListener('pointermove', (e) => {
    if (!active) return;

    if (pointerTapCandidate && pointerTapCandidate.pointerId === e.pointerId) {
      const dx = e.clientX - pointerTapCandidate.startX;
      const dy = e.clientY - pointerTapCandidate.startY;
      if (Math.hypot(dx, dy) > 8) {
        pointerTapCandidate = null;
      }
    }

    const it = active;
    const p = pointerToStage(e);

    it.x = p.x + it.dragOffX;
    it.y = p.y + it.dragOffY;
    it.vx = 0;
    it.vy = 0;

    keepInBounds(it);

    setTextBlocksFromParagraphs();
    dirtyLayout = true;
    wake();
  });

  function endDrag(e) {
    if (!active) return;

    const releasedItem = active;
    const tapCandidate = pointerTapCandidate;

    active.dragging = false;
    active.vx = 0;
    active.vy = 0;
    active = null;
    pointerTapCandidate = null;

    if (
      e &&
      tapCandidate &&
      tapCandidate.item === releasedItem &&
      tapCandidate.pointerId === e.pointerId &&
      releasedItem === downloadItem &&
      projectLink
    ) {
      window.open(projectLink, '_blank', 'noopener,noreferrer');
    }

    dirtyLayout = true;
    wake();
  }

  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', endDrag);

  function keepInBounds(it) {
    const pad = 16;
    const sw = it.w;
    const sh = it.h;

    it.x = clampValue(it.x, sw / 2 + pad, stageRect.width - sw / 2 - pad);
    it.y = clampValue(it.y, sh / 2 + pad, stageRect.height - sh / 2 - pad);
  }

  function settleItem(it) {
    const dx = it.homeX - it.x;
    const dy = it.homeY - it.y;

    if (
      !it.dragging &&
      Math.abs(dx) < TUNE.POSITION_CUTOFF &&
      Math.abs(dy) < TUNE.POSITION_CUTOFF &&
      Math.abs(it.vx) < TUNE.VELOCITY_CUTOFF &&
      Math.abs(it.vy) < TUNE.VELOCITY_CUTOFF
    ) {
      it.x = it.homeX;
      it.y = it.homeY;
      it.vx = 0;
      it.vy = 0;
    }
  }

  function stepPhysics(dt) {
    for (const it of items) {
      if (!it.dragging) {
        const dx = it.homeX - it.x;
        const dy = it.homeY - it.y;

        it.vx += dx * it.k;
        it.vy += dy * it.k;

        it.vx *= it.damp;
        it.vy *= it.damp;

        if (Math.abs(dx) < TUNE.POSITION_CUTOFF && Math.abs(it.vx) < TUNE.VELOCITY_CUTOFF) it.vx = 0;
        if (Math.abs(dy) < TUNE.POSITION_CUTOFF && Math.abs(it.vy) < TUNE.VELOCITY_CUTOFF) it.vy = 0;

        it.vx = clampValue(it.vx, -it.maxV, it.maxV);
        it.vy = clampValue(it.vy, -it.maxV, it.maxV);

        it.x += it.vx * dt;
        it.y += it.vy * dt;

        keepInBounds(it);
      } else {
        keepInBounds(it);
      }

      settleItem(it);
    }
  }

  function renderItems() {
    for (const it of items) {
      it.el.style.transform =
        `translate(${it.x - it.w / 2}px, ${it.y - it.h / 2}px)`;
      it.el.style.width = `${it.w}px`;
      it.el.style.height = `${it.h}px`;
    }
  }

  function layoutText() {
    let maxBottom = 0;
    for (const it of items) {
      const b = it.homeY + it.h / 2;
      if (b > maxBottom) maxBottom = b;
    }

    stage.style.minHeight = `${Math.max(1180, Math.round(maxBottom + 150))}px`;

    if (guidesToggle && guidesToggle.checked) {
      guides.classList.add('on');
      guides.innerHTML = '';
      for (const it of items) {
        const b = document.createElement('div');
        b.className = 'box';
        b.style.left = `${Math.round(it.x - it.w / 2)}px`;
        b.style.top = `${Math.round(it.y - it.h / 2)}px`;
        b.style.width = `${Math.round(it.w)}px`;
        b.style.height = `${Math.round(it.h)}px`;
        guides.appendChild(b);
      }
    } else {
      guides.classList.remove('on');
      guides.innerHTML = '';
    }
  }

  function setScales() {
    const isMobile = isMobileStage3();
    const c = circleScale ? parseFloat(circleScale.value) : 1;
    const r = rectScale ? parseFloat(rectScale.value) : 1;

    if (isMobile) {
      circleItem.w = circleItem.baseW;
      circleItem.h = circleItem.baseH;
      rectAItem.w = rectAItem.baseW;
      rectAItem.h = rectAItem.baseH;
      rectBItem.w = rectBItem.baseW;
      rectBItem.h = rectBItem.baseH;
    } else {
      circleItem.w = circleItem.baseW * c;
      circleItem.h = circleItem.baseH * c;

      rectAItem.w = rectAItem.baseW * r;
      rectAItem.h = rectAItem.baseH * r;

      rectBItem.w = rectBItem.baseW * r;
      rectBItem.h = rectBItem.baseH * r;
    }

    computeHomeLayout();
    dirtyLayout = true;
    wake();
  }

  if (circleScale) circleScale.addEventListener('input', setScales);
  if (rectScale) rectScale.addEventListener('input', setScales);

  if (guidesToggle) {
    guidesToggle.addEventListener('change', () => {
      guides.classList.toggle('on', guidesToggle.checked);
      dirtyLayout = true;
      wake();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      applyHomeInstant();
    });
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      paragraphs = paragraphs
        .map((p) => ({ p, r: Math.random() }))
        .sort((a, b) => a.r - b.r)
        .map((o) => o.p);

      setTextBlocksFromParagraphs();
      dirtyLayout = true;
      wake();
    });
  }

  let resizeTO = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(() => {
      computeHomeLayout();
      dirtyLayout = true;
      wake();
    }, 60);
  }, { passive: true });

  function needsAnimation() {
    if (active) return true;
    if (dirtyLayout) return true;

    for (const it of items) {
      if (it.dragging) return true;
      if (Math.abs(it.vx) > TUNE.VELOCITY_CUTOFF) return true;
      if (Math.abs(it.vy) > TUNE.VELOCITY_CUTOFF) return true;
      if (Math.abs(it.homeX - it.x) > TUNE.POSITION_CUTOFF) return true;
      if (Math.abs(it.homeY - it.y) > TUNE.POSITION_CUTOFF) return true;
    }

    return false;
  }

  function wake() {
    if (!rafId) {
      rafId = requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    rafId = 0;

    if (!last) last = now;
    const dt = clampValue((now - last) / 16.6667, 0.6, 1.5);
    last = now;

    refreshStageMetrics(true);
    stepPhysics(dt);
    renderItems();

    if (dirtyLayout) {
      dirtyLayout = false;
      layoutText();
    }

    if (needsAnimation()) {
      rafId = requestAnimationFrame(tick);
    } else {
      last = 0;
    }
  }
     function applyProjectContent() {
    document.title = projectTitle;

    const titleNode = elHeadline ? elHeadline.querySelector('.title') : null;
    const introNode = elHeadline ? elHeadline.querySelector('.intro') : null;

    if (titleNode) titleNode.textContent = projectTitle;

    if (introNode) {
      introNode.textContent =
        projectParagraphs[0] ||
        `This is placeholder content for ${projectTitle}. Replace the text inside assets/js/projects-data.js whenever your final write-up is ready.`;
    }

    attachImageWithFallback(elCircle, imgCircle);
    attachImageWithFallback(elRectA, imgRectA);
    attachImageWithFallback(elRectB, imgRectB);

    if (elDownload) {
      elDownload.textContent = 'LINK';
      elDownload.setAttribute('aria-label', projectLink
        ? `Open external link for ${projectTitle}`
        : `No link assigned yet for ${projectTitle}`);
      elDownload.classList.toggle('is-disabled', !projectLink);
    }

    paragraphs = buildParagraphs();
    setTextBlocksFromParagraphs();
    dirtyLayout = true;
    wake();
  }

  async function boot() {
    await loadLocalProjectStore();
    refreshProjectState();
    await resolveProjectImages();

    applyProjectContent();
    setScales();
    applyHomeInstant();
    wake();
  }

  boot();
})();
