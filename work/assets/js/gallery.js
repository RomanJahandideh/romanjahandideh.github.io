/* =========================================================
   PORTFOLIO GALLERY
   Site-modal window — two layers: grid → single artwork.

   API (preserved):
     window.PORTFOLIO_GALLERY = { open(category), close() }

   Detection (preserved):
     #gallery-overlay.is-open   ← checked by main.js / transitions.js

   Data:
     window.GALLERY_DATA[category].artworks[]
     Each artwork: { title, caption, description, image?, youtube?, video? }
   ========================================================= */
(function () {
  "use strict";

  /* ── State ── */
  var _built    = false;
  var _view     = "none";   /* "none" | "list" | "detail" */
  var _cat      = null;
  var _items    = [];
  var _idx      = 0;
  var _touchX   = 0;
  var _ytLoaded   = false;
  var _opener     = null;   /* element that triggered open — focus returns here */
  var _filterTag  = "all";
  var _allItems   = [];
  var _filterBtns = [];

  /* ── DOM refs ── */
  var _overlay, _panel;
  var _listView, _detailView;
  var _catLabel, _catTitle, _countEl, _grid;
  var _lCloseBtn;
  var _filterBar = null;
  var _dTopbar, _dBreadcrumb, _dDetailCloseBtn;
  var _dImgWrap, _dImg;
  var _dYtWrap, _dYtPoster, _dYtPlay, _dYtIframe;
  var _dTitleOverlay, _dTitleEl;
  var _prevBtn, _nextBtn;
  var _dDescEl;
  var _dLinkBtn = null;

  /* ── Helpers ── */
  function _el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  function _mkCloseBtn(label) {
    var btn = _el("button", "gallery-close-btn");
    btn.type = "button";
    btn.setAttribute("aria-label", label || "Close");
    btn.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">' +
        '<path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg>';
    return btn;
  }

  function _chevronSvg(dir) {
    var d = dir === "left" ? "M7.5 1L1.5 6.5L7.5 12" : "M1.5 1L7.5 6.5L1.5 12";
    return (
      '<svg width="9" height="13" viewBox="0 0 9 13" fill="none" aria-hidden="true">' +
        '<path d="' + d + '" stroke="currentColor" stroke-width="1.6"' +
        ' stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>'
    );
  }

  /* ── Build DOM (once on first open) ── */
  function _build() {
    if (_built) return;
    _built = true;

    /* Backdrop */
    _overlay = _el("div");
    _overlay.id = "gallery-overlay";
    _overlay.setAttribute("aria-hidden", "true");

    /* Panel */
    _panel = _el("div");
    _panel.id = "gallery-panel";
    _panel.setAttribute("role", "dialog");
    _panel.setAttribute("aria-modal", "true");
    _panel.setAttribute("aria-label", "Portfolio gallery");

    /* ─── LIST VIEW ─── */
    _listView = _el("div");
    _listView.id = "gallery-list-view";

    _lCloseBtn = _mkCloseBtn("Close gallery");
    _lCloseBtn.addEventListener("click", _close);

    var header = _el("div", "gallery-header");

    _catLabel = _el("div", "gallery-eyebrow");
    _catLabel.textContent = "Work";

    _catTitle = _el("h2", "gallery-cat-title");

    var rule = _el("hr", "gallery-orange-rule");
    rule.setAttribute("aria-hidden", "true");

    _countEl = _el("p", "gallery-count");

    header.appendChild(_catLabel);
    header.appendChild(_catTitle);
    header.appendChild(rule);
    header.appendChild(_countEl);

    _grid = _el("div");
    _grid.id = "gallery-grid";

    _filterBar = _el("div", "gallery-filter-bar gal-hidden");
    _filterBar.id = "gallery-filter-bar";

    _listView.appendChild(_lCloseBtn);
    _listView.appendChild(header);
    _listView.appendChild(_filterBar);
    _listView.appendChild(_grid);

    /* ─── DETAIL VIEW ─── */
    _detailView = _el("div");
    _detailView.id = "gallery-detail-view";
    _detailView.classList.add("gal-hidden");

    /* Topbar: breadcrumb left, × right */
    _dTopbar = _el("div", "gallery-detail-topbar");

    _dBreadcrumb = _el("span", "gallery-detail-breadcrumb");

    /* × in detail → back to gallery grid (not close-all) */
    _dDetailCloseBtn = _mkCloseBtn("Back to gallery");
    _dDetailCloseBtn.addEventListener("click", _showList);

    _dTopbar.appendChild(_dBreadcrumb);
    _dTopbar.appendChild(_dDetailCloseBtn);

    /* Image area */
    _dImgWrap = _el("div", "gallery-detail-img-wrap");

    _dImg = _el("img");
    _dImg.id = "gallery-detail-img";
    _dImg.alt = "";
    _dImg.style.display = "none";
    _dImgWrap.appendChild(_dImg);

    /* YouTube facade */
    _dYtWrap = _el("div", "gallery-yt-wrap");
    _dYtWrap.style.display = "none";

    _dYtPoster = _el("img", "gallery-yt-poster");
    _dYtPoster.alt = "";

    _dYtPlay = _el("button", "gallery-yt-play");
    _dYtPlay.type = "button";
    _dYtPlay.setAttribute("aria-label", "Play video");
    _dYtPlay.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">' +
        '<path d="M4 3.5L15 9L4 14.5V3.5Z" fill="currentColor"/>' +
      '</svg>';
    _dYtPlay.addEventListener("click", _loadYt);

    _dYtIframe = _el("iframe", "gallery-yt-iframe");
    _dYtIframe.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    );
    _dYtIframe.setAttribute("allowfullscreen", "");
    _dYtIframe.title = "Video";

    _dYtWrap.appendChild(_dYtPoster);
    _dYtWrap.appendChild(_dYtPlay);
    _dYtWrap.appendChild(_dYtIframe);
    _dImgWrap.appendChild(_dYtWrap);

    /* Title overlay — gradient scrim at bottom of image */
    _dTitleOverlay = _el("div", "gallery-detail-title-overlay");
    _dTitleEl = _el("p", "gallery-detail-title");
    _dTitleOverlay.appendChild(_dTitleEl);
    _dImgWrap.appendChild(_dTitleOverlay);

    /* Navigation arrows */
    _prevBtn = _el("button", "gallery-nav-btn gallery-nav-prev");
    _prevBtn.type = "button";
    _prevBtn.setAttribute("aria-label", "Previous artwork");
    _prevBtn.innerHTML = _chevronSvg("left");
    _prevBtn.addEventListener("click", function () { _navigate(-1); });

    _nextBtn = _el("button", "gallery-nav-btn gallery-nav-next");
    _nextBtn.type = "button";
    _nextBtn.setAttribute("aria-label", "Next artwork");
    _nextBtn.innerHTML = _chevronSvg("right");
    _nextBtn.addEventListener("click", function () { _navigate(1); });

    _dImgWrap.appendChild(_prevBtn);
    _dImgWrap.appendChild(_nextBtn);

    /* Description strip below image */
    var dDescStrip = _el("div", "gallery-detail-desc-strip");
    _dDescEl = _el("p", "gallery-detail-desc");
    dDescStrip.appendChild(_dDescEl);

    _dLinkBtn = _el("a", "gallery-visit-btn");
    _dLinkBtn.textContent = "Visit Project →";
    _dLinkBtn.setAttribute("rel", "noopener noreferrer");
    _dLinkBtn.style.display = "none";
    dDescStrip.appendChild(_dLinkBtn);

    _detailView.appendChild(_dTopbar);
    _detailView.appendChild(_dImgWrap);
    _detailView.appendChild(dDescStrip);

    /* Assemble */
    _panel.appendChild(_listView);
    _panel.appendChild(_detailView);
    _overlay.appendChild(_panel);
    document.body.appendChild(_overlay);

    /* Global events */
    _overlay.addEventListener("pointerdown", _onBackdropClick);
    document.addEventListener("keydown", _onKeydown);
    _dImgWrap.addEventListener("touchstart", _onTouchStart, { passive: true });
    _dImgWrap.addEventListener("touchend",   _onTouchEnd,   { passive: true });
    window.addEventListener("resize", function () {
      if (_view === "list") _syncSquares();
    });
  }

  /* ── Open gallery for a category ── */
  function _openGallery(cat) {
    _build();
    _opener = document.activeElement || null;

    var data = window.GALLERY_DATA && window.GALLERY_DATA[cat];
    if (!data || !data.artworks || !data.artworks.length) return;

    _cat       = cat;
    _allItems  = data.artworks;
    _items     = _allItems.slice();
    _filterTag = "all";

    _catTitle.textContent    = cat;
    _dBreadcrumb.textContent = cat;
    _countEl.textContent     =
      _items.length + (_items.length === 1 ? " piece" : " pieces");

    _buildFilterBar();
    _buildGrid();
    _showList();

    _overlay.removeAttribute("aria-hidden");
    _overlay.classList.add("is-open");
    document.body.classList.add("gallery-open");

    /* Two rAF passes: first lets the overlay become visible, second reads
       actual rendered dimensions after the browser has laid out the grid. */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { _syncSquares(); });
    });

    setTimeout(function () { _lCloseBtn.focus(); }, 80);
  }

  /* ── Build thumbnail grid ── */
  function _buildGrid() {
    _grid.innerHTML = "";

    _items.forEach(function (item, i) {
      var card = _el("div", "gallery-card");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", "View " + (item.title || "artwork"));

      var wrap = _el("div", "gallery-thumb-wrap");

      var img = _el("img", "gallery-thumb-img");
      img.alt      = item.title || "";
      img.loading  = "lazy";
      img.decoding = "async";

      if (item.youtube) {
        img.src = "https://img.youtube.com/vi/" + item.youtube + "/hqdefault.jpg";
        var badge = _el("div", "gallery-thumb-play");
        badge.innerHTML =
          '<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">' +
            '<path d="M2 1.5L9 5L2 8.5V1.5Z" fill="currentColor"/>' +
          '</svg>';
        wrap.appendChild(badge);
      } else if (item.image) {
        img.src = item.image;
      }

      wrap.appendChild(img);

      var titleEl = _el("p", "gallery-thumb-title");
      titleEl.textContent = item.title || "";

      card.appendChild(wrap);
      card.appendChild(titleEl);

      /* Stagger entry animation — cap delay at 0.36s for large grids */
      card.style.animationDelay = Math.min(i * 0.022, 0.36) + "s";

      (function (idx) {
        function open() { _showDetail(idx); }
        card.addEventListener("click", open);
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        });
      }(i));

      _grid.appendChild(card);
    });
  }

  /* ── Show list view ── */
  function _showList() {
    _view = "list";
    _listView.classList.remove("gal-hidden");
    _detailView.classList.add("gal-hidden");
    _ytLoaded = false;
    _resetYt();
    /* Re-sync in case the window was resized while detail view was open */
    requestAnimationFrame(function () { _syncSquares(); });
    setTimeout(function () { _lCloseBtn.focus(); }, 60);
  }

  /* ── Show detail for item[idx] ── */
  function _showDetail(idx) {
    _idx = ((idx % _items.length) + _items.length) % _items.length;
    var item = _items[_idx];

    _view = "detail";
    _listView.classList.add("gal-hidden");
    _detailView.classList.remove("gal-hidden");

    /* Update text */
    _dTitleEl.textContent = item.title || "";
    _dDescEl.textContent  = item.description || item.caption || "";

    if (item.link) {
      _dLinkBtn.href = item.link;
      var isInternal = item.link.charAt(0) === "/" || item.link.charAt(0) === ".";
      _dLinkBtn.setAttribute("target", isInternal ? "_self" : "_blank");
      _dLinkBtn.style.display = "inline-flex";
    } else {
      _dLinkBtn.style.display = "none";
    }

    /* Reset media */
    _dImg.style.display    = "none";
    _dImg.src              = "";
    _dYtWrap.style.display = "none";
    _ytLoaded              = false;
    _resetYt();

    /* Load correct media type */
    if (item.youtube) {
      var ytId = item.youtube;
      _dYtWrap.style.display = "flex";
      _dYtPoster.src = "https://img.youtube.com/vi/" + ytId + "/maxresdefault.jpg";
      _dYtPoster.alt = item.title || "";
      _dYtPoster.onerror = function () {
        this.src = "https://img.youtube.com/vi/" + ytId + "/hqdefault.jpg";
        this.onerror = null;
      };
      _dYtIframe.setAttribute(
        "data-src",
        "https://www.youtube-nocookie.com/embed/" + ytId + "?autoplay=1&rel=0&modestbranding=1"
      );
      _dYtIframe.title = item.title || "";
    } else if (item.image) {
      _dImg.style.display = "block";
      _dImg.src = item.image;
      _dImg.alt = item.title || "";
    }

    /* Hide arrows when only one artwork */
    var single = _items.length <= 1;
    _prevBtn.style.display = single ? "none" : "";
    _nextBtn.style.display = single ? "none" : "";

    setTimeout(function () { _dDetailCloseBtn.focus(); }, 60);
  }

  /* ── Navigate prev / next ── */
  function _navigate(dir) {
    if (_view !== "detail") return;
    _showDetail(_idx + dir);
  }

  /* ── YouTube ── */
  function _loadYt() {
    if (_ytLoaded) return;
    _ytLoaded = true;
    var src = _dYtIframe.getAttribute("data-src");
    if (src) _dYtIframe.src = src;
    _dYtPoster.style.opacity     = "0";
    _dYtPlay.style.opacity       = "0";
    _dYtPlay.style.pointerEvents = "none";
    _dYtIframe.style.opacity     = "1";
  }

  function _resetYt() {
    if (!_dYtIframe) return;
    _dYtIframe.src               = "";
    _dYtPoster.style.opacity     = "1";
    _dYtPlay.style.opacity       = "1";
    _dYtPlay.style.pointerEvents = "";
    _dYtIframe.style.opacity     = "0";
  }

  /* ── Close entire gallery ── */
  function _close() {
    if (!_overlay) return;
    _view = "none";
    _overlay.classList.remove("is-open");
    _overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("gallery-open");
    _ytLoaded = false;
    _resetYt();

    /* Return focus to opener */
    if (_opener && typeof _opener.focus === "function") {
      var el = _opener;
      _opener = null;
      setTimeout(function () { el.focus(); }, 40);
    }

    /* Reset to list view after panel finishes fading out */
    setTimeout(function () {
      if (_view === "none" && _built) {
        _listView.classList.remove("gal-hidden");
        _detailView.classList.add("gal-hidden");
      }
    }, 360);
  }

  /* ── Outside click: two-stage close ── */
  function _onBackdropClick(e) {
    if (_panel && _panel.contains(e.target)) return;
    if (_view === "detail")    _showList();
    else if (_view === "list") _close();
  }

  /* ── Keyboard ── */
  function _onKeydown(e) {
    if (_view === "none") return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (_view === "detail") _showList();
      else _close();
      return;
    }
    if (_view === "detail") {
      if (e.key === "ArrowLeft")  { e.preventDefault(); _navigate(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); _navigate(1); }
    }
  }

  /* ── Sync grid row height to exact card pixel width ──
     CSS aspect-ratio / padding-top tricks can disagree with the browser's
     grid track sizing in edge cases (large natural image dims, thin scrollbar
     stealing width, etc.).  Reading the ACTUAL rendered card width and
     stamping it on grid-auto-rows is the only bullet-proof approach. */
  function _syncSquares() {
    if (!_grid) return;
    var first = _grid.querySelector(".gallery-card");
    if (!first) return;
    var w = first.getBoundingClientRect().width;
    if (w <= 0) return;   /* element not yet painted */
    _grid.style.gridAutoRows = Math.round(w) + "px";
  }

  /* ── Touch swipe on image area ── */
  function _onTouchStart(e) { _touchX = e.touches[0].clientX; }
  function _onTouchEnd(e)   {
    var dx = e.changedTouches[0].clientX - _touchX;
    if (Math.abs(dx) > 50) _navigate(dx < 0 ? 1 : -1);
  }

  /* ── Auto-derive filter tag from item title (no data changes needed) ── */
  function _deriveTag(item) {
    if (item.tags && item.tags.length) return item.tags;
    var t = item.title || "";
    if (/^(SFU Design Series|Senior Design Leader|Vancouver Downtown|Shaped by Stories|Fragments of Downtown|Time Stops|Learn AI)/i.test(t))
      return ["editorial"];
    if (/^(Aurelle|Lanura|Rivelle|Softener|Stripeform|Lipmuse|Softora)/i.test(t))
      return ["fashion"];
    if (/^(Advertisement Design|ITU Event Poster|Taksim|Meeting Day|Virtual Landscape|İstanbul Levent)/i.test(t))
      return ["advertising"];
    return [];
  }

  /* ── Build filter bar ── */
  var TAG_ORDER  = ["editorial", "fashion", "advertising", "gym"];
  var TAG_LABELS = { editorial: "Editorial", fashion: "Fashion & Beauty", advertising: "Advertising", gym: "Gym & Sport" };

  function _buildFilterBar() {
    if (!_filterBar) return;
    _filterBar.innerHTML = "";
    _filterBtns = [];

    var tagCounts = {};
    _allItems.forEach(function (item) {
      _deriveTag(item).forEach(function (t) {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    var visible = TAG_ORDER.filter(function (t) { return tagCounts[t]; });
    if (visible.length === 0) { _filterBar.classList.add("gal-hidden"); return; }
    _filterBar.classList.remove("gal-hidden");

    var allBtn = _mkFilterPill("all", "All", _allItems.length, true);
    _filterBar.appendChild(allBtn);
    _filterBtns.push(allBtn);

    visible.forEach(function (tag) {
      var btn = _mkFilterPill(tag, TAG_LABELS[tag], tagCounts[tag], false);
      _filterBar.appendChild(btn);
      _filterBtns.push(btn);
    });
  }

  function _mkFilterPill(tag, label, count, active) {
    var btn = _el("button", "gallery-filter-pill" + (active ? " is-active" : ""));
    btn.type = "button";
    btn.setAttribute("data-tag", tag);
    var countSpan = _el("span", "gallery-filter-count");
    countSpan.textContent = count;
    btn.appendChild(document.createTextNode(label + " "));
    btn.appendChild(countSpan);
    btn.addEventListener("click", function () { _applyFilter(tag); });
    return btn;
  }

  /* ── Apply filter ── */
  function _applyFilter(tag) {
    _filterTag = tag;
    _filterBtns.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-tag") === tag);
    });
    _items = tag === "all"
      ? _allItems.slice()
      : _allItems.filter(function (item) { return _deriveTag(item).indexOf(tag) !== -1; });
    _countEl.textContent = _items.length + (_items.length === 1 ? " piece" : " pieces");
    _buildGrid();
    _grid.scrollTop = 0;
    requestAnimationFrame(function () { _syncSquares(); });
  }

  /* ── Public API ── */
  window.PORTFOLIO_GALLERY = {
    open:  function (cat) { _openGallery(cat); },
    close: function ()    { _close(); }
  };

}());
