/* =========================================================
   HOME SMOKE VIDEO — scroll-scrubbed background per mode

   Home mode      : greenscreen.mp4   — scrubbed by homeScrollSequence
   Work mode      : greenscreen44.mp4 — scrubbed by discrete scroll steps
   Teaching mode  : greenscreen33.mp4 — scrubbed by discrete scroll steps

   Desktop        : scrubbed frame-by-frame via rAF
   Touch / mobile : ambient loop; play() retried on first touch gesture
   Reduced motion : paused at frame 0
   ========================================================= */
(function () {
  "use strict";

  var IS_TOUCH   = window.matchMedia("(pointer: coarse)").matches;
  var IS_REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var MODES     = ["home", "work", "teaching"];
  var ALT_STEPS = 4;

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

  /* ── Try to play a video, retrying after the canplay event ── */
  function _tryPlay(vid) {
    if (!vid) return;
    var p = vid.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () {
        /* Autoplay blocked — wait for canplay then retry once */
        vid.addEventListener("canplay", function retry() {
          vid.removeEventListener("canplay", retry);
          vid.play().catch(function () {});
        });
      });
    }
  }

  /* ── Init a single video element ── */
  function _initVideo(elemId, modeKey) {
    var vid = document.getElementById(elemId);
    if (!vid) return;
    _vids[modeKey] = vid;

    vid.muted       = true;
    vid.playsInline = true;
    vid.setAttribute("playsinline", "");       /* belt-and-suspenders for iOS */
    vid.setAttribute("webkit-playsinline", "");
    vid.setAttribute("aria-hidden", "true");

    if (IS_REDUCED) {
      vid.pause();
      vid.currentTime = 0;
      return;
    }

    if (IS_TOUCH) {
      vid.loop         = true;
      vid.playbackRate = 0.70;
      /* Force the browser to buffer the video (mobile ignores preload="auto") */
      vid.load();
      /* Only the current mode's video plays immediately */
      if (modeKey === _getMode()) _tryPlay(vid);
      return;
    }

    /* Desktop: metadata-driven scrub */
    function onMeta() {
      _durs[modeKey]  = vid.duration || 0;
      _ready[modeKey] = true;
      vid.pause();
      vid.currentTime = 0;
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

    if (IS_TOUCH) {
      /* Retry playing the active video on first user touch
         (handles iOS Safari strict autoplay policy) */
      window.addEventListener("touchstart", function onFirstTouch() {
        var vid = _vids[_getMode()];
        if (vid && vid.paused) _tryPlay(vid);
        window.removeEventListener("touchstart", onFirstTouch);
      }, { passive: true, once: true });
    }
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

    MODES.forEach(function (k) {
      var v = _vids[k];
      if (!v) return;

      if (!IS_TOUCH && !IS_REDUCED && _durs[k] > 0) {
        v.currentTime = 0;
      }

      if (IS_TOUCH) {
        if (k === newMode) {
          v.currentTime = 0;
          _tryPlay(v);
        } else {
          v.pause();
        }
      }
    });
  }, { passive: true });

  /* ── Public API ── */
  window.smokeVideoSequence = {
    onWheel: function (dy) {
      if (IS_TOUCH || IS_REDUCED) return;
      _advanceAltStep(dy < 0 ? 1 : -1);
    },
    /* Tap version for mobile — same direction convention as onWheel */
    onTap: function () {
      _advanceAltStep(1);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

}());
