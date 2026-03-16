/* =========================================================
   MODE 3 ADDON v3 (NON-DESTRUCTIVE, WORK PAGE)
   - New files only (no edits to existing JS/CSS)
   - Strict entry: ONLY click on D3 label (text) -> Mode 3
   - Mode 2 top zone remains visually untouched (black, spiderweb, D3)
   - Mode 3 is scroll-reveal below; scroll drives background to white
   - Word-level text carving with big circle + 3 big rectangles
   - Per-project download mapping (edit the map below)
   - Study Mode freezes Mode 3 interactions
   ========================================================= */
(function () {
  "use strict";

  // -----------------------------
  // Config (edit safely)
  // -----------------------------
  const DOWNLOAD_MAP = {
    // Example keys must match your label text exactly:
    // "Articles - Project 01": "https://example.com/file1.pdf",
  };

  const DEFAULT_DOWNLOAD_URL = "#";

  // 0..3/8: black + D3 visible
  // 3/8..6/8: background transitions to white + nav fades + D3 fades out
  // 6/8..8/8: fully white + nav hidden + D3 hidden
  const FRACTION_BLACK_END = 3 / 8;
  const FRACTION_WHITE_FULL = 6 / 8;

  // -----------------------------
  // Helpers
  // -----------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, t) => {
    const x = clamp((t - a) / (b - a), 0, 1);
    return x * x * (3 - 2 * x);
  };

  const rafThrottle = (fn) => {
    let scheduled = false;
    return (...args) => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        fn(...args);
      });
    };
  };

  const now = () => (performance && performance.now ? performance.now() : Date.now());

  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

  // -----------------------------
  // State
  // -----------------------------
  const S = {
    ready: false,
    mode3: false,
    study: false,
    activeLabel: "",
    // DOM
    hint: null,
    nav: null,
    graph: null,
    stack: null,
    // mode3 DOM
    section: null,
    title: null,
    download: null,
    topBtn: null,
    studyBtn: null,
    bg: null,
    // svg label interop
    mo: null,
    hitLayer: null,
    labelHits: [],
    hoverHit: null,
    // click gating
    down: { t: 0, x: 0, y: 0, hit: null },
    // word carving
    play: {
      stage: null,
      textLayer: null,
      words: [],
      home: [],
      pos: [],
      vel: [],
      measureCtx: null,
      needsLayout: true,
      running: false,
      raf: 0,
      lineHeight: 28,
      pad: 20,
      // shapes
      shapes: {},
      dragging: null,
      dragOff: { x: 0, y: 0 },
      stageRect: null,
    },
    // wheel lock
    wheelLockBound: null,
  };

  // -----------------------------
  // Mode2 detection
  // -----------------------------
  function isMode2Active() {
    if (!S.stack || !S.graph) return false;
    const stackActive = S.stack.classList.contains("stack-active");
    const hasSVG = !!S.graph.querySelector("svg");
    return stackActive && hasSVG;
  }

  // -----------------------------
  // Download mapping
  // -----------------------------
  function downloadUrlFor(labelText) {
    return DOWNLOAD_MAP[labelText] || DEFAULT_DOWNLOAD_URL;
  }

  // -----------------------------
  // Create Mode3 DOM (once)
  // -----------------------------
  function ensureMode3Dom() {
    if (S.section) return;

    // Background overlay (covers viewport, does NOT touch Mode2 scene)
    const bg = document.createElement("div");
    bg.id = "mode3-bg";
    bg.className = "mode3-bg";
    bg.setAttribute("aria-hidden", "true");
    document.body.appendChild(bg);
    S.bg = bg;

    const section = document.createElement("section");
    section.id = "mode3-section";
    section.className = "mode3-section";
    section.setAttribute("aria-hidden", "true");

    section.innerHTML = `
      <div class="mode3-inner">
        <header class="mode3-header">
          <div class="mode3-hero" aria-label="Hero image"></div>
          <div class="mode3-headcopy">
            <h1 class="mode3-title">Deep Exploration</h1>
            <p class="mode3-subtitle">A deeper layer of the same living structure, revealed by curiosity.</p>
            <div class="mode3-actions-top">
              <a class="mode3-btn mode3-download" href="#" target="_blank" rel="noopener">Download</a>
              <button class="mode3-btn mode3-study" type="button" aria-pressed="false">Study Mode</button>
              <button class="mode3-btn mode3-top" type="button">Go to Top</button>
            </div>
          </div>
        </header>

        <section class="mode3-stageWrap" aria-label="Shape-Driven Text Flow">
          <div class="mode3-stage" id="mode3-stage" aria-label="Interactive layout stage">
            <!-- big circle -->
            <div class="mode3-shape circle drag-target" id="m3Circle" aria-label="Circle image"></div>

            <!-- three big rectangles -->
            <div class="mode3-shape rect drag-target" id="m3RectA" aria-label="Rectangle image A"></div>
            <div class="mode3-shape rect drag-target" id="m3RectB" aria-label="Rectangle image B"></div>
            <div class="mode3-shape rect drag-target" id="m3RectC" aria-label="Rectangle image C"></div>

            <!-- flowing words -->
            <div class="mode3-textLayer" id="mode3TextLayer" aria-label="Flowing text"></div>
          </div>
        </section>

        <section class="mode3-article" aria-label="Article content">
          <h2 class="mode3-h2">Placeholder Article</h2>
          <p class="mode3-p">Scroll down to brighten the space. Scroll up to return to black. Click another label to explore a different project.</p>
          <p class="mode3-p">Replace this with your real project writing and images later.</p>
          <div class="mode3-midimg" aria-label="Mid content image"></div>
          ${Array.from({length: 10}).map((_,i)=>`<p class="mode3-p">Paragraph ${i+1}. Placeholder content to create scroll depth and let the background transition breathe.</p>`).join("")}
        </section>

        <footer class="mode3-footer">
          <div class="mode3-footerInner">
            Mode 3 is a reward for curiosity. Shapes carve space into words. Study Mode freezes interaction.
          </div>
        </footer>
      </div>
    `;

    document.body.appendChild(section);
    S.section = section;

    S.title = qs(".mode3-title", section);
    S.download = qs(".mode3-download", section);
    S.topBtn = qs(".mode3-top", section);
    S.studyBtn = qs(".mode3-study", section);

    // Button handlers
    S.topBtn.addEventListener("click", () => exitMode3());
    S.studyBtn.addEventListener("click", () => toggleStudyMode());

    // Build stage refs
    S.play.stage = qs("#mode3-stage", section);
    S.play.textLayer = qs("#mode3TextLayer", section);

    // Create word spans (word-level)
    buildWords();

    // Shapes and initial placement
    S.play.shapes.circle = qs("#m3Circle", section);
    S.play.shapes.rectA  = qs("#m3RectA", section);
    S.play.shapes.rectB  = qs("#m3RectB", section);
    S.play.shapes.rectC  = qs("#m3RectC", section);

    // Dragging
    setupDrag(S.play.shapes.circle);
    setupDrag(S.play.shapes.rectA);
    setupDrag(S.play.shapes.rectB);
    setupDrag(S.play.shapes.rectC);

    // Resize => relayout
    window.addEventListener("resize", () => {
      S.play.needsLayout = true;
      applyScrollDrivenLook();
    }, { passive: true });
  }

  // -----------------------------
  // Build word-level text
  // -----------------------------
  function buildWords() {
    const layer = S.play.textLayer;
    if (!layer) return;
    layer.innerHTML = "";

    const text =
      "Drag the circle and the three rectangles through the words. Wherever a shape passes, text should make room, " +
      "like drawing negative space into language. This is a placeholder meditation-text. Replace it with your real writing. " +
      "Scroll down to brighten the space. Scroll up to return to black. The spider remains where you left it at the top.";

    const words = text.split(/\s+/).filter(Boolean);

    S.play.words = [];
    S.play.home = [];
    S.play.pos = [];
    S.play.vel = [];

    for (let i = 0; i < words.length; i++) {
      const span = document.createElement("span");
      span.className = "m3-word";
      span.textContent = words[i] + " ";
      layer.appendChild(span);

      S.play.words.push(span);
      S.play.home.push({ x: 0, y: 0 });
      S.play.pos.push({ x: 0, y: 0 });
      S.play.vel.push({ x: 0, y: 0 });
    }

    // canvas measure ctx
    const c = document.createElement("canvas");
    S.play.measureCtx = c.getContext("2d");
    S.play.needsLayout = true;
  }

  function layoutWords() {
    const layer = S.play.textLayer;
    if (!layer || !S.play.measureCtx) return;

    const stage = S.play.stage;
    if (!stage) return;

    const stageRect = stage.getBoundingClientRect();
    S.play.stageRect = stageRect;

    const cs = getComputedStyle(layer);
    const font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
    S.play.measureCtx.font = font;

    const lineHeight = parseFloat(cs.lineHeight) || 28;
    S.play.lineHeight = lineHeight;

    const pad = S.play.pad;
    const maxW = Math.max(260, stageRect.width - pad * 2);

    let x = 0, y = 0;

    for (let i = 0; i < S.play.words.length; i++) {
      const w = (S.play.words[i].textContent || "");
      const width = S.play.measureCtx.measureText(w).width;

      if (x + width > maxW) {
        x = 0;
        y += lineHeight;
      }

      const hx = pad + x;
      const hy = pad + y;

      S.play.home[i].x = hx;
      S.play.home[i].y = hy;

      // init pos
      S.play.pos[i].x = hx;
      S.play.pos[i].y = hy;
      S.play.vel[i].x = 0;
      S.play.vel[i].y = 0;

      x += width;
    }

    S.play.needsLayout = false;
  }

  // -----------------------------
  // Shape dragging (study mode disables)
  // -----------------------------
  function setupDrag(el) {
    if (!el) return;
    el.addEventListener("pointerdown", (e) => {
      if (!S.mode3 || S.study) return;
      S.play.dragging = el;
      el.setPointerCapture(e.pointerId);

      const r = el.getBoundingClientRect();
      S.play.dragOff.x = e.clientX - r.left;
      S.play.dragOff.y = e.clientY - r.top;

      e.preventDefault();
    });

    el.addEventListener("pointermove", (e) => {
      if (!S.mode3 || S.study) return;
      if (S.play.dragging !== el) return;
      const stage = S.play.stage;
      if (!stage) return;

      const pr = stage.getBoundingClientRect();
      const x = e.clientX - pr.left - S.play.dragOff.x;
      const y = e.clientY - pr.top - S.play.dragOff.y;

      const maxX = pr.width - el.offsetWidth;
      const maxY = pr.height - el.offsetHeight;

      el.style.left = clamp(x, 0, maxX) + "px";
      el.style.top  = clamp(y, 0, maxY) + "px";
    }, { passive: false });

    const end = () => { if (S.play.dragging === el) S.play.dragging = null; };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  // -----------------------------
  // Word carving simulation
  // -----------------------------
  function shapeFields() {
    const layerRect = S.play.textLayer.getBoundingClientRect();

    function circleField(el) {
      const r = el.getBoundingClientRect();
      const cx = (r.left + r.right)/2 - layerRect.left;
      const cy = (r.top + r.bottom)/2 - layerRect.top;
      const rad = Math.min(r.width, r.height)/2;
      return { cx, cy, r: rad };
    }

    function rectField(el) {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - layerRect.left,
        y: r.top  - layerRect.top,
        w: r.width,
        h: r.height
      };
    }

    return {
      circle: circleField(S.play.shapes.circle),
      rects: [
        rectField(S.play.shapes.rectA),
        rectField(S.play.shapes.rectB),
        rectField(S.play.shapes.rectC),
      ]
    };
  }

  function stepWords() {
    if (!S.mode3 || S.study) return;
    if (!S.play.textLayer) return;

    if (S.play.needsLayout) layoutWords();

    const fields = shapeFields();

    const spring = 0.09;
    const damping = 0.82;
    const repelK = 1.15;
    const maxV = 14;

    const approxH = Math.max(18, parseFloat(getComputedStyle(S.play.textLayer).fontSize) * 1.3);

    for (let i = 0; i < S.play.words.length; i++) {
      const el = S.play.words[i];
      const home = S.play.home[i];
      const pos  = S.play.pos[i];
      const vel  = S.play.vel[i];

      const w = el.offsetWidth || 30;
      const cx = pos.x + w/2;
      const cy = pos.y + approxH/2;

      let fx = 0, fy = 0;

      // circle carve
      {
        const dx = cx - fields.circle.cx;
        const dy = cy - fields.circle.cy;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const inside = dist < (fields.circle.r + 10);
        const near = dist < (fields.circle.r + 95);

        if (inside) {
          const push = (fields.circle.r + 10 - dist) * 1.0;
          fx += (dx / dist) * push;
          fy += (dy / dist) * push;
        } else if (near) {
          const push = (fields.circle.r + 95 - dist) * 0.08;
          fx += (dx / dist) * push;
          fy += (dy / dist) * push;
        }
      }

      // rect carve
      for (const R of fields.rects) {
        const px = clamp(cx, R.x, R.x + R.w);
        const py = clamp(cy, R.y, R.y + R.h);
        const dx = cx - px;
        const dy = cy - py;
        const dist = Math.hypot(dx, dy) || 0.0001;

        const inside = (cx >= R.x && cx <= R.x + R.w && cy >= R.y && cy <= R.y + R.h);
        if (inside) {
          const left = cx - R.x;
          const right = (R.x + R.w) - cx;
          const top = cy - R.y;
          const bottom = (R.y + R.h) - cy;
          const min = Math.min(left, right, top, bottom);
          const push = (Math.max(1, 18 - min)) * 2.2;

          if (min === left) fx += push;
          else if (min === right) fx -= push;
          else if (min === top) fy += push;
          else fy -= push;
        } else if (dist < 90) {
          const push = (90 - dist) * 0.10;
          fx += (dx / dist) * push;
          fy += (dy / dist) * push;
        }
      }

      const ax = (home.x - pos.x) * spring + fx * repelK;
      const ay = (home.y - pos.y) * spring + fy * repelK;

      vel.x = (vel.x + ax) * damping;
      vel.y = (vel.y + ay) * damping;

      vel.x = clamp(vel.x, -maxV, maxV);
      vel.y = clamp(vel.y, -maxV, maxV);

      pos.x += vel.x;
      pos.y += vel.y;

      el.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    }
  }

  function startWordLoop() {
    if (S.play.running) return;
    S.play.running = true;
    const loop = () => {
      if (!S.play.running) return;
      if (S.mode3 && !S.study) stepWords();
      S.play.raf = requestAnimationFrame(loop);
    };
    loop();
  }

  function stopWordLoop() {
    S.play.running = false;
    if (S.play.raf) cancelAnimationFrame(S.play.raf);
    S.play.raf = 0;
  }

  // -----------------------------
  // Study Mode
  // -----------------------------
  function toggleStudyMode() {
    S.study = !S.study;
    if (S.studyBtn) {
      S.studyBtn.setAttribute("aria-pressed", S.study ? "true" : "false");
      S.studyBtn.textContent = S.study ? "Study Mode: ON" : "Study Mode";
    }
    document.body.classList.toggle("mode3-study", S.study);
  }

  // -----------------------------
  // Scroll look + wheel lock
  // -----------------------------
  function scrollProgress() {
    const doc = document.documentElement;
    const maxScroll = Math.max(1, doc.scrollHeight - doc.clientHeight);
    const y = window.scrollY || doc.scrollTop || 0;
    return { t: clamp(y / maxScroll, 0, 1), y, maxScroll };
  }

  function applyScrollDrivenLook() {
    if (!S.mode3) return;

    const { t } = scrollProgress();

    let bright = 0;
    if (t <= FRACTION_BLACK_END) bright = 0;
    else if (t >= FRACTION_WHITE_FULL) bright = 1;
    else bright = (t - FRACTION_BLACK_END) / (FRACTION_WHITE_FULL - FRACTION_BLACK_END);

    if (S.bg) S.bg.style.opacity = String(bright);

    const navFade = 1 - smoothstep(FRACTION_BLACK_END, FRACTION_WHITE_FULL, t);
    if (S.nav) {
      S.nav.style.opacity = String(navFade);
      S.nav.style.pointerEvents = navFade < 0.06 ? "none" : "";
      S.nav.style.transform = `translateY(${lerp(0, -14, 1 - navFade)}px)`;
    }

    if (S.graph) {
      const d3Vis = 1 - smoothstep(FRACTION_BLACK_END, FRACTION_BLACK_END + 0.06, t);
      S.graph.style.opacity = String(d3Vis);
      S.graph.style.pointerEvents = d3Vis < 0.06 ? "none" : "";
    }
  }

  const onScroll = rafThrottle(() => applyScrollDrivenLook());

  function wheelLock(e) {
    if (!S.mode3) return;
    e.preventDefault();
  }

  // -----------------------------
  // Bounce entry scroll
  // -----------------------------
  function bounceTo(yTarget) {
    const startY = window.scrollY || 0;
    const overshoot = 90;
    const y1 = yTarget + overshoot;

    const t0 = now();
    const d1 = 540;
    const d2 = 520;

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
    function easeOutBack(t) {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function step() {
      const t = now() - t0;
      if (t < d1) {
        const p = easeOutBack(t / d1);
        window.scrollTo(0, lerp(startY, y1, p));
        requestAnimationFrame(step);
        return;
      }
      const t2 = t - d1;
      if (t2 < d2) {
        const p = easeOutCubic(t2 / d2);
        window.scrollTo(0, lerp(y1, yTarget, p));
        requestAnimationFrame(step);
        return;
      }
      window.scrollTo(0, yTarget);
    }
    requestAnimationFrame(step);
  }

  // -----------------------------
  // Enter / Exit Mode3
  // -----------------------------
  function enterMode3(labelText) {
    ensureMode3Dom();

    S.mode3 = true;
    S.study = false;
    document.body.classList.add("mode3-active");
    document.body.classList.add("mode3-scroll");

    if (S.hint) S.hint.classList.add("mode3-hide");

    S.activeLabel = labelText || "";
    if (S.title) S.title.textContent = labelText || "Deep Exploration";
    if (S.download) S.download.href = downloadUrlFor(labelText);

    if (S.studyBtn) {
      S.studyBtn.setAttribute("aria-pressed", "false");
      S.studyBtn.textContent = "Study Mode";
    }
    document.body.classList.remove("mode3-study");

    S.section.classList.add("mode3-show");
    S.section.setAttribute("aria-hidden", "false");

    S.play.needsLayout = true;
    startWordLoop();

    // Lock wheel/touch scrolling (scrollbar drag still works)
    if (!S.wheelLockBound) S.wheelLockBound = wheelLock;
    window.addEventListener("wheel", S.wheelLockBound, { passive: false });
    window.addEventListener("touchmove", S.wheelLockBound, { passive: false });

    window.addEventListener("scroll", onScroll, { passive: true });

    const y = Math.max(0, S.section.offsetTop + 12);
    bounceTo(y);

    applyScrollDrivenLook();
  }

  function exitMode3() {
    if (!S.mode3) return;

    window.scrollTo(0, 0);

    S.mode3 = false;
    S.study = false;

    document.body.classList.remove("mode3-active");
    document.body.classList.remove("mode3-scroll");
    document.body.classList.remove("mode3-study");

    if (S.hint) S.hint.classList.remove("mode3-hide");

    if (S.nav) {
      S.nav.style.opacity = "";
      S.nav.style.pointerEvents = "";
      S.nav.style.transform = "";
    }
    if (S.graph) {
      S.graph.style.opacity = "";
      S.graph.style.pointerEvents = "";
    }
    if (S.bg) S.bg.style.opacity = "0";

    if (S.section) {
      S.section.classList.remove("mode3-show");
      S.section.setAttribute("aria-hidden", "true");
    }

    stopWordLoop();

    if (S.wheelLockBound) {
      window.removeEventListener("wheel", S.wheelLockBound);
      window.removeEventListener("touchmove", S.wheelLockBound);
    }
  }

  // -----------------------------
  // SVG label hitboxes
  // -----------------------------
  function rebuildLabelHitboxes() {
    const svg = S.graph ? qs("svg", S.graph) : null;
    if (!svg) return;

    if (S.hitLayer && S.hitLayer.parentNode) S.hitLayer.parentNode.removeChild(S.hitLayer);
    S.hitLayer = null;
    S.labelHits = [];
    S.hoverHit = null;

    const ns = "http://www.w3.org/2000/svg";
    const g = document.createElementNS(ns, "g");
    g.setAttribute("class", "mode3-hitlayer");
    svg.appendChild(g);
    S.hitLayer = g;

    const texts = qsa("text", svg).filter(t => (t.textContent || "").trim().length > 0);

    for (const t of texts) {
      let bb;
      try { bb = t.getBBox(); } catch { continue; }
      if (!bb || bb.width < 6 || bb.height < 6) continue;

      const pad = 6;
      const r = document.createElementNS(ns, "rect");
      r.setAttribute("x", String(bb.x - pad));
      r.setAttribute("y", String(bb.y - pad));
      r.setAttribute("width", String(bb.width + pad * 2));
      r.setAttribute("height", String(bb.height + pad * 2));
      r.setAttribute("fill", "transparent");
      r.setAttribute("pointer-events", "all");
      r.setAttribute("class", "mode3-hit");
      r.__m3Text = t;

      r.addEventListener("mouseenter", () => {
        if (!isMode2Active() || S.mode3) return;
        if (S.hoverHit && S.hoverHit !== r) unscaleHit(S.hoverHit);
        S.hoverHit = r;
        scaleText(t, 1.2);
      });

      r.addEventListener("mouseleave", () => {
        if (S.hoverHit === r) S.hoverHit = null;
        unscaleHit(r);
      });

      r.addEventListener("pointerdown", (e) => {
        if (!isMode2Active() || S.mode3) return;
        S.down.t = now();
        S.down.x = e.clientX;
        S.down.y = e.clientY;
        S.down.hit = r;
      });

      r.addEventListener("click", (e) => {
        if (!isMode2Active() || S.mode3) return;

        const dt = now() - S.down.t;
        if (dt > 650) return;
        const moved = Math.hypot(e.clientX - S.down.x, e.clientY - S.down.y);
        if (moved > 6) return;
        if (S.down.hit !== r) return;

        const labelText = ((t.textContent || "").trim());
        if (!labelText) return;

        enterMode3(labelText);
      });

      g.appendChild(r);
      S.labelHits.push(r);
    }
  }

  function scaleText(textEl, scale) {
    if (!textEl) return;
    let bb;
    try { bb = textEl.getBBox(); } catch { return; }
    const cx = bb.x + bb.width / 2;
    const cy = bb.y + bb.height / 2;
    textEl.setAttribute("transform", `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`);
  }

  function unscaleHit(hitRect) {
    const t = hitRect && hitRect.__m3Text;
    if (!t) return;
    t.removeAttribute("transform");
  }

  // -----------------------------
  // MutationObserver
  // -----------------------------
  function attachGraphObserver() {
    if (!S.graph) return;
    if (S.mo) return;

    S.mo = new MutationObserver(() => {
      if (isMode2Active()) rebuildLabelHitboxes();
    });

    S.mo.observe(S.graph, { childList: true, subtree: true });
  }

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    S.hint = qs(".work-hint");
    S.nav = document.getElementById("site-nav") || qs("header") || null;
    S.graph = document.getElementById("graph-container");
    S.stack = document.getElementById("card-stack");

    if (!S.graph || !S.stack) return;

    attachGraphObserver();

    if (isMode2Active()) rebuildLabelHitboxes();

    S.ready = true;
  }

  window.addEventListener("DOMContentLoaded", () => {
    try { init(); } catch (e) {}
  });

})();