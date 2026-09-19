/* Project index overlay. Full descriptions are available as static pages. */
(function () {
  "use strict";
  var btn, overlay, scrollEl, closeBtn, cards;
  var isOpen = false;
  var lastFocus = null;

  function init() {
    btn = document.getElementById("services-btn");
    overlay = document.getElementById("projects-overlay");
    scrollEl = document.getElementById("projects-overlay-scroll");
    closeBtn = document.getElementById("projects-close");
    if (!btn || !overlay || !scrollEl || !closeBtn) return;
    cards = Array.prototype.slice.call(overlay.querySelectorAll(".project-card"));

    // Scrolling the index must not trigger the home page's swipe navigation.
    ["touchstart", "touchend"].forEach(function (type) {
      overlay.addEventListener(type, function (event) {
        event.stopPropagation();
      }, { passive: true });
    });

    btn.addEventListener("click", function () { isOpen ? close() : open(); });
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", function (event) {
      if (!isOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") {
        var links = overlay.querySelectorAll("button, a[href]");
        var first = links[0], last = links[links.length - 1];
        if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    document.addEventListener("click", function (event) {
      var link = event.target.closest("[data-open-project]");
      if (!link) return;
      event.preventDefault();
      var raw = link.getAttribute("data-open-project");
      open(raw === "" || raw === null ? null : parseInt(raw, 10));
    });
    window.addEventListener("hashchange", function () {
      if (location.hash.toLowerCase() === "#projects") open();
      else if (isOpen) close();
    });
    window.addEventListener("portfolio:modechange", function (event) {
      if (isOpen && event.detail && event.detail.mode !== "home") close();
    });
    window.ProjectsOverlay = {
      open: open,
      close: close,
      isOpen: function () { return isOpen; }
    };
    if (location.hash.toLowerCase() === "#projects") open();
  }

  function open(index) {
    if (typeof index === "number" && cards[index]) {
      var link = cards[index].querySelector(".project-summary-link");
      if (link) {
        window.location.assign(link.href);
        return;
      }
    }
    if (isOpen) return;
    if (window.PortfolioAbout && window.PortfolioAbout.isOpen && window.PortfolioAbout.isOpen()) {
      window.PortfolioAbout.close();
    }
    isOpen = true;
    lastFocus = document.activeElement;
    document.body.classList.add("svc-open");
    btn.setAttribute("aria-expanded", "true");
    overlay.setAttribute("aria-hidden", "false");
    overlay.classList.add("is-open");
    scrollEl.scrollTop = 0;
    closeBtn.focus();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    document.body.classList.remove("svc-open");
    btn.setAttribute("aria-expanded", "false");
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    if (location.hash.toLowerCase() === "#projects") {
      history.replaceState(history.state, "", location.pathname + location.search);
    }
    var target = lastFocus && lastFocus !== document.body && typeof lastFocus.focus === "function" ? lastFocus : btn;
    target.focus();
    lastFocus = null;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
