/* =========================================================
   TOOLBAR — About Window
   Eye socket click → opens About window.
   "Visual Timeline" button → cross-fades to timeline iframe view.
   Click outside / Escape / section nav → closes.
   ========================================================= */
(function () {
  "use strict";

  var _win        = null;
  var _trigger    = null;
  var _tlBtn      = null;   /* Visual Timeline button */
  var _backBtn    = null;   /* Back to About button in timeline view */
  var _isOpen     = false;

  function init() {
    _win     = document.getElementById("about-window");
    _trigger = document.getElementById("about-trigger");
    _tlBtn   = document.getElementById("abt-timeline-btn");
    _backBtn = document.getElementById("abt-back-btn");

    if (!_win || !_trigger) return;

    /* Eye socket click */
    _trigger.addEventListener("click", function (e) {
      e.stopPropagation();
      if (_isOpen) _close();
      else _open();
    });

    /* "Visual Timeline" reveals the iframe view */
    if (_tlBtn) {
      _tlBtn.addEventListener("click", function () {
        _win.classList.add("show-timeline");
        /* Lazy-load: swap data-src → src on the iframe now */
        var iframe = _win.querySelector(".abt-timeline-wrap iframe[data-src]");
        if (iframe) {
          iframe.src = iframe.getAttribute("data-src");
          iframe.removeAttribute("data-src");
        }
        _backBtn && _backBtn.focus();
      });
    }

    /* Back to text view */
    if (_backBtn) {
      _backBtn.addEventListener("click", function () {
        _win.classList.remove("show-timeline");
        _tlBtn && _tlBtn.focus();
      });
    }

    /* Click outside → close */
    document.addEventListener("pointerdown", function (e) {
      if (!_isOpen) return;
      if (_win.contains(e.target)) return;
      if (_trigger.contains(e.target)) return;
      _close();
    }, true);

    /* Escape → close */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && _isOpen) {
        e.preventDefault();
        _close();
        _trigger.focus();
      }
    });

    /* Section nav link → close */
    document.addEventListener("click", function (e) {
      if (!_isOpen) return;
      var link = e.target.closest("a[data-nav], a[data-mode-link]");
      if (link) _close();
    });

    /* Portfolio mode change → close */
    window.addEventListener("portfolio:modechange", function (e) {
      if (_isOpen && e.detail && e.detail.mode !== "home") _close();
    }, { passive: true });

    /* Expose for other scripts (services.js etc.) */
    window.PortfolioAbout = {
      open:   _open,
      close:  _close,
      isOpen: function () { return _isOpen; }
    };
  }

  function _open() {
    /* One-window-at-a-time */
    if (window.PortfolioContact && typeof window.PortfolioContact.close === "function") {
      window.PortfolioContact.close();
    }

    _isOpen = true;
    _win.classList.add("is-open");
    _win.setAttribute("aria-hidden", "false");
    _trigger.setAttribute("aria-expanded", "true");

    /* Focus first focusable inside window */
    setTimeout(function () {
      var first = _win.querySelector("button, a, [tabindex]");
      if (first) first.focus();
    }, 360);
  }

  function _close() {
    _isOpen = false;
    _win.classList.remove("is-open", "show-timeline");
    _win.setAttribute("aria-hidden", "true");
    _trigger.setAttribute("aria-expanded", "false");
  }

  /* ── Boot — defer so nav.js has moved #eyes first ── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    /* All other scripts run synchronously before this; safe to init */
    init();
  }
}());
