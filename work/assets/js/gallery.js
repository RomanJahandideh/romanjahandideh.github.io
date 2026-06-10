/* =====================================================
   PORTFOLIO GALLERY
   API: window.PORTFOLIO_GALLERY = { open(category), close() }
   Data: window.GALLERY_DATA  (gallery-data.js)
   Powered by GSAP 3.15 + GLightbox
   ===================================================== */
(function () {
  "use strict";

  var HAS_GSAP      = (typeof gsap !== "undefined");
  var HAS_GLIGHTBOX = (typeof GLightbox !== "undefined");

  /* ── State ─────────────────────────────────────────── */
  var _overlay         = null;
  var _currentCat      = null;
  var _currentArtworks = [];
  var _currentArtIdx   = 0;
  var _tiltQrx         = null;
  var _tiltQry         = null;
  var _glb             = null;
  var _cardObserver    = null;
  var _cardOrder       = 0;
  var _openerEl        = null; /* element that triggered open — focus returns here on close */

  /* ── Build DOM (once on first open) ────────────────── */
  function _ensureDOM() {
    if (_overlay) return;

    _overlay = document.createElement("div");
    _overlay.id = "gallery-overlay";
    _overlay.setAttribute("role", "dialog");
    _overlay.setAttribute("aria-modal", "true");
    _overlay.setAttribute("aria-hidden", "true");

    _overlay.innerHTML = [
      /* LIST VIEW */
      '<div id="gallery-list-view">',
        '<header class="gallery-header">',
          '<div class="gallery-header-left">',
            '<button class="gallery-back-btn" data-gallery-close aria-label="Close gallery">',
              '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 1L1 7l6 6M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
              'Back',
            '</button>',
            '<h2 class="gallery-category-title" id="gallery-cat-title"></h2>',
          '</div>',
          '<div class="gallery-header-right">',
            '<button class="gallery-close-btn" id="gallery-close-btn-list" data-gallery-close aria-label="Close">&#x2715;</button>',
          '</div>',
        '</header>',
        '<div class="gallery-body" id="gallery-body">',
          '<p class="gallery-browse-hint">Click any artwork to view details</p>',
          '<div class="gallery-grid" id="gallery-grid"></div>',
        '</div>',
      '</div>',

      /* DETAIL VIEW */
      '<div id="gallery-detail">',
        '<header class="detail-header">',
          '<button class="detail-back-btn" id="detail-back-btn" aria-label="Back to gallery">',
            '<svg viewBox="0 0 14 14"><path d="M7 1L1 7l6 6M1 7h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
            'Back',
          '</button>',
          '<button class="gallery-close-btn" id="gallery-close-btn-detail" data-gallery-close aria-label="Close">&#x2715;</button>',
        '</header>',
        '<div class="detail-body" id="detail-body">',
          '<div class="detail-image-col">',
            '<div class="detail-hero-wrap" id="detail-hero-wrap">',
              '<img class="detail-hero-img" id="detail-hero-img" alt="" src="">',
              '<video class="detail-hero-video" id="detail-hero-video" controls playsinline style="display:none"></video>',
              '<div class="yt-facade" id="detail-hero-yt" style="display:none">',
                '<img class="yt-facade__poster" id="yt-poster" alt="">',
                '<button class="yt-facade__play" id="yt-play-btn" type="button" aria-label="Play video">',
                  '<svg viewBox="0 0 24 24" width="26" height="26" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
                '</button>',
                '<iframe class="yt-facade__iframe" id="yt-iframe" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen style="display:none" title=""></iframe>',
              '</div>',
              '<div class="detail-hero-placeholder" id="detail-hero-placeholder">&#x1F3A8;</div>',
              '<button class="detail-zoom-btn" id="detail-zoom-btn" aria-label="View fullscreen">',
                '<svg viewBox="0 0 16 16"><path d="M1 6V1h5M10 1h5v5M15 10v5h-5M6 15H1v-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
              '</button>',
            '</div>',
          '</div>',
          '<div class="detail-info-col" id="detail-info-col">',
            '<span class="detail-kicker" id="detail-caption"></span>',
            '<h1 class="detail-title" id="detail-title"></h1>',
            '<div class="detail-rule"></div>',
            '<p class="detail-desc" id="detail-desc"></p>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(_overlay);
    _bindEvents();
    if (HAS_GSAP) { _initTilt(); _initMagnetic(); }
  }

  /* ── Open gallery for a category ───────────────────── */
  function open(category) {
    _ensureDOM();
    _currentCat = category;
    _openerEl = document.activeElement || null;

    var data = (window.GALLERY_DATA && window.GALLERY_DATA[category]) || {};
    _currentArtworks = data.artworks || [];

    document.getElementById("gallery-cat-title").textContent = category;

    /* Show list, hide detail */
    var listView = document.getElementById("gallery-list-view");
    var detail   = document.getElementById("gallery-detail");
    listView.style.cssText = "display:flex;flex-direction:column;height:100%";
    detail.classList.remove("is-open");
    detail.style.display = "none";

    _renderGrid(_currentArtworks);

    var body = document.getElementById("gallery-body");
    if (body) body.scrollTop = 0;

    _overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (HAS_GSAP) {
      _overlay.style.display       = "flex";
      _overlay.style.flexDirection = "column";
      gsap.fromTo(_overlay,
        { opacity: 0, scale: 0.96, y: 24 },
        { opacity: 1, scale: 1,    y: 0,
          duration: 0.50, ease: "expo.out",
          onStart: function () { _overlay.classList.add("is-open"); },
          onComplete: function () {
            var closeBtn = _overlay.querySelector("[data-gallery-close]");
            if (closeBtn) closeBtn.focus();
          }
        }
      );
    } else {
      _overlay.classList.add("is-open");
      var closeBtn = _overlay.querySelector("[data-gallery-close]");
      if (closeBtn) closeBtn.focus();
    }
  }

  /* ── Render artwork grid ────────────────────────────── */
  function _renderGrid(artworks) {
    var grid = document.getElementById("gallery-grid");
    grid.innerHTML = "";

    /* Disconnect any previous IntersectionObserver */
    if (_cardObserver) { _cardObserver.disconnect(); _cardObserver = null; }
    _cardOrder = 0;

    if (!artworks || artworks.length === 0) {
      var empty = document.createElement("div");
      empty.className = "gallery-empty";
      empty.innerHTML = [
        '<div class="gallery-empty-icon">&#x1F3A8;</div>',
        '<div class="gallery-empty-title">Coming Soon</div>',
        '<div class="gallery-empty-text">Artworks for this category will be added soon.</div>'
      ].join('');
      grid.appendChild(empty);
      return;
    }

    artworks.forEach(function (artwork, i) {
      var card = document.createElement("div");
      card.className = "gallery-card";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "View " + _esc(artwork.title || "artwork"));

      var imgSrc = artwork.image   || "";
      var vidSrc = artwork.video   || "";
      var ytId   = artwork.youtube || "";
      card.innerHTML = [
        '<div class="gallery-card-image-wrap">',
          imgSrc
            ? '<img class="gallery-card-img" src="' + imgSrc + '" alt="' + _esc(artwork.title) + '" loading="lazy" crossorigin="anonymous">'
            : ytId
              ? '<img class="gallery-card-img" src="https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg" alt="' + _esc(artwork.title) + '" loading="lazy">' +
                '<div class="yt-play-badge" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div>'
              : vidSrc
                ? '<video class="gallery-card-video" src="' + vidSrc + '" muted autoplay loop playsinline></video>'
                : '<div class="gallery-card-placeholder">&#x1F3A8;</div>',
        '</div>',
        '<div class="gallery-card-info">',
          '<div class="gallery-card-title">' + _esc(artwork.title || "Untitled") + '</div>',
          artwork.caption
            ? '<div class="gallery-card-caption">' + _esc(artwork.caption) + '</div>'
            : '',
        '</div>'
      ].join('');

      var img = card.querySelector(".gallery-card-img");
      if (img) {
        img.addEventListener("error", function () {
          this.parentElement.innerHTML = '<div class="gallery-card-placeholder">&#x1F3A8;</div>';
        });
      }

      card.addEventListener("click",   function ()  { openDetail(i); });
      card.addEventListener("keydown",  function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(i); }
      });

      grid.appendChild(card);
    });

    /* ── GSAP stagger + IntersectionObserver scroll-in ── */
    if (HAS_GSAP) {
      var cards     = Array.from(grid.querySelectorAll(".gallery-card"));
      var bodyEl    = document.getElementById("gallery-body");

      gsap.set(cards, { opacity: 0, y: 26, scale: 0.93 });

      _cardObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          _cardObserver.unobserve(entry.target);
          var delay = (_cardOrder < 9) ? _cardOrder * 0.052 : 0;
          _cardOrder++;
          gsap.to(entry.target, {
            opacity: 1, y: 0, scale: 1,
            duration: 0.52, ease: "expo.out", delay: delay
          });
        });
      }, { root: bodyEl, threshold: 0.06 });

      cards.forEach(function (c) { _cardObserver.observe(c); });
    }
  }

  /* ── Open detail view ───────────────────────────────── */
  function openDetail(index) {
    _ensureDOM();
    _currentArtIdx = index;

    var artwork = _currentArtworks[index];
    if (!artwork) return;

    var heroImg     = document.getElementById("detail-hero-img");
    var heroVideo   = document.getElementById("detail-hero-video");
    var placeholder = document.getElementById("detail-hero-placeholder");
    var zoomBtn     = document.getElementById("detail-zoom-btn");
    var captionEl   = document.getElementById("detail-caption");
    var titleEl     = document.getElementById("detail-title");
    var descEl      = document.getElementById("detail-desc");
    var infoCol     = document.getElementById("detail-info-col");
    var ruleEl      = infoCol ? infoCol.querySelector(".detail-rule") : null;
    var ytFacade    = document.getElementById("detail-hero-yt");
    var ytPoster    = document.getElementById("yt-poster");
    var ytIframe    = document.getElementById("yt-iframe");
    var ytPlayBtn   = document.getElementById("yt-play-btn");

    /* Stop any previous video */
    if (heroVideo) { heroVideo.pause(); heroVideo.removeAttribute("src"); heroVideo.style.display = "none"; }
    /* Reset any previous YouTube facade */
    if (ytIframe)  { ytIframe.src = ""; ytIframe.style.display = "none"; }
    if (ytPoster)  { ytPoster.style.display = ""; }
    if (ytPlayBtn) { ytPlayBtn.style.display = ""; }
    if (ytFacade)  { ytFacade.style.display = "none"; }

    /* Populate content */
    titleEl.textContent = artwork.title || "";
    descEl.textContent  = artwork.description || "";

    if (artwork.caption) {
      captionEl.textContent = artwork.caption;
      captionEl.style.display = "inline-flex";
    } else {
      captionEl.style.display = "none";
    }

    /* Hero media — YouTube > local video > image */
    if (artwork.youtube && ytFacade) {
      placeholder.style.display = "none";
      heroImg.style.display     = "none";
      heroVideo.style.display   = "none";
      ytPoster.src = "https://img.youtube.com/vi/" + artwork.youtube + "/maxresdefault.jpg";
      ytPoster.onerror = function () { this.src = "https://img.youtube.com/vi/" + artwork.youtube + "/hqdefault.jpg"; };
      ytPoster.alt = artwork.title || "";
      ytFacade.dataset.ytId = artwork.youtube;
      ytFacade.setAttribute("aria-label", "Play " + _esc(artwork.title || "video"));
      ytFacade.style.display  = "";
      ytFacade.style.opacity  = "0";
      if (zoomBtn) zoomBtn.style.display = "none";
    } else if (artwork.video && heroVideo) {
      placeholder.style.display  = "none";
      heroImg.style.display      = "none";
      heroVideo.src              = artwork.video;
      heroVideo.style.display    = "block";
      heroVideo.style.opacity    = "0";
      if (zoomBtn) zoomBtn.style.display = "none";
    } else if (artwork.image) {
      placeholder.style.display = "none";
      heroImg.style.display      = "block";
      heroImg.style.opacity      = "0";
      heroImg.src                = artwork.image;
      heroImg.alt                = artwork.title || "";
      heroImg.onerror = function () {
        heroImg.style.display = "none";
        placeholder.style.display = "flex";
      };
      if (zoomBtn) zoomBtn.style.display = "flex";
    } else {
      heroImg.style.display     = "none";
      placeholder.style.display = "flex";
      if (zoomBtn) zoomBtn.style.display = "none";
    }

    /* Show detail, hide list */
    var listView = document.getElementById("gallery-list-view");
    var detail   = document.getElementById("gallery-detail");
    listView.style.display = "none";
    detail.style.cssText   = "display:flex;flex-direction:column;height:100%";
    detail.classList.add("is-open");

    if (!HAS_GSAP) return;

    /* Reset hidden state for content stagger */
    gsap.set([captionEl, titleEl, descEl], { opacity: 0, y: 12 });
    if (ruleEl) gsap.set(ruleEl, { scaleX: 0, transformOrigin: "left" });

    /* Slide detail in from right */
    gsap.fromTo(detail,
      { opacity: 0, x: 32 },
      { opacity: 1, x: 0, duration: 0.40, ease: "expo.out",
        onComplete: function () {
          /* Stagger content after panel arrives */
          if (artwork.youtube && ytFacade) {
            gsap.to(ytFacade, { opacity: 1, duration: 0.45, ease: "power2.out" });
          } else if (artwork.video && heroVideo) {
            gsap.to(heroVideo, { opacity: 1, duration: 0.45, ease: "power2.out" });
          } else if (artwork.image) {
            gsap.to(heroImg, { opacity: 1, duration: 0.45, ease: "power2.out" });
          }
          var tl = gsap.timeline({ delay: 0.08 });
          tl.to(captionEl, { opacity: 1, y: 0, duration: 0.32, ease: "power2.out" });
          tl.to(titleEl,   { opacity: 1, y: 0, duration: 0.38, ease: "power2.out" }, "-=0.18");
          if (ruleEl) tl.to(ruleEl, { scaleX: 1, duration: 0.36, ease: "power2.out" }, "-=0.2");
          tl.to(descEl,    { opacity: 1, y: 0, duration: 0.34, ease: "power2.out" }, "-=0.18");
        }
      }
    );
  }

  /* ── Close gallery overlay ──────────────────────────── */
  function close() {
    if (!_overlay) return;
    if (_glb) { _glb.destroy(); _glb = null; }
    var hv = document.getElementById("detail-hero-video");
    if (hv) { hv.pause(); hv.removeAttribute("src"); }
    var yi = document.getElementById("yt-iframe");
    if (yi) { yi.src = ""; }

    if (HAS_GSAP) {
      gsap.to(_overlay, {
        opacity: 0, scale: 0.97, y: 12, duration: 0.28, ease: "power2.in",
        onComplete: function () {
          _overlay.classList.remove("is-open");
          _overlay.setAttribute("aria-hidden", "true");
          _overlay.style.display = "";
          gsap.set(_overlay, { clearProps: "opacity,scale,y" });
          document.body.style.overflow = "";
          if (_openerEl && typeof _openerEl.focus === "function") _openerEl.focus();
          if (window.PortfolioModes && window.PortfolioModes.getMode() !== "work") {
            window.PortfolioModes.setMode("work", {});
          }
        }
      });
    } else {
      _overlay.classList.remove("is-open");
      _overlay.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (_openerEl && typeof _openerEl.focus === "function") _openerEl.focus();
      if (window.PortfolioModes && window.PortfolioModes.getMode() !== "work") {
        window.PortfolioModes.setMode("work", {});
      }
    }
  }

  /* ── Close detail → back to grid ───────────────────── */
  function _closeDetail() {
    var hv = document.getElementById("detail-hero-video");
    if (hv) { hv.pause(); hv.removeAttribute("src"); }
    var yi = document.getElementById("yt-iframe");
    if (yi) { yi.src = ""; yi.style.display = "none"; }
    var yp = document.getElementById("yt-poster");
    if (yp) { yp.style.display = ""; }
    var yb = document.getElementById("yt-play-btn");
    if (yb) { yb.style.display = ""; }
    var listView = document.getElementById("gallery-list-view");
    var detail   = document.getElementById("gallery-detail");
    if (!listView || !detail) return;

    if (HAS_GSAP) {
      gsap.to(detail, {
        opacity: 0, x: 28, duration: 0.24, ease: "power2.in",
        onComplete: function () {
          detail.classList.remove("is-open");
          detail.style.display = "none";
          gsap.set(detail, { clearProps: "opacity,x" });
          listView.style.cssText = "display:flex;flex-direction:column;height:100%";
          gsap.fromTo(listView, { opacity: 0, x: -22 }, { opacity: 1, x: 0, duration: 0.32, ease: "expo.out" });
        }
      });
    } else {
      listView.style.cssText = "display:flex;flex-direction:column;height:100%";
      detail.classList.remove("is-open");
      detail.style.display = "none";
    }
  }

  /* ── GLightbox fullscreen ───────────────────────────── */
  function _openLightbox() {
    var artwork = _currentArtworks[_currentArtIdx];
    if (!HAS_GLIGHTBOX || !artwork || !artwork.image || artwork.video) return;
    if (_glb) { _glb.destroy(); _glb = null; }
    _glb = GLightbox({
      elements: [{ href: artwork.image, type: "image" }],
      touchNavigation: true, loop: false, zoomable: true,
      openEffect: "zoom", closeEffect: "zoom"
    });
    _glb.open();
  }

  /* ── GSAP 3D tilt on hero image wrap ────────────────── */
  function _initTilt() {
    var heroWrap = document.getElementById("detail-hero-wrap");
    if (!heroWrap) return;
    _tiltQrx = gsap.quickTo(heroWrap, "rotateX", { duration: 0.55, ease: "power2.out" });
    _tiltQry = gsap.quickTo(heroWrap, "rotateY", { duration: 0.55, ease: "power2.out" });
    gsap.set(heroWrap, { transformPerspective: 900, transformStyle: "preserve-3d" });

    heroWrap.addEventListener("mousemove", function (e) {
      var r  = heroWrap.getBoundingClientRect();
      var mx = ((e.clientX - r.left)  / r.width  - 0.5) * 9;
      var my = ((e.clientY - r.top)   / r.height - 0.5) * 9;
      _tiltQrx(-my);
      _tiltQry(mx);
    }, { passive: true });

    heroWrap.addEventListener("mouseleave", function () {
      _tiltQrx(0);
      _tiltQry(0);
    });
  }

  /* ── Magnetic close buttons ─────────────────────────── */
  function _initMagnetic() {
    var RADIUS = 62;
    function bindMagnet(btn) {
      if (!btn) return;
      document.addEventListener("mousemove", function (e) {
        if (!_overlay || !_overlay.classList.contains("is-open")) return;
        var r  = btn.getBoundingClientRect();
        var cx = r.left + r.width  / 2;
        var cy = r.top  + r.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < RADIUS) {
          var s = (1 - d / RADIUS) * 0.40;
          gsap.to(btn, { x: dx * s, y: dy * s, duration: 0.28, ease: "power2.out", overwrite: true });
        } else {
          gsap.to(btn, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.45)", overwrite: true });
        }
      }, { passive: true });
    }
    requestAnimationFrame(function () {
      bindMagnet(document.getElementById("gallery-close-btn-list"));
      bindMagnet(document.getElementById("gallery-close-btn-detail"));
    });
  }

  /* ── Bind events ────────────────────────────────────── */
  function _bindEvents() {
    _overlay.addEventListener("click", function (e) {
      if (e.target.closest("[data-gallery-close]")) close();
    });

    document.getElementById("detail-back-btn").addEventListener("click", _closeDetail);

    document.getElementById("detail-hero-img").addEventListener("click", _openLightbox);
    document.getElementById("detail-zoom-btn").addEventListener("click", _openLightbox);

    /* ── YouTube facade ─────────────────────────────────── */
    function _activateYT() {
      var yf = document.getElementById("detail-hero-yt");
      var yi = document.getElementById("yt-iframe");
      var yp = document.getElementById("yt-poster");
      var yb = document.getElementById("yt-play-btn");
      if (!yf || !yi) return;
      var id = yf.dataset.ytId;
      if (!id) return;
      yi.title = yf.getAttribute("aria-label") || "";
      yi.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1";
      yi.style.display = "";
      if (yp) yp.style.display = "none";
      if (yb) yb.style.display = "none";
    }
    document.getElementById("yt-play-btn").addEventListener("click", _activateYT);
    document.getElementById("yt-poster").addEventListener("click",   _activateYT);

    document.addEventListener("keydown", function (e) {
      if (!_overlay || !_overlay.classList.contains("is-open")) return;
      if (e.key === "Escape") {
        var detail = document.getElementById("gallery-detail");
        if (detail && detail.classList.contains("is-open")) _closeDetail();
        else close();
      }
    });
  }

  /* ── HTML-escape helper ─────────────────────────────── */
  function _esc(str) {
    return (str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  /* ── Export ─────────────────────────────────────────── */
  window.PORTFOLIO_GALLERY = { open: open, close: close };

}());
