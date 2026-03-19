/* Shape-Driven Text Flow v10
   - Clean "home" composition always returns after interaction.
   - Page scroll is normal (stage is NOT fixed).
   - Text reflows around shapes (and headline block acts like a draggable collider).
   - Collisions prevent overlap between draggable objects.
*/
(() => {
  const stage = document.getElementById('stage');
  const textLayer = document.getElementById('textLayer');

  /* =====================================================
     TEXT HOVER (paragraph-scale)
     - implemented via event delegation on .flowLine elements
     - does NOT change layout, only transforms existing nodes
     ===================================================== */
  let _paraMap = new Map();
  let _hoverPid = null;

  function setParagraphHover(pid) {
    if (pid === _hoverPid) return;

    // clear previous
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

  /* =====================================================
     MOUSE "JELLY" INFLUENCE (visual + gentle physics)
     ===================================================== */
  const mouse = { x: 0, y: 0, speed: 0, inside: false, _lx: 0, _ly: 0, _lt: 0 };

  /* ==========================
     TUNING (safe, reversible)
     ========================== */
  const TUNE = {
    SNAP_LINE_Y: true,
    ROUND_LINE_STEP: true,
    PARA_GAP_MULT: 1.70,

    MOUSE_PULL: 0.65,
    WOBBLE: 0.65,

    TEXT_HOVER_SCALE: 1.015,
  };

  document.documentElement.style.setProperty('--pHover', String(TUNE.TEXT_HOVER_SCALE));

  let _hoverPara = null;
  let _paraGroups = new Map();

  function updateMouseFromEvent(e){
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
    mouse.inside = inside;
    if(!inside) return;

    mouse.x = x;
    mouse.y = y;

    const now = (typeof e.timeStamp === 'number' ? e.timeStamp : performance.now());
    if(mouse._lt){
      const dtMs = Math.max(1, now - mouse._lt);
      const dx = x - mouse._lx;
      const dy = y - mouse._ly;
      const inst = Math.hypot(dx, dy) / (dtMs / 16.666);
      mouse.speed = mouse.speed * 0.75 + inst * 0.25;
    }
    mouse._lx = x; mouse._ly = y; mouse._lt = now;
  }

  window.addEventListener('pointermove', updateMouseFromEvent, { passive: true });
  stage.addEventListener('pointerleave', () => { mouse.inside = false; mouse.speed *= 0.5; });

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

  /* =====================================================
     SHAPE FX
     ===================================================== */
  function injectSvgFilters(){
    if (document.getElementById('fxSvgDefs')) return;
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('id','fxSvgDefs');
    svg.setAttribute('width','0');
    svg.setAttribute('height','0');
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

  function applyShapeFx(el, kind){
    if (!el) return;
    el.classList.add('fxShape');
    if (kind === 'circle') el.classList.add('fxCircle');
    if (kind === 'rect') el.classList.add('fxRect');

    const grain = document.createElement('div');
    grain.className = 'fxGrain';
    el.appendChild(grain);

    el.addEventListener('pointerenter', () => el.classList.add('fxHover'));
    el.addEventListener('pointerleave', () => el.classList.remove('fxHover'));
  }

  injectSvgFilters();
  applyShapeFx(elCircle, 'circle');
  applyShapeFx(elRectA, 'rect');
  applyShapeFx(elRectB, 'rect');
  applyShapeFx(elDownload, 'circle');

  // ---- Content (paragraph blocks) ----
  const baseParagraphs = [
    "Design is the art of convincing chaos to behave for a few seconds. Here, the shapes are not decorations. They are obstacles with opinions, forcing language to route around them.",
    "Words slide into gaps like water finding the easiest route, except water usually complains less. The composition is computed as blocks that search for a clean placement, then get disturbed by your hand.",
    "A page is usually passive. This one refuses. If you move the structure, the content moves too. Convenient, and mildly threatening.",
    "When you drag objects near the text, the layout should react without collapsing into nonsense. Clean blocks first. Chaos only when you insist.",
    "Typography negotiates with geometry. Not politely. When you shove the shapes into the reading path, the paragraphs deform, then regain their posture when you let go."
  ];

  function buildParagraphs() {
    const out = [];
    for (let i = 0; i < 14; i++) {
      const p = baseParagraphs[i % baseParagraphs.length];
      out.push(p + (i % 3 === 0 ? " The point is interaction: a layout instrument you can physically disturb, then watch it reform." : ""));
    }
    return out;
  }

  let paragraphs = buildParagraphs();

  /* =====================================================
     CONTENT BLOCKS
     ===================================================== */
  const blocks = [];
  const textBlocks = [];

  // ---- Utility ----
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function getStageRect() {
    return stage.getBoundingClientRect();
  }

  // Get rect in stage-local coordinates (uses scale so growing pushes others)
  function rectFromItem(it, pad = 0) {
    const sc = (it.scale || 1);
    const sw = it.w * sc;
    const sh = it.h * sc;
    return {
      x: it.x - sw/2 - pad,
      y: it.y - sh/2 - pad,
      w: sw + pad*2,
      h: sh + pad*2,
    };
  }

  function aabbOverlap(a, b) {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  }

  function separateAABB(a, b) {
    const axc = a.x + a.w/2, ayc = a.y + a.h/2;
    const bxc = b.x + b.w/2, byc = b.y + b.h/2;

    const dx = axc - bxc;
    const px = (a.w/2 + b.w/2) - Math.abs(dx);

    const dy = ayc - byc;
    const py = (a.h/2 + b.h/2) - Math.abs(dy);

    if (px < py) return { x: dx < 0 ? -px : px, y: 0 };
    return { x: 0, y: dy < 0 ? -py : py };
  }

  // ---- Items ----
  const items = [];

  function makeItem(el, kind, opts) {
    const it = {
      el, kind,
      x: 0, y: 0, vx: 0, vy: 0,
      w: opts.w, h: opts.h,
      baseW: opts.w, baseH: opts.h,
      homeX: 0, homeY: 0,
      dragging: false,
      dragOffX: 0, dragOffY: 0,
      mass: opts.mass ?? 1.0,
      k: opts.k ?? 0.13,
      damp: opts.damp ?? 0.78,
      maxV: opts.maxV ?? 80,

      scale: 1,
      scaleV: 0,
      scaleTarget: 1,
      hoverScale: (opts.hoverScale ?? 1.06),

      hovering: false, // IMPORTANT: unified hover (blocks + shapes)

      wobbleSeed: Math.random() * 1000,
      ox: 0,
      oy: 0
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
      w, h,
      mass: (opts.mass ?? 1.4),
      k: (opts.k ?? 0.15),
      damp: (opts.damp ?? 0.76),
      hoverScale: (opts.hoverScale ?? 1.02)
    });

    it.isBlock = true;
    it.blockType = opts.type || 'empty';
    if (opts.type === 'text') {
      it.contentEl = el._contentEl;
      textBlocks.push(it);
    }

    // Hover state only (do NOT directly set scaleTarget here)
    it.el.addEventListener('pointerenter', () => { it.hovering = true; dirtyLayout = true; });
    it.el.addEventListener('pointerleave', () => { it.hovering = false; dirtyLayout = true; });

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

  // Slightly oversized collider so paragraphs never collide with the hero text.
  const headlineItem = makeItem(elHeadline, "headline", { w: 900, h: 230, mass: 1.9, k: 0.16, damp: 0.78 });
  const circleItem   = makeItem(elCircle,   "circle",   { w: 320, h: 320, mass: 1.8, k: 0.15, damp: 0.76 });
  const rectAItem    = makeItem(elRectA,    "rect",     { w: 360, h: 220, mass: 1.7, k: 0.15, damp: 0.76 });
  const rectBItem    = makeItem(elRectB,    "rect",     { w: 360, h: 220, mass: 1.7, k: 0.15, damp: 0.76 });
  const downloadItem = makeItem(elDownload, "download", { w: 160, h: 160, mass: 1.6, k: 0.14, damp: 0.78, hoverScale: 1.05 });

  // Default action: download the main image
  elDownload.addEventListener("click", (e) => {
    if (downloadItem.dragging) return;
    const a = document.createElement("a");
    a.href = "../../ruby.png";
    a.download = "Download";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  // Hover state for main shapes (unified behavior)
  [circleItem, rectAItem, rectBItem, downloadItem].forEach((it) => {
    it.el.addEventListener("pointerenter", () => { it.hovering = true; dirtyLayout = true; });
    it.el.addEventListener("pointerleave", () => { it.hovering = false; dirtyLayout = true; });
  });

  // ---- Create content blocks ----
  const TEXT_BLOCK_COUNT = 7;
  const IMAGE_BLOCK_COUNT = 1;
  const EMPTY_BLOCK_COUNT = 0;

  const blockPlan = ["T","I","T","T","I","T","T","I","T","T"];

  let imgIndex = 0;
  let txtIndex = 0;

  for (let i = 0; i < blockPlan.length; i++) {
    const kind = blockPlan[i];
    if (kind === "I" && imgIndex < IMAGE_BLOCK_COUNT) {
      imgIndex++;
      /* CHANGED: hoverScale 1.3 -> 1.1 */
      createBlock(`img${imgIndex}`, 520, 300, { type: "image", imageUrl: "../../ruby.png", mass: 1.65, hoverScale: 1.15 });
    } else {
      txtIndex++;
      /* CHANGED: hoverScale 1.3 -> 1.1 */
      createBlock(`txt${txtIndex}`, 420, 180, { type: "text", html: "", mass: 1.20, hoverScale: 1.15 });
    }
  }

  setTextBlocksFromParagraphs();

  requestAnimationFrame(() => { dirtyLayout = true; });

  textLayer.style.display = "none";

  // Dynamic text field top
  let textTop = 520;

  function computeHomeLayout() {
    const r = getStageRect();
    const stageW = r.width;
    const centerX = stageW / 2;

    circleItem.homeX = centerX;
    circleItem.homeY = 150;

    headlineItem.homeX = centerX;
    headlineItem.homeY = circleItem.homeY + (circleItem.h/2) + (headlineItem.h/2) + 32;

    textTop = headlineItem.homeY + (headlineItem.h/2) + 110;

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

    function placeSpan1(b){
      let bestCol = 0;
      for (let c = 1; c < cols; c++) if (colH[c] < colH[bestCol]) bestCol = c;
      const x = x0 + bestCol * (colW + GAP) + colW / 2;
      const y = colH[bestCol] + b.h / 2;
      b.homeX = x;
      b.homeY = y;
      colH[bestCol] = y + b.h / 2 + GAP;
    }

    function placeSpan2(b){
      let best = 0;
      let bestH = Infinity;
      for (let c = 0; c < cols - 1; c++){
        const h = Math.max(colH[c], colH[c+1]);
        if (h < bestH){ bestH = h; best = c; }
      }
      const spanW = colW * 2 + GAP;
      const x = x0 + best * (colW + GAP) + spanW / 2;
      const y = bestH + b.h / 2;
      b.homeX = x;
      b.homeY = y;
      const newH = y + b.h / 2 + GAP;
      colH[best] = newH;
      colH[best+1] = newH;
    }

    for (const b of blocks) {
      if (b.span === 2 && cols >= 2) placeSpan2(b);
      else placeSpan1(b);
    }

    const blocksBottom = Math.max(...colH);

    downloadItem.homeX = stageW / 2;
    downloadItem.homeY = Math.round(blocksBottom + 320);

    const maxBottom = Math.max(
      blocksBottom,
      rectBItem.homeY + rectBItem.h/2,
      downloadItem.homeY + downloadItem.h/2
    );
    stage.style.minHeight = `${Math.max(1600, Math.round(maxBottom + 700))}px`;
  }

  function applyHomeInstant() {
    computeHomeLayout();
    for (const it of items) {
      it.x = it.homeX;
      it.y = it.homeY;
      it.vx = 0; it.vy = 0;
      it.scale = 1;
      it.scaleV = 0;
    }
    dirtyLayout = true;
  }

  // ---- Drag handling ----
  let active = null;

  function pickItemFromEvent(e) {
    const target = e.target.closest('.drag-target');
    if (!target) return null;
    return items.find(it => it.el === target) || null;
  }

  function pointerToStage(e) {
    const s = getStageRect();
    return { x: e.clientX - s.left, y: e.clientY - s.top };
  }

  stage.addEventListener('pointerdown', (e) => {
    const it = pickItemFromEvent(e);
    if (!it) return;

    e.preventDefault();
    stage.setPointerCapture(e.pointerId);

    const p = pointerToStage(e);
    it.dragging = true;
    active = it;

    it.dragOffX = it.x - p.x;
    it.dragOffY = it.y - p.y;

    it.vx *= 0.2;
    it.vy *= 0.2;
  });

  stage.addEventListener('pointermove', (e) => {
    if (!active) return;
    const it = active;
    const p = pointerToStage(e);

    const nx = p.x + it.dragOffX;
    const ny = p.y + it.dragOffY;

    it.vx = (nx - it.x) * 0.55;
    it.vy = (ny - it.y) * 0.55;

    it.x = nx;
    it.y = ny;

    setTextBlocksFromParagraphs();
    dirtyLayout = true;
  });

  function endDrag() {
    if (!active) return;
    active.dragging = false;
    active.vx += (active.homeX - active.x) * 0.06;
    active.vy += (active.homeY - active.y) * 0.06;
    active = null;
    dirtyLayout = true;
  }

  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('pointerleave', endDrag);

  // ---- Bounds + collisions ----
  function keepInBounds(it) {
    const s = getStageRect();
    const pad = 16;

    const sc = (it.scale || 1);
    const sw = it.w * sc;
    const sh = it.h * sc;

    it.x = clamp(it.x, sw/2 + pad, s.width - sw/2 - pad);
    it.y = clamp(it.y, sh/2 + pad, s.height - sh/2 - pad);
  }

  // HARD collision solver: prevents overlap even while scaling
  function resolveCollisions() {
    const passes = 12; // higher = more solid (especially during hover-scale)
    const pad = 14;

    for (let pass = 0; pass < passes; pass++) {
      let moved = false;

      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const A = items[i], B = items[j];

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

          if (A.dragging && !B.dragging) { ax = 0; ay = 0; bx = -sep.x; by = -sep.y; }
          if (B.dragging && !A.dragging) { bx = 0; by = 0; ax = sep.x; ay = sep.y; }

          A.x += ax; A.y += ay;
          B.x += bx; B.y += by;

          const bounce = 0.22;
          A.vx += ax * bounce; A.vy += ay * bounce;
          B.vx += bx * bounce; B.vy += by * bounce;

          moved = true;
          dirtyLayout = true;
        }
      }

      for (const it of items) keepInBounds(it);

      if (!moved) break;
    }
  }

  function stepPhysics(dt) {
    // 0) hover targets (ON again)
    for (const it of items) {
      if (it === headlineItem) it.scaleTarget = 1;
      else it.scaleTarget = it.hovering ? (it.hoverScale ?? 1) : 1;
    }

    // 1) integrate motion + scale
    for (const it of items) {
      if (!it.dragging) {
        const dx = (it.homeX - it.x);
        const dy = (it.homeY - it.y);

        it.vx += dx * it.k;
        it.vy += dy * it.k;

        if (mouse.inside) {
          const speedNorm = Math.min(1, mouse.speed / 180);
          const dxm = mouse.x - it.x;
          const dym = mouse.y - it.y;
          const dist = Math.hypot(dxm, dym) + 1e-6;
          const falloff = 1 / (dist + 1400);
          const accel = (40 + 90 * speedNorm) * falloff * TUNE.MOUSE_PULL;
          it.vx += dxm * accel * dt;
          it.vy += dym * accel * dt;
        }

        it.vx *= it.damp;
        it.vy *= it.damp;

        if (Math.abs(dx) < 0.1 && Math.abs(it.vx) < 0.05) it.vx = 0;
        if (Math.abs(dy) < 0.1 && Math.abs(it.vy) < 0.05) it.vy = 0;

        it.vx = clamp(it.vx, -it.maxV, it.maxV);
        it.vy = clamp(it.vy, -it.maxV, it.maxV);

        it.x += it.vx * dt;
        it.y += it.vy * dt;

        // Hover scale spring (kept, not disabled)
        if (it !== headlineItem) {
          const frame = dt * 60;
          const sdx = (it.scaleTarget ?? 1) - (it.scale ?? 1);
          it.scaleV = (it.scaleV ?? 0) + sdx * 0.22 * frame;
          it.scaleV *= Math.pow(0.72, frame);
          it.scale = (it.scale ?? 1) + it.scaleV * frame;
        } else {
          it.scale = 1;
        }

        it.ox = it.x;
        it.oy = it.y;

        keepInBounds(it);
      } else {
        keepInBounds(it);
      }
    }

    // 2) solids + walls: do more than once so growth doesn't create overlap near walls
    for (let k = 0; k < 2; k++) {
      resolveCollisions();
      for (const it of items) keepInBounds(it);
    }
  }

  // ---- Rendering ----
  function renderItems() {
    for (const it of items) {
      const speedNorm = (mouse.inside ? Math.min(1, mouse.speed / 90) : 0);
      const t = performance.now() * 0.001;
      const phase = (it.wobbleSeed || 0) * 6.28318;

      const isHeadline = (it.kind === 'headline') || (it.el && it.el.id === 'headline');
      const isDownload = (it.el && it.el.id === 'downloadBtn');
      const isHeroCircle = (it.el && it.el.id === 'shapeCircle');

      const shapeMul = isHeadline ? 0.18 : (isDownload ? 0.70 : 1.0);

      const hoverBoost = it.el && it.el.classList && it.el.classList.contains('fxHover');
      const baseWob = hoverBoost ? (isHeroCircle ? 0.34 : 0.22) : 0.05;

      const wobMul = shapeMul * (baseWob + 1.25 * speedNorm) * TUNE.WOBBLE;

      const wobX = Math.sin(t * 1.6 + phase) * wobMul;
      const wobY = Math.cos(t * 1.35 + phase * 1.13) * wobMul * 0.8;
      const wobR = Math.sin(t * 1.1 + phase * 0.7) * shapeMul * (0.35 + 1.1 * speedNorm);

      const vel = Math.hypot(it.vx || 0, it.vy || 0);
      const squash = shapeMul * Math.min(0.10, vel / 1800) * (0.45 + 0.75 * speedNorm);
      const sx = (it.scale || 1) * (1 + squash);
      const sy = (it.scale || 1) * (1 - squash * 0.85);

      it.el.style.transform = `translate(${it.x - it.w/2 + wobX}px, ${it.y - it.h/2 + wobY}px) rotate(${wobR}deg) scale(${sx}, ${sy})`;
      it.el.style.width = `${it.w}px`;
      it.el.style.height = `${it.h}px`;
    }
  }

  // ---- Layout (guides only) ----
  let dirtyLayout = true;

  function layoutText() {
    let maxBottom = 0;
    for (const it of items) {
      const b = it.homeY + it.h/2;
      if (b > maxBottom) maxBottom = b;
    }
    stage.style.minHeight = `${Math.max(1600, Math.round(maxBottom + 700))}px`;

    if (guidesToggle.checked) {
      guides.classList.add('on');
      guides.innerHTML = '';
      for (const it of items) {
        const b = document.createElement('div');
        b.className = 'box';
        b.style.left = `${Math.round(it.x - it.w/2)}px`;
        b.style.top = `${Math.round(it.y - it.h/2)}px`;
        b.style.width = `${Math.round(it.w)}px`;
        b.style.height = `${Math.round(it.h)}px`;
        guides.appendChild(b);
      }
    } else {
      guides.classList.remove('on');
      guides.innerHTML = '';
    }
  }

  // ---- UI ----
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
  }

  circleScale.addEventListener('input', setScales);
  rectScale.addEventListener('input', setScales);

  guidesToggle.addEventListener('change', () => {
    guides.classList.toggle('on', guidesToggle.checked);
    dirtyLayout = true;
  });

  resetBtn && resetBtn.addEventListener('click', () => {
    applyHomeInstant();
  });

  shuffleBtn && shuffleBtn.addEventListener('click', () => {
    paragraphs = paragraphs
      .map(p => ({ p, r: Math.random() }))
      .sort((a,b) => a.r - b.r)
      .map(o => o.p);
    setTextBlocksFromParagraphs();
    dirtyLayout = true;
  });

  // ---- Resize handling ----
  let resizeTO = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(() => {
      computeHomeLayout();
      dirtyLayout = true;
    }, 50);
  });

  // ---- Tick loop ----
  let last = performance.now();
  function tick(now) {
    const dt = clamp((now - last) / 16.6667, 0.5, 1.75);
    last = now;

    stepPhysics(dt);
    renderItems();

    if (dirtyLayout) {
      dirtyLayout = false;
      layoutText();
    }

    requestAnimationFrame(tick);
  }

  // ---- Boot ----
  function boot() {
    setScales();
    applyHomeInstant();
    requestAnimationFrame(tick);
  }

  boot();
})();
