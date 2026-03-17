

window.addEventListener("DOMContentLoaded", function () {

  const IS_MOBILE_STAGE = window.matchMedia("(pointer: coarse), (max-width: 900px)").matches;


  function ensureSharedProjectsData(){
    const store = (window.PROJECTS && typeof window.PROJECTS === "object") ? window.PROJECTS : null;
    if (store && Object.keys(store).length) {
      return Promise.resolve(store);
    }

    if (window.__sharedProjectsDataPromise) {
      return window.__sharedProjectsDataPromise;
    }

    const candidates = [];
    const path = String(window.location.pathname || "").toLowerCase();

    if (path.indexOf("/work/") !== -1 || /\/work(?:\/index\.html)?$/.test(path)) {
      candidates.push("assets/js/projects-data.js");
      candidates.push("./assets/js/projects-data.js");
      candidates.push("../work/assets/js/projects-data.js");
      candidates.push("/work/assets/js/projects-data.js");
    } else {
      candidates.push("/work/assets/js/projects-data.js");
      candidates.push("work/assets/js/projects-data.js");
      candidates.push("./work/assets/js/projects-data.js");
      candidates.push("assets/js/projects-data.js");
    }

    window.__sharedProjectsDataPromise = new Promise((resolve) => {
      let idx = 0;

      const finish = () => {
        const loadedStore = (window.PROJECTS && typeof window.PROJECTS === "object") ? window.PROJECTS : {};
        resolve(loadedStore);
      };

      const tryNext = () => {
        const loadedStore = (window.PROJECTS && typeof window.PROJECTS === "object") ? window.PROJECTS : null;
        if (loadedStore && Object.keys(loadedStore).length) {
          finish();
          return;
        }

        if (idx >= candidates.length) {
          finish();
          return;
        }

        const src = candidates[idx++];
        if (!src) {
          tryNext();
          return;
        }

        const existing = Array.from(document.scripts || []).find((script) => {
          const scriptSrc = String(script.getAttribute("src") || script.src || "");
          return scriptSrc.indexOf("projects-data.js") !== -1 && scriptSrc.indexOf(src.replace(/^\.\//, "")) !== -1;
        });

        if (existing) {
          if ((window.PROJECTS && typeof window.PROJECTS === "object") && Object.keys(window.PROJECTS).length) {
            finish();
            return;
          }
          existing.addEventListener("load", finish, { once: true });
          existing.addEventListener("error", tryNext, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.dataset.sharedProjectsData = "1";
        script.addEventListener("load", () => {
          script.dataset.projectsReady = "1";
          finish();
        }, { once: true });
        script.addEventListener("error", tryNext, { once: true });
        document.head.appendChild(script);
      };

      tryNext();
    });

    return window.__sharedProjectsDataPromise;
  }

  ensureSharedProjectsData().then(function(){
const stack = document.getElementById("card-stack");
  const hint  = document.querySelector(".work-hint");
  const layers = document.querySelectorAll("#main-stack .layer");
  const graphContainer = document.getElementById("graph-container");
  const mainStack = document.getElementById("main-stack");

  if (!stack || !graphContainer || !mainStack || layers.length === 0 || typeof d3 === "undefined") {
    console.warn("Work page: required elements or d3 not found.");
    return;
  }

  if (!window.spiderweb) {
    console.warn("spiderweb API not found. Check script order: spiderweb.js must load before work-d3-interaction.js");
  }

  // =========================================================
  // MODE 3 (embedded): Deep Exploration Layer (NO extra files)
  // Trigger: click a D3 *label text* (non-root label only)
  // =========================================================
  (function(){
    const MODE3 = {};
    let active = false;
    let activeSelection = "";

    let layerEl = null;
    let titleEl = null;
    let dlEl = null;
    let goTopBtn = null;

    // word field
    let wordField = null;
    let wordSpans = [];
    let words = [];

    // draggable carve shapes
    let circleEl = null;
    let rectEl = null;

    function ensureDOM(){
      if (layerEl) return;

      layerEl = document.createElement("section");
      layerEl.id = "work-mode3-layer";
      layerEl.setAttribute("aria-hidden","true");

      layerEl.innerHTML = `
        <div class="mode3-wrap">
          <div class="mode3-hero">
            <div class="mode3-hero-circle">
              <img class="mode3-hero-img" alt="Hero" src="">
            </div>
            <div class="mode3-hero-meta">
              <h1 class="mode3-title">Project</h1>
              <a class="mode3-download" href="#" download>Download</a>
            </div>
          </div>

          <div class="mode3-gallery">
            <figure class="mode3-rect"><img alt="Project image 1" src=""></figure>
            <figure class="mode3-rect"><img alt="Project image 2" src=""></figure>
            <figure class="mode3-rect"><img alt="Project image 3" src=""></figure>
          </div>

          <div class="mode3-field">
            <div class="mode3-carve-shape mode3-carve-circle" aria-hidden="true"></div>
            <div class="mode3-carve-shape mode3-carve-rect" aria-hidden="true"></div>
            <div class="mode3-words" aria-label="Project text"></div>
          </div>

          <div class="mode3-footnote">Drag the circle and rectangle. Words vanish where the shapes exist.</div>
        </div>

        <button class="mode3-go-top" type="button" aria-label="Go to Top">Go to Top</button>
      `;

      document.body.appendChild(layerEl);

      titleEl = layerEl.querySelector(".mode3-title");
      dlEl = layerEl.querySelector(".mode3-download");
      goTopBtn = layerEl.querySelector(".mode3-go-top");
      wordField = layerEl.querySelector(".mode3-words");
      circleEl = layerEl.querySelector(".mode3-carve-circle");
      rectEl = layerEl.querySelector(".mode3-carve-rect");

      // Dummy text (word-level)
      const lorem = (
        "A deeper layer of the same living structure. " +
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non purus in justo malesuada laoreet. " +
        "Vivamus pulvinar, ipsum at congue cursus, dui risus convallis sapien, vitae rhoncus odio justo in augue. " +
        "Quisque vel elit nec risus sodales pulvinar. Integer laoreet, nibh sed tincidunt volutpat, metus lectus tincidunt mauris, sed placerat massa nulla in justo. " +
        "Suspendisse potenti. Curabitur placerat, risus ut volutpat viverra, lectus lectus cursus neque, sed laoreet justo arcu a augue. "
      ).repeat(6);

      words = lorem.trim().split(/\s+/g);
      wordSpans = [];
      wordField.innerHTML = "";

      const frag = document.createDocumentFragment();
      words.forEach((w,i) => {
        const s = document.createElement("span");
        s.className = "mode3-word";
        s.textContent = w + " ";
        frag.appendChild(s);
        wordSpans.push(s);
      });
      wordField.appendChild(frag);

      // initial carve positions
      circleEl.style.left = "10%";
      circleEl.style.top  = "55%";
      rectEl.style.left = "55%";
      rectEl.style.top  = "35%";

      // drag handlers (no global hijack)
      makeDraggable(circleEl);
      makeDraggable(rectEl);

      // scroll: show go-to-top after some depth
      goTopBtn.style.opacity = "0";
      goTopBtn.style.pointerEvents = "none";
      goTopBtn.addEventListener("click", () => {
        // Smooth scroll back to top, then exit Mode 3
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      window.addEventListener("scroll", onScroll, { passive: true });

      // carve update loop (rAF)
      requestAnimationFrame(updateCarve);
    }

    function makeDraggable(el){
      let dragging = false;
      let startX = 0, startY = 0;
      let origL = 0, origT = 0;

      el.addEventListener("pointerdown", (ev) => {
        dragging = true;
        el.setPointerCapture(ev.pointerId);
        startX = ev.clientX;
        startY = ev.clientY;
        const r = el.getBoundingClientRect();
        const parentR = layerEl.querySelector(".mode3-field").getBoundingClientRect();
        origL = r.left - parentR.left;
        origT = r.top - parentR.top;
        ev.preventDefault();
      });

      el.addEventListener("pointermove", (ev) => {
        if (!dragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const fieldR = layerEl.querySelector(".mode3-field").getBoundingClientRect();
        const selfR = el.getBoundingClientRect();

        let nl = origL + dx;
        let nt = origT + dy;

        // clamp inside field
        const maxL = fieldR.width - selfR.width;
        const maxT = fieldR.height - selfR.height;
        nl = Math.max(0, Math.min(maxL, nl));
        nt = Math.max(0, Math.min(maxT, nt));

        el.style.left = nl + "px";
        el.style.top  = nt + "px";
      });

      el.addEventListener("pointerup", (ev) => {
        dragging = false;
        try { el.releasePointerCapture(ev.pointerId); } catch(e){}
      });
      el.addEventListener("pointercancel", (ev) => {
        dragging = false;
        try { el.releasePointerCapture(ev.pointerId); } catch(e){}
      });
    }

    function onScroll(){
      if (!active) return;
      const y = window.scrollY || document.documentElement.scrollTop || 0;

      // show go-to-top only after some scroll
      if (y > 500) {
        goTopBtn.style.opacity = "1";
        goTopBtn.style.pointerEvents = "auto";
      } else {
        goTopBtn.style.opacity = "0";
        goTopBtn.style.pointerEvents = "none";
      }

      // Exit Mode 3 when user returns to top
      if (y < 5) {
        deactivate();
      }
    }

    function bounceScrollTo(targetY){
      const startY = window.scrollY || document.documentElement.scrollTop || 0;
      const dist = targetY - startY;
      const overshoot = 120;
      const dur1 = 420;
      const dur2 = 280;
      const t0 = performance.now();

      function easeOutCubic(t){ return 1 - Math.pow(1-t,3); }
      function easeOutBack(t){
        const c1 = 1.70158, c3 = c1 + 1;
        return 1 + c3 * Math.pow(t-1,3) + c1 * Math.pow(t-1,2);
      }

      function step(now){
        const dt = now - t0;
        if (dt < dur1) {
          const t = Math.max(0, Math.min(1, dt / dur1));
          const y = startY + dist * easeOutBack(t) + overshoot * (t*t*(1-t));
          window.scrollTo(0, y);
          requestAnimationFrame(step);
          return;
        }
        const t2 = Math.max(0, Math.min(1, (dt - dur1) / dur2));
        const y2 = targetY + (overshoot * (1 - easeOutCubic(t2))) * 0.25;
        window.scrollTo(0, y2);
        if (t2 < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function updateCarve(){
      if (active && layerEl && wordSpans.length){
        const field = layerEl.querySelector(".mode3-field");
        const fieldR = field.getBoundingClientRect();
        const cR = circleEl.getBoundingClientRect();
        const rR = rectEl.getBoundingClientRect();

        // recompute visibility
        for (let i=0;i<wordSpans.length;i++){
          const s = wordSpans[i];
          const wR = s.getBoundingClientRect();

          // skip if off-screen for perf
          if (wR.bottom < fieldR.top - 40 || wR.top > fieldR.bottom + 40) continue;

          const hitCircle = !(wR.right < cR.left || wR.left > cR.right || wR.bottom < cR.top || wR.top > cR.bottom);
          const hitRect   = !(wR.right < rR.left || wR.left > rR.right || wR.bottom < rR.top || wR.top > rR.bottom);

          if (hitCircle || hitRect) {
            s.style.opacity = "0";
          } else {
            s.style.opacity = "1";
          }
        }
      }
      requestAnimationFrame(updateCarve);
    }

    function activate(){
      ensureDOM();
      active = true;
      layerEl.setAttribute("aria-hidden","false");
      document.documentElement.classList.add("mode3-active");
      document.body.classList.add("mode3-active");
    }

    function deactivate(){
      if (!active) return;
      active = false;
      if (layerEl) layerEl.setAttribute("aria-hidden","true");
      document.documentElement.classList.remove("mode3-active");
      document.body.classList.remove("mode3-active");
    }

    MODE3.enter = function(labelText){
      activeSelection = (labelText || "").trim() || "Project";
      activate();

      // bind selection
      if (titleEl) titleEl.textContent = activeSelection;
      if (dlEl) {
        dlEl.setAttribute("href", "#");
        dlEl.removeAttribute("download");
      }

      // Scroll into Mode 3 (direct connection, no black void)
      const y = layerEl.getBoundingClientRect().top + (window.scrollY || 0) - 30;
      bounceScrollTo(Math.max(0, y));
    };

    MODE3.isActive = function(){ return active; };

    window.WorkMode3 = MODE3;
  })();

  const NODE_STYLE = {
    rootRadius: 24,
    childRadius: 9,
    rootFill: "rgba(255,255,255,1.0)",
    childFill: "rgba(255,255,255,0.80)",
    stroke: "rgba(255,255,255,0.35)",
    strokeWidth: 1.1,
    labelRootSize: "14px",
    labelChildSize: "12px"
  };


  if (IS_MOBILE_STAGE) {
    NODE_STYLE.childRadius = 11;
    NODE_STYLE.labelChildSize = "14px";
    NODE_STYLE.labelRootSize = "15px";
  }

  const STACK_REPEL_MARGIN = 80;
  const NODE_MIN_DISTANCE  = 180;
  const SCREEN_MARGIN      = 80;

  const STACK_ACTIVE_SCALE = 0.45;
  const STACK_ACTIVE_BLUR  = 1.8;
  stack.style.setProperty('--stack-active-scale', STACK_ACTIVE_SCALE);
  stack.style.setProperty('--stack-active-blur',  STACK_ACTIVE_BLUR + 'px');

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function rand(a,b){ return a + Math.random()*(b-a); }
  function inRect(x, y, rect){ return (x > rect.left && x < rect.right && y > rect.top && y < rect.bottom); }
  function dist(a, b){ const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx*dx + dy*dy); }
  function easeOutQuad(t){ return 1 - (1 - t)*(1 - t); }

  // Measure text width (px) for auto-sizing the root label box
  function measureTextPx(text, fontPx, fontWeight){
    const c = measureTextPx._c || (measureTextPx._c = document.createElement("canvas"));
    const ctx = c.getContext("2d");
    ctx.font = `${fontWeight || 600} ${fontPx}px Inter, sans-serif`;
    return ctx.measureText(text || "").width;
  }
  function kneeAngleDegFromDist(d){
    const L1 = SPIDER.upperLen;
    const L2 = SPIDER.lowerLen;
    const dd = Math.max(0.0001, d);
    const cos = (L1*L1 + L2*L2 - dd*dd) / (2*L1*L2);
    const c = Math.max(-1, Math.min(1, cos));
    return Math.acos(c) * 180 / Math.PI;
  }

  function solveKneePos(body, foot, bendSide){
    const L1 = SPIDER.upperLen;
    const L2 = SPIDER.lowerLen;
    const dx = foot.x - body.x;
    const dy = foot.y - body.y;
    const d = Math.max(0.0001, Math.sqrt(dx*dx + dy*dy));

    const a = (L1*L1 - L2*L2 + d*d) / (2*d);
    const h2 = Math.max(0, L1*L1 - a*a);
    const h = Math.sqrt(h2);

    const ux = dx / d;
    const uy = dy / d;
    const px = -uy;
    const py = ux;

    return {
      x: body.x + ux * a + px * h * bendSide,
      y: body.y + uy * a + py * h * bendSide
    };
  }

  function enforceNodeSeparation(state){
    const minD0 = SPIDER.minNodeSpacing;
    if (!minD0 || minD0 <= 0) return;
    const passes = Math.max(1, SPIDER.separationPasses || 1);

    for (let p = 0; p < passes; p++){
      for (let i = 0; i < state.nodes.length; i++){
        const a = state.nodes[i];
        for (let j = i + 1; j < state.nodes.length; j++){
          const b = state.nodes[j];

          let minD = minD0;
          const aK = !!a.knee, bK = !!b.knee;
          const aF = !!a.foot, bF = !!b.foot;
          if (aK && bK) minD = minD0 * 0.60;
          else if (aK || bK) minD = minD0 * 0.75;
          else if (aF || bF) minD = minD0 * 1.05; // keep feet a bit more spaced for text

          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx*dx + dy*dy) || 0.0001;

          if (d < minD){
            const push = (minD - d) * 0.5;
            const ux = dx / d;
            const uy = dy / d;

            const aIsRoot = !!a.root;
            const bIsRoot = !!b.root;

            if (!aIsRoot){ a.x -= ux * push; a.y -= uy * push; }
            if (!bIsRoot){ b.x += ux * push; b.y += uy * push; }

            if (aIsRoot && !bIsRoot){ b.x += ux * push; b.y += uy * push; }
            if (bIsRoot && !aIsRoot){ a.x -= ux * push; a.y -= uy * push; }
          }
        }
      }
    }
  }

  function normAngle(a){
    while (a <= -Math.PI) a += Math.PI * 2;
    while (a >  Math.PI) a -= Math.PI * 2;
    return a;
  }
  function angDiff(a, b){
    return Math.abs(normAngle(a - b));
  }

  function pushOutOfForbidden(x, y, forbidden, head){
    if (!inRect(x, y, forbidden)) return { x, y };
    const dx = x - head.x, dy = y - head.y;
    const d = Math.sqrt(dx*dx + dy*dy) || 1;
    const ux = dx / d, uy = dy / d;
    let nx = x, ny = y;
    for (let k = 0; k < 40; k++){
      if (!inRect(nx, ny, forbidden)) break;
      nx += ux * 10;
      ny += uy * 10;
    }
    return { x: nx, y: ny };
  }

  function clampFootRange(state, foot){
    const head = state.nodes[0];
    const width = window.innerWidth;
    const height = window.innerHeight;
    const forbidden = getForbiddenRect();

    let dx = foot.x - head.x;
    let dy = foot.y - head.y;
    let d = Math.sqrt(dx*dx + dy*dy) || 0.0001;
    const ux = dx / d, uy = dy / d;

    const dd = clamp(d, SPIDER.minDist, SPIDER.maxDist);
    if (Math.abs(dd - d) > 0.01){
      foot.x = head.x + ux * dd;
      foot.y = head.y + uy * dd;
    }

    foot.x = clamp(foot.x, SCREEN_MARGIN, width - SCREEN_MARGIN);
    foot.y = clamp(foot.y, SCREEN_MARGIN, height - SCREEN_MARGIN);

    const pushed = pushOutOfForbidden(foot.x, foot.y, forbidden, head);
    foot.x = pushed.x; foot.y = pushed.y;
  }

  function enforceLegAngularSeparation(state){
    const minSep = SPIDER.minLegAngleSep;
    if (!minSep || minSep <= 0 || !state.legPairs) return;

    const head = state.nodes[0];
    const forbidden = getForbiddenRect();

    const legs = [];
    for (let i = 0; i < state.legPairs.length; i++){
      const fp = state.nodes[state.legPairs[i].footIndex];
      if (!fp) continue;
      const a = Math.atan2(fp.y - head.y, fp.x - head.x);
      legs.push({ i, foot: fp, ang: a });
    }
    if (legs.length < 2) return;

    for (let pass = 0; pass < 3; pass++){
      for (let k = 0; k < legs.length; k++){
        const cur = legs[k];
        const prev = legs[(k - 1 + legs.length) % legs.length];
        const next = legs[(k + 1) % legs.length];

        let dPrev = normAngle(cur.ang - prev.ang);
        let dNext = normAngle(next.ang - cur.ang);

        if (dPrev < 0) dPrev += Math.PI * 2;
        if (dNext < 0) dNext += Math.PI * 2;

        if (dPrev < minSep){
          const push = (minSep - dPrev) * 0.5;
          cur.ang += push;
          prev.ang -= push;
        }
        if (dNext < minSep){
          const push = (minSep - dNext) * 0.5;
          cur.ang -= push;
          next.ang += push;
        }

        cur.ang = normAngle(cur.ang);
        prev.ang = normAngle(prev.ang);
        next.ang = normAngle(next.ang);
      }
    }

    for (let k = 0; k < legs.length; k++){
      const foot = legs[k].foot;
      const dx = foot.x - head.x;
      const dy = foot.y - head.y;
      const d = Math.sqrt(dx*dx + dy*dy) || SPIDER.minDist;

      const r = clamp(d, SPIDER.minDist, SPIDER.maxDist);
      foot.x = head.x + Math.cos(legs[k].ang) * r;
      foot.y = head.y + Math.sin(legs[k].ang) * r;

      foot.x = clamp(foot.x, SCREEN_MARGIN, window.innerWidth - SCREEN_MARGIN);
      foot.y = clamp(foot.y, SCREEN_MARGIN, window.innerHeight - SCREEN_MARGIN);

      const pushed = pushOutOfForbidden(foot.x, foot.y, forbidden, head);
      foot.x = pushed.x; foot.y = pushed.y;

      foot._legAngle = legs[k].ang;
    }
  }

  function enforceLegConstraints(state){
    if (!SPIDER.constraintsEnabled) return;
    if (!state || !state.nodes) return;

    for (let i = 1; i < state.nodes.length; i++){
      const n = state.nodes[i];
      if (n && n.foot) clampFootRange(state, n);
    }

    enforceLegAngularSeparation(state);

    for (let i = 1; i < state.nodes.length; i++){
      const n = state.nodes[i];
      if (n && n.foot) clampFootRange(state, n);
    }

    if (WEB_SNAP.enabled && window.spiderweb && typeof window.spiderweb.getClosestPoint === "function"){
      for (let i = 1; i < state.nodes.length; i++){
        const n = state.nodes[i];
        if (!n || !n.foot) continue;
        const snapped = webSnapOrNull(n.x, n.y);
        if (snapped){
          n.x = snapped.x;
          n.y = snapped.y;
        }
      }
    }

  }

  const FIREFLIES = {
    enabled: true,
    count: 6,

    cageRadius: 190,
    wallBounce: 0.25,

    gravity: 0.075,
    airDrag: 0.985,
    maxSpeed: 5.0,

    collisionPadding: 10,
    separationPasses: 7,
    restitution: 0.12,

    influenceRadius: 2200,
    tiltStrength: 0.22,
    shakeFromVelocity: 1.60,
    shakeFromAccel: 3.60,
    impulseClamp: 0.60,

    idleWander: 0.004,

    hoverScale: 2.15,
    otherScaleWhenHover: 0.78,
    freezeOnHover: true,

    webGlowEnabled: true,
    webGlowRadius: 185,
    webGlowStrength: 0.65
  };

  const FIREFLY_BREATH = {
    minScale: 0.93,
    maxScale: 1.06,
    speed: 0.00135,     // smaller = slower
    flickerAmp: 0.035   // subtle opacity drift
  };

  const MODE1_ENTRY = {
    targetOpacity: 0.97,

    fadeMs: 1100,
    firstLeadMs: 520,
    staggerMs: 260,

    startScale: 0.90
  };

  let _mode1EntryActive = false;
  let _mode1EntryT0 = 0;
  let _mode1EntryStackX = 0;
  let _mode1EntryStackY = 0;

  function beginMode1EntryUnified(){
    if (!fireflies || fireflies.length === 0) return;

    _mode1EntryActive = true;
    _mode1EntryT0 = 0;

    _mode1EntryStackX = fireflies[0].x;
    _mode1EntryStackY = fireflies[0].y;

    for (let i = 0; i < fireflies.length; i++) {
      const f = fireflies[i];
      f.x = _mode1EntryStackX;
      f.y = _mode1EntryStackY;
      f.vx = 0;
      f.vy = 0;

      f._entryAlpha = 0;
      f._entryReleased = (i === 0);

      f.el.style.opacity = "0";
      f.el.style.pointerEvents = "none";
    }
  }

  const _mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    px: window.innerWidth / 2,
    py: window.innerHeight / 2,
    vx: 0, vy: 0,
    ax: 0, ay: 0,
    t: performance.now()
  };

  function _onMouseMove(e){
    const now = performance.now();
    const dt = Math.max(8, now - _mouse.t);

    const nx = e.clientX, ny = e.clientY;
    const nvx = (nx - _mouse.px) / dt;
    const nvy = (ny - _mouse.py) / dt;

    _mouse.ax = (nvx - _mouse.vx) / dt;
    _mouse.ay = (nvy - _mouse.vy) / dt;

    _mouse.vx = nvx;
    _mouse.vy = nvy;

    _mouse.px = nx;
    _mouse.py = ny;
    _mouse.x = nx;
    _mouse.y = ny;
    _mouse.t = now;
  }
  window.addEventListener("mousemove", _onMouseMove, { passive: true });

  let fireflies = [];
  let fireflyRAF = null;
  let firefliesRunning = false;

  const savedInlineStyle = new Map();

  function takeOverLayerForBubble(el){
    if (!savedInlineStyle.has(el)) savedInlineStyle.set(el, el.getAttribute("style") || "");

    el.style.display = "block";
    el.style.opacity = "1";
    el.style.position = "absolute";
    el.style.left = "50%";
    el.style.top  = "50%";
    el.style.transform = "translate(-50%,-50%)";
    el.style.pointerEvents = "auto";
    el.style.cursor = "pointer";
    el.style.willChange = "transform";
    el.style.filter = "none";
  }

  function restoreLayer(el){
    const prev = savedInlineStyle.get(el);
    if (prev === undefined) el.removeAttribute("style");
    else el.setAttribute("style", prev);
    el.onmouseenter = null;
    el.onmouseleave = null;
    el.classList.remove("ff-hovered");
    el.style.opacity = "";
  }

  function safeRectCenter(el){
    const r = el.getBoundingClientRect();
    if (!r || r.width < 2 || r.height < 2) {
      return { x: 0, y: 0, w: 420, h: 420, rect: { left: 0, top: 0 } };
    }
    return { x: r.width/2, y: r.height/2, w: r.width, h: r.height, rect: r };
  }

  function getBubbleBaseRadius(el){
    const r = el.getBoundingClientRect();
    if (r && r.width > 2) return r.width / 2;
    return 55;
  }

  function initFireflies(){
    fireflies = [];
    const N = Math.min(FIREFLIES.count, layers.length);
    const cage = safeRectCenter(mainStack);

    for (let i = 0; i < N; i++){
      const el = layers[i];
      takeOverLayerForBubble(el);

      const baseR = getBubbleBaseRadius(el);

      const x = cage.x + (Math.random() - 0.5) * 45;
      const y = cage.y - FIREFLIES.cageRadius * 0.32 + (Math.random() - 0.5) * 34;

      fireflies.push({
        el,
        x, y,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        seed: Math.random() * 999,
        hover: false,
        baseR,
        mass: 0.9 + Math.random() * 0.6
      });
    }

    for (let step = 0; step < 140; step++){
      settleStep(0.95);
    }
  }

  function bubbleRadius(f, anyHover){
    const sc = f.hover ? FIREFLIES.hoverScale : (anyHover ? FIREFLIES.otherScaleWhenHover : 1);
    return f.baseR * sc;
  }

  function applyFireflyTransform(f, anyHover){
    const cage = safeRectCenter(mainStack);
    const dx = f.x - cage.x;
    const dy = f.y - cage.y;

    const isHovered = f.hover;

    if (_mode1EntryActive) {
      const a = Math.max(0, Math.min(1, f._entryAlpha || 0));
      f.el.style.opacity = String(MODE1_ENTRY.targetOpacity * a);
    }

    let sc = isHovered
      ? FIREFLIES.hoverScale
      : (anyHover ? FIREFLIES.otherScaleWhenHover : 1);

    if (_mode1EntryActive) {
      const a = Math.max(0, Math.min(1, f._entryAlpha || 0));
      const e = easeOutQuad(a);
      const s0 = (typeof MODE1_ENTRY.startScale === "number") ? MODE1_ENTRY.startScale : 1;
      sc *= (s0 + (1 - s0) * e);
    }

    if (!isHovered && !anyHover) {
      const t = performance.now();

      const breathe =
        FIREFLY_BREATH.minScale +
        (Math.sin(t * FIREFLY_BREATH.speed + f.seed) * 0.5 + 0.5) *
        (FIREFLY_BREATH.maxScale - FIREFLY_BREATH.minScale);

      sc *= breathe;

      if (!_mode1EntryActive) f.el.style.opacity = String(
        0.965 + Math.sin(t * 0.002 + f.seed) * FIREFLY_BREATH.flickerAmp
      );
    } else {
      if (!_mode1EntryActive) f.el.style.opacity = "1";
    }

    f.el.style.transform = `translate(-50%,-50%) translate(${dx}px, ${dy}px) scale(${sc})`;
  }

  function settleStep(dtMul){
    const cage = safeRectCenter(mainStack);
    const R = FIREFLIES.cageRadius;

    let anyHover = false;
    for (const f of fireflies) if (f.hover) { anyHover = true; break; }

    if (_mode1EntryActive) {
      const now = performance.now();
      if (!_mode1EntryT0) _mode1EntryT0 = now;

      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];

        const delay = (i === 0)
          ? 0
          : (MODE1_ENTRY.firstLeadMs + (i - 1) * MODE1_ENTRY.staggerMs);

        const tt = (now - _mode1EntryT0) - delay;
        const a = Math.max(0, Math.min(1, tt / MODE1_ENTRY.fadeMs));

        f._entryAlpha = a;

        if (tt >= 0) f._entryReleased = true;

        if (a < 0.99) f.el.style.pointerEvents = "none";
        else f.el.style.pointerEvents = "auto";
      }
    }

    const radii = fireflies.map(f => bubbleRadius(f, anyHover));

    for (let i = 0; i < fireflies.length; i++){
      const a = fireflies[i];

      if (_mode1EntryActive && !a._entryReleased) {
        a.x = _mode1EntryStackX;
        a.y = _mode1EntryStackY;
        a.vx = 0;
        a.vy = 0;
        continue;
      }

      if (a.hover && FIREFLIES.freezeOnHover){
        a.vx = 0;
        a.vy = 0;
        continue;
      }

      a.vy += FIREFLIES.gravity * dtMul;
      a.vx += (Math.sin(a.seed + i) * FIREFLIES.idleWander) * dtMul;

      a.vx *= FIREFLIES.airDrag;
      a.vy *= FIREFLIES.airDrag;

      a.x += a.vx * dtMul;
      a.y += a.vy * dtMul;

      const rr = radii[i];
      const cx = a.x - cage.x, cy = a.y - cage.y;
      const dd = Math.hypot(cx, cy) || 0.0001;
      const maxInside = Math.max(10, R - rr);

      if (dd > maxInside){
        const nx = cx / dd, ny = cy / dd;
        a.x = cage.x + nx * maxInside;
        a.y = cage.y + ny * maxInside;

        const dot = a.vx * nx + a.vy * ny;
        a.vx -= (1 + FIREFLIES.wallBounce) * dot * nx;
        a.vy -= (1 + FIREFLIES.wallBounce) * dot * ny;
      }
    }

    for (let pass = 0; pass < FIREFLIES.separationPasses; pass++){
      for (let i = 0; i < fireflies.length; i++){
        for (let j = i + 1; j < fireflies.length; j++){
          const a = fireflies[i], b = fireflies[j];

          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx*dx + dy*dy;

          if (d2 < 0.0001){
            dx = (Math.random() - 0.5);
            dy = (Math.random() - 0.5);
            d2 = dx*dx + dy*dy;
          }

          const d = Math.sqrt(d2);
          const minD = radii[i] + radii[j] + FIREFLIES.collisionPadding;

          if (d < minD){
            const nx = dx / d, ny = dy / d;
            const overlap = (minD - d);

            const push = overlap * 0.5;
            if (!(a.hover && FIREFLIES.freezeOnHover)) {
              a.x += nx * push;
              a.y += ny * push;
            }
            if (!(b.hover && FIREFLIES.freezeOnHover)) {
              b.x -= nx * push;
              b.y -= ny * push;
            }

            const relVx = a.vx - b.vx;
            const relVy = a.vy - b.vy;
            const relAlong = relVx * nx + relVy * ny;

            if (relAlong < 0) {
              const e = FIREFLIES.restitution;
              const jImpulse = -(1 + e) * relAlong / (1/a.mass + 1/b.mass);

              const ix = jImpulse * nx;
              const iy = jImpulse * ny;

              if (!(a.hover && FIREFLIES.freezeOnHover)) {
                a.vx += ix / a.mass;
                a.vy += iy / a.mass;
              }
              if (!(b.hover && FIREFLIES.freezeOnHover)) {
                b.vx -= ix / b.mass;
                b.vy -= iy / b.mass;
              }
            }
          }
        }
      }

      for (let i = 0; i < fireflies.length; i++){
        const a = fireflies[i];
        const rr = radii[i];
        const cx = a.x - cage.x, cy = a.y - cage.y;
        const dd = Math.hypot(cx, cy) || 0.0001;
        const maxInside = Math.max(10, R - rr);

        if (dd > maxInside){
          const nx = cx / dd, ny = cy / dd;
          a.x = cage.x + nx * maxInside;
          a.y = cage.y + ny * maxInside;
        }
      }
    }

    return anyHover;
  }

  function fireflyTick(ts){
    if (!firefliesRunning) return;

    const cage = safeRectCenter(mainStack);
    const rect = mainStack.getBoundingClientRect();

    const bowlCX = rect.left + cage.x;
    const bowlCY = rect.top  + cage.y;

    const dxC = _mouse.x - bowlCX;
    const dyC = _mouse.y - bowlCY;
    const dC  = Math.hypot(dxC, dyC) || 1;

    const t = 1 - Math.max(0, Math.min(1, dC / FIREFLIES.influenceRadius));
    const influence = t * t;

    const tiltNX = dxC / dC;
    const tiltNY = dyC / dC;

    let sx = (_mouse.vx * FIREFLIES.shakeFromVelocity + _mouse.ax * FIREFLIES.shakeFromAccel) * influence;
    let sy = (_mouse.vy * FIREFLIES.shakeFromVelocity + _mouse.ay * FIREFLIES.shakeFromAccel) * influence;

    const sMag = Math.hypot(sx, sy) || 0;
    const sMax = FIREFLIES.impulseClamp * (0.35 + 0.65 * influence);
    if (sMag > sMax){
      sx = (sx / sMag) * sMax;
      sy = (sy / sMag) * sMax;
    }

    let anyHover = false;
    for (const f of fireflies) if (f.hover) { anyHover = true; break; }

    for (let i = 0; i < fireflies.length; i++){
      const a = fireflies[i];

      if (a.hover && FIREFLIES.freezeOnHover){
        a.vx = 0;
        a.vy = 0;
      } else {
        a.vx += (tiltNX * FIREFLIES.tiltStrength * influence) / a.mass;
        a.vy += (FIREFLIES.gravity + (tiltNY * FIREFLIES.tiltStrength * influence)) / a.mass;

        const phase = 0.75 + 0.35 * Math.sin(a.seed + ts * 0.004);
        a.vx += (sx * phase) / a.mass;
        a.vy += (sy * phase) / a.mass;

        a.vx += Math.sin(ts * 0.0017 + a.seed) * FIREFLIES.idleWander;
        a.vy += Math.cos(ts * 0.0014 + a.seed) * FIREFLIES.idleWander;

        const sp = Math.hypot(a.vx, a.vy);
        if (sp > FIREFLIES.maxSpeed){
          a.vx = (a.vx/sp) * FIREFLIES.maxSpeed;
          a.vy = (a.vy/sp) * FIREFLIES.maxSpeed;
        }
      }
    }

    settleStep(1);

    if (FIREFLIES.webGlowEnabled && window.spiderweb &&
        typeof window.spiderweb.getClosestPoint === "function" &&
        typeof window.spiderweb.disturbAt === "function"){

      const glowR = FIREFLIES.webGlowRadius;
      const glowR2 = glowR * glowR;

      for (let i = 0; i < fireflies.length; i++){
        const a = fireflies[i];
        const bx = rect.left + a.x;
        const by = rect.top  + a.y;

        const hit = window.spiderweb.getClosestPoint(bx, by);
        if (!hit) continue;

        if (hit.d2 < glowR2){
          const d = Math.sqrt(hit.d2);
          const falloff = 1 - (d / glowR);
          const s = FIREFLIES.webGlowStrength * falloff;
          window.spiderweb.disturbAt(hit.x, hit.y, s, glowR * 0.95);
        }
      }
    }

    for (const f of fireflies) applyFireflyTransform(f, anyHover);

    if (_mode1EntryActive) {
      let allDone = true;
      for (let i = 0; i < fireflies.length; i++) {
        if ((fireflies[i]._entryAlpha || 0) < 1) { allDone = false; break; }
      }
      if (allDone) {
        _mode1EntryActive = false;
        _mode1EntryT0 = 0;
        for (let i = 0; i < fireflies.length; i++) {
          fireflies[i].el.style.pointerEvents = "auto";
        }
      }
    }

    fireflyRAF = requestAnimationFrame(fireflyTick);
  }

  function startFireflies(){
    if (!FIREFLIES.enabled) return;
    cancelAnimationFrame(fireflyRAF);
    initFireflies();

    beginMode1EntryUnified();

    fireflies.forEach(f => {
      f.el.onmouseenter = () => {
        f.hover = true;
        f.el.classList.add("ff-hovered");
        f.el.style.opacity = "1";
      };
      f.el.onmouseleave = () => {
        f.hover = false;
        f.el.classList.remove("ff-hovered");
        f.el.style.opacity = "1";
      };
    });

    firefliesRunning = true;
    fireflyRAF = requestAnimationFrame(fireflyTick);
  }

  function stopFireflies(){
    firefliesRunning = false;
    cancelAnimationFrame(fireflyRAF);
    layers.forEach(el => restoreLayer(el));
  }

  const VIBE = {
    enabled: true,
    
    fps: 30,
jitter: 0.35,
    freq:   0.006,
    amp:    0.9
  };


  if (IS_MOBILE_STAGE) {
    VIBE.enabled = false;
  }

  const SPIDER = {
    enabled: true,
    minDist: 220,
    maxDist: 380,
    stepOutMin: 190,
    stepOutMax: 260,
    stepInMin:  160,
    stepInMax:  230,
    minFootSeparation: 70,
    stepDurationMs: 140,
    stepCooldownMs: 70,
    angleJitter: 0.55,
    
    constraintsEnabled: false,
    minLegAngleSep: 0,
    avoidStack: true,
    enableAfterEntranceMs: 1200

    ,
    upperLen: 190,              // Body -> Knee segment length
    lowerLen: 190,              // Knee -> Foot segment length
    maxKneeAngleDeg: 120,       // trigger step when knee angle opens beyond this
    minNodeSpacing: 46,         // minimum spacing between nodes (feet + body) to avoid crowding
    separationPasses: 2         // small passes, conservative
  };


  if (IS_MOBILE_STAGE) {
    SPIDER.minDist = 210;
    SPIDER.maxDist = 300;
    SPIDER.stepOutMin = 170;
    SPIDER.stepOutMax = 205;
    SPIDER.stepInMin = 155;
    SPIDER.stepInMax = 195;
    SPIDER.minFootSeparation = 42;
    SPIDER.stepDurationMs = 180;
    SPIDER.stepCooldownMs = 240;
    SPIDER.angleJitter = 0.18;
    SPIDER.enableAfterEntranceMs = 1600;
    SPIDER.minNodeSpacing = 8;
    SPIDER.separationPasses = 1;
  }

  const WEB_SNAP = {
    enabled: true,
    snapMaxDistancePx: 28,
    pluckStrength: 3,
    pluckRadius: 180,

    plantedVibeEnabled: true,
    plantedStrengthMul: 0.02,
    plantedRadiusMul: 0.45,
    plantedIntervalMs: 95,

    pluckWhileDragging: true,
    dragPluckStrength: 0.35,
    dragPluckRadius: 160,
    dragPluckThrottleMs: 30
  };

  const ROOT_GLOW = {
    enabled: true,
    radius: 210,            // how far from a strand the root starts to glow
    maxBlurPx: 18,          // glow size
    maxAlpha: 0.75,         // glow intensity
    rBoost: 2.2,            // slight radius boost when glowing
    pluckEnabled: true,
    pluckThrottleMs: 55,
    pluckStrength: 0.10,
    pluckRadius: 140
  };


  if (IS_MOBILE_STAGE) {
    WEB_SNAP.plantedVibeEnabled = false;
    WEB_SNAP.pluckWhileDragging = false;
    ROOT_GLOW.pluckEnabled = false;
    ROOT_GLOW.maxBlurPx = 12;
    ROOT_GLOW.maxAlpha = 0.52;
    ROOT_GLOW.rBoost = 1.4;
  }

  let expanded = false;
  let isTransitioning = false;
  let graphState = null;
  let lastDragPluck = 0;

  stack.classList.add("stack-default");

  startFireflies();

  stack.addEventListener("mouseenter", () => {
    if (expanded) resetStack();
  });

  // --- Mode 2 "top circle" glow ---
  // In Mode 2, the clicked firefly bubble is visually parked near the top.
  // You wanted that bubble to glow like the main highlighted node.
  function clearTopBubbleGlow(){
    layers.forEach(el => {
      el.style.filter = "";
      el.style.boxShadow = "";
    });
  }

  function applyTopBubbleGlow(el){
    if (!el) return;
    clearTopBubbleGlow();
    // Soft white glow, similar vibe to the root highlight.
    el.style.filter = "drop-shadow(0 0 18px rgba(255,255,255,0.65)) drop-shadow(0 0 38px rgba(255,255,255,0.22))";
  }

  layers.forEach(layer => {
    layer.addEventListener("click", () => {
      const labelEl = layer.querySelector(".label");
      const labelText = labelEl ? String(labelEl.textContent || "").trim() : "";
      const category = labelText || layer.dataset.category || "Projects";
      enterGraphMode(category, layer);
    });
  });

  function enterGraphMode(category, clickedLayer){
    expanded = true;
    stopFireflies();

    // Add glow only to the bubble that becomes the top circle in Mode 2.
    applyTopBubbleGlow(clickedLayer);

    stack.classList.add("stack-active");
    stack.classList.remove("stack-default");
    if (hint) hint.classList.add("jaw-open");

    if (graphState && !isTransitioning) {
      animateGraphExit(() => spawnGraph(category));
    } else {
      clearGraph();
      spawnGraph(category);
    }
  }

  function resetStack(){
    if (!expanded && !graphState) return;

    expanded = false;

    // Mode 1 restored: remove the Mode 2 "top circle" glow.
    clearTopBubbleGlow();

    for (let i = 0; i < layers.length; i++) {
      layers[i].style.opacity = "0";
      layers[i].style.pointerEvents = "none";
    }

    stack.classList.remove("stack-active");
    stack.classList.add("stack-default");
    if (hint) hint.classList.remove("jaw-open");

    // When returning to Mode 1, remove the top bubble glow.
    clearTopBubbleGlow();

    if (graphState && !isTransitioning) animateGraphExit(() => startFireflies());
    else {
      clearGraph();
      startFireflies();
    }
  }

  function getForbiddenRect() {
    const r = stack.getBoundingClientRect();
    return {
      left:   r.left   - STACK_REPEL_MARGIN,
      right:  r.right  + STACK_REPEL_MARGIN,
      top:    r.top    - STACK_REPEL_MARGIN,
      bottom: r.bottom + STACK_REPEL_MARGIN,
      centerX: (r.left + r.right) / 2,
      centerY: (r.top  + r.bottom) / 2
    };
  }

  function randomEdgePoint(width, height, offset) {
    const side = ["left","right","top","bottom"][Math.floor(Math.random()*4)];
    switch (side) {
      case "left":   return { side, x: -offset,      y: Math.random() * height };
      case "right":  return { side, x: width+offset, y: Math.random() * height };
      case "top":    return { side, x: Math.random() * width, y: -offset };
      case "bottom":
      default:       return { side, x: Math.random() * width, y: height+offset };
    }
  }

  function bottomEdgePoint(width, height, offset) {
    return {
      side: "bottom",
      x: SCREEN_MARGIN + Math.random() * (width - 2 * SCREEN_MARGIN),
      y: height + offset
    };
  }

  function constrainedRootPosition(width, height, forbidden) {
    const xMin0 = width * 0.5 - width * 0.12;
    const xMax0 = width * 0.5 + width * 0.12;

    const yMin0 = height * 0.44;
    const yMax0 = height * 0.60;

    const m = SCREEN_MARGIN + NODE_STYLE.rootRadius + 10;

    const xMin = clamp(xMin0, m, width  - m);
    const xMax = clamp(xMax0, m, width  - m);
    const yMin = clamp(yMin0, m, height - m);
    const yMax = clamp(yMax0, m, height - m);

    for (let attempt = 0; attempt < 200; attempt++) {
      const x = rand(xMin, xMax);
      const y = rand(yMin, yMax);
      if (inRect(x, y, forbidden)) continue;
      return { x, y };
    }

    const fx = clamp(forbidden.right + 120, m, width - m);
    const fy = clamp((forbidden.top + forbidden.bottom) * 0.5, yMin, yMax);
    return { x: fx, y: fy };
  }

  function randomSafePosition(width, height, forbidden, existingTargets, minDist, margin) {
    const m = (typeof margin === "number") ? margin : SCREEN_MARGIN;
    for (let attempt = 0; attempt < 200; attempt++) {
      const x = m + Math.random() * (width  - 2 * m);
      const y = m + Math.random() * (height - 2 * m);

      if (x > forbidden.left && x < forbidden.right &&
          y > forbidden.top  && y < forbidden.bottom) continue;

      let ok = true;
      for (const n of existingTargets) {
        const dx = x - n.targetX;
        const dy = y - n.targetY;
        if (dx*dx + dy*dy < minDist * minDist) { ok = false; break; }
      }
      if (ok) return { x, y };
    }
    return {
      x: Math.min(width - m, forbidden.right + 200),
      y: Math.min(height - m, forbidden.bottom + 200)
    };
  }

  function webClosest(x, y){
    if (!WEB_SNAP.enabled) return null;
    if (!window.spiderweb || typeof window.spiderweb.getClosestPoint !== "function") return null;
    return window.spiderweb.getClosestPoint(x, y);
  }

  function webSnapOrNull(x, y){
    const hit = webClosest(x, y);
    if (!hit) return null;

    const maxD2 = WEB_SNAP.snapMaxDistancePx * WEB_SNAP.snapMaxDistancePx;
    if (hit.d2 > maxD2) return null;

    // Prefer locking to the *segment midpoint* (prevents "surfing" along a strand),
    // but only if spiderweb exposes the segment endpoints on the hit.
    // Supported shapes:
    //  - {ax,ay,bx,by,...}
    //  - {a:{x,y}, b:{x,y}, ...}
    let mx = hit.x, my = hit.y;

    if (hit.ax != null && hit.ay != null && hit.bx != null && hit.by != null){
      mx = (hit.ax + hit.bx) * 0.5;
      my = (hit.ay + hit.by) * 0.5;
    } else if (hit.a && hit.b && hit.a.x != null && hit.a.y != null && hit.b.x != null && hit.b.y != null){
      mx = (hit.a.x + hit.b.x) * 0.5;
      my = (hit.a.y + hit.b.y) * 0.5;
    }

    return { x: mx, y: my };
  }

  function webPluck(x, y, strength, radius){
    if (!window.spiderweb || typeof window.spiderweb.disturbAt !== "function") return;
    window.spiderweb.disturbAt(x, y, strength, radius);
  }


  // Hard biomechanical limit: legs cannot extend beyond (upperLen + lowerLen).
  // If they do (dragging or entrance tween), we clamp the foot back and (loosely) re-snap to the web.
  function clampFootToMaxReach(state, foot){
    if (!foot || !foot.foot) return;
    const head = state.nodes[0];
    const maxReach = (SPIDER.upperLen + SPIDER.lowerLen) - 6;

    let dx = foot.x - head.x;
    let dy = foot.y - head.y;
    let d  = Math.hypot(dx, dy) || 0.0001;
    if (d <= maxReach) return;

    const ux = dx / d;
    const uy = dy / d;

    let nx = head.x + ux * maxReach;
    let ny = head.y + uy * maxReach;

    // Loose snap (bigger than step-snap), only used to keep feet on the web after a hard clamp.
    if (WEB_SNAP.enabled && window.spiderweb && typeof window.spiderweb.getClosestPoint === "function"){
      const hit = window.spiderweb.getClosestPoint(nx, ny);
      if (hit){
        const loose = Math.max(WEB_SNAP.snapMaxDistancePx, 80);
        if (hit.d2 <= loose * loose){
          nx = hit.x; ny = hit.y;
        }
      }
    }

    foot.x = nx;
    foot.y = ny;
  }

  function vibeOffset(d, t) {
    if (!VIBE.enabled) return { ox: 0, oy: 0 };
    const s = d._vseed || 0;
    const jx = Math.sin(t * 1.9 + s * 2.3) * VIBE.jitter;
    const jy = Math.cos(t * 1.7 + s * 1.8) * VIBE.jitter;
    const wx = Math.sin(t * 1.1 + s) * VIBE.amp;
    const wy = Math.cos(t * 1.0 + s * 0.9) * VIBE.amp;
    return { ox: jx + wx, oy: jy + wy };
  }

  function startVibeLoop(state) {
    if (!VIBE.enabled) return;
    if (state._vibeTimerStarted) return;
    state._vibeTimerStarted = true;
    state._vibeStop = false;

    const minFrameMs = 1000 / (VIBE.fps || 60);
    let last = 0;

    d3.timer(function (elapsed) {
      if (!graphState || state._vibeStop) return true;

      if (state.spider && state.spider.dragging) return false;

      if ((elapsed - last) >= minFrameMs) {
        last = elapsed;
        state.render();
      }
      return false;
    });
  }

  function initSpiderState(state){
    const nodes = state.nodes;
    const footCount = nodes.length - 1;

    state.spider = {
      ready: false,
      dragging: false,
      dragNode: null,
      nextFootIndex: 1,
      stepping: null,
      nextAllowedAt: 0,
      lastPlantedBuzz: 0
    };

    const base = Math.random() * Math.PI * 2;
    for (let i = 1; i < nodes.length; i++){
      const k = i - 1;
      nodes[i]._legAngle = base + (k / Math.max(1, footCount)) * Math.PI * 2;
    }

    const _t = setTimeout(() => {
      if (graphState === state && state.spider) state.spider.ready = true;
    }, SPIDER.enableAfterEntranceMs);
    if (state._timeouts) state._timeouts.push(_t);
  }

  function pickLegTarget(state, foot, mode){
    const width  = window.innerWidth;
    const height = window.innerHeight;
    const forbidden = getForbiddenRect();
    const head = state.nodes[0];

    const tries = 70;

    for (let t = 0; t < tries; t++){
      const jitter = rand(-SPIDER.angleJitter, SPIDER.angleJitter);
      const ang = (foot._legAngle || 0) + jitter;

      const r = (mode === "out")
        ? rand(SPIDER.stepOutMin, SPIDER.stepOutMax)
        : rand(SPIDER.stepInMin,  SPIDER.stepInMax);

      let x = head.x + Math.cos(ang) * r;
      let y = head.y + Math.sin(ang) * r;

      x = clamp(x, SCREEN_MARGIN, width  - SCREEN_MARGIN);
      y = clamp(y, SCREEN_MARGIN, height - SCREEN_MARGIN);

      if (SPIDER.avoidStack && inRect(x, y, forbidden)) continue;

      const snapped = webSnapOrNull(x, y);
      if (!snapped) continue;

      x = snapped.x;
      y = snapped.y;

      // ---- Reach + knee-angle validity (prevents rubber-band legs)
      const _maxReach = (SPIDER.upperLen + SPIDER.lowerLen) - 6;
      const _dd = Math.hypot(x - head.x, y - head.y) || 0.0001;
      if (_dd > _maxReach) continue;
      const _kneeDeg = kneeAngleDegFromDist(_dd);
      // We only accept targets that RELAX the joint (below the limit)
      if (_kneeDeg >= SPIDER.maxKneeAngleDeg) continue;
      if (SPIDER.minLegAngleSep && SPIDER.minLegAngleSep > 0){
        const candAng = Math.atan2(y - head.y, x - head.x);
        let angOk = true;
        for (let j = 1; j < state.nodes.length; j++){
          const other = state.nodes[j];
          if (!other || !other.foot || other === foot) continue;
          const oang = (typeof other._legAngle === "number")
            ? other._legAngle
            : Math.atan2(other.y - head.y, other.x - head.x);
          if (angDiff(candAng, oang) < SPIDER.minLegAngleSep){
            angOk = false; break;
          }
        }
        if (!angOk) continue;
      }

      let ok = true;
      for (let j = 1; j < state.nodes.length; j++){
        if (state.nodes[j] === foot) continue;
        const other = state.nodes[j];
        const dx = x - other.x, dy = y - other.y;
        if (dx*dx + dy*dy < SPIDER.minFootSeparation * SPIDER.minFootSeparation){
          ok = false; break;
        }
      }
      if (!ok) continue;

      foot._legAngle = ang;
      return { x, y };
    }

    return { x: foot.x, y: foot.y };
  }

  function startLegStep(state, idx, target){
    const foot = state.nodes[idx];
    state.spider.stepping = {
      idx,
      startX: foot.x, startY: foot.y,
      endX: target.x, endY: target.y,
      t0: Date.now(),
      willPluck: true
    };
  }

  function spiderTick(state){
    if (!SPIDER.enabled) return;
    if (!state || !state.spider) return;
    if (!expanded) return;
    if (isTransitioning) return;
    if (!state.spider.ready) return;

    if (state.spider.dragging && state.spider.dragNode && !state.spider.dragNode.root){
      return;
    }

    const now = Date.now();
    const head = state.nodes[0];
    const s = state.spider;

    if (s.stepping){
      const st = s.stepping;
      const foot = state.nodes[st.idx];

      const t = clamp((now - st.t0) / SPIDER.stepDurationMs, 0, 1);
      const e = easeOutQuad(t);

      foot.x = st.startX + (st.endX - st.startX) * e;
      foot.y = st.startY + (st.endY - st.startY) * e;

      if (t >= 1){
        if (WEB_SNAP.enabled && st.willPluck){
          webPluck(foot.x, foot.y, WEB_SNAP.pluckStrength, WEB_SNAP.pluckRadius);
        }
        s.stepping = null;
        s.nextAllowedAt = now + SPIDER.stepCooldownMs;
      }
      return;
    }

    if (WEB_SNAP.enabled && WEB_SNAP.plantedVibeEnabled && now - s.lastPlantedBuzz >= WEB_SNAP.plantedIntervalMs) {
      s.lastPlantedBuzz = now;

      const plantedStrength = WEB_SNAP.pluckStrength * WEB_SNAP.plantedStrengthMul;
      const plantedRadius   = WEB_SNAP.pluckRadius   * WEB_SNAP.plantedRadiusMul;

      for (let i = 1; i < state.nodes.length; i++) {
        const f = state.nodes[i];
        if (!f || !f.foot) continue;
        webPluck(f.x, f.y, plantedStrength, plantedRadius);
      }
    }

    if (now < s.nextAllowedAt) return;

    const footIdxs = [];
    for (let i = 1; i < state.nodes.length; i++){
      const n = state.nodes[i];
      if (n && n.foot) footIdxs.push(i);
    }

    const feetN = footIdxs.length;
    if (feetN <= 0) return;

    let chosen = -1;
    let chosenMode = null;

    for (let k = 0; k < feetN; k++){
      const arrIdx = (s.nextFootIndex + k) % feetN;
      const idx = footIdxs[arrIdx];
      const foot = state.nodes[idx];

      const d = dist(head, foot);
      const ang = kneeAngleDegFromDist(d);
      const maxReach = (SPIDER.upperLen + SPIDER.lowerLen) - 6;

      // Knee/Reach are the real "bones". If they hit the limit, we FORCE a step.
      if (d >= maxReach || ang >= SPIDER.maxKneeAngleDeg){
        chosen = idx; chosenMode = "in"; s.nextFootIndex = arrIdx + 1; break;
      }

      if (d < SPIDER.minDist){ chosen = idx; chosenMode = "out"; s.nextFootIndex = arrIdx + 1; break; }
      if (d > SPIDER.maxDist){
        chosen = idx; chosenMode = "in"; s.nextFootIndex = arrIdx + 1; break;
      }
    }
    if (chosen < 0) return;
    const foot = state.nodes[chosen];
    const target = pickLegTarget(state, foot, chosenMode);
    startLegStep(state, chosen, target);
  }

  function getProjectsForCategory(category){
    const store = (window.PROJECTS && typeof window.PROJECTS === "object") ? window.PROJECTS : {};
    const categoryToPrefix = {
      "Animations": "animations-",
      "CG Art": "cgart-",
      "Graphic Design": "cgart-",
      "AA": "cgart-",
      "Narrative": "narrative-",
      "Game Design": "gamedesign-",
      "Projects": "projects-",
      "Architectural Design": "projects-",
      "Articles": "articles-",
      "UI/UX Design": "articles-",
      "UI/UX design": "articles-"
    };

    const prefix = categoryToPrefix[category] || "";
    const items = Object.keys(store)
      .map((id) => store[id])
      .filter((project) => {
        if (!project || typeof project !== "object") return false;

        const projectCategory = String(project.category || "").trim().toLowerCase();
        const wantedCategory = String(category || "").trim().toLowerCase();
        const projectId = String(project.id || "").trim().toLowerCase();

        return projectCategory === wantedCategory || (prefix && projectId.indexOf(prefix) === 0);
      })
      .sort((a, b) => String(a.id || "").localeCompare(String(b.id || "")));

    if (items.length) return items.slice(0, 5);

    return Array.from({ length: 5 }, (_, i) => ({
      id: prefix ? `${prefix}${String(i + 1).padStart(2, "0")}` : "",
      title: `${category} · Project 0${i + 1}`
    }));
  }

  function spawnGraph(category){
    clearGraph();

    const width  = window.innerWidth;
    const height = window.innerHeight;

    const forbidden = getForbiddenRect();
    const nodes = [];

    const projects = getProjectsForCategory(category);
    const childCount = projects.length || 5;

    let rootTarget;
    if (IS_MOBILE_STAGE) {
      rootTarget = {
        x: clamp(width * 0.5, 120, width - 120),
        y: clamp(height * 0.24, 120, Math.max(120, height * 0.34))
      };
    } else {
      rootTarget = constrainedRootPosition(width, height, forbidden);
    }

    nodes.push({
      name: category,
      root: true,
      targetX: rootTarget.x,
      targetY: rootTarget.y,
      x: 0, y: 0,
      _vseed: Math.random() * 1000
    });

    const legPairs = []; // { kneeIndex, footIndex }

    let mobileList = null;
    if (IS_MOBILE_STAGE) {
      rootTarget.y = clamp(rootTarget.y + 126, 220, Math.max(220, height * 0.50));
      const topGap = 112;
      const bottomGap = 110;
      const listStartY = rootTarget.y + topGap;
      const listEndY = Math.max(listStartY, height - bottomGap);
      const rawStep = childCount > 1 ? (listEndY - listStartY) / (childCount - 1) : 0;
      const stepY = clamp(rawStep || 64, 52, 76);
      const totalHeight = stepY * Math.max(0, childCount - 1);
      const centeredStartY = clamp(
        rootTarget.y + topGap,
        listStartY,
        Math.max(listStartY, listEndY - totalHeight)
      );

      mobileList = {
        leftFootX: clamp(34, 28, Math.max(28, width * 0.12)),
        rightFootX: clamp(width - 34, Math.min(width * 0.78, width - 72), width - 28),
        kneeX: clamp(width * 0.50, 140, Math.max(140, width * 0.62)),
        startY: centeredStartY,
        stepY
      };
    }

    for (let i = 0; i < childCount; i++) {
      const project = projects[i] || null;
      const pos = IS_MOBILE_STAGE
        ? {
            side: (i % 2 === 0) ? "left" : "right",
            x: (i % 2 === 0) ? mobileList.leftFootX : mobileList.rightFootX,
            y: mobileList.startY + (i * mobileList.stepY),
            kneeX: mobileList.kneeX,
            kneeY: mobileList.startY + (i * mobileList.stepY)
          }
        : randomSafePosition(width, height, forbidden, nodes, NODE_MIN_DISTANCE, SCREEN_MARGIN + NODE_STYLE.childRadius + 8);

      const kneeIndex = nodes.length;
      nodes.push({
        name: "",               // no label for knee
        knee: true,
        root: false,
        targetX: (IS_MOBILE_STAGE && typeof pos.kneeX === "number") ? pos.kneeX : pos.x,
        targetY: (IS_MOBILE_STAGE && typeof pos.kneeY === "number") ? pos.kneeY : pos.y,
        x: 0, y: 0,
        _vseed: Math.random() * 1000
      });

      const footIndex = nodes.length;
      nodes.push({
        name: (project && project.title) ? project.title : `${category} · Project 0${i + 1}`,
        projectId: (project && project.id) ? project.id : "",
        foot: true,
        root: false,
        mobileSide: (IS_MOBILE_STAGE && pos.side) ? pos.side : "left",
        targetX: pos.x,
        targetY: pos.y,
        x: 0, y: 0,
        _vseed: Math.random() * 1000
      });

      legPairs.push({ kneeIndex, footIndex });
    }

    const links = [];
    for (let i = 0; i < legPairs.length; i++) {
      links.push({ sourceIndex: 0, targetIndex: legPairs[i].kneeIndex }); // body -> knee
      links.push({ sourceIndex: legPairs[i].kneeIndex, targetIndex: legPairs[i].footIndex }); // knee -> foot
    }

    const svg = d3.select("#graph-container")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

      // Track mouse for label proximity (do not hijack global handlers)
      window.__mode3LabelMouseX = null;
      window.__mode3LabelMouseY = null;
      svg.on("mousemove", function(){
        const p = d3.mouse(this);
        window.__mode3LabelMouseX = p[0];
        window.__mode3LabelMouseY = p[1];
      });
      svg.on("mouseleave", function(){
        window.__mode3LabelMouseX = null;
        window.__mode3LabelMouseY = null;
      });

    const linkSel = svg.selectAll("line")
      .data(links)
      .enter().append("line")
      .style("display", d => {
        if (!IS_MOBILE_STAGE) return null;
        const targetNode = nodes[d.targetIndex];
        return targetNode && targetNode.foot ? "none" : null;
      })
      .style("stroke", IS_MOBILE_STAGE ? "rgba(255,255,255,0.24)" : NODE_STYLE.stroke)
      .style("stroke-width", IS_MOBILE_STAGE ? 1.0 : NODE_STYLE.strokeWidth)
      .style("opacity", 0);

// --- split root vs others (so only root becomes a rounded rect)
const rootData  = nodes.filter(d => d.root);
const otherData = nodes.filter(d => !d.root);

// ROOT as rounded rectangle (auto-sized to label)
const rootSel = svg.selectAll("rect.root-node")
  .data(rootData)
  .enter().append("rect")
  .attr("class", "root-node")
  .attr("rx", 14)
  .attr("ry", 14)
  .style("fill", NODE_STYLE.rootFill)
  .style("stroke", NODE_STYLE.stroke)
  .style("stroke-width", NODE_STYLE.strokeWidth)
  .style("cursor","pointer")
  .style("display", IS_MOBILE_STAGE ? "none" : null)
  .style("opacity", 0);

// Others remain circles (knee + foot)
const nodeSel = svg.selectAll("circle")
  .data(otherData)
  .enter().append("circle")
  .style("display", d => {
    if (!IS_MOBILE_STAGE) return null;
    return d.foot ? "none" : null;
  })
  .attr("r", d => {
    if (d.knee) return IS_MOBILE_STAGE ? 4.5 : 6;
    return IS_MOBILE_STAGE ? 0 : NODE_STYLE.childRadius;
  })
  .style("fill", d => {
    if (d.knee) return IS_MOBILE_STAGE ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.35)";
    return IS_MOBILE_STAGE ? "rgba(255,255,255,0)" : NODE_STYLE.childFill;
  })
  .style("stroke", d => {
    if (d.knee) return IS_MOBILE_STAGE ? "rgba(255,255,255,0.18)" : "none";
    return IS_MOBILE_STAGE ? "rgba(255,255,255,0)" : "none";
  })
  .style("stroke-width", d => {
    if (d.knee) return IS_MOBILE_STAGE ? 0.6 : 0;
    return IS_MOBILE_STAGE ? 0 : 0;
  })
  .style("filter", d => {
    if (!IS_MOBILE_STAGE || d.knee) return "none";
    return "none";
  })
  .style("cursor","pointer")
  .style("opacity", 0);

const mobileTapData = IS_MOBILE_STAGE ? otherData.filter(d => d && d.foot) : [];
const mobileTapSel = svg.selectAll("rect.mobile-tap-target")
  .data(mobileTapData)
  .enter().append("rect")
  .attr("class", "mobile-tap-target")
  .style("fill", "rgba(255,255,255,0)")
  .style("stroke", "none")
  .style("pointer-events", IS_MOBILE_STAGE ? "all" : "none")
  .style("cursor", IS_MOBILE_STAGE ? "pointer" : "default");

const labelSel = svg.selectAll("text")
      .data(nodes)
      .enter().append("text")
      .attr("class", d => d.root ? "node-label node-label-root" : "node-label node-label-child")
      .text(d => d.name)
      .style("fill", d => {
        if (d.root) return IS_MOBILE_STAGE ? "rgba(255,255,255,0.98)" : "#000";
        return IS_MOBILE_STAGE ? "rgba(255,255,255,0.88)" : "#fff";
      })
      .style("text-anchor", d => d.root ? "middle" : "start")
      .style("dominant-baseline", d => d.root ? "middle" : "auto")
      // Mobile uses invisible row-sized tap targets instead of text interactions.
      .style("pointer-events", d => {
        if (IS_MOBILE_STAGE) return "none";
        return d.root ? "none" : "all";
      })
      .style("cursor", d => {
        if (IS_MOBILE_STAGE) return "default";
        return d.root ? "default" : "pointer";
      })
      .style("font-size", d => {
        if (d.root) return IS_MOBILE_STAGE ? "18px" : NODE_STYLE.labelRootSize;
        return IS_MOBILE_STAGE ? "11.5px" : NODE_STYLE.labelChildSize;
      })
      .style("font-weight", d => {
        if (d.root) return "600";
        return IS_MOBILE_STAGE ? "500" : "400";
      })
      .style("letter-spacing", d => {
        if (!IS_MOBILE_STAGE) return "0em";
        return d.root ? "0em" : "0.005em";
      })
      .style("filter", d => {
        if (!IS_MOBILE_STAGE || d.root || d.knee) return "none";
        return "drop-shadow(0 0 6px rgba(255,255,255,0.08))";
      })
      .style("opacity", 0)
      .on("click", function(d){
        const e = (typeof d3 !== "undefined" && d3.event) ? d3.event : null;
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (!d || d.root || d.knee) return; // only project labels

        if (IS_MOBILE_STAGE) {
          return;
        }

        // Desktop: Stage 3 opens only when the label is "hot".
        const el = this;
        const isHot = el && el.classList && el.classList.contains("stage3-hot");
        if (!isHot) return;

        if (window.WorkStage3 && typeof window.WorkStage3.open === "function") {
          window.WorkStage3.open({
            title: d.name || "",
            projectId: d.projectId || ""
          });
        }
      });

// --- Stage 3 proximity hover (text only)
// Makes only the label text enlarge and become "hot" when the cursor gets close.
(function setupStage3Proximity(){
  // Stable "hot label" logic:
  // - uses simulation coordinates (d.x/d.y) instead of getBBox/CTM
  // - no transforms applied in JS (CSS handles scaling)
  if (!labelSel || labelSel.empty()) return;

  const THRESHOLD_PX = IS_MOBILE_STAGE ? 120 : 70;
  let hotEl = null;

  function clearHot(){
    if (hotEl) hotEl.classList.remove("stage3-hot");
    hotEl = null;
  }

  function setHot(el){
    if (hotEl === el) return;
    clearHot();
    hotEl = el;
    if (hotEl) hotEl.classList.add("stage3-hot");
  }

  function onMove(){
    const e = (typeof d3 !== "undefined") ? d3.event : null;
    if (!e) return;

    // Mouse position in SVG coordinates
    const m = d3.mouse(svg.node());
    const mx = m[0], my = m[1];

    let bestEl = null;
    let bestD2 = Infinity;

    labelSel.each(function(d){
      if (!d || d.root || d.knee) return;

      // Label anchor point is where we draw it in tick:
      // x = d.x + 16, y = d.y - 10 (plus small vibe offsets in tick).
      // We intentionally ignore vibe here to keep "hot" stable.
      const lx = (d.x || 0) + 16;
      const ly = (d.y || 0) - 10;

      const dx = lx - mx;
      const dy = ly - my;
      const d2 = dx*dx + dy*dy;

      if (d2 < bestD2) { bestD2 = d2; bestEl = this; }
    });

    if (bestEl && bestD2 <= (THRESHOLD_PX * THRESHOLD_PX)) setHot(bestEl);
    else clearHot();
  }

  if (!IS_MOBILE_STAGE) {
    svg.on("mousemove.stage3", onMove);
    svg.on("mouseleave.stage3", clearHot);
  }
})();

    // --- compute root rect size to fit label (once)
    rootData.forEach(r => {
      const fontPx = parseFloat(NODE_STYLE.labelRootSize) || 14;
      const padX = 18;
      const padY = 10;
      const textW = measureTextPx(r.name || "", fontPx, 600);
      r._boxW = Math.ceil(textW + padX * 2);
      r._boxH = Math.ceil(fontPx + padY * 2);
      r._boxWg = r._boxW;
      r._boxHg = r._boxH;
    });

    nodeSel.style("pointer-events", d => {
      if (IS_MOBILE_STAGE) return d.knee ? "none" : "none";
      return d.knee ? "none" : "all";
    });
    rootSel.style("pointer-events", IS_MOBILE_STAGE ? "none" : "all");
    linkSel.style("pointer-events", "none");
    labelSel.style("pointer-events", d => {
      if (IS_MOBILE_STAGE) return "none";
      return (d && d.root) ? "none" : "all";
    });

    function render() {
      if (graphState && !IS_MOBILE_STAGE) spiderTick(graphState);

      // Cinematic: root (main body) glow + gentle web response near strands
      if (graphState && ROOT_GLOW.enabled && window.spiderweb && typeof window.spiderweb.getClosestPoint === "function") {
        const root = graphState.nodes && graphState.nodes[0];
        if (root) {
          const hit = window.spiderweb.getClosestPoint(root.x, root.y);
          if (hit) {
            const r = ROOT_GLOW.radius;
            const r2 = r * r;
            const g = (hit.d2 < r2) ? (1 - (Math.sqrt(hit.d2) / r)) : 0;
            graphState._rootGlow = g;

            if (ROOT_GLOW.pluckEnabled && g > 0) {
              const now = Date.now();
              if (!graphState._rootGlowLastPluck || (now - graphState._rootGlowLastPluck) >= ROOT_GLOW.pluckThrottleMs) {
                graphState._rootGlowLastPluck = now;
                webPluck(hit.x, hit.y, ROOT_GLOW.pluckStrength * g, ROOT_GLOW.pluckRadius);
              }
            }
          } else {
            graphState._rootGlow = 0;
          }
        }
      }

      if (graphState && !IS_MOBILE_STAGE) enforceNodeSeparation(graphState);

      if (graphState && SPIDER.constraintsEnabled) enforceLegConstraints(graphState);

      // Prevent impossible leg extension (keeps knees from collapsing into a straight line)
      if (graphState) {
        for (let i = 1; i < graphState.nodes.length; i++){
          const n = graphState.nodes[i];
          if (n && n.foot) clampFootToMaxReach(graphState, n);
        }
      }

      if (graphState && graphState.legPairs) {
        const body = graphState.nodes[0];
        for (let i = 0; i < graphState.legPairs.length; i++) {
          const kp = graphState.legPairs[i];
          const knee = graphState.nodes[kp.kneeIndex];
          const foot = graphState.nodes[kp.footIndex];
          if (!knee || !foot) continue;
          if (IS_MOBILE_STAGE) {
            knee.x = knee.targetX;
            knee.y = knee.targetY;
            foot.x = foot.targetX;
            foot.y = foot.targetY;
            continue;
          }
          if (typeof foot._bendSide !== "number") {
            foot._bendSide = (i % 2 === 0) ? 1 : -1;
          }
          const kpos = solveKneePos(body, foot, foot._bendSide);
          knee.x = kpos.x;
          knee.y = kpos.y;
        }
      }

      const t = Date.now() * VIBE.freq;

      linkSel
        .attr("x1", d => {
          const n = nodes[d.sourceIndex];
          const o = vibeOffset(n, t);
          return n.x + o.ox;
        })
        .attr("y1", d => {
          const n = nodes[d.sourceIndex];
          const o = vibeOffset(n, t);
          return n.y + o.oy;
        })
        .attr("x2", d => {
          const n = nodes[d.targetIndex];
          const o = vibeOffset(n, t);
          return n.x + o.ox;
        })
        .attr("y2", d => {
          const n = nodes[d.targetIndex];
          const o = vibeOffset(n, t);
          return n.y + o.oy;
        });

      nodeSel
        .attr("cx", d => {
          const o = vibeOffset(d, t);
          return d.x + o.ox;
        })
        .attr("cy", d => {
          const o = vibeOffset(d, t);
          return d.y + o.oy;
        });

      if (IS_MOBILE_STAGE) {
        mobileTapSel
          .attr("x", d => {
            const o = vibeOffset(d, t);
            const baseX = d.x + o.ox;
            return (d.mobileSide === "right") ? Math.max(0, baseX - 146) : Math.max(0, baseX - 8);
          })
          .attr("y", d => {
            const o = vibeOffset(d, t);
            return (d.y + o.oy) - 26;
          })
          .attr("width", d => {
            return (d.mobileSide === "right") ? 156 : 196;
          })
          .attr("height", 52);
      }

      // position ROOT rect (centered)
      rootSel
        .attr("x", d => {
          const o = vibeOffset(d, t);
          return (d.x + o.ox) - (d._boxWg * 0.5);
        })
        .attr("y", d => {
          const o = vibeOffset(d, t);
          return (d.y + o.oy) - (d._boxHg * 0.5);
        })
        .attr("width",  d => d._boxWg)
        .attr("height", d => d._boxHg);

      // Apply root glow styling (only the main body)
      if (graphState && ROOT_GLOW.enabled) {
        const g = Math.max(0, Math.min(1, graphState._rootGlow || 0));

        // tiny inflate so glow feels "alive" but doesn't mess layout
        const k = 1 + 0.03 * g;
        rootData.forEach(r => {
          r._boxWg = Math.ceil(r._boxW * k);
          r._boxHg = Math.ceil(r._boxH * k);
        });

        rootSel
          .style("stroke", `rgba(255,255,255,${0.35 + 0.45 * g})`)
          .style("filter", g > 0
            ? `drop-shadow(0 0 ${6 + ROOT_GLOW.maxBlurPx * g}px rgba(255,255,255,${0.15 + ROOT_GLOW.maxAlpha * g}))`
            : "none"
          );
      }


      labelSel
        .attr("x", d => {
          const o = vibeOffset(d, t);
          if (d.root) return d.x + o.ox;
          if (d.knee) return d.x + o.ox;
          if (IS_MOBILE_STAGE) {
            return d.x + o.ox + ((d.mobileSide === "right") ? -18 : 18);
          }
          return d.x + o.ox + 16;
        })
        .attr("y", d => {
          const o = vibeOffset(d, t);
          if (d.root) return d.y + o.oy - (IS_MOBILE_STAGE ? 58 : 0);
          if (d.knee) return d.y + o.oy;
          return d.y + o.oy + (IS_MOBILE_STAGE ? 1 : -10);
        })
        .style("text-anchor", d => {
          if (d.root) return "middle";
          if (IS_MOBILE_STAGE) return (d.mobileSide === "right") ? "end" : "start";
          return "start";
        })
        .style("dominant-baseline", d => {
          if (d.root) return "middle";
          return IS_MOBILE_STAGE ? "middle" : "auto";
        });
    }

    const entry = bottomEdgePoint(width, height, 120);
    nodes.forEach((n) => {
      n.x = entry.x + (Math.random() - 0.5) * 40;
      n.y = entry.y + (Math.random() - 0.5) * 40;
    });
    render();

    const drag = d3.behavior.drag()
      .on("dragstart", function(d) {
        d3.event.sourceEvent.stopPropagation();
        if (graphState && graphState.spider){
          graphState.spider.dragging = true;
          graphState.spider.dragNode = d;
        }
      })
      .on("drag", function(d) {
        d.x += d3.event.dx;
        d.y += d3.event.dy;

        d.x = Math.max(SCREEN_MARGIN, Math.min(width  - SCREEN_MARGIN, d.x));
        d.y = Math.max(SCREEN_MARGIN, Math.min(height - SCREEN_MARGIN, d.y));

        const forbiddenNow = getForbiddenRect();
        if (d.x > forbiddenNow.left && d.x < forbiddenNow.right &&
            d.y > forbiddenNow.top  && d.y < forbiddenNow.bottom) {
          const dx = d.x - forbiddenNow.centerX;
          const dy = d.y - forbiddenNow.centerY;
          const dist0 = Math.sqrt(dx*dx + dy*dy) || 1;
          const push = STACK_REPEL_MARGIN + 10;

          d.x = forbiddenNow.centerX + (dx / dist0) *
            (Math.max(forbiddenNow.right - forbiddenNow.left, forbiddenNow.bottom - forbiddenNow.top) / 2 + push);

          d.y = forbiddenNow.centerY + (dy / dist0) *
            (Math.max(forbiddenNow.right - forbiddenNow.left, forbiddenNow.bottom - forbiddenNow.top) / 2 + push);
        }

        if (WEB_SNAP.pluckWhileDragging){
          const now = Date.now();
          if (now - lastDragPluck > WEB_SNAP.dragPluckThrottleMs) {
            lastDragPluck = now;
            webPluck(d.x, d.y, WEB_SNAP.dragPluckStrength, WEB_SNAP.dragPluckRadius);
          }
        }

        // Hard clamp leg reach during drag (keeps it spider-like, not elastic)
        if (graphState && d && d.foot) clampFootToMaxReach(graphState, d);

        if (graphState && graphState.spider && !d.root){
          const head = nodes[0];
          d._legAngle = Math.atan2(d.y - head.y, d.x - head.x);
          if (graphState.spider.stepping && graphState.spider.stepping.idx === nodes.indexOf(d)){
            graphState.spider.stepping = null;
          }
        }

        render();
      })
      .on("dragend", function(d){
        // Plant feet: snap ONCE to the strand point (midpoint if available) so it doesn't "surf".
        if (graphState && d && d.foot){
          const snapped = webSnapOrNull(d.x, d.y);
          if (snapped){
            d.x = snapped.x;
            d.y = snapped.y;
            // small pluck on plant gives a satisfying "grab" feel
            webPluck(d.x, d.y, WEB_SNAP.pluckStrength * 0.22, WEB_SNAP.pluckRadius * 0.55);
          }
        }

        if (graphState && graphState.spider){
          graphState.spider.dragging = false;
          graphState.spider.dragNode = null;
          graphState.spider.nextAllowedAt = Date.now() + 60;
        }
      });

    nodeSel.call(drag);
    rootSel.call(drag);

    if (IS_MOBILE_STAGE) {
      mobileTapSel
        .on("click", function(d){
          const e = (typeof d3 !== "undefined" && d3.event) ? d3.event : null;
          if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          if (e && typeof e.preventDefault === "function") e.preventDefault();
          if (!d || !d.foot) return;
          if (window.WorkStage3 && typeof window.WorkStage3.open === "function") {
            window.WorkStage3.open({
              title: d.name || "",
              projectId: d.projectId || ""
            });
          }
        })
        .on("touchstart", function(d){
          const e = (typeof d3 !== "undefined" && d3.event) ? d3.event : null;
          if (e && typeof e.stopPropagation === "function") e.stopPropagation();
          if (e && typeof e.preventDefault === "function") e.preventDefault();
          if (!d || !d.foot) return;
          if (window.WorkStage3 && typeof window.WorkStage3.open === "function") {
            window.WorkStage3.open({
              title: d.name || "",
              projectId: d.projectId || ""
            });
          }
        });
    }

    graphState = {
      svg,
      nodes,
      links,
      legPairs,
      nodeSel,
      rootSel,
      labelSel,
      linkSel,
      mobileTapSel,
      render,
      _vibeStop: false,
      _timeouts: []
    };

    initSpiderState(graphState);
    startVibeLoop(graphState);
    spiderEntrance(graphState);
  }

  function spiderEntrance(state) {
    const { nodeSel, rootSel, labelSel, linkSel, render } = state;

    nodeSel.interrupt();
    rootSel.interrupt();
    labelSel.interrupt();
    linkSel.interrupt();

    rootSel.transition()
      .delay(0)
      .duration(700)
      .tween("position", function(d) {
        const ix = d3.interpolate(d.x, d.targetX);
        const iy = d3.interpolate(d.y, d.targetY);
        return function(t) {
          d.x = ix(t);
          d.y = iy(t);
          render();
        };
      })
      .style("opacity", 1);

    nodeSel.transition()
      .delay((d, i) => d.root ? 0 : 250 + i * 120)
      .duration(700)
      .tween("position", function(d) {
        const ix = d3.interpolate(d.x, d.targetX);
        const iy = d3.interpolate(d.y, d.targetY);
        return function(t) {
          d.x = ix(t);
          d.y = iy(t);
          render();
        };
      })
      .style("opacity", 1);

    labelSel.transition()
      .delay((d, i) => d.root ? 350 : 450 + i * 120)
      .duration(400)
      .style("opacity", 1)
      .each("end", render);

    linkSel.transition()
      .delay((d, i) => 320 + i * 110)
      .duration(380)
      .style("opacity", 1)
      .each("end", render);
  }

  function animateGraphExit(onDone){
    if (!graphState) {
      if (typeof onDone === "function") onDone();
      return;
    }

    isTransitioning = true;

    const { nodes, nodeSel, rootSel, labelSel, linkSel, render } = graphState;

    nodeSel.interrupt();
    rootSel.interrupt();
    labelSel.interrupt();
    linkSel.interrupt();
    const width  = window.innerWidth;
    const height = window.innerHeight;

    const exitEdge   = bottomEdgePoint(width, height, 0);
    const exitCenter = { x: exitEdge.x, y: exitEdge.y };
    const exitOuter  = bottomEdgePoint(width, height, 160);

    if (graphState.spider) graphState.spider.ready = false;

    rootSel.transition()
      .delay(0)
      .duration(450)
      .tween("position", function(d) {
        const ix = d3.interpolate(d.x, exitCenter.x);
        const iy = d3.interpolate(d.y, exitCenter.y);
        return function(t) {
          d.x = ix(t);
          d.y = iy(t);
          render();
        };
      });

    rootSel.transition()
      .delay(450)
      .duration(420)
      .tween("position", function(d) {
        const ix = d3.interpolate(exitCenter.x, exitOuter.x);
        const iy = d3.interpolate(exitCenter.y, exitOuter.y);
        return function(t) {
          d.x = ix(t);
          d.y = iy(t);
          render();
        };
      })
      .style("opacity", 0);

    nodeSel.transition()
      .delay((d, i) => i * 80)
      .duration(450)
      .tween("position", function(d) {
        const ix = d3.interpolate(d.x, exitCenter.x);
        const iy = d3.interpolate(d.y, exitCenter.y);
        return function(t) {
          d.x = ix(t);
          d.y = iy(t);
          render();
        };
      });

    nodeSel.transition()
      .delay((d, i) => 450 + i * 60)
      .duration(420)
      .tween("position", function(d) {
        const ix = d3.interpolate(exitCenter.x, exitOuter.x);
        const iy = d3.interpolate(exitCenter.y, exitOuter.y);
        return function(t) {
          d.x = ix(t);
          d.y = iy(t);
          render();
        };
      })
      .style("opacity", 0);

    labelSel.transition()
      .delay((d, i) => 380 + i * 60)
      .duration(350)
      .style("opacity", 0);

    linkSel.transition()
      .delay((d, i) => 360 + i * 60)
      .duration(350)
      .style("opacity", 0);

    const totalDuration = 450 + (nodes.length - 1) * 80 + 420 + 150;

    const _t = setTimeout(() => {
      clearGraph();
      isTransitioning = false;
      if (typeof onDone === "function") onDone();
    }, totalDuration);
    if (graphState && graphState._timeouts) graphState._timeouts.push(_t);
  }

  function clearGraph(){
    if (graphState) {
      graphState._vibeStop = true;
      graphState._vibeTimerStarted = false;

      if (graphState._timeouts && graphState._timeouts.length) {
        for (let i = 0; i < graphState._timeouts.length; i++) {
          clearTimeout(graphState._timeouts[i]);
        }
        graphState._timeouts.length = 0;
      }

      if (graphState.nodeSel) graphState.nodeSel.interrupt();
      if (graphState.rootSel) graphState.rootSel.interrupt();
      if (graphState.labelSel) graphState.labelSel.interrupt();
      if (graphState.linkSel) graphState.linkSel.interrupt();

      if (graphState.svg) graphState.svg.remove();
    }
    graphState = null;
  }

  window.addEventListener("resize", () => {
    if (!expanded) startFireflies();
  });

  });
});
