(function () {
  "use strict";

  var _el   = document.getElementById("site-intro");
  var _word = document.getElementById("site-intro-word");
  if (!_el || !_word) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (_el.parentNode) _el.parentNode.removeChild(_el);
    return;
  }

  window.siteIntroPlaying = true;

  var _dismissed = false;

  function _dismiss() {
    if (_dismissed) return;
    _dismissed = true;

    /* Step 1 — fade the text out smoothly (background stays fully opaque) */
    _word.style.transition = 'opacity 1.0s ease';
    _word.style.opacity    = '0';

    var _skip = document.getElementById("site-intro-skip");
    if (_skip) { _skip.style.transition = 'opacity 0.6s ease'; _skip.style.opacity = '0'; }

    /* Step 2 — once text is gone, remove the container instantly */
    setTimeout(function () {
      window.siteIntroPlaying = false;
      if (_el.parentNode) _el.parentNode.removeChild(_el);
    }, 1050);
  }

  /* Fade word in via CSS transition, then auto-dismiss */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      _word.style.opacity = '1';
      setTimeout(_dismiss, 750 + 350);
    });
  });

  /* Skip on any interaction */
  function _onSkip() {
    document.removeEventListener("pointerdown", _onSkip);
    document.removeEventListener("keydown",     _onSkip);
    _dismiss();
  }
  document.addEventListener("pointerdown", _onSkip);
  document.addEventListener("keydown",     _onSkip);

}());
