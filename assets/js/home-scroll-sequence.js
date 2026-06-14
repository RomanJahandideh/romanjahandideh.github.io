/**
 * HOME SCROLL SEQUENCE
 * One wheel notch = one discrete step. Scroll UP = forward.
 * GSAP animates progress between step targets (fully reversible).
 * At step 5: triggers Work-mode transition.
 *
 * The timeline is REBUILT on every home-entry so no external
 * tween-kill (services.js, transitions.js) can corrupt it permanently.
 */
(function () {
  "use strict";

  if (window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  /* Progress value each step snaps to */
  var STEP_PROGRESS = [0.0, 0.26, 0.44, 0.62, 0.82];

  /* ── State ── */
  var _step         = 0;
  var _prog         = 0;
  var _locked       = false;
  var _stepCooldown = false;
  var _stepTween    = null;
  var _tl           = null;
  var _cards        = [];
  var _refsReady    = false;
  var _btnIsDown    = false; /* two-state: false=Position A, true=Position B */
  var _btnTargetY   = 0;    /* measured on every _buildTimeline() call */

  /* Gallery category for each seq-step card (index = card data-step) */
  var STEP_CATEGORIES = ["Graphic Design", "Animation", "Web Design", null];

  var _root  = document.documentElement;
  var _bgEl, _veilEl, _nameEl, _roleEl, _btnEl;
  var _hole  = { v: 230 };

  /* ── Cache DOM refs once at boot ─────────────────────────────
     Called only at DOMContentLoaded. Rebuilding the timeline does
     not require re-querying the DOM.
  ─────────────────────────────────────────────────────────── */
  function _initRefs() {
    if (typeof gsap === "undefined") return;

    _bgEl   = document.getElementById("bg");
    _veilEl = document.getElementById("scene-veil");
    _nameEl = document.querySelector(".hero .name");
    _roleEl = document.querySelector(".hero .role");
    _btnEl  = document.getElementById("services-btn");
    _cards  = Array.from(document.querySelectorAll(".seq-step-card"));

    if (!_bgEl || !_veilEl || !_nameEl) return;
    _refsReady = true;

    document.querySelectorAll(".seq-step-link").forEach(function (link) {
      var card = link.closest(".seq-step-card");
      var step = card ? parseInt(card.dataset.step, 10) : -1;
      var cat  = (step >= 0 && step < STEP_CATEGORIES.length) ? STEP_CATEGORIES[step] : null;
      link.addEventListener("click", function (e) { e.preventDefault(); _doTransition(cat); });
    });

    _buildTimeline();
  }

  /* ── Build / rebuild the GSAP timeline ──────────────────────
     Called on init AND on every home-entry reset so that tweens
     killed by external code (services.js or transitions.js) can
     never make the sequence permanently stale.
  ─────────────────────────────────────────────────────────── */
  function _buildTimeline() {
    if (!_refsReady || typeof gsap === "undefined") return;

    /* Kill any previous timeline before creating a fresh one */
    if (_tl) { _tl.kill(); _tl = null; }

    /* Snapshot button's resting-to-bottom distance for the two-state snap.
       Must be called after clearProps so the button is back in document flow. */
    _btnTargetY = 0;
    if (_btnEl) {
      var btnRect  = _btnEl.getBoundingClientRect();
      var hintsEl  = document.getElementById("global-site-hints");
      var stopY    = hintsEl
        ? hintsEl.getBoundingClientRect().top - 12
        : window.innerHeight - 80;
      _btnTargetY  = Math.max(0, stopY - btnRect.bottom);
    }

    gsap.set(_veilEl, { opacity: 0 });
    var tl = gsap.timeline({ paused: true });

    /* Hero exit: name + role fade out — 0.00 → ~0.20
       fromTo anchors the start at opacity 1 so the origin is never
       affected by whatever inline style a previous Services open/close
       or entrance animation left on the elements. */
    tl.fromTo([_nameEl, _roleEl],
      { opacity: 1 },
      { opacity: 0, duration: 0.16, ease: "power1.in", stagger: 0.04 },
    0);

    /* Button is NOT in this timeline. It snaps between Position A and Position B
       via _snapBtnDown / _snapBtnUp on step 0↔1 boundary crossings only. */

    /* Scene veil: fade out */
    tl.to(_veilEl, { opacity: 0, duration: 0.20, ease: "power1.inOut" }, 0.02);

    /* BG zoom 1.0 → 3.8 */
    tl.to(_bgEl, {
      scale: 3.8, duration: 1.0, ease: "power1.inOut", transformOrigin: "50% 50%"
    }, 0);

    /* Aperture: open to 300 (peak at t=0.55), then close to 190 */
    tl.to(_hole, {
      v: 300, duration: 0.55, ease: "power2.inOut",
      onUpdate: function () {
        _root.style.setProperty("--web-hole-base", Math.round(_hole.v).toString());
      }
    }, 0);
    tl.to(_hole, {
      v: 190, duration: 0.45, ease: "power2.in",
      onUpdate: function () {
        _root.style.setProperty("--web-hole-base", Math.round(_hole.v).toString());
      }
    }, 0.55);

    /* Service step cards — pinned hidden at t=0, shown one at a time */
    var steps = [
      [0.20, 0.32, 0.37],
      [0.38, 0.50, 0.55],
      [0.56, 0.68, 0.73],
      [0.74, 0.86, 0.90]
    ];
    steps.forEach(function (t, i) {
      var c = _cards[i];
      if (!c) return;
      tl.set(c,  { opacity: 0, y: 18 }, 0);
      tl.to(c,   { opacity: 1, y: 0,   duration: 0.04,         ease: "power2.out" }, t[0]);
      tl.to(c,   { opacity: 0, y: -12, duration: t[2] - t[1],  ease: "power1.in"  }, t[1]);
    });

    _tl = tl;
  }

  /* ── Two-state button snap helpers ── */
  function _snapBtnDown(instant) {
    if (!_btnEl || _btnTargetY <= 4) return;
    _btnIsDown = true;
    if (instant) {
      gsap.set(_btnEl, { y: _btnTargetY });
    } else {
      gsap.to(_btnEl, { y: _btnTargetY, duration: 0.32, ease: "power2.out", overwrite: true });
    }
  }

  function _snapBtnUp(instant) {
    if (!_btnEl) return;
    _btnIsDown = false;
    if (instant) {
      gsap.set(_btnEl, { y: 0 });
    } else {
      gsap.to(_btnEl, { y: 0, duration: 0.32, ease: "power2.out", overwrite: true });
    }
  }

  /* ── Scrub timeline to a given progress value ── */
  function _set(p) {
    if (_locked) return;
    p = Math.max(0, Math.min(1, p));
    _prog = p;
    if (_tl) _tl.totalProgress(p);
    _cards.forEach(function (c) {
      var op = parseFloat(c.style.opacity) || 0;
      c.style.pointerEvents = op > 0.5 ? "auto" : "none";
    });
  }

  /* ── Animate progress to a target value, call cb on complete ── */
  function _animateTo(target, cb) {
    if (_stepTween) _stepTween.kill();
    var proxy = { v: _prog };
    _stepTween = gsap.to(proxy, {
      v: target,
      duration: 0.72,
      ease: "power2.inOut",
      onUpdate:   function () { _set(proxy.v); },
      onComplete: cb || null
    });
  }

  /* ── Advance or retreat one step ── */
  function _advanceStep(dir) {
    if (_locked || _stepCooldown) return;
    var next = _step + dir;
    if (next < 0) return;

    /* Past last step → animate to near-end then trigger Work transition */
    if (next >= STEP_PROGRESS.length) {
      _locked = true;
      _animateTo(0.99, function () { _doTransition(); });
      return;
    }

    _step = next;
    /* Snap button only at the 0↔1 boundary; all other steps leave it in place */
    if (_step >= 1 && !_btnIsDown) _snapBtnDown();
    else if (_step === 0 && _btnIsDown) _snapBtnUp();
    _stepCooldown = true;
    _animateTo(STEP_PROGRESS[_step], function () { _stepCooldown = false; });
  }

  function _doTransition(category) {
    if (typeof window._triggerModeTransition === "function")
      window._triggerModeTransition("work", null, {});
    if (category) {
      setTimeout(function () {
        if (window.PORTFOLIO_GALLERY && typeof window.PORTFOLIO_GALLERY.open === "function") {
          window.PORTFOLIO_GALLERY.open(category);
        }
      }, 700);
    }
  }

  /* ── Reset: put every element back to its exact starting state,
     then rebuild the timeline from scratch so no externally-killed
     tween can persist across home visits. ── */
  function _reset() {
    _locked       = false;
    _step         = 0;
    _stepCooldown = false;
    _btnIsDown    = false;
    if (_stepTween) { _stepTween.kill(); _stepTween = null; }

    _prog   = 0;
    _hole.v = 230;
    _root.style.setProperty("--web-hole-base", "230");

    if (typeof gsap !== "undefined" && _refsReady) {
      /* Kill any in-flight tween on the button before clearing props —
         this includes any half-done services.js close animation. */
      if (_btnEl) gsap.killTweensOf(_btnEl);

      /* Explicit element restore: use clearProps:"all" so position:fixed
         from services.js and y-transform from the previous scroll run
         are both removed before we measure the button for the new build. */
      if (_nameEl) gsap.set(_nameEl, { clearProps: "all" });
      if (_roleEl) gsap.set(_roleEl, { clearProps: "all" });
      if (_btnEl)  gsap.set(_btnEl,  { clearProps: "all" });
      if (_bgEl)   gsap.set(_bgEl,   { clearProps: "transform,scale" });
      if (_veilEl) gsap.set(_veilEl, { opacity: 0 });
      if (_cards.length) gsap.set(_cards, { opacity: 0, y: 18 });
    }
    _cards.forEach(function (c) { c.style.pointerEvents = "none"; });

    /* Rebuild with fresh tweens that lazily capture element state on
       first play — so the entrance animation in transitions.js always
       starts from the correct position regardless of what came before. */
    _buildTimeline();
  }

  /* Reset on every mode change:
     - Entering home  → rebuild timeline fresh, restoring clean starting state.
     - Leaving home   → hide cards and zero out scroll progress so they never
       bleed into Work or Teaching regardless of how navigation was triggered. */
  window.addEventListener("portfolio:modechange", function (e) {
    if (e.detail) _reset();
  }, { passive: true });

  /* ── Public API ── */
  window.homeScrollSequence = {
    onWheel: function (dy) {
      if (window.siteIntroPlaying) return false;
      if (!_tl || _locked) return false;
      /* scroll UP (dy < 0) = forward (+1); scroll DOWN (dy > 0) = backward (-1) */
      _advanceStep(dy < 0 ? 1 : -1);
      return true;
    },
    reset: _reset,
    getProgress: function () { return _prog; },
    getStep: function () { return _step; },
    /* Seek to a specific step, optionally instant (no tween on button). */
    seekStep: function (step, instant) {
      step = Math.max(0, Math.min(STEP_PROGRESS.length - 1, step));
      _step = step;
      _prog = STEP_PROGRESS[_step];
      if (_tl) _tl.totalProgress(_prog);
      _cards.forEach(function (c) {
        var op = parseFloat(c.style.opacity) || 0;
        c.style.pointerEvents = op > 0.5 ? "auto" : "none";
      });
      if (_btnEl) {
        if (_step >= 1) _snapBtnDown(instant);
        else            _snapBtnUp(instant);
      }
    }
  };

  /* ── Boot ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _initRefs);
  } else {
    _initRefs();
  }

}());
