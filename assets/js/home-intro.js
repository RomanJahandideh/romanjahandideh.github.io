/**
 * DISNEY-STYLE WELCOME INTRO
 * Plays greenscreen.mp4 with real-time canvas chroma-key (green removal).
 * Stars twinkle in the background. Name reveals with shimmer + orange accent.
 * Skip on any click / key / scroll / touch.
 * Shown once; returns after 48 hours (localStorage).
 */
(function () {
  "use strict";

  var STORAGE_KEY = "rj-intro-ts";
  var COOLDOWN_MS = 48 * 60 * 60 * 1000; /* 48 hours */
  var MAX_DURATION_MS = 9000;             /* hard cap — dismiss after 9s */

  /* ── Frequency gate ── */
  /* Add ?intro=1 to the URL to force the intro to show regardless of cooldown */
  var _forceShow = window.location.search.indexOf("intro=1") !== -1;
  var stored = localStorage.getItem(STORAGE_KEY);
  var shouldShow = _forceShow || !stored || (Date.now() - parseInt(stored, 10)) > COOLDOWN_MS;
  if (!shouldShow) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
    return;
  }

  var _el      = document.getElementById("site-intro");
  if (!_el) return;

  localStorage.setItem(STORAGE_KEY, Date.now().toString());
  window.siteIntroPlaying = true;

  /* Reveal overlay */
  _el.style.display       = "flex";
  _el.style.pointerEvents = "auto";
  _el.removeAttribute("aria-hidden");

  /* ── State ── */
  var _dismissed   = false;
  var _raf         = null;
  var _video       = null;
  var _canvas      = null;
  var _ctx         = null;
  var _maxTimer    = null;

  /* ── Dismiss ── */
  function _dismiss(fast) {
    if (_dismissed) return;
    _dismissed = true;
    window.siteIntroPlaying = false;
    _removeListeners();
    clearTimeout(_maxTimer);
    if (_raf) cancelAnimationFrame(_raf);
    if (_video) { _video.pause(); }

    var dur = fast ? 0.30 : 0.65;
    if (typeof gsap !== "undefined") {
      gsap.to(_el, { opacity: 0, duration: dur, ease: "power2.in", onComplete: _remove });
    } else {
      _remove();
    }
  }

  function _remove() {
    if (_el) {
      _el.style.display = "none";
      _el.setAttribute("aria-hidden", "true");
      if (_el.parentNode) _el.parentNode.removeChild(_el);
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

  /* Hard-cap: always dismiss after MAX_DURATION_MS */
  _maxTimer = setTimeout(function () { _exitSequence(); }, MAX_DURATION_MS);

  /* ── Star field ── */
  function _createStars() {
    var container = _el.querySelector("#intro-stars");
    if (!container) return;
    var count = 90;
    for (var i = 0; i < count; i++) {
      var s   = document.createElement("div");
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
    var maxW   = Math.min(vw, 720);
    var scale  = maxW / vw;
    _canvas.width  = Math.round(vw * scale);
    _canvas.height = Math.round(vh * scale);
  }

  /* Remove green pixels using chroma-key: g dominant over r and b */
  function _removeGreen(ctx, w, h) {
    try {
      var img = ctx.getImageData(0, 0, w, h);
      var d   = img.data;
      for (var i = 0; i < d.length; i += 4) {
        var r = d[i], g = d[i + 1], b = d[i + 2];
        if (g > 80 && g > r * 1.30 && g > b * 1.30) {
          /* Soft edge: strength proportional to how "green" the pixel is */
          var excess = Math.min(1, (g - 80) / 120);
          d[i + 3]   = Math.round(d[i + 3] * (1 - excess));
        }
      }
      ctx.putImageData(img, 0, 0);
    } catch (e) {
      /* Tainted canvas or security error — render without key */
    }
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
    var words = _el.querySelectorAll(".intro-word");
    var rule  = _el.querySelector(".intro-rule");
    var hint  = _el.querySelector(".intro-skip-hint");

    /* Words: scale-in + fade, staggered */
    gsap.fromTo(words,
      { opacity: 0, y: 18, scale: 1.08 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.88,
        ease: "power2.out",
        stagger: 0.32,
        delay: delay,
        onComplete: function () {
          /* Trigger CSS shimmer sweep on each word */
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
        {
          scaleX: 1,
          duration: 0.72,
          ease: "power2.inOut",
          transformOrigin: "left center",
          delay: delay + 0.9
        }
      );
    }

    /* Skip hint fades in gently */
    if (hint) {
      gsap.fromTo(hint,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: "power1.out", delay: delay + 1.3 }
      );
    }
  }

  /* ── Exit sequence: content fades, then overlay fades ── */
  function _exitSequence() {
    if (_dismissed) return;
    if (typeof gsap !== "undefined") {
      /* Fade out video canvas and title, then dismiss */
      var targets = [];
      if (_canvas) targets.push(_canvas);
      var words = _el.querySelectorAll(".intro-word, .intro-rule");
      for (var i = 0; i < words.length; i++) targets.push(words[i]);

      gsap.to(targets, {
        opacity: 0,
        duration: 0.50,
        ease: "power2.in",
        stagger: 0.06,
        onComplete: function () { _dismiss(false); }
      });
    } else {
      _dismiss(false);
    }
  }

  /* ── Video setup ── */
  function _initVideo() {
    _video = document.createElement("video");
    _video.muted      = true;
    _video.playsInline = true;
    _video.preload    = "auto";
    _video.src        = "greenscreen.mp4";

    /* Size canvas once we know video dimensions */
    _video.addEventListener("loadedmetadata", function () {
      _setCanvasSize(_video.videoWidth, _video.videoHeight);
    });

    /* Fade canvas in and start frame loop when video starts */
    _video.addEventListener("play", function () {
      if (typeof gsap !== "undefined" && _canvas) {
        gsap.to(_canvas, { opacity: 1, duration: 0.6, ease: "power2.out" });
      }
      _startFrameLoop();
      _runTitleAnim(0.6); /* title appears 0.6s after video starts */
    });

    /* When video finishes, start exit */
    _video.addEventListener("ended", function () {
      cancelAnimationFrame(_raf);
      /* Brief pause so the last frame + title are visible together */
      setTimeout(_exitSequence, 600);
    });

    /* Autoplay fail fallback */
    _video.addEventListener("error", function () {
      _runTitleAnim(0.4);
      setTimeout(_exitSequence, 4500);
    });

    var playPromise = _video.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(function () {
        /* Autoplay blocked — show title without video */
        _runTitleAnim(0.4);
        setTimeout(_exitSequence, 4500);
      });
    }
  }

  /* ── Boot ── */
  _createStars();
  _initCanvas();
  _initVideo();

}());
