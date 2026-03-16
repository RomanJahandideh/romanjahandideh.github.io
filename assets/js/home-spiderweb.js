// ===============================
//  HOME CANVAS SPIDER WEB (Work Page Style)
//  - Same interaction + highlight smoothing as Work page
//  - Full-screen web, not triangle-ring web
//  - Center follows a target (HOME composition), fallback to screen center
//  - UPDATED: center hole breath is MUCH stronger + larger radius influence
//    Handlers in CSS :root:
//      --web-hole-base
//      --web-hole-breathe-amp
//      --web-hole-breathe-speed
//      --web-hole-breathe-smooth
//      --web-hole-min-scale
//      --web-hole-max-scale
//      --web-hole-influence
//      --web-hole-influence-strength
// ===============================

window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("home-spiderweb-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  const WEB = {
    spokes: 18,
    rings: 9,
    ringJitter: 0.08,
    angularJitter: 0.07,

    lineWidth: 1.15,

    // Gradient: center -> edges
    centerAlpha: 0.32,
    edgeAlpha: 0.05,
    highlightBoost: 0.55,

    glowStrength: 0.0,

    // physics
    spring: 0.026,
    damping: 0.92,
    neighborSpring: 0.16,

    // wind interaction (Work feel)
    windRadius: 200,
    windStrength: 1.50,
    windVelocityFactor: 0.085,

    // hole / clear zone at center (BASE; overridden by CSS handler)
    centerClearRadius: 230,
    centerTensionBoost: 0.008,

    // follow element (HOME)
    followSelector: ".hero",
    followSelectorWork: "#card-stack",
    followLerp: 0.14,
    followFallbackToScreenCenter: true,

    // intro disabled on HOME (so nothing weird “draws in”)
    introEnabled: false,
    introDelayMs: 120,
    introDurationMs: 1700,
    cardsRevealAt: 0.85,

    // pluck (kept for API compatibility)
    pluckVelocityGain: 3.5,
    pluckDisturbGain:  1.4,

    // anti-flicker highlight (Work page magic)
    highlightSmoothing: 0.10,
    highlightDecay: 0.965,

    breatheEnabled: true
  };

  let W = 0, H = 0, DPR = 1;
  let mouse = { x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, active: false };

  let points = [];
  let links = [];

  let center = { x: 0, y: 0 };
  let centerTarget = { x: 0, y: 0 };

  let rafId = null;

  // ===== breathing state =====
  const root = document.documentElement;

  let baseClearR = WEB.centerClearRadius;
  let clearR = baseClearR;            // current radius (smoothed)
  let clearRTarget = baseClearR;      // target radius (sin wave)
  let lastT = performance.now();
  let phase = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function cssNum(name, fallback) {
    const raw = getComputedStyle(root).getPropertyValue(name).trim();
    if (!raw) return fallback;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  function getFollowCenter() {
    const mode = String(document.body.dataset.mode || "home").toLowerCase();
    const sel = (mode === "work") ? WEB.followSelectorWork : WEB.followSelector;
    const el = document.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    if (WEB.followFallbackToScreenCenter) return { x: W / 2, y: H / 2 };
    return { x: centerTarget.x, y: centerTarget.y };
  }

  function computeMaxR(cx, cy) {
    const d1 = Math.hypot(cx - 0, cy - 0);
    const d2 = Math.hypot(cx - W, cy - 0);
    const d3 = Math.hypot(cx - 0, cy - H);
    const d4 = Math.hypot(cx - W, cy - H);
    return Math.max(d1, d2, d3, d4) * 0.98;
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    const c = getFollowCenter();
    center.x = centerTarget.x = c.x;
    center.y = centerTarget.y = c.y;

    // Base radius from handler (stronger default if missing)
    baseClearR = cssNum("--web-hole-base", WEB.centerClearRadius);

    clearR = baseClearR;
    clearRTarget = baseClearR;

    buildWeb();
  }

  function makePoint(x, y, rrFromCenter) {
    return {
      x, y,
      ox: x, oy: y,
      vx: 0, vy: 0,
      tension: WEB.spring + (rrFromCenter < WEB.centerClearRadius + 140 ? WEB.centerTensionBoost : 0),

      disturbed: 0,
      disturbedVis: 0
    };
  }

  function link(a, b, kind) {
    links.push({ a, b, kind, revealKey: 0 });
  }

  function buildWeb() {
    points = [];
    links = [];

    const cx = center.x;
    const cy = center.y;
    const maxR = computeMaxR(cx, cy);

    // stable build geometry uses baseClearR
    const holeR = baseClearR;

    for (let r = 0; r <= WEB.rings; r++) {
      const t = r / WEB.rings;
      const eased = t * t;
      const baseR = holeR + eased * (maxR - holeR);

      const ring = [];
      for (let s = 0; s < WEB.spokes; s++) {
        const aBase = (s / WEB.spokes) * Math.PI * 2;
        const a = aBase + (Math.sin(s * 12.989 + r * 78.233) * WEB.angularJitter);
        const rr = baseR * (1 + (Math.sin(r * 3.17 + s * 1.91) * WEB.ringJitter));

        let x = cx + Math.cos(a) * rr;
        let y = cy + Math.sin(a) * rr;

        // hole clamp at build time (base radius)
        const dx = x - cx, dy = y - cy;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < holeR) {
          const k = holeR / dist;
          x = cx + dx * k;
          y = cy + dy * k;
        }

        ring.push(makePoint(x, y, rr));
      }
      points.push(ring);
    }

    // spokes
    for (let r = 0; r < WEB.rings; r++) {
      for (let s = 0; s < WEB.spokes; s++) {
        link(points[r][s], points[r + 1][s], "spoke");
      }
    }

    // rings
    for (let r = 0; r <= WEB.rings; r++) {
      for (let s = 0; s < WEB.spokes; s++) {
        link(points[r][s], points[r][(s + 1) % WEB.spokes], "ring");
      }
    }
  }

  window.addEventListener("mousemove", (e) => {
    mouse.active = true;
    mouse.px = mouse.x; mouse.py = mouse.y;
    mouse.x = e.clientX; mouse.y = e.clientY;
    mouse.vx = mouse.x - mouse.px;
    mouse.vy = mouse.y - mouse.py;
  });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
  });

  function alphaForSegment(ax, ay, bx, by) {
    const cx = center.x, cy = center.y;
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const dist = Math.hypot(mx - cx, my - cy);
    const maxR = computeMaxR(cx, cy);
    const t = clamp(dist / maxR, 0, 1);
    return WEB.centerAlpha + (WEB.edgeAlpha - WEB.centerAlpha) * t;
  }

  function updateCenterFollow() {
    const c = getFollowCenter();
    centerTarget.x = c.x;
    centerTarget.y = c.y;

    const oldX = center.x, oldY = center.y;

    center.x += (centerTarget.x - center.x) * WEB.followLerp;
    center.y += (centerTarget.y - center.y) * WEB.followLerp;

    const dx = center.x - oldX;
    const dy = center.y - oldY;

    if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
      for (let r = 0; r < points.length; r++) {
        for (let s = 0; s < points[r].length; s++) {
          const p = points[r][s];
          p.x += dx; p.y += dy;
          p.ox += dx; p.oy += dy;
        }
      }
    }
  }

  // -------------------------------
  // PUBLIC API (for WORK Stage 2/3)
  // Exposes the same API as the old Work spiderweb.js:
  //   window.spiderweb.getClosestPoint(px,py)
  //   window.spiderweb.disturbAt(px,py,strength,radius)
  // -------------------------------
  function closestPointOnSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax, aby = by - ay;
    const apx = px - ax, apy = py - ay;
    const ab2 = abx * abx + aby * aby || 0.000001;
    let t = (apx * abx + apy * aby) / ab2;
    t = clamp(t, 0, 1);
    return { x: ax + abx * t, y: ay + aby * t, t };
  }

  function getClosestWebPoint(px, py) {
    let best = null;
    let bestD2 = Infinity;

    for (let i = 0; i < links.length; i++) {
      const L = links[i];
      const a = L.a, b = L.b;
      const cp = closestPointOnSegment(px, py, a.x, a.y, b.x, b.y);
      const dx = px - cp.x, dy = py - cp.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestD2) {
        bestD2 = d2;
        best = { x: cp.x, y: cp.y, d2, kind: L.kind, a, b };
      }
    }
    return best;
  }

  function disturbAt(px, py, strength, radius) {
    strength = (strength == null) ? 0.8 : strength;
    radius = (radius == null) ? 120 : radius;

    const R2 = radius * radius;

    for (let r = 0; r < points.length; r++) {
      for (let s = 0; s < points[r].length; s++) {
        const p = points[r][s];

        // ignore inside (breathing) hole
        const dr = Math.hypot(p.ox - center.x, p.oy - center.y);
        if (dr < clearR) continue;

        const dx = p.x - px;
        const dy = p.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 > R2) continue;

        const d = Math.sqrt(d2) || 0.0001;
        const falloff = 1 - (d / radius);

        const fx = (dx / d) * falloff * strength;
        const fy = (dy / d) * falloff * strength;

        p.vx += fx * 0.9 * WEB.pluckVelocityGain;
        p.vy += fy * 0.9 * WEB.pluckVelocityGain;

        p.disturbed = Math.min(1, p.disturbed + falloff * 0.9 * WEB.pluckDisturbGain);
      }
    }
  }

  window.spiderweb = window.spiderweb || {};
  window.spiderweb.getClosestPoint = getClosestWebPoint;
  window.spiderweb.disturbAt = disturbAt;

  function stepBreathing() {
    if (!WEB.breatheEnabled) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // If the mode changed, --web-hole-base might change too. Smoothly chase it.
    const desiredBase = cssNum("--web-hole-base", WEB.centerClearRadius);
    baseClearR += (desiredBase - baseClearR) * 0.08;

    // ===== STRONG DEFAULTS (if CSS handlers missing) =====
    const amp = cssNum("--web-hole-breathe-amp", 0.14);
    const speed = cssNum("--web-hole-breathe-speed", 0.20);
    const smooth = clamp(cssNum("--web-hole-breathe-smooth", 0.10), 0.01, 0.40);

    const minScale = cssNum("--web-hole-min-scale", 0.78);
    const maxScale = cssNum("--web-hole-max-scale", 1.42);

    phase += dt * speed * Math.PI * 2;

    const scale = clamp(1 + Math.sin(phase) * amp, minScale, maxScale);
    clearRTarget = baseClearR * scale;

    clearR += (clearRTarget - clearR) * smooth;
  }

  function step() {
    updateCenterFollow();
    stepBreathing();

    const cx = center.x;
    const cy = center.y;

    // ===== STRONG DEFAULTS for influence (if CSS handlers missing) =====
    const influenceBand = Math.max(0, cssNum("--web-hole-influence", 620));
    const influenceStrength = clamp(cssNum("--web-hole-influence-strength", 0.28), 0, 0.60);

    // wind
    if (mouse.active) {
      const speed = Math.hypot(mouse.vx, mouse.vy);
      const velBoost = 1 + speed * WEB.windVelocityFactor;
      const R2 = WEB.windRadius * WEB.windRadius;

      for (let r = 0; r < points.length; r++) {
        for (let s = 0; s < points[r].length; s++) {
          const p = points[r][s];

          const dr = Math.hypot(p.ox - cx, p.oy - cy);
          if (dr < clearR) continue;

          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;

          if (d2 < R2) {
            const d = Math.sqrt(d2) || 0.0001;
            const falloff = 1 - (d / WEB.windRadius);

            const pushX = (mouse.vx * 0.8 - dx * 0.02);
            const pushY = (mouse.vy * 0.8 - dy * 0.02);

            const f = falloff * WEB.windStrength * velBoost;

            p.vx += pushX * f * 0.02;
            p.vy += pushY * f * 0.02;

            p.disturbed = Math.min(1, p.disturbed + falloff * 0.20);
          }
        }
      }
    }

    // neighbor coupling (unchanged)
    for (let i = 0; i < links.length; i++) {
      const { a, b } = links[i];

      const dx = b.x - a.x;
      const dy = b.y - a.y;

      const odx = b.ox - a.ox;
      const ody = b.oy - a.oy;
      const targetLen = Math.hypot(odx, ody) || 0.0001;

      const len = Math.hypot(dx, dy) || 0.0001;
      const diff = (len - targetLen) / len;

      const k = WEB.neighborSpring;
      const fx = dx * diff * k;
      const fy = dy * diff * k;

      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    // integrate + decay + smooth highlight
    for (let r = 0; r < points.length; r++) {
      for (let s = 0; s < points[r].length; s++) {
        const p = points[r][s];

        p.vx += (p.ox - p.x) * p.tension;
        p.vy += (p.oy - p.y) * p.tension;

        p.vx *= WEB.damping;
        p.vy *= WEB.damping;

        p.x += p.vx;
        p.y += p.vy;

        // ===== STRONGER + WIDER breathing influence band =====
        if (influenceBand > 0 && influenceStrength > 0) {
          const dx = p.x - cx, dy = p.y - cy;
          const dist = Math.hypot(dx, dy) || 1;

          if (dist > clearR && dist < clearR + influenceBand) {
            const t = 1 - (dist - clearR) / influenceBand; // 1 near edge, 0 at end
            const ux = dx / dist, uy = dy / dist;

            const breathingDir = (clearRTarget - clearR);

            p.vx += ux * breathingDir * t * influenceStrength;
            p.vy += uy * breathingDir * t * influenceStrength;

            p.disturbed = Math.min(1, p.disturbed + t * 0.16);
          }
        }

        // breathing hole clamp
        const dx2 = p.x - cx, dy2 = p.y - cy;
        const dist2 = Math.hypot(dx2, dy2) || 1;
        if (dist2 < clearR) {
          const k = clearR / dist2;
          p.x = cx + dx2 * k;
          p.y = cy + dy2 * k;
          p.vx *= 0.78;
          p.vy *= 0.78;
        }

        p.disturbed *= 0.90;

        p.disturbedVis *= WEB.highlightDecay;
        p.disturbedVis += (p.disturbed - p.disturbedVis) * WEB.highlightSmoothing;
        p.disturbedVis = clamp(p.disturbedVis, 0, 1);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.shadowBlur = 0;
    ctx.lineWidth = WEB.lineWidth;
    ctx.lineCap = "round";

    for (let i = 0; i < links.length; i++) {
      const L = links[i];
      const a = L.a, b = L.b;

      let alpha = alphaForSegment(a.x, a.y, b.x, b.y);
      if (L.kind === "ring") alpha *= 0.92;

      const hi = Math.max(a.disturbedVis, b.disturbedVis);
      alpha = alpha + hi * WEB.highlightBoost;
      alpha = clamp(alpha, 0, 1);

      const base = 0.55;
      const boosted = clamp(base + hi * 0.45, 0, 1);
      const outA = alpha * boosted;

      ctx.strokeStyle = `rgba(255,255,255,${outA})`;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function loop() {
    step();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  // boot
  resize();
  window.addEventListener("resize", resize);

  if (rafId) cancelAnimationFrame(rafId);
  loop();
});