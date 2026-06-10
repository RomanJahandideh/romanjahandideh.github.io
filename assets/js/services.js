/* =========================================================
   SERVICES PANEL — Editorial Cinema v3
   Fix 2: hover=active on desktop, tap=active on touch
   Fix 3: Back to Services button after View Work
   Fix 5: Mobile horizontal-scroll strip + description pane
   ========================================================= */
(function () {
  "use strict";

  var _panel       = null;
  var _openBtn     = null;
  var _closeBtn    = null;
  var _grid        = null;
  var _backBtn     = null;
  var _mobilePaneDesc = null;
  var _mobilePaneBtn  = null;

  var _active      = null;   /* currently expanded .service-card */
  var _cards       = [];
  var _tiltsOn     = false;
  var _pendingReturn = null; /* { cardIdx } set when user clicks View Work */

  /* true on real pointer/hover devices (desktop) */
  var _isHoverDevice = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ── Init ──────────────────────────────────────────────── */

  function init() {
    _panel          = document.getElementById("services-panel");
    _openBtn        = document.getElementById("services-btn");
    _closeBtn       = document.getElementById("services-close-btn");
    _grid           = document.getElementById("services-grid");
    _backBtn        = document.getElementById("services-back-btn");
    _mobilePaneDesc = document.getElementById("services-mobile-desc");
    _mobilePaneBtn  = document.getElementById("services-mobile-work-btn");

    if (!_panel || !_openBtn) return;

    _cards = Array.from(_panel.querySelectorAll(".service-card"));

    /* Cards start invisible so GSAP can stagger them in on first open */
    if (window.gsap) {
      gsap.set(_cards, { opacity: 0, y: 24, scale: 0.96 });
    }

    /* ── Core listeners ────────────────────────────────── */

    _openBtn.addEventListener("click", openPanel);
    if (_closeBtn) _closeBtn.addEventListener("click", closePanel);

    /* Backdrop click closes */
    _panel.addEventListener("click", function (e) {
      if (e.target === _panel) closePanel();
    });

    /* Escape key */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && _panel.classList.contains("is-open")) closePanel();
    });

    /* Delegated grid interaction */
    if (_grid) {
      _grid.addEventListener("click", handleGridClick);
      _grid.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        var card = e.target.closest(".service-card");
        if (!card || e.target.closest(".service-work-btn")) return;
        e.preventDefault();
        toggleCard(card);
      });
    }

    /* Fix 2: hover=active — mouseenter/leave on desktop only */
    if (_isHoverDevice) {
      _cards.forEach(function (card) {
        card.addEventListener("mouseenter", function () {
          if (_active && _active !== card) collapseCard(_active);
          expandCard(card);
          _active = card;
        });
        card.addEventListener("mouseleave", function () {
          if (_active === card) {
            collapseCard(card);
            _active = null;
          }
        });
      });
    }

    /* 3-D tilt on mousemove (desktop) */
    _cards.forEach(function (card) {
      card.addEventListener("mousemove", onCardTilt.bind(null, card));
      card.addEventListener("mouseleave", onCardReset.bind(null, card));
    });

    /* Fix 3: Back to Services button */
    if (_backBtn) {
      _backBtn.addEventListener("click", handleBackToServices);
    }

    /* Fix 5: mobile pane "View Work" button */
    if (_mobilePaneBtn) {
      _mobilePaneBtn.addEventListener("click", function () {
        handleViewWork(_mobilePaneBtn);
      });
    }

    /* Hide back button when mode changes away from work */
    window.addEventListener("portfolio:modechange", function () {
      var mode = window.PortfolioModes ? window.PortfolioModes.getMode() : "home";
      if (mode !== "work") hideBackButton();
    });
  }

  /* ── Open ──────────────────────────────────────────────── */

  function openPanel() {
    _panel.classList.add("is-open");
    _panel.setAttribute("aria-hidden", "false");

    document.documentElement.classList.add("services-open");
    document.body.classList.add("services-open");

    hideBackButton();
    _tiltsOn = false;

    if (window.gsap) {
      gsap.set(_cards, { opacity: 0, y: 24, scale: 0.96 });

      /* Scope to card children only — mobile pane elements not affected */
      var allDesc = _panel.querySelectorAll(".service-card .service-desc");
      var allBtns = _panel.querySelectorAll(".service-card .service-work-btn");
      gsap.set(allDesc, { opacity: 0, y: 14 });
      gsap.set(allBtns, { opacity: 0, y: 10 });

      gsap.to(_cards, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.56,
        ease: "power3.out",
        stagger: 0.08,
        delay: 0.10,
        onComplete: function () { _tiltsOn = true; }
      });
    }

    if (_closeBtn) setTimeout(function () { _closeBtn.focus(); }, 80);
  }

  /* ── Close ─────────────────────────────────────────────── */

  function closePanel() {
    _panel.classList.remove("is-open");
    _panel.setAttribute("aria-hidden", "true");

    document.documentElement.classList.remove("services-open");
    document.body.classList.remove("services-open");

    _tiltsOn = false;

    if (_active) {
      _active.classList.remove("is-active");
      _active.setAttribute("aria-expanded", "false");
      var d = _active.querySelector(".service-detail");
      if (d) d.setAttribute("aria-hidden", "true");
      _active = null;
    }

    if (_openBtn) _openBtn.focus();
  }

  /* ── Grid click delegation ─────────────────────────────── */

  function handleGridClick(e) {
    /* View Work always takes priority */
    var workBtn = e.target.closest(".service-work-btn");
    if (workBtn) { handleViewWork(workBtn); return; }

    /* On hover devices, mouseenter handles expand — clicks don't toggle */
    if (_isHoverDevice) return;

    var card = e.target.closest(".service-card");
    if (card) toggleCard(card);
  }

  /* ── Card expand / collapse ────────────────────────────── */

  function toggleCard(card) {
    if (_active === card) {
      collapseCard(card);
      _active = null;
    } else {
      if (_active) collapseCard(_active);
      expandCard(card);
      _active = card;
    }
  }

  function expandCard(card) {
    card.classList.add("is-active");
    card.setAttribute("aria-expanded", "true");
    var detail = card.querySelector(".service-detail");
    if (detail) detail.setAttribute("aria-hidden", "false");

    /* Fix 5: on mobile, populate the shared pane instead of expanding inline */
    if (window.matchMedia("(max-width: 768px)").matches) {
      updateMobilePane(card);
      card.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      return;
    }

    if (!window.gsap) return;

    var desc = card.querySelector(".service-desc");
    var btn  = card.querySelector(".service-work-btn");

    if (desc) {
      gsap.fromTo(desc,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.48, ease: "power2.out", delay: 0.14 }
      );
    }
    if (btn) {
      gsap.fromTo(btn,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.36, ease: "power2.out", delay: 0.28 }
      );
    }
  }

  function collapseCard(card) {
    card.classList.remove("is-active");
    card.setAttribute("aria-expanded", "false");
    var detail = card.querySelector(".service-detail");
    if (detail) detail.setAttribute("aria-hidden", "true");

    if (window.gsap) {
      var desc = card.querySelector(".service-desc");
      var btn  = card.querySelector(".service-work-btn");
      gsap.set([desc, btn].filter(Boolean), { opacity: 0, y: 12 });
    }
  }

  /* ── Fix 5: mobile description pane ───────────────────── */

  function updateMobilePane(card) {
    var srcDesc = card.querySelector(".service-desc");
    var srcBtn  = card.querySelector(".service-work-btn");

    if (_mobilePaneDesc && srcDesc) {
      _mobilePaneDesc.textContent = srcDesc.textContent;
    }

    if (_mobilePaneBtn) {
      if (srcBtn && srcBtn.dataset.category) {
        _mobilePaneBtn.dataset.category = srcBtn.dataset.category;
        _mobilePaneBtn.style.display = "";
      } else {
        _mobilePaneBtn.style.display = "none";
      }
    }

    var pane = document.getElementById("services-mobile-pane");
    if (pane && window.gsap) {
      gsap.fromTo(pane,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.36, ease: "power2.out" }
      );
    }
  }

  /* ── 3-D tilt on mousemove ─────────────────────────────── */

  function onCardTilt(card, e) {
    if (!_tiltsOn || !window.gsap || !_isHoverDevice) return;

    var rect = card.getBoundingClientRect();
    var dx   = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
    var dy   = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);

    gsap.to(card, {
      rotateY: dx * 5,
      rotateX: -dy * 4,
      transformPerspective: 720,
      duration: 0.38,
      ease: "power2.out",
      overwrite: "auto"
    });
  }

  function onCardReset(card) {
    if (!window.gsap) return;
    gsap.to(card, {
      rotateY: 0,
      rotateX: 0,
      duration: 0.55,
      ease: "power3.out",
      overwrite: "auto"
    });
  }

  /* ── View Work ─────────────────────────────────────────── */

  function handleViewWork(btn) {
    var category = btn.dataset.category;
    if (!category) return;

    /* Fix 3: save which card was active so Back button can restore it */
    _pendingReturn = _active ? { cardIdx: _cards.indexOf(_active) } : null;

    closePanel();

    var openGallery = function () {
      if (window.PORTFOLIO_GALLERY && typeof window.PORTFOLIO_GALLERY.open === "function") {
        window.PORTFOLIO_GALLERY.open(category);
      }
    };

    if (window.PortfolioModes && typeof window.PortfolioModes.setMode === "function") {
      if (typeof window._triggerModeTransition === "function") {
        window._triggerModeTransition("work", null, {});
      } else {
        window.PortfolioModes.setMode("work", {});
      }
      setTimeout(openGallery, 680);
    } else {
      setTimeout(openGallery, 300);
    }

    /* Show Back button after gallery has opened */
    if (_pendingReturn !== null) {
      setTimeout(showBackButton, 820);
    }
  }

  /* ── Fix 3: Back to Services ───────────────────────────── */

  function showBackButton() {
    if (!_backBtn) return;
    _backBtn.classList.add("is-visible");
  }

  function hideBackButton() {
    if (!_backBtn) return;
    _backBtn.classList.remove("is-visible");
  }

  function handleBackToServices() {
    var returnCardIdx = _pendingReturn ? _pendingReturn.cardIdx : -1;
    _pendingReturn = null;
    hideBackButton();

    var doOpen = function () {
      openPanel();
      /* Re-expand the card the user was on */
      if (returnCardIdx >= 0 && _cards[returnCardIdx]) {
        var card = _cards[returnCardIdx];
        setTimeout(function () {
          if (_active) collapseCard(_active);
          expandCard(card);
          _active = card;
        }, 240);
      }
    };

    var mode = window.PortfolioModes ? window.PortfolioModes.getMode() : "home";
    if (mode !== "home") {
      if (typeof window._triggerModeTransition === "function") {
        window._triggerModeTransition("home", null, {});
      }
      /* Wait for curtain transition to settle before opening panel */
      setTimeout(doOpen, 840);
    } else {
      doOpen();
    }
  }

  /* ── Boot ──────────────────────────────────────────────── */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
