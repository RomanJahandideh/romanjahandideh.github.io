/* =========================================================
   TOUCH SWIPE = DESKTOP SCROLL (mobile / tablet only)

   Replaces the old "tap advances one step" behaviour with a
   drag-based gesture that drives the same step engines the
   desktop wheel uses (homeScrollSequence / smokeVideoSequence),
   and never auto-triggers a section (mode) change from a swipe —
   reaching the end of the home sequence just stops.
   ========================================================= */
(function () {
  "use strict";

  if (!window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var THRESHOLD = 26;   // px of vertical drag before it counts as one "tick"
  var COOLDOWN   = 650; // ms between ticks, mirrors the desktop step animation

  var tracking = false;
  var lastY = 0;
  var lastDispatch = 0;
  var maxHomeStep = null;

  function interactiveTarget(el) {
    return !!(el && el.closest && el.closest(
      "a, button, input, textarea, select, [role='button'], .site-modal, #mode-indicator, nav, .nav, #contact, #about-window, #teaching-detail-overlay"
    ));
  }

  function panelOpen() {
    return !!(window.isPanelOpen && window.isPanelOpen());
  }

  function homeMaxStep() {
    if (maxHomeStep === null) {
      maxHomeStep = document.querySelectorAll(".seq-step-card").length || 4;
    }
    return maxHomeStep;
  }

  function dispatch(dy) {
    if (panelOpen() || window.artworkBgActive) return;

    var mode = window.PortfolioModes ? window.PortfolioModes.getMode() : "home";

    if (mode === "home" && window.homeScrollSequence) {
      var advancing = dy < 0;
      if (advancing && window.homeScrollSequence.getStep() >= homeMaxStep()) return;
      window.homeScrollSequence.onWheel(dy);
      return;
    }

    if ((mode === "work" || mode === "teaching") && window.smokeVideoSequence) {
      window.smokeVideoSequence.onWheel(dy);
    }
  }

  window.addEventListener("touchstart", function (e) {
    if (panelOpen() || interactiveTarget(e.target)) { tracking = false; return; }
    var t = e.touches[0];
    lastY = t.clientY;
    tracking = true;
  }, { passive: true });

  window.addEventListener("touchmove", function (e) {
    if (!tracking) return;
    var t = e.touches[0];
    var dy = t.clientY - lastY;

    if (Math.abs(dy) < THRESHOLD) return;

    var now = Date.now();
    if (now - lastDispatch >= COOLDOWN) {
      dispatch(dy);
      lastDispatch = now;
    }
    lastY = t.clientY;
  }, { passive: true });

  window.addEventListener("touchend", function () {
    tracking = false;
  }, { passive: true });
})();
