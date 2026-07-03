/* =========================================================
   SERVICES — Firefly Balls Interaction
   Click Services → name+btn shift up, divider + 4 physics balls appear.
   Balls float and respond to mouse exactly like the Work section.
   Click a ball → scene shifts up, description slides in below.
   Click outside / nav link / Escape → close everything.
   ========================================================= */
(function () {
  "use strict";

  var SERVICES = [
    {
      idx: 0,
      category: "Graphic Design",
      desc: "Brands need a visual identity that stays consistent everywhere it appears, from a single social post to a full campaign. I build complete graphic systems — logo, typography, color, layout, iconography — and ready-to-publish marketing assets that hold together across print and digital.",
      viewWork: true
    },
    {
      idx: 1,
      category: "Animation",
      desc: "Audiences scroll fast, so a brand has only seconds to land its message. I create advertisement videos and motion graphics from concept to final cut — blending 3D animation, editing, and visual storytelling into content that holds attention and moves people to act.",
      viewWork: true
    },
    {
      idx: 2,
      category: "Web Design",
      desc: "A brand often meets its audience first through its website. I design clean, on-brand web experiences built around clear visual hierarchy and an intuitive journey, so visitors understand the brand quickly and act with confidence.",
      viewWork: true
    },
    {
      idx: 3,
      category: "",
      desc: "Marketing teams are pushed to produce more in less time. I bring AI into the creative pipeline — generating and refining visual assets, building prompt-driven workflows, and automating repetitive design tasks — so campaigns ship faster without sacrificing quality.",
      viewWork: false
    }
  ];

  /* ── State ── */
  var _state = "closed"; /* "closed" | "open" | "detail" */
  var _activeIdx = -1;
  var _savedStep = 0;   /* seq scroll step that was active when Services was opened */
  var _reducedMotion = false;
  var _btnOpenTween = null; /* reference to the "slide to bottom" tween — kill only this, not the scroll-sequence's timeline tween */

  /* ── DOM refs ── */
  var _btn, _divider, _ballsWrap, _balls, _heroName, _heroRole, _heroDesignerTitle, _hero;
  var _desc, _descText, _viewWorkLink;

  /* ═══════════════════════════════════════════════════════
     PHYSICS — adapted from work-d3-interaction.js FIREFLIES
     Identical feel to Work section; smaller cage radius so
     balls stay below the Services button.
  ═══════════════════════════════════════════════════════ */

  var SVC_PHYS = {
    cageRadius:       190,
    wallBounce:       0.25,
    gravity:          0.065,
    airDrag:          0.985,
    maxSpeed:         4.5,
    collisionPadding: 8,
    separationPasses: 6,
    restitution:      0.12,
    influenceRadius:  1800,
    tiltStrength:     0.22,
    shakeFromVelocity: 1.60,
    shakeFromAccel:   3.20,
    impulseClamp:     0.55,
    idleWander:       0.004,
    hoverScale:       1.6,
    otherScaleWhenHover: 0.82,
    freezeOnHover:    true,
    fadeMs:           850,
    staggerMs:        160
  };

  var SVC_BREATH = {
    minScale:   0.93,
    maxScale:   1.06,
    speed:      0.00135,
    flickerAmp: 0.035
  };

  /* Physics runtime */
  var _ff    = [];       /* array of firefly objects */
  var _ffRAF = null;
  var _ffRunning  = false;
  var _ffEntry    = false;
  var _ffEntryT0  = 0;

  var _mouse = {
    x: 0, y: 0, px: 0, py: 0,
    vx: 0, vy: 0, ax: 0, ay: 0,
    t: performance.now()
  };

  /* ── Mouse tracker (registered once in init) ── */
  function _onMouseMove(e) {
    var now = performance.now();
    var dt  = Math.max(8, now - _mouse.t);
    var nvx = (e.clientX - _mouse.px) / dt;
    var nvy = (e.clientY - _mouse.py) / dt;
    _mouse.ax = (nvx - _mouse.vx) / dt;
    _mouse.ay = (nvy - _mouse.vy) / dt;
    _mouse.vx = nvx; _mouse.vy = nvy;
    _mouse.px = e.clientX; _mouse.py = e.clientY;
    _mouse.x  = e.clientX; _mouse.y  = e.clientY;
    _mouse.t  = now;
  }

  /* ── Helpers ── */
  function _getCage() {
    if (!_ballsWrap) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var r = _ballsWrap.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function _bubbleR(f, anyHover) {
    return f.baseR * (f.hover ? SVC_PHYS.hoverScale : (anyHover ? SVC_PHYS.otherScaleWhenHover : 1));
  }

  function _applyTransform(f, anyHover) {
    var sc;
    if (f.hover)       sc = SVC_PHYS.hoverScale;
    else if (anyHover) sc = SVC_PHYS.otherScaleWhenHover;
    else               sc = 1;

    if (_ffEntry) {
      var a   = Math.max(0, Math.min(1, f._alpha || 0));
      var e0  = 1 - Math.pow(1 - a, 2); /* easeOutQuad */
      f.el.style.opacity = String(0.97 * a);
      sc *= (0.88 + 0.12 * e0);
    } else if (!f.hover && !anyHover) {
      var t2 = performance.now();
      var breathe = SVC_BREATH.minScale +
        (Math.sin(t2 * SVC_BREATH.speed + f.seed) * 0.5 + 0.5) *
        (SVC_BREATH.maxScale - SVC_BREATH.minScale);
      sc *= breathe;
      f.el.style.opacity = String(0.965 + Math.sin(t2 * 0.002 + f.seed) * SVC_BREATH.flickerAmp);
    } else {
      f.el.style.opacity = "1";
    }

    /* positions are offsets from cage centre; balls sit left:50% top:50% in wrap */
    f.el.style.transform = "translate(-50%,-50%) translate(" +
      f.x.toFixed(2) + "px," + f.y.toFixed(2) + "px) scale(" + sc.toFixed(4) + ")";
  }

  function _settleStep() {
    var R = SVC_PHYS.cageRadius;
    var anyHover = false;
    var i, j, a, b;
    for (i = 0; i < _ff.length; i++) if (_ff[i].hover) { anyHover = true; break; }

    /* entry fade-in */
    if (_ffEntry) {
      var now = performance.now();
      if (!_ffEntryT0) _ffEntryT0 = now;
      for (i = 0; i < _ff.length; i++) {
        var f = _ff[i];
        var delay = i * SVC_PHYS.staggerMs;
        var tt = (now - _ffEntryT0) - delay;
        f._alpha = Math.max(0, Math.min(1, tt / SVC_PHYS.fadeMs));
        if (tt >= 0) f._released = true;
        f.el.style.pointerEvents = (f._alpha >= 0.99) ? "auto" : "none";
      }
    }

    var radii = [];
    for (i = 0; i < _ff.length; i++) radii.push(_bubbleR(_ff[i], anyHover));

    /* integrate physics */
    for (i = 0; i < _ff.length; i++) {
      a = _ff[i];
      if (_ffEntry && !a._released) { a.x = 0; a.y = 0; a.vx = 0; a.vy = 0; continue; }
      if (a.hover && SVC_PHYS.freezeOnHover) { a.vx = 0; a.vy = 0; continue; }

      a.vy += SVC_PHYS.gravity;
      a.vx += Math.sin(a.seed + i) * SVC_PHYS.idleWander;
      a.vx *= SVC_PHYS.airDrag;
      a.vy *= SVC_PHYS.airDrag;
      a.x  += a.vx;
      a.y  += a.vy;

      /* cage wall */
      var rr  = radii[i];
      var dd  = Math.hypot(a.x, a.y) || 0.0001;
      var max = Math.max(10, R - rr);
      if (dd > max) {
        var nx = a.x / dd, ny = a.y / dd;
        a.x = nx * max; a.y = ny * max;
        var dot = a.vx * nx + a.vy * ny;
        a.vx -= (1 + SVC_PHYS.wallBounce) * dot * nx;
        a.vy -= (1 + SVC_PHYS.wallBounce) * dot * ny;
      }
    }

    /* separation passes */
    for (var pass = 0; pass < SVC_PHYS.separationPasses; pass++) {
      for (i = 0; i < _ff.length; i++) {
        for (j = i + 1; j < _ff.length; j++) {
          a = _ff[i]; b = _ff[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var d2 = dx*dx + dy*dy;
          if (d2 < 0.0001) { dx = Math.random()-0.5; dy = Math.random()-0.5; d2 = dx*dx+dy*dy; }
          var d = Math.sqrt(d2);
          var minD = radii[i] + radii[j] + SVC_PHYS.collisionPadding;
          if (d < minD) {
            var nx2 = dx/d, ny2 = dy/d;
            var push = (minD - d) * 0.5;
            if (!(a.hover && SVC_PHYS.freezeOnHover)) { a.x += nx2*push; a.y += ny2*push; }
            if (!(b.hover && SVC_PHYS.freezeOnHover)) { b.x -= nx2*push; b.y -= ny2*push; }
            var relV = (a.vx-b.vx)*nx2 + (a.vy-b.vy)*ny2;
            if (relV < 0) {
              var jImp = -(1+SVC_PHYS.restitution)*relV / (1/a.mass + 1/b.mass);
              if (!(a.hover && SVC_PHYS.freezeOnHover)) { a.vx += jImp*nx2/a.mass; a.vy += jImp*ny2/a.mass; }
              if (!(b.hover && SVC_PHYS.freezeOnHover)) { b.vx -= jImp*nx2/b.mass; b.vy -= jImp*ny2/b.mass; }
            }
          }
        }
      }
      /* re-clamp after separation */
      for (i = 0; i < _ff.length; i++) {
        a = _ff[i];
        var rr2 = radii[i];
        var dd2 = Math.hypot(a.x, a.y) || 0.0001;
        var max2 = Math.max(10, R - rr2);
        if (dd2 > max2) { a.x = (a.x/dd2)*max2; a.y = (a.y/dd2)*max2; }
      }
    }

    return anyHover;
  }

  function _ffTick(ts) {
    if (!_ffRunning) return;

    var cage = _getCage();
    var dxC  = _mouse.x - cage.x;
    var dyC  = _mouse.y - cage.y;
    var dC   = Math.hypot(dxC, dyC) || 1;
    var t    = 1 - Math.max(0, Math.min(1, dC / SVC_PHYS.influenceRadius));
    var inf  = t * t;
    var pNX  = dxC / dC, pNY = dyC / dC;

    var sx = (_mouse.vx * SVC_PHYS.shakeFromVelocity + _mouse.ax * SVC_PHYS.shakeFromAccel) * inf;
    var sy = (_mouse.vy * SVC_PHYS.shakeFromVelocity + _mouse.ay * SVC_PHYS.shakeFromAccel) * inf;
    var sMag = Math.hypot(sx, sy) || 0;
    var sMax = SVC_PHYS.impulseClamp * (0.35 + 0.65 * inf);
    if (sMag > sMax) { sx = sx/sMag*sMax; sy = sy/sMag*sMax; }

    for (var i = 0; i < _ff.length; i++) {
      var a = _ff[i];
      if (a.hover && SVC_PHYS.freezeOnHover) { a.vx = 0; a.vy = 0; }
      else {
        a.vx += (pNX * SVC_PHYS.tiltStrength * inf) / a.mass;
        a.vy += (SVC_PHYS.gravity + pNY * SVC_PHYS.tiltStrength * inf) / a.mass;
        var phase = 0.75 + 0.35 * Math.sin(a.seed + ts * 0.004);
        a.vx += sx * phase / a.mass;
        a.vy += sy * phase / a.mass;
        a.vx += Math.sin(ts * 0.0017 + a.seed) * SVC_PHYS.idleWander;
        a.vy += Math.cos(ts * 0.0014 + a.seed) * SVC_PHYS.idleWander;
        var sp = Math.hypot(a.vx, a.vy);
        if (sp > SVC_PHYS.maxSpeed) { a.vx = a.vx/sp*SVC_PHYS.maxSpeed; a.vy = a.vy/sp*SVC_PHYS.maxSpeed; }
      }
    }

    var anyHover = _settleStep();
    for (var i2 = 0; i2 < _ff.length; i2++) _applyTransform(_ff[i2], anyHover);

    /* finish entry once all balls are fully opaque */
    if (_ffEntry) {
      var done = true;
      for (var i3 = 0; i3 < _ff.length; i3++) if ((_ff[i3]._alpha || 0) < 1) { done = false; break; }
      if (done) { _ffEntry = false; _ffEntryT0 = 0; }
    }

    _ffRAF = requestAnimationFrame(_ffTick);
  }

  /* ── Start physics on the balls ── */
  function _startPhysics() {
    if (!_ballsWrap || !_balls.length) return;
    cancelAnimationFrame(_ffRAF);
    if (window.gsap) window.gsap.killTweensOf(_balls);

    /* Fixed centred container — matches Work/Teaching 420×420 layout */
    _ballsWrap.style.display    = "block";
    _ballsWrap.style.position   = "fixed";
    _ballsWrap.style.width      = "420px";
    _ballsWrap.style.height     = "420px";
    _ballsWrap.style.top        = "50%";
    _ballsWrap.style.left       = "50%";
    _ballsWrap.style.margin     = "0";
    _ballsWrap.style.marginLeft = "-210px";
    _ballsWrap.style.marginTop  = "-210px";
    _ballsWrap.style.zIndex     = "20";
    _ballsWrap.style.flexWrap   = "";
    _ballsWrap.style.gap        = "";

    _ff = [];
    for (var i = 0; i < _balls.length; i++) {
      var el = _balls[i];
      el.style.display       = "block";
      el.style.position      = "absolute";
      el.style.left          = "50%";
      el.style.top           = "50%";
      el.style.transform     = "translate(-50%,-50%)";
      el.style.opacity       = "0";
      el.style.pointerEvents = "none";

      var r    = el.getBoundingClientRect();
      var baseR = (r && r.width > 2) ? r.width / 2 : 46;

      _ff.push({
        el:    el,
        x: 0, y: 0,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        seed:  Math.random() * 999,
        hover: false,
        baseR: baseR,
        mass:  0.9 + Math.random() * 0.6,
        _alpha:    0,
        _released: false
      });
    }

    /* Centre for entry animation — physics spreads balls naturally from here */
    for (var i2 = 0; i2 < _ff.length; i2++) {
      _ff[i2].x  = 0; _ff[i2].y  = 0;
      _ff[i2].vx = (Math.random()-0.5)*0.25;
      _ff[i2].vy = (Math.random()-0.5)*0.25;
      _ff[i2]._alpha    = 0;
      _ff[i2]._released = (i2 === 0); /* first ball leads */

      /* hover listeners */
      (function (f) {
        f.el.onmouseenter = function () { f.hover = true;  f.el.classList.add("ff-hovered"); };
        f.el.onmouseleave = function () { f.hover = false; f.el.classList.remove("ff-hovered"); };
      })(_ff[i2]);
    }

    _ffEntry   = true;
    _ffEntryT0 = 0;
    _ffRunning = true;
    _ffRAF     = requestAnimationFrame(_ffTick);
  }

  /* ── Stop physics and restore ball elements for GSAP fade ── */
  function _stopPhysicsForClose() {
    _ffRunning = false;
    _ffEntry   = false;
    cancelAnimationFrame(_ffRAF);
    for (var i = 0; i < _ff.length; i++) {
      var f = _ff[i];
      f.el.onmouseenter    = null;
      f.el.onmouseleave    = null;
      f.el.classList.remove("ff-hovered");
      f.el.style.pointerEvents = "none";
      /* leave opacity + transform for GSAP to animate */
    }
  }

  /* Called by GSAP onComplete after balls fade to 0 */
  function _cleanupBalls() {
    for (var i = 0; i < _ff.length; i++) {
      var f = _ff[i];
      f.el.style.position      = "";
      f.el.style.left          = "";
      f.el.style.top           = "";
      f.el.style.transform     = "";
      f.el.style.opacity       = "";
      f.el.style.pointerEvents = "";
      f.el.style.display       = "";
    }
    if (_ballsWrap) {
      _ballsWrap.style.display    = "none";
      _ballsWrap.style.position   = "";
      _ballsWrap.style.width      = "";
      _ballsWrap.style.height     = "";
      _ballsWrap.style.margin     = "";
      _ballsWrap.style.marginLeft = "";
      _ballsWrap.style.marginTop  = "";
      _ballsWrap.style.top        = "";
      _ballsWrap.style.left       = "";
      _ballsWrap.style.zIndex     = "";
      if (window.gsap) window.gsap.set(_ballsWrap, { clearProps: "y" });
    }
    _ff = [];
  }

  /* ═══════════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════════ */

  function init() {
    _btn          = document.getElementById("services-btn");
    _divider      = document.getElementById("svc-divider");
    _ballsWrap    = document.getElementById("svc-balls-wrap");
    _desc         = document.getElementById("svc-desc");
    _descText     = document.getElementById("svc-desc-text");
    _viewWorkLink = document.getElementById("svc-view-work");
    _balls        = Array.from(document.querySelectorAll(".svc-ball"));
    _heroName          = document.querySelector(".hero .name");
    _heroRole          = document.querySelector(".hero .role");
    _heroDesignerTitle = document.querySelector(".hero .designer-title");
    _hero              = document.querySelector(".hero");

    if (!_btn || !_balls.length) return;

    _reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* seed mouse at viewport centre so impulses start near-zero */
    _mouse.x = _mouse.px = window.innerWidth  / 2;
    _mouse.y = _mouse.py = window.innerHeight / 2;

    _btn.addEventListener("click", _handleToggle);

    _balls.forEach(function (ball, i) {
      ball.addEventListener("click", function () { _handleBallClick(i); });
    });

    window.addEventListener("mousemove", _onMouseMove, { passive: true });

    /* Global outside click */
    document.addEventListener("pointerdown", _handleOutside, true);

    /* Escape key */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && _state !== "closed") {
        e.preventDefault();
        _closeAll();
      }
    });

    /* Close when a nav section link is clicked */
    document.addEventListener("click", function (e) {
      if (_state === "closed") return;
      var link = e.target.closest("a[data-nav], a[data-mode-link]");
      if (link) _closeAll();
    });

    /* Close when Work gallery opens */
    window.addEventListener("portfolio:modechange", function (e) {
      if (_state !== "closed" && e.detail && e.detail.mode !== "home") {
        _closeAll();
      }
    }, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════
     OPEN / CLOSE
  ═══════════════════════════════════════════════════════ */

  function _handleToggle() {
    if (_state === "closed") _openServices();
    else _closeAll();
  }

  function _openServices() {
    _state = "open";
    _btn.setAttribute("aria-expanded", "true");
    document.body.classList.add("svc-open");
    _savedStep = window.homeScrollSequence ? window.homeScrollSequence.getStep() : 0;

    var hint = document.getElementById("global-site-hints");

    if (!window.gsap || _reducedMotion) {
      /* ── Instant / reduced-motion fallback ── */
      if (_heroName) { _heroName.style.opacity = "0"; _heroName.style.height = "0"; _heroName.style.overflow = "hidden"; }
      if (_heroRole) { _heroRole.style.opacity = "0"; _heroRole.style.height = "0"; _heroRole.style.overflow = "hidden"; }
      if (_heroDesignerTitle) { _heroDesignerTitle.style.opacity = "0"; _heroDesignerTitle.style.height = "0"; _heroDesignerTitle.style.overflow = "hidden"; }
      if (_hero) _hero.style.rowGap = "0";
      _btn.style.position  = "fixed";
      _btn.style.bottom    = "44px";
      _btn.style.top       = "auto";
      _btn.style.left      = "50%";
      _btn.style.transform = "translateX(-50%)";
      _btn.style.margin    = "0";
      _startPhysics();
      return;
    }

    /* hint text stays visible — repositioned via CSS .svc-open rule */

    /* ── Fade + collapse name, designer title, and role ── */
    window.gsap.to(_heroName, { opacity: 0, duration: 0.25, ease: "power2.in",
      onComplete: function () {
        if (_heroName) { _heroName.style.height = "0"; _heroName.style.overflow = "hidden"; }
        if (_hero) _hero.style.rowGap = "0";
      }
    });
    window.gsap.to(_heroDesignerTitle, { opacity: 0, duration: 0.22, ease: "power2.in",
      onComplete: function () {
        if (_heroDesignerTitle) { _heroDesignerTitle.style.height = "0"; _heroDesignerTitle.style.overflow = "hidden"; }
      }
    });
    window.gsap.to(_heroRole, { opacity: 0, duration: 0.20, ease: "power2.in",
      onComplete: function () {
        if (_heroRole) { _heroRole.style.height = "0"; _heroRole.style.overflow = "hidden"; }
      }
    });

    /* ── Animate button to fixed bottom ── */
    /* Measure visual position first (includes any scroll-sequence y-transform),
       then clear that transform so it doesn't compound with the fixed `top` below */
    var btnRect    = _btn.getBoundingClientRect();
    window.gsap.killTweensOf(_btn);
    window.gsap.set(_btn, { y: 0 });
    var hintsEl    = document.getElementById("global-site-hints");
    var stopY      = hintsEl
      ? hintsEl.getBoundingClientRect().top - 12
      : window.innerHeight - 80;
    var targetTop  = stopY - btnRect.height;
    var targetLeft = window.innerWidth  / 2 - btnRect.width / 2;
    window.gsap.set(_btn, {
      position: "fixed",
      top:      btnRect.top,
      left:     btnRect.left,
      width:    btnRect.width,
      margin:   0
    });
    _btnOpenTween = window.gsap.to(_btn, {
      top:      targetTop,
      left:     targetLeft,
      duration: 0.45,
      ease:     "power2.inOut"
    });

    /* ── Balls: physics handles entry animation ── */
    _startPhysics();
  }

  function _handleBallClick(idx) {
    if (_state === "closed") return;
    _activeIdx = idx;
    _state = "detail";

    var svc = SERVICES[idx];

    /* Update active class on balls */
    _balls.forEach(function (b, i) { b.classList.toggle("is-active", i === idx); });

    /* Populate description */
    if (_descText) _descText.textContent = svc.desc;
    if (_viewWorkLink) {
      if (svc.viewWork && svc.category) {
        _viewWorkLink.setAttribute("data-category", svc.category);
        _viewWorkLink.style.visibility = "visible";
      } else {
        _viewWorkLink.style.visibility = "hidden";
      }
    }

    document.body.classList.add("svc-detail-open");

    if (!window.gsap || _reducedMotion) {
      if (_desc) { _desc.setAttribute("aria-hidden", "false"); _desc.style.opacity = "1"; }
      return;
    }

    /* Shift balls wrap up to make room for description */
    if (_ballsWrap) window.gsap.to(_ballsWrap, { y: -44, duration: 0.42, ease: "power2.out" });

    /* Reveal description */
    if (_desc) {
      _desc.setAttribute("aria-hidden", "false");
      window.gsap.fromTo(_desc,
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.38, ease: "power2.out" }
      );
    }
  }

  function _closeAll() {
    if (_state === "closed") return;
    _state     = "closed";
    _activeIdx = -1;

    _btn.setAttribute("aria-expanded", "false");
    document.body.classList.remove("svc-open", "svc-detail-open");
    document.body.classList.add("svc-closing"); /* keeps #seq-steps hidden until balls fade out */
    _balls.forEach(function (b) { b.classList.remove("is-active"); });

    var hint = document.getElementById("global-site-hints");

    /* Restore layout heights immediately — elements are invisible so no visible shift */
    if (_heroName) { _heroName.style.height = ""; _heroName.style.overflow = ""; }
    if (_heroDesignerTitle) { _heroDesignerTitle.style.height = ""; _heroDesignerTitle.style.overflow = ""; }
    if (_heroRole) { _heroRole.style.height = ""; _heroRole.style.overflow = ""; }
    if (_hero) _hero.style.rowGap = "";

    if (!window.gsap || _reducedMotion) {
      /* ── Instant reset ── */
      _btn.style.position  = "";
      _btn.style.top       = "";
      _btn.style.left      = "";
      _btn.style.bottom    = "";
      _btn.style.transform = "";
      _btn.style.margin    = "";
      _btn.style.width     = "";
      _btn.style.opacity   = "";
      if (_heroName) _heroName.style.opacity = "";
      if (_heroDesignerTitle) _heroDesignerTitle.style.opacity = "";
      if (_heroRole) _heroRole.style.opacity = "";
      _cleanupBalls();
      document.body.classList.remove("svc-closing");
      if (_desc) { _desc.setAttribute("aria-hidden", "true"); _desc.style.opacity = "0"; }
      _btn.focus();
      return;
    }

    /* ── Stop physics, reset balls wrap y ── */
    _stopPhysicsForClose();
    if (_ballsWrap) window.gsap.set(_ballsWrap, { y: 0 });

    /* ── Reset the scroll sequence to progress 0 ───────────────────────────
       This is the single source-of-truth sync: it kills any in-flight button
       tween, clears all GSAP props on home elements (button, name, role,
       cards), and rebuilds the scroll timeline with a fresh `fromTo` whose
       start is anchored at the elements' clean resting state.
       Doing this BEFORE the visual animations means:
         • name / role are at CSS opacity 1 (clearProps removed inline styles)
         • button is back in normal flow at y = 0 (clearProps removed position:fixed)
         • _prog = 0 so the next scroll starts from the very beginning
       ─────────────────────────────────────────────────────────────────── */
    if (_btnOpenTween) { _btnOpenTween.kill(); _btnOpenTween = null; }
    if (window.homeScrollSequence) window.homeScrollSequence.reset();

    /* Capture before reset — closures fire async and _savedStep will be 0 by then */
    var stepToRestore = _savedStep;
    _savedStep = 0;

    /* If the user was mid-scroll when Services opened, restore that step
       immediately after reset so name/role stay hidden at the right opacity. */
    if (stepToRestore > 0 && window.homeScrollSequence) {
      window.homeScrollSequence.seekStep(stepToRestore, true);
    }

    /* ── Fade button out, then fade back in at the restored position ── */
    window.gsap.to(_btn, { opacity: 0, duration: 0.18, ease: "power2.in",
      onComplete: function () {
        /* clearProps removes position:fixed from Services open; re-apply step
           position instantly after since it was wiped along with everything else */
        window.gsap.set(_btn, { clearProps: "all" });
        if (stepToRestore > 0 && window.homeScrollSequence) {
          window.homeScrollSequence.seekStep(stepToRestore, true);
        }
        window.gsap.fromTo(_btn, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: "power2.out" });
      }
    });

    /* Name and role: fade back in only when returning to step 0.
       For step >= 1 the timeline already holds them at opacity 0 via seekStep. */
    if (stepToRestore === 0) {
      window.gsap.fromTo(_heroName,
        { opacity: 0 },
        { opacity: 1, duration: 0.38, ease: "power2.out", delay: 0.22,
          onComplete: function () { window.gsap.set(_heroName, { clearProps: "opacity" }); }
        }
      );
      window.gsap.fromTo(_heroDesignerTitle,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: "power2.out", delay: 0.25,
          onComplete: function () { window.gsap.set(_heroDesignerTitle, { clearProps: "opacity" }); }
        }
      );
      window.gsap.fromTo(_heroRole,
        { opacity: 0 },
        { opacity: 1, duration: 0.35, ease: "power2.out", delay: 0.28,
          onComplete: function () { window.gsap.set(_heroRole, { clearProps: "opacity" }); }
        }
      );
    }

    /* hint text opacity is reset automatically when .svc-open class is removed */

    /* ── Fade balls out, then reveal scroll cards ── */
    if (_ff.length > 0) {
      window.gsap.to(_balls, { opacity: 0, duration: 0.22, onComplete: function () {
        _cleanupBalls();
        document.body.classList.remove("svc-closing");
      }});
    } else {
      if (_ballsWrap) _ballsWrap.style.display = "none";
      document.body.classList.remove("svc-closing");
    }

    /* ── Slide description out ── */
    if (_desc) {
      window.gsap.to(_desc, { opacity: 0, y: 10, duration: 0.22, ease: "power2.in",
        onComplete: function () {
          _desc.setAttribute("aria-hidden", "true");
          window.gsap.set(_desc, { clearProps: "transform,opacity" });
        }
      });
    }

    _btn.focus();
  }

  /* ═══════════════════════════════════════════════════════
     CLOSE DETAIL ONLY (keep balls, go back to "open" state)
  ═══════════════════════════════════════════════════════ */
  function _closeDetail() {
    if (_state !== "detail") return;
    _state     = "open";
    _activeIdx = -1;
    _balls.forEach(function (b) { b.classList.remove("is-active"); });
    document.body.classList.remove("svc-detail-open");

    if (!window.gsap || _reducedMotion) {
      if (_desc) { _desc.setAttribute("aria-hidden", "true"); _desc.style.opacity = "0"; }
      return;
    }
    /* Restore balls wrap to centre */
    if (_ballsWrap) window.gsap.to(_ballsWrap, { y: 0, duration: 0.38, ease: "power2.inOut" });
    window.gsap.to(_desc, {
      opacity: 0, y: 10, duration: 0.22, ease: "power2.in",
      onComplete: function () {
        _desc.setAttribute("aria-hidden", "true");
        window.gsap.set(_desc, { clearProps: "transform,opacity" });
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     OUTSIDE CLICK
  ═══════════════════════════════════════════════════════ */
  function _handleOutside(e) {
    if (_state === "closed") return;

    /* Always allow the toggle button through — it has its own handler */
    if (_btn && _btn.contains(e.target)) return;

    /* In detail state: click on desc or balls → keep open */
    if (_state === "detail") {
      if (_desc && _desc.contains(e.target)) return;
      if (_ballsWrap && _ballsWrap.contains(e.target)) return;
      _closeDetail();
      return;
    }

    /* In open state: only the balls wrap is "inside" — everything else closes */
    if (_ballsWrap && _ballsWrap.contains(e.target)) return;
    _closeAll();
  }

  /* ═══════════════════════════════════════════════════════
     VIEW WORK LINK
  ═══════════════════════════════════════════════════════ */
  document.addEventListener("click", function (e) {
    var link = e.target.closest("#svc-view-work");
    if (!link) return;
    e.preventDefault();

    var category = link.getAttribute("data-category");
    _closeAll();

    if (typeof window._triggerModeTransition === "function") {
      window._triggerModeTransition("work", null, {});
    } else if (window.PortfolioModes) {
      window.PortfolioModes.setMode("work");
    }

    if (category) {
      setTimeout(function () {
        if (window.PORTFOLIO_GALLERY && typeof window.PORTFOLIO_GALLERY.open === "function") {
          window.PORTFOLIO_GALLERY.open(category);
        }
      }, 700);
    }
  });

  /* ── Boot ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
