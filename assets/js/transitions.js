/* =====================================================
   PAGE TRANSITIONS
   Atmospheric dark dissolve between modes.
   The curtain is a dark overlay with backdrop-filter
   blur — as it fades in the scene behind blurs and
   dims, creating a cinematic depth-of-field dissolve.
   No hard shapes, no text, no color flashes.
   ===================================================== */
(function () {
  "use strict";

  /* ── Timing ──────────────────────────────────────── */
  var OPEN_DUR  = 0.42;  /* scene dissolves into darkness   */
  var CLOSE_DUR = 0.55;  /* new scene emerges from darkness */
  var HOLD      = 0.05;  /* peak darkness hold              */
  var SWITCH_AT = 0.84;  /* fraction of OPEN_DUR when mode flips */

  var MODES = ["home", "work", "teaching"];

  /* ── State ───────────────────────────────────────── */
  var curtainEl   = null;
  var indicatorEl = null;
  var dotWraps    = [];

  var _transitioning  = false;
  var _touchStartY    = 0;
  var _touchStartX    = 0;
  var _touchStartTime = 0;

  /* ── Boot ────────────────────────────────────────── */
  function boot() {
    curtainEl   = document.getElementById("mode-curtain");
    indicatorEl = document.getElementById("mode-indicator");

    if (!curtainEl || typeof gsap === "undefined") {
      /* No GSAP — export a passthrough so callers don't break */
      window._triggerModeTransition = function (mode, switchFn, options) {
        if (typeof switchFn === "function") switchFn();
        else if (window.PortfolioModes) window.PortfolioModes.setMode(mode, options || {});
      };
      return;
    }

    document.body.setAttribute("data-transitions", "active");
    gsap.set(curtainEl, { opacity: 0 });

    setupIndicator();
    setupTouchSwipe();
    listenModeChange();

    window._triggerModeTransition = triggerModeTransition;
  }

  /* ─────────────────────────────────────────────────────
     ATMOSPHERIC DISSOLVE
     Called by main.js (scroll) and nav.js (click).

     Sequence:
       1. Curtain fades in → scene blurs & darkens (0.42s)
       2. Mode DOM switches near peak
       3. Brief hold in darkness
       4. Curtain fades out → new scene emerges (0.55s)
  ───────────────────────────────────────────────────── */
  function triggerModeTransition(targetMode, switchFn, options) {
    if (_transitioning) return;
    if (!curtainEl || typeof gsap === "undefined") {
      if (typeof switchFn === "function") switchFn();
      else if (window.PortfolioModes) window.PortfolioModes.setMode(targetMode, options || {});
      return;
    }

    var current = window.PortfolioModes ? window.PortfolioModes.getMode() : "home";
    if (current === targetMode) return;

    _transitioning = true;
    document.body.classList.add("is-transitioning");
    gsap.set(curtainEl, { opacity: 0 });

    var tl = gsap.timeline({
      onComplete: function () {
        _transitioning = false;
        document.body.classList.remove("is-transitioning");
        gsap.set(curtainEl, { opacity: 0 });
      }
    });

    /* 1 — Scene dissolves into atmospheric darkness */
    tl.to(curtainEl, {
      opacity: 1,
      duration: OPEN_DUR,
      ease: "power2.inOut"
    });

    /* 2 — Mode switches near the moment of peak darkness */
    tl.add(function () {
      if (typeof switchFn === "function") {
        switchFn();
      } else if (window.PortfolioModes) {
        window.PortfolioModes.setMode(targetMode, options || {});
      }
    }, "-=" + ((1 - SWITCH_AT) * OPEN_DUR).toFixed(3));

    /* 3 — Hold at peak darkness */
    tl.to({}, { duration: HOLD });

    /* 4 — New scene emerges */
    tl.to(curtainEl, {
      opacity: 0,
      duration: CLOSE_DUR,
      ease: "power3.out",
      onStart: function () {
        entranceFor(targetMode);
      }
    });
  }

  /* ── Mode content entrance animations ────────────── */
  function entranceFor(mode) {
    if (mode === "work") {
      var layers = document.querySelectorAll("#main-stack .layer");
      if (layers.length) {
        gsap.fromTo(layers,
          { opacity: 0, scale: 0.95 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.65,
            ease: "power2.out",
            stagger: 0.06,
            overwrite: "auto"
          }
        );
      }
    }

    if (mode === "teaching") {
      var tLayers = document.querySelectorAll(".teaching-layer");
      if (tLayers.length) {
        gsap.fromTo(tLayers,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.55,
            ease: "power2.out",
            stagger: 0.08,
            overwrite: "auto"
          }
        );
      }
    }

    if (mode === "home") {
      var heroEls = document.querySelectorAll(".hero .name, .hero .role");
      if (heroEls.length) {
        gsap.fromTo(heroEls,
          { y: 14, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.52,
            ease: "expo.out",
            stagger: 0.10,
            overwrite: "auto"
          }
        );
      }
    }
  }

  /* ─────────────────────────────────────────────────────
     MODE INDICATOR DOTS
  ───────────────────────────────────────────────────── */
  function setupIndicator() {
    if (!indicatorEl) return;
    dotWraps = Array.from(indicatorEl.querySelectorAll(".mode-dot-wrap"));
    dotWraps.forEach(function (wrap) {
      var mode = wrap.dataset.mode;
      wrap.addEventListener("click", function () {
        if (_transitioning) return;
        triggerModeTransition(mode);
      });
    });
    refreshDots();
  }

  function refreshDots() {
    if (!indicatorEl) return;
    var current = window.PortfolioModes ? window.PortfolioModes.getMode() : "home";
    dotWraps.forEach(function (wrap) {
      var dot = wrap.querySelector(".mode-dot");
      var active = wrap.dataset.mode === current;
      if (dot) dot.classList.toggle("is-active", active);
      wrap.classList.toggle("is-active", active);
    });
  }

  function listenModeChange() {
    window.addEventListener("portfolio:modechange", refreshDots, { passive: true });
  }

  /* ─────────────────────────────────────────────────────
     TOUCH SWIPE — vertical swipe cycles modes
  ───────────────────────────────────────────────────── */
  function setupTouchSwipe() {
    document.addEventListener("touchstart", function (e) {
      var t = e.touches[0];
      _touchStartY    = t.clientY;
      _touchStartX    = t.clientX;
      _touchStartTime = Date.now();
    }, { passive: true });

    document.addEventListener("touchend", function (e) {
      var h = (window.location.hash || "").toLowerCase();
      if (h === "#about" || h === "#contact") return;
      if (document.body.classList.contains("modal-open")) return;
      if (document.querySelector && document.querySelector("#gallery-overlay.is-open")) return;
      if (document.body.classList.contains("teaching-detail-open")) return;
      if (_transitioning) return;

      var t  = e.changedTouches[0];
      var dy = _touchStartY - t.clientY;
      var dx = _touchStartX - t.clientX;
      var dt = Date.now() - _touchStartTime;

      if (Math.abs(dy) < 55) return;
      if (Math.abs(dx) > Math.abs(dy) * 0.65) return;
      if (dt > 500) return;

      var current = window.PortfolioModes ? window.PortfolioModes.getMode() : "home";
      var idx     = MODES.indexOf(current);
      var dir     = dy > 0 ? 1 : -1;
      var next    = MODES[(idx + dir + MODES.length) % MODES.length];

      triggerModeTransition(next);
    }, { passive: true });
  }

  /* ── Run ─────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

}());
