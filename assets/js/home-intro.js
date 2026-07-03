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

    _el.style.transition = 'opacity 1.4s ease';
    _el.style.opacity    = '0';

    /* remove after fade completes; fallback timer in case transitionend misfires */
    function _remove() {
      window.siteIntroPlaying = false;
      if (_el.parentNode) _el.parentNode.removeChild(_el);
    }
    _el.addEventListener('transitionend', _remove, { once: true });
    setTimeout(_remove, 1600);
  }

  /* Fade word in via CSS transition, then auto-dismiss */
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      _word.style.opacity = '1';
      setTimeout(_dismiss, 750 + 400); /* wait for fade-in + short hold */
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
