/* =========================================================
   Contact Window — JS controller
   Nav link click → opens Contact window (same pattern as toolbar-about.js).
   Click outside / Escape / section nav / mode change → closes.
   ========================================================= */
(function () {
  "use strict";

  var _win    = null;
  var _isOpen = false;

  function init() {
    _win = document.getElementById("contact");
    if (!_win) return;

    _win.setAttribute("aria-hidden", "true");
    _win.classList.remove("is-open");

    /* Close button inside window */
    var closeBtn = document.getElementById("contact-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () { _close(); });
    }

    /* Nav link intercept — <a href="#contact"> */
    document.addEventListener("click", function (e) {
      var link = e.target.closest("a[href='#contact']");
      if (!link) return;
      e.preventDefault();
      if (_isOpen) _close(); else _open();
    });

    /* Click outside → close */
    document.addEventListener("pointerdown", function (e) {
      if (!_isOpen) return;
      if (_win.contains(e.target)) return;
      _close();
    }, true);

    /* Escape → close */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && _isOpen) {
        e.preventDefault();
        _close();
      }
    });

    /* Other section nav links → close (not the contact link itself) */
    document.addEventListener("click", function (e) {
      if (!_isOpen) return;
      var link = e.target.closest("a[data-nav], a[data-mode-link]");
      if (!link) return;
      if (link.getAttribute("href") === "#contact") return;
      _close();
    });

    /* Portfolio mode change → close */
    window.addEventListener("portfolio:modechange", function () {
      if (_isOpen) _close();
    }, { passive: true });

    /* Deep-link: page loaded with #contact hash */
    if (window.location.hash === "#contact") {
      setTimeout(_open, 500);
    }

    /* Expose API */
    window.PortfolioContact = {
      open:   _open,
      close:  _close,
      isOpen: function () { return _isOpen; }
    };
  }

  function _open() {
    /* One-window-at-a-time */
    if (window.PortfolioAbout && typeof window.PortfolioAbout.close === "function") {
      window.PortfolioAbout.close();
    }

    _isOpen = true;
    _win.classList.add("is-open");
    _win.setAttribute("aria-hidden", "false");

    /* Lift the site-wide touch-action:none so the modal body can
       scroll on mobile. Inline style wins over any CSS rule. */
    document.body.style.touchAction = "auto";

    /* Update hash so nav.js marks contact active */
    window.location.hash = "#contact";

    /* Focus first input */
    setTimeout(function () {
      var first = _win.querySelector("input, textarea, button");
      if (first) first.focus();
    }, 360);
  }

  function _close() {
    _isOpen = false;
    _win.classList.remove("is-open");
    _win.setAttribute("aria-hidden", "true");

    /* Restore touch lock so the site scroll system works again */
    document.body.style.touchAction = "";

    /* Clear hash so nav.js removes active state */
    if (window.location.hash === "#contact") {
      window.location.hash = "";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
