/**
 * WELCOME INTRO
 * Shown on every visit. Black overlay with star field, green-screen
 * canvas animation, and name/tagline reveal.
 * Skip: any click / key / scroll / touch.
 * Dismissed automatically after MAX_DURATION_MS.
 */
(function () {
  "use strict";

  var MAX_DURATION_MS = 6000;

  var _el = document.getElementById("site-intro");
  if (!_el) return;

  /* Users who prefer no motion: remove immediately */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    _remove();
    return;
  }

  window.siteIntroPlaying = true;

  /* ── State ── */
  var _dismissed = false;
  var _raf       = null;
  var _video     = null;
  var _canvas    = null;
  var _ctx       = null;
  var _maxTimer  = null;

  /* ── Remove the overlay from DOM ── */
  function _remove() {
    if (_el && _el.parentNode) {
      _el.style.display = "none";
      _el.parentNode.removeChild(_el);
    }
    _el = null;
  }

  /* ── Dismiss: fade out then remove ── */
  function _dismiss(fast) {
    if (_dismissed) return;
    _dismissed = true;
    window.siteIntroPlaying = false;
    _removeListeners();
    clearTimeout(_maxTimer);
    if (_raf) cancelAnimationFrame(_raf);
    if (_video) _video.pause();

    var target = _el;
    if (!target) return;

    var dur = fast ? 0.28 : 0.60;
    if (typeof gsap !== "undefined") {
      gsap.to(target, { opacity: 0, duration: dur, ease: "power2.in", onComplete: _remove });
    } else {
      _remove();
    }
  }

  /* ── Skip listeners ── */
  function _onSkip() { _dismiss(true); }

  function _removeListeners() {
    document.removeEventListener("pointerdown", _onSkip);
    document.removeEventListener("keydown",     _onSkip);
    document.removeEventListener("wheel",       _onSkip, { passive: true });
    document.removeEventListener("touchstart",  _onSkip, { passive: true });
  }

  document.addEventListener("pointerdown", _onSkip);
  document.addEventListener("keydown",     _onSkip);
  document.addEventListener("wheel",       _onSkip, { passive: true });
  document.addEventListener("touchstart",  _onSkip, { passive: true });

  _maxTimer = setTimeout(function () { _exitSequence(); }, MAX_DURATION_MS);

  /* ── Star field ── */
  function _createStars() {
    var container = _el.querySelector("#intro-stars");
    if (!container) return;
    for (var i = 0; i < 90; i++) {
      var s = document.createElement("div");
      s.className = "intro-star" + (Math.random() < 0.12 ? " gold" : "");
      s.style.left   = (Math.random() * 100).toFixed(2) + "%";
      s.style.top    = (Math.random() * 100).toFixed(2) + "%";
      var sz = (Math.random() * 2.2 + 0.8).toFixed(2);
      s.style.width  = sz + "px";
      s.style.height = sz + "px";
      s.style.setProperty("--dur",   (Math.random() * 2.5 + 1.2).toFixed(2) + "s");
      s.style.setProperty("--delay", "-" + (Math.random() * 3).toFixed(2) + "s");
      container.appendChild(s);
    }
  }

  /* ── Canvas chroma-key ── */
  function _initCanvas() {
    _canvas = _el.querySelector("#intro-canvas");
    if (!_canvas) return;
    _ctx = _canvas.getContext("2d", { willReadFrequently: true });
  }

  function _setCanvasSize(vw, vh) {
    var maxW  = Math.min(vw, 720);
    var scale = maxW / vw;
    _canvas.width  = Math.round(vw * scale);
    _canvas.height = Math.round(vh * scale);
  }

  function _removeGreen(ctx, w, h) {
    try {
      var img = ctx.getImageData(0, 0, w, h);
      var d   = img.data;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        if (g > 80 && g > r * 1.30 && g > b * 1.30) {
          var excess = Math.min(1, (g - 80) / 120);
          d[i + 3]   = Math.round(d[i + 3] * (1 - excess));
        }
      }
      ctx.putImageData(img, 0, 0);
    } catch (e) { /* tainted canvas — render without key */ }
  }

  function _startFrameLoop() {
    function _tick() {
      if (_dismissed || !_video || _video.paused || _video.ended) return;
      _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
      _ctx.drawImage(_video, 0, 0, _canvas.width, _canvas.height);
      _removeGreen(_ctx, _canvas.width, _canvas.height);
      _raf = requestAnimationFrame(_tick);
    }
    _raf = requestAnimationFrame(_tick);
  }

  /* ── Title animation ── */
  function _runTitleAnim(delay) {
    if (typeof gsap === "undefined") return;
    delay = delay || 0;

    var welcome  = _el.querySelector(".intro-welcome");
    var words    = _el.querySelectorAll(".intro-word");
    var rule     = _el.querySelector(".intro-rule");
    var tagline  = _el.querySelector(".intro-tagline");
    var hint     = _el.querySelector(".intro-skip-hint");

    /* "Welcome" fades in first */
    if (welcome) {
      gsap.fromTo(welcome,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out", delay: delay }
      );
    }

    /* Name words scale-in + fade, staggered */
    gsap.fromTo(words,
      { opacity: 0, y: 18, scale: 1.08 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.88, ease: "power2.out",
        stagger: 0.28, delay: delay + 0.38,
        onComplete: function () {
          for (var i = 0; i < words.length; i++) {
            words[i].classList.add("shimmer-on");
          }
        }
      }
    );

    /* Orange rule draws left → right */
    if (rule) {
      gsap.fromTo(rule,
        { scaleX: 0 },
        { scaleX: 1, duration: 0.72, ease: "power2.inOut",
          transformOrigin: "left center", delay: delay + 1.2 }
      );
    }

    /* Tagline fades in */
    if (tagline) {
      gsap.fromTo(tagline,
        { opacity: 0 },
        { opacity: 1, duration: 0.55, ease: "power1.out", delay: delay + 1.6 }
      );
    }

    /* Skip hint */
    if (hint) {
      gsap.fromTo(hint,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power1.out", delay: delay + 2.0 }
      );
    }
  }

  /* ── Exit sequence ── */
  function _exitSequence() {
    if (_dismissed) return;
    if (typeof gsap !== "undefined") {
      var targets = [];
      if (_canvas) targets.push(_canvas);
      var els = _el.querySelectorAll(".intro-welcome, .intro-word, .intro-rule, .intro-tagline");
      for (var i = 0; i < els.length; i++) targets.push(els[i]);
      gsap.to(targets, {
        opacity: 0, duration: 0.45, ease: "power2.in",
        stagger: 0.05, onComplete: function () { _dismiss(false); }
      });
    } else {
      _dismiss(false);
    }
  }

  /* ── Video setup ── */
  function _initVideo() {
    _video = document.createElement("video");
    _video.muted       = true;
    _video.playsInline = true;
    _video.preload     = "auto";
    _video.src         = "greenscreen.mp4";

    _video.addEventListener("loadedmetadata", function () {
      _setCanvasSize(_video.videoWidth, _video.videoHeight);
    });

    _video.addEventListener("play", function () {
      if (typeof gsap !== "undefined" && _canvas) {
        gsap.to(_canvas, { opacity: 1, duration: 0.6, ease: "power2.out" });
      }
      _startFrameLoop();
      _runTitleAnim(0.5);
    });

    _video.addEventListener("ended", function () {
      cancelAnimationFrame(_raf);
      setTimeout(_exitSequence, 500);
    });

    _video.addEventListener("error", function () {
      _runTitleAnim(0.3);
      setTimeout(_exitSequence, 4000);
    });

    var p = _video.play();
    if (p && typeof p.then === "function") {
      p.catch(function () {
        /* Autoplay blocked — show title only */
        _runTitleAnim(0.3);
        setTimeout(_exitSequence, 4000);
      });
    }
  }

  /* ── Boot ── */
  _createStars();
  _initCanvas();
  _initVideo();

}());
