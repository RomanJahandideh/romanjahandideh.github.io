/* =========================================================
   HOME SMOKE VIDEO — scroll-scrubbed background per mode

   Home mode      : greenscreen.mp4  — scrubbed by homeScrollSequence
   Work mode      : greenscreen44.mp4 — scrubbed by discrete scroll steps
   Teaching mode  : greenscreen33.mp4 — scrubbed by discrete scroll steps

   Touch          : ambient loop (only active mode plays)
   Reduced motion : paused at frame 0
   ========================================================= */
(function () {
  "use strict";

  var IS_TOUCH   = window.matchMedia("(pointer: coarse)").matches;
  var IS_REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var MODES     = ["home", "work", "teaching"];
  var ALT_STEPS = 4;

  /* Per-mode video state */
  var _vids  = { home: null, work: null, teaching: null };
  var _durs  = { home: 0,    work: 0,    teaching: 0    };
  var _ready = { home: false, work: false, teaching: false };

  var _smooth      = 0;
  var _altStep     = 0;
  var _altProg     = 0;
  var _altCooldown = false;
  var _rafId       = null;

  function _getMode() {
    return (document.body.dataset.mode || "home").toLowerCase();
  }

  /* ── Advance or retreat one step in work / teaching ── */
  function _advanceAltStep(dir) {
    if (document.body.classList.contains("is-transitioning")) return;
    if (_altCooldown) return;

    var next = _altStep + dir;

    if (next < 0 || next > ALT_STEPS) {
      var cur  = _getMode();
      var idx  = MODES.indexOf(cur);
      if (idx < 0) idx = 0;
      var nextMode = MODES[(idx + (dir > 0 ? 1 : -1) + MODES.length) % MODES.length];
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

  /* ── Init a single video element ── */
  function _initVideo(elemId, modeKey) {
    var vid = document.getElementById(elemId);
    if (!vid) return;
    _vids[modeKey] = vid;

    vid.muted       = true;
    vid.playsInline = true;
    vid.setAttribute("aria-hidden", "true");

    if (IS_REDUCED) {
      vid.pause();
      vid.currentTime = 0;
      return;
    }

    if (IS_TOUCH) {
      vid.loop         = true;
      vid.playbackRate = 0.70;
      /* Only play the home video on initial load; others start on mode entry */
      if (modeKey === "home") vid.play().catch(function () {});
      return;
    }

    /* Desktop: scrub-driven — load metadata then pause */
    function onMeta() {
      _durs[modeKey]  = vid.duration || 0;
      _ready[modeKey] = true;
      vid.pause();
      vid.currentTime = 0;
      /* Start the rAF loop as soon as the first video is ready */
      if (!_rafId) _rafId = requestAnimationFrame(tick);
    }

    if (vid.readyState >= 1 && vid.duration) {
      onMeta();
    } else {
      vid.addEventListener("loadedmetadata", onMeta, { once: true });
    }
  }

  /* ── Bootstrap all three videos ── */
  function init() {
    _initVideo("smoke-video",    "home");
    _initVideo("work-video",     "work");
    _initVideo("teaching-video", "teaching");
  }

  /* ── rAF scrub loop (desktop only) ── */
  function tick() {
    var mode = _getMode();
    var vid  = _vids[mode];
    var dur  = _durs[mode] || 0;
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

    if (vid && dur > 0) {
      var t = Math.max(0, Math.min(dur, _smooth * dur));
      if (Math.abs(vid.currentTime - t) > 0.012) {
        vid.currentTime = t;
      }
    }

    _rafId = requestAnimationFrame(tick);
  }

  /* ── Reset on every mode change ── */
  window.addEventListener("portfolio:modechange", function (e) {
    if (!e.detail) return;

    _altCooldown = false;
    _altStep     = 0;
    _altProg     = 0;
    _smooth      = 0;

    var newMode = (e.detail.mode || "home").toLowerCase();

    /* Reset all videos to frame 0 */
    MODES.forEach(function (k) {
      var v = _vids[k];
      if (!v) return;

      if (!IS_TOUCH && !IS_REDUCED && _durs[k] > 0) {
        v.currentTime = 0;
      }

      /* Touch: play only the newly active video, pause the rest */
      if (IS_TOUCH) {
        if (k === newMode) {
          v.play().catch(function () {});
        } else {
          v.pause();
        }
      }
    });
  }, { passive: true });

  /* ── Public API — called by main.js wheel delegation ── */
  window.smokeVideoSequence = {
    onWheel: function (dy) {
      if (IS_TOUCH || IS_REDUCED) return;
      /* dy < 0 = scroll up = forward (+1); dy > 0 = scroll down = backward (-1) */
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
