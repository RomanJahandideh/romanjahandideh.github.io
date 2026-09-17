/* ============================================================
   Projects overlay controller.

   Clicking the "Projects" button no longer opens floating balls.
   Instead the whole home page desaturates and fades behind a
   full-screen, scrollable overlay of project write-ups. Both the
   background dim and the card entrance/exit are plain CSS
   transitions (see projects.css) driven off two class toggles —
   body.svc-open and #projects-overlay.is-open — so the reveal
   never depends on a JS animation ticker being alive, only on
   the class being present.

   body.svc-open is the same class the rest of the site already
   uses to know a panel is open (wheel-scroll blocking, touch-
   scroll blocking, hint text), so reusing it wires this feature
   into everything else for free.
   ============================================================ */
!(function () {
  "use strict";

  var btn, overlay, scrollEl, closeBtn, cards;
  var reduced = false;
  var isOpen = false;
  var lastFocus = null;
  var CLOSE_MS = 550;

  function init() {
    btn = document.getElementById("services-btn");
    overlay = document.getElementById("projects-overlay");
    scrollEl = document.getElementById("projects-overlay-scroll");
    closeBtn = document.getElementById("projects-close");
    if (!btn || !overlay || !scrollEl) return;

    cards = Array.prototype.slice.call(overlay.querySelectorAll(".project-card"));
    reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Each project has a small clickable thumbnail; GLightbox (already
    // loaded for other galleries on the site) opens it full size instead
    // of navigating to the image file.
    if (window.GLightbox) {
      window.GLightbox({ selector: ".project-thumb", touchNavigation: true, loop: false });
    }

    btn.addEventListener("click", function () {
      isOpen ? close() : open();
    });

    closeBtn && closeBtn.addEventListener("click", function () {
      close();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    });

    document.addEventListener("click", function (e) {
      var link = e.target.closest("[data-open-project]");
      if (!link) return;
      e.preventDefault();
      if (window.PortfolioAbout && window.PortfolioAbout.isOpen && window.PortfolioAbout.isOpen()) {
        window.PortfolioAbout.close();
      }
      var raw = link.getAttribute("data-open-project");
      open(raw === "" || raw === null ? null : parseInt(raw, 10));
    });

    window.addEventListener("hashchange", function () {
      var h = (location.hash || "").toLowerCase();
      if (isOpen && (h === "#about" || h === "#contact")) close();
    });

    window.addEventListener(
      "portfolio:modechange",
      function (e) {
        if (isOpen && e.detail && e.detail.mode !== "home") close();
      },
      { passive: true }
    );

    window.ProjectsOverlay = { open: open, close: close, isOpen: isOpenFn };
  }

  function isOpenFn() {
    return isOpen;
  }

  function open(index) {
    if (isOpen) {
      if (typeof index === "number") scrollToCard(index);
      return;
    }

    if (window.PortfolioAbout && window.PortfolioAbout.isOpen && window.PortfolioAbout.isOpen()) {
      window.PortfolioAbout.close();
    }

    isOpen = true;
    lastFocus = document.activeElement;
    document.body.classList.add("svc-open");
    btn.setAttribute("aria-expanded", "true");
    overlay.setAttribute("aria-hidden", "false");
    scrollEl.scrollTop = 0;

    // Force layout so the cards' initial (opacity:0) state paints
    // before .is-open flips it, otherwise the browser may collapse
    // the two states into one frame and skip the transition.
    void overlay.offsetHeight;
    overlay.classList.add("is-open");

    if (typeof index === "number") {
      setTimeout(
        function () {
          scrollToCard(index);
        },
        reduced ? 0 : 80
      );
    }

    setTimeout(
      function () {
        var target = closeBtn || scrollEl;
        target && target.focus();
      },
      reduced ? 0 : 260
    );
  }

  function scrollToCard(index) {
    var card = cards[index];
    if (!card) return;
    var top = card.offsetTop - 20;
    scrollEl.scrollTo({ top: top, behavior: reduced ? "auto" : "smooth" });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    document.body.classList.remove("svc-open");
    btn.setAttribute("aria-expanded", "false");
    overlay.classList.remove("is-open");

    setTimeout(
      function () {
        overlay.setAttribute("aria-hidden", "true");
        var target = lastFocus && typeof lastFocus.focus === "function" ? lastFocus : btn;
        target.focus();
        lastFocus = null;
      },
      reduced ? 0 : CLOSE_MS
    );
  }

  "loading" === document.readyState
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
