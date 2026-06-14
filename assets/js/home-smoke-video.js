/* =========================================================
   HOME SMOKE VIDEO — persistent scroll-scrubbed background

   Home mode      : currentTime driven by homeScrollSequence.getProgress()
   Work / Teaching: currentTime driven by a 4-step discrete scroll counter;
                    step boundaries trigger section transitions
   Touch          : muted ambient loop at CSS opacity
   Reduced motion : paused at frame 0

   Section loop (all reversible):
     home ─scroll-fwd─▶ work ─scroll-fwd─▶ teaching ─scroll-fwd─▶ home
     home ◀─scroll-bck─ work ◀─scroll-bck─ teaching ◀─scroll-bck─ home
   ========================================================= */
(function () {
  "use strict";

  var IS_TOUCH   = window.matchMedia("(pointer: coarse)").matches;
  var IS_REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Section order — must match MODE_ORDER in main.js */
  var MODES     = ["home", "work", "teaching"];
  /* Number of scroll steps that scrub the full video in work/teaching */
  var ALT_STEPS = 4;

  var _vid         = null;
  var _dur         = 0;
  var _smooth      = 0;   /* lerped display progress (0-1) */
  var _altStep     = 0;   /* discrete step counter: 0 … ALT_STEPS */
  var _altProg     = 0;   /* target progress = _altStep / ALT_STEPS */
  var _altCooldown = false; /* inter-step debounce (~450 ms) */
  var _rafId       = null;
  var _ready       = false;

  /* ── Advance or retreat one step in work/teaching ── */
  function _advanceAltStep(dir) {
    /* Respect the curtain transition lock from transitions.js */
    if (document.body.classList.contains("is-transitioning")) return;
    if (_altCooldown) return;

    var next = _altStep + dir;

    /* Boundary → trigger section transition */
    if (next < 0 || next > ALT_STEPS) {
      var cur = (document.body.dataset.mode || "home").toLowerCase();
      var idx = MODES.indexOf(cur);
      if (idx < 0) idx = 0;
      /* dir: +1 = forward (scroll up) → next section; -1 = backward → prev */
      var modeDir  = dir > 0 ? 1 : -1;
      var nextMode = MODES[(idx + modeDir + MODES.length) % MODES.length];
      if (typeof window._triggerModeTransition === "function") {
        window._triggerModeTransition(nextMode, null, {});
      }
      return;
    }

    _altStep = next;
    _altProg = _altStep / ALT_STEPS;

    _altCooldown = true;
    setTimeout(function () { _altCooldown = false; }, 450);
  }

  /* ── Bootstrap ── */
  function init() {
    _vid = document.getElementById("smoke-video");
    if (!_vid) return;

    _vid.muted       = true;
    _vid.playsInline = true;
    _vid.setAttribute("aria-hidden", "true");

    /* ── Reduced motion: first frame, no animation ── */
    if (IS_REDUCED) {
      _vid.pause();
      _vid.currentTime = 0;
      return;
    }

    /* ── Touch / mobile: ambient loop, CSS handles opacity ── */
    if (IS_TOUCH) {
      _vid.loop        = true;
      _vid.playbackRate = 0.70;
      _vid.play().catch(function () {});
      return;
    }

    /* ── Desktop: scroll-scrubbed ── */
    function onMeta() {
      if (_ready) return;
      _ready = true;
      _dur   = _vid.duration || 0;
      _vid.pause();
      _vid.currentTime = 0;
      if (!_rafId) _rafId = requestAnimationFrame(tick);
    }

    if (_vid.readyState >= 1 && _vid.duration) {
      onMeta();
    } else {
      _vid.addEventListener("loadedmetadata", onMeta, { once: true });
    }
  }

  /* ── rAF scrub loop (desktop only) ── */
  function tick() {
    var mode = (document.body.dataset.mode || "home").toLowerCase();
    var rawProg;

    if (mode === "home") {
      var seq = window.homeScrollSequence;
      rawProg = (seq && typeof seq.getProgress === "function")
                ? seq.getProgress() : 0;
    } else {
      rawProg = _altProg;
    }

    /* Lerp toward target — smooths discrete step snaps */
    _smooth += (rawProg - _smooth) * 0.07;

    if (_dur > 0) {
      var t = Math.max(0, Math.min(_dur, _smooth * _dur));
      if (Math.abs(_vid.currentTime - t) > 0.012) {
        _vid.currentTime = t;
      }
    }

    _rafId = requestAnimationFrame(tick);
  }

  /* ── Reset step state on every section entry ── */
  window.addEventListener("portfolio:modechange", function (e) {
    if (!e.detail) return;

    /* Unlock cooldown on any mode change so the user is never stuck */
    _altCooldown = false;

    /* Always start each section's video from step 0 / frame 0 */
    _altStep = 0;
    _altProg = 0;
    _smooth  = 0;
    if (_vid && !IS_TOUCH && !IS_REDUCED && _dur > 0) {
      _vid.currentTime = 0;
    }
  }, { passive: true });

  /* ── Public API — called by main.js wheel delegation ── */
  window.smokeVideoSequence = {
    /*
     * Called by main.js when mode is work or teaching.
     * dy < 0 = scroll up  = forward  (+1 step → toward next section)
     * dy > 0 = scroll down = backward (-1 step → toward prev section)
     */
    onWheel: function (dy) {
      if (IS_TOUCH || IS_REDUCED) return;
      _advanceAltStep(dy < 0 ? 1 : -1);
    }
  };

  /* ── Boot ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

}());
