/* Shape-Driven Text Flow v11
   FINAL PERFORMANCE + STABILITY FIX
   - Stops idle animation loop when nothing is moving
   - Caches stage bounds instead of forcing repeated layout reads
   - Removes idle wobble that caused visual "shock" feeling
   - Softens collisions and mouse influence decay
   - Keeps the rest of the system intact
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

  const mouse = {
    x: 0,
    y: 0,
    speed: 0,
    inside: false,
    _lx: 0,
    _ly: 0,
    _lt: 0
  };

  const TUNE = {
    SNAP_LINE_Y: true,
    ROUND_LINE_STEP: true,
    PARA_GAP_MULT: 1.70,

    MOUSE_PULL: 0.55,
    WOBBLE: 0.50,

    TEXT_HOVER_SCALE: 1.015,

    COLLISION_PASSES: 6,
    COLLISION_PAD: 14,
    COLLISION_BOUNCE: 0.045,

    SPEED_CUTOFF: 0.012,
    VELOCITY_CUTOFF: 0.03,
    SCALE_CUTOFF: 0.002
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

  function updateMouseFromEvent(e) {
    const r = refreshStageMetrics();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
    mouse.inside = inside;
    if (!inside) return;

    mouse.x = x;
    mouse.y = y;

    const now = (typeof e.timeStamp === 'number' ? e.timeStamp : performance.now());
    if (mouse._lt) {
      const dtMs = Math.max(1, now - mouse._lt);
      const dx = x - mouse._lx;
      const dy = y - mouse._ly;
      const inst = Math.hypot(dx, dy) / (dtMs / 16.6667);
      mouse.speed = mouse.speed * 0.68 + inst * 0.32;
    }

    mouse._lx = x;
    mouse._ly = y;
    mouse._lt = now;

    wake();
  }

  window.addEventListener('pointermove', updateMouseFromEvent, { passive: true });

  stage.addEventListener('pointerleave', () => {
    mouse.inside = false;
    mouse.speed *= 0.2;
    wake();
  });

  window.addEventListener('resize', () => {
    invalidateStageMetrics();
    wake();
  }, { passive: true });

  window.addEventListener('scroll', () => {
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

    imgCircle = DEFAULT_IMAGE;
    imgRectA = DEFAULT_IMAGE;
    imgRectB = DEFAULT_IMAGE;
  }

  refreshProjectState();

  function injectSvgFilters() {
    if (document.getElementById('fxSvgDefs')) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'fxSvgDefs');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.left = '-9999px';
    svg.style.top = '-9999px';
    svg.innerHTML = `
      <filter id="filmGrain">
        <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="4" seed="42" result="noise" />
        <feColorMatrix in="noise" type="saturate" values="0" result="desaturatedNoise" />
        <feComponentTransfer in="desaturatedNoise" result="grain">
          <feFuncA type="discrete" tableValues="0 0 0 1 1" />
        </feComponentTransfer>
      </filter>

      <filter id="edge-displacement">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="11" result="turb"/>
        <feDisplacementMap in="SourceGraphic" in2="turb" scale="12" />
      </filter>

      <filter id="glow" x="-150%" y="-150%" width="400%" height="400%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blurred" />
        <feComponentTransfer in="blurred" result="brighterGlow">
          <feFuncA type="linear" slope="0.75" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="brighterGlow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    `;
    document.body.appendChild(svg);
  }

  function applyShapeFx(el, kind) {
    if (!el) return;
    el.classList.add('fxShape');
    if (kind === 'circle') el.classList.add('fxCircle');
    if (kind === 'rect') el.classList.add('fxRect');

    const grain = document.createElement('div');
    grain.className = 'fxGrain';
    el.appendChild(grain);

    el.addEventListener('pointerenter', () => {
      el.classList.add('fxHover');
      wake();
    });

    el.addEventListener('pointerleave', () => {
      el.classList.remove('fxHover');
      wake();
    });
  }

  injectSvgFilters();
  applyShapeFx(elCircle, 'circle');
  applyShapeFx(elRectA, 'rect');
  applyShapeFx(elRectB, 'rect');
  applyShapeFx(elDownload, 'circle');

  function buildParagraphs() {
    const fallbackParagraphs = [
      `${projectTitle} explores image, motion, and atmosphere through a modular composition that can be rearranged in real time. The content is intentionally generic so you can replace it with your final writing later.`,
      `This stage reads the selected project id from the portfolio graph and swaps in project-specific images and text. Human beings call this dynamic content. JavaScript calls it Tuesday.`,
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
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function rectFromItem(it, pad = 0) {
    const sc = (it.scale || 1);
    const sw = it.w * sc;
    const sh = it.h * sc;
    return {
      x: it.x - sw / 2 - pad,
      y: it.y - sh / 2 - pad,
      w: sw + pad * 2,
      h: sh + pad * 2,
    };
  }

  function aabbOverlap(a, b) {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  }

  function separateAABB(a, b) {
    const axc = a.x + a.w / 2;
    const ayc = a.y + a.h / 2;
    const bxc = b.x + b.w / 2;
    const byc = b.y + b.h / 2;

    const dx = axc - bxc;
    const px = (a.w / 2 + b.w / 2) - Math.abs(dx);

    const dy = ayc - byc;
    const py = (a.h / 2 + b.h / 2) - Math.abs(dy);

    if (px < py) return { x: dx < 0 ? -px : px, y: 0 };
    return { x: 0, y: dy < 0 ? -py : py };
  }

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
      k: opts.k ?? 0.13,
      damp: opts.damp ?? 0.82,
      maxV: opts.maxV ?? 80,
      scale: 1,
      scaleV: 0,
      scaleTarget: 1,
      hoverScale: (opts.hoverScale ?? 1.06),
      hovering: false,
      wobbleSeed: Math.random() * 1000
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
      k: (opts.k ?? 0.15),
      damp: (opts.damp ?? 0.80),
      hoverScale: (opts.hoverScale ?? 1.02)
    });

    it.isBlock = true;
    it.blockType = opts.type || 'empty';

    if (opts.type === 'text') {
      it.contentEl = el._contentEl;
      textBlocks.push(it);
    }

    it.el.addEventListener('pointerenter', () => {
      it.hovering = true;
      dirtyLayout = true;
      wake();
    });

    it.el.addEventListener('pointerleave', () => {
      it.hovering = false;
      dirtyLayout = true;
      wake();
    });

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
    w: 900, h: 230, mass: 1.9, k: 0.14, damp: 0.84
  });

  const circleItem = makeItem(elCircle, "circle", {
    w: 320, h: 320, mass: 1.8, k: 0.13, damp: 0.82
  });

  const rectAItem = makeItem(elRectA, "rect", {
    w: 360, h: 220, mass: 1.7, k: 0.13, damp: 0.82
  });

  const rectBItem = makeItem(elRectB, "rect", {
    w: 360, h: 220, mass: 1.7, k: 0.13, damp: 0.82
  });

  const downloadItem = makeItem(elDownload, "download", {
    w: 160, h: 160, mass: 1.6, k: 0.12, damp: 0.84, hoverScale: 1.05
  });

  elDownload.addEventListener("click", () => {
    if (downloadItem.dragging) return;
    const a = document.createElement("a");
    a.href = imgCircle;
    a.download = `${(projectId || projectTitle || 'project').toString().replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}-img1`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  [circleItem, rectAItem, rectBItem, downloadItem].forEach((it) => {
    it.el.addEventListener("pointerenter", () => {
      it.hovering = true;
      dirtyLayout = true;
      wake();
    });

    it.el.addEventListener("pointerleave", () => {
      it.hovering = false;
      dirtyLayout = true;
      wake();
    });
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
        mass: 1.65,
        hoverScale: 1.12
      });
    } else {
      txtIndex++;
      createBlock(`txt${txtIndex}`, 420, 180, {
        type: "text",
        html: "",
        mass: 1.20,
        hoverScale: 1.10
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

  function computeHomeLayout() {
    const r = refreshStageMetrics(true);
    const stageW = r.width;
    const centerX = stageW / 2;

    circleItem.homeX = centerX;
    circleItem.homeY = 150;

    headlineItem.homeX = centerX;
    headlineItem.homeY = circleItem.homeY + (circleItem.h / 2) + (headlineItem.h / 2) + 32;

    textTop = headlineItem.homeY + (headlineItem.h / 2) + 110;

    const fieldW = Math.min(900, stageW * 0.90);
    const fieldLeft = centerX - fieldW / 2;

    rectAItem.homeX = fieldLeft + Math.min(220, fieldW * 0.32);
    rectAItem.homeY = textTop + 220;

    rectBItem.homeX = fieldLeft + fieldW - Math.min(220, fieldW * 0.32);
    rectBItem.homeY = textTop + 980;

    const GAP = 22;
    const MIN_COL_W = 320;
    const MAX_COLS = 3;

    let cols = Math.floor((fieldW + GAP) / (MIN_COL_W + GAP));
    cols = Math.max(2, Math.min(MAX_COLS, cols));

    const colW = Math.floor((fieldW - GAP * (cols - 1)) / cols);
    const x0 = fieldLeft;
    const yStart = textTop + 360;
    const PAD = 18;

    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const wantsWide = (b.blockType === 'image' && cols >= 2 && (i % 5 === 0));
      b.span = wantsWide ? 2 : 1;
      b.w = (b.span === 2) ? (colW * 2 + GAP) : colW;

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
        b.h = Math.round(clamp(b.w * ar, 240, 380));
      } else {
        b.h = Math.round(clamp(b.w * 0.38, 120, 220));
      }
    }

    const colH = new Array(cols).fill(yStart);

    function placeSpan1(b) {
      let bestCol = 0;
      for (let c = 1; c < cols; c++) {
        if (colH[c] < colH[bestCol]) bestCol = c;
      }
      const x = x0 + bestCol * (colW + GAP) + colW / 2;
      const y = colH[bestCol] + b.h / 2;
      b.homeX = x;
      b.homeY = y;
      colH[bestCol] = y + b.h / 2 + GAP;
    }

    for (const b of blocks) placeSpan1(b);

    const blocksBottom = Math.max(...colH);
    downloadItem.homeX = stageW / 2;
    downloadItem.homeY = Math.round(blocksBottom + 320);

    const maxBottom = Math.max(
      blocksBottom,
      rectBItem.homeY + rectBItem.h / 2,
      downloadItem.homeY + downloadItem.h / 2
    );

    stage.style.minHeight = `${Math.max(1600, Math.round(maxBottom + 700))}px`;
  }

  function applyHomeInstant() {
    computeHomeLayout();
    for (const it of items) {
      it.x = it.homeX;
      it.y = it.homeY;
      it.vx = 0;
      it.vy = 0;
      it.scale = 1;
      it.scaleV = 0;
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

    it.dragOffX = it.x - p.x;
    it.dragOffY = it.y - p.y;

    it.vx *= 0.15;
    it.vy *= 0.15;

    wake();
  });

  stage.addEventListener('pointermove', (e) => {
    if (!active) return;

    const it = active;
    const p = pointerToStage(e);

    const nx = p.x + it.dragOffX;
    const ny = p.y + it.dragOffY;

    it.vx = (nx - it.x) * 0.45;
    it.vy = (ny - it.y) * 0.45;

    it.x = nx;
    it.y = ny;

    setTextBlocksFromParagraphs();
    dirtyLayout = true;
    wake();
  });

  function endDrag() {
    if (!active) return;

    active.dragging = false;
    active.vx += (active.homeX - active.x) * 0.04;
    active.vy += (active.homeY - active.y) * 0.04;
    active = null;

    dirtyLayout = true;
    wake();
  }

  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', endDrag);

  function keepInBounds(it) {
    const pad = 16;
    const sc = (it.scale || 1);
    const sw = it.w * sc;
    const sh = it.h * sc;

    it.x = clamp(it.x, sw / 2 + pad, stageRect.width - sw / 2 - pad);
    it.y = clamp(it.y, sh / 2 + pad, stageRect.height - sh / 2 - pad);
  }

  function resolveCollisions() {
    const passes = TUNE.COLLISION_PASSES;
    const pad = TUNE.COLLISION_PAD;

    for (let pass = 0; pass < passes; pass++) {
      let moved = false;

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const A = items[i];
          const B = items[j];

          const a = rectFromItem(A, pad);
          const b = rectFromItem(B, pad);
          if (!aabbOverlap(a, b)) continue;

          const sep = separateAABB(a, b);

          const invMa = 1 / A.mass;
          const invMb = 1 / B.mass;
          const sum = invMa + invMb;

          let ax = (sep.x * (invMa / sum));
          let ay = (sep.y * (invMa / sum));
          let bx = -(sep.x * (invMb / sum));
          let by = -(sep.y * (invMb / sum));

          if (A.dragging && !B.dragging) {
            ax = 0; ay = 0; bx = -sep.x; by = -sep.y;
          }

          if (B.dragging && !A.dragging) {
            bx = 0; by = 0; ax = sep.x; ay = sep.y;
          }

          A.x += ax; A.y += ay;
          B.x += bx; B.y += by;

          const bounce = TUNE.COLLISION_BOUNCE;
          A.vx += ax * bounce; A.vy += ay * bounce;
          B.vx += bx * bounce; B.vy += by * bounce;

          moved = true;
        }
      }

      for (const it of items) keepInBounds(it);
      if (!moved) break;
    }
  }

  function stepPhysics(dt) {
    if (!mouse.inside) {
      mouse.speed *= 0.82;
    }
    if (mouse.speed < TUNE.SPEED_CUTOFF) {
      mouse.speed = 0;
    }

    for (const it of items) {
      if (it === headlineItem) it.scaleTarget = 1;
      else it.scaleTarget = it.hovering ? (it.hoverScale ?? 1) : 1;
    }

    for (const it of items) {
      if (!it.dragging) {
        const dx = it.homeX - it.x;
        const dy = it.homeY - it.y;

        it.vx += dx * it.k;
        it.vy += dy * it.k;

        if (mouse.inside && mouse.speed > 0) {
          const speedNorm = Math.min(1, mouse.speed / 180);
          const dxm = mouse.x - it.x;
          const dym = mouse.y - it.y;
          const dist = Math.hypot(dxm, dym) + 1e-6;
          const falloff = 1 / (dist + 1600);
          const accel = (24 + 56 * speedNorm) * falloff * TUNE.MOUSE_PULL;
          it.vx += dxm * accel * dt;
          it.vy += dym * accel * dt;
        }

        it.vx *= it.damp;
        it.vy *= it.damp;

        if (Math.abs(dx) < 0.1 && Math.abs(it.vx) < TUNE.VELOCITY_CUTOFF) it.vx = 0;
        if (Math.abs(dy) < 0.1 && Math.abs(it.vy) < TUNE.VELOCITY_CUTOFF) it.vy = 0;

        it.vx = clamp(it.vx, -it.maxV, it.maxV);
        it.vy = clamp(it.vy, -it.maxV, it.maxV);

        it.x += it.vx * dt;
        it.y += it.vy * dt;

        if (it !== headlineItem) {
          const frame = dt * 60;
          const sdx = (it.scaleTarget ?? 1) - (it.scale ?? 1);
          it.scaleV = (it.scaleV ?? 0) + sdx * 0.18 * frame;
          it.scaleV *= Math.pow(0.74, frame);
          it.scale = (it.scale ?? 1) + it.scaleV * frame;

          if (Math.abs((it.scaleTarget ?? 1) - it.scale) < TUNE.SCALE_CUTOFF && Math.abs(it.scaleV) < TUNE.SCALE_CUTOFF) {
            it.scale = it.scaleTarget ?? 1;
            it.scaleV = 0;
          }
        } else {
          it.scale = 1;
          it.scaleV = 0;
        }

        keepInBounds(it);
      } else {
        keepInBounds(it);
      }
    }

    resolveCollisions();
  }

  function renderItems() {
    const now = performance.now() * 0.001;

    for (const it of items) {
      const hoverBoost = !!(it.el && it.el.classList && it.el.classList.contains('fxHover'));
      const speedNorm = mouse.inside ? Math.min(1, mouse.speed / 90) : 0;

      const isHeadline = (it.kind === 'headline') || (it.el && it.el.id === 'headline');
      const isDownload = (it.el && it.el.id === 'downloadBtn');
      const isHeroCircle = (it.el && it.el.id === 'shapeCircle');

      const shapeMul = isHeadline ? 0.10 : (isDownload ? 0.55 : 1.0);

      let wobMul = 0;
      if (hoverBoost || speedNorm > 0.01) {
        const baseWob = hoverBoost ? (isHeroCircle ? 0.18 : 0.12) : 0;
        wobMul = shapeMul * (baseWob + 0.85 * speedNorm) * TUNE.WOBBLE;
      }

      const phase = (it.wobbleSeed || 0) * 6.28318;

      const wobX = wobMul ? Math.sin(now * 1.5 + phase) * wobMul : 0;
      const wobY = wobMul ? Math.cos(now * 1.28 + phase * 1.11) * wobMul * 0.8 : 0;
      const wobR = wobMul ? Math.sin(now * 1.02 + phase * 0.7) * shapeMul * (0.18 + 0.65 * speedNorm) : 0;

      const vel = Math.hypot(it.vx || 0, it.vy || 0);
      const squash = Math.min(0.06, vel / 2200) * (0.35 + 0.65 * speedNorm) * shapeMul;

      const sx = (it.scale || 1) * (1 + squash);
      const sy = (it.scale || 1) * (1 - squash * 0.8);

      it.el.style.transform =
        `translate(${it.x - it.w / 2 + wobX}px, ${it.y - it.h / 2 + wobY}px) rotate(${wobR}deg) scale(${sx}, ${sy})`;
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

    stage.style.minHeight = `${Math.max(1600, Math.round(maxBottom + 700))}px`;

    if (guidesToggle.checked) {
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
    const c = parseFloat(circleScale.value);
    const r = parseFloat(rectScale.value);

    circleItem.w = circleItem.baseW * c;
    circleItem.h = circleItem.baseH * c;

    rectAItem.w = rectAItem.baseW * r;
    rectAItem.h = rectAItem.baseH * r;

    rectBItem.w = rectBItem.baseW * r;
    rectBItem.h = rectBItem.baseH * r;

    computeHomeLayout();
    dirtyLayout = true;
    wake();
  }

  circleScale.addEventListener('input', setScales);
  rectScale.addEventListener('input', setScales);

  guidesToggle.addEventListener('change', () => {
    guides.classList.toggle('on', guidesToggle.checked);
    dirtyLayout = true;
    wake();
  });

  resetBtn && resetBtn.addEventListener('click', () => {
    applyHomeInstant();
  });

  shuffleBtn && shuffleBtn.addEventListener('click', () => {
    paragraphs = paragraphs
      .map((p) => ({ p, r: Math.random() }))
      .sort((a, b) => a.r - b.r)
      .map((o) => o.p);

    setTextBlocksFromParagraphs();
    dirtyLayout = true;
    wake();
  });

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
    if (mouse.inside && mouse.speed > TUNE.SPEED_CUTOFF) return true;
    if (dirtyLayout) return true;

    for (const it of items) {
      if (it.dragging) return true;
      if (Math.abs(it.vx) > TUNE.VELOCITY_CUTOFF) return true;
      if (Math.abs(it.vy) > TUNE.VELOCITY_CUTOFF) return true;
      if (Math.abs((it.scaleTarget ?? 1) - (it.scale ?? 1)) > TUNE.SCALE_CUTOFF) return true;
      if (Math.abs(it.scaleV || 0) > TUNE.SCALE_CUTOFF) return true;
      if (it.el && it.el.classList && it.el.classList.contains('fxHover')) return true;
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
    const dt = clamp((now - last) / 16.6667, 0.6, 1.5);
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
      elDownload.setAttribute('aria-label', `Download first image from ${projectTitle}`);
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