(function () {
  "use strict";

  var _el   = document.getElementById("site-intro");
  var _word = document.getElementById("site-intro-word");
  if (!_el || !_word) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    _el.parentNode.removeChild(_el);
    return;
  }

  /* Block interaction until dismissed */
  window.siteIntroPlaying = true;

  function _dismiss() {
    window.siteIntroPlaying = false;
    if (_el.parentNode) _el.parentNode.removeChild(_el);
  }

  /* Fade word in, hold briefly, then snap out */
  var _skip = document.getElementById("site-intro-skip");

  if (typeof gsap !== "undefined") {
    gsap.to(_word, {
      opacity: 1, duration: 0.55, ease: "power2.out",
      onComplete: function () {
        setTimeout(_dismiss, 300);
      }
    });
  } else {
    setTimeout(_dismiss, 300);
  }

  /* Skip on any interaction */
  function _onSkip() {
    document.removeEventListener("pointerdown", _onSkip);
    document.removeEventListener("keydown",     _onSkip);
    _dismiss();
  }
  document.addEventListener("pointerdown", _onSkip);
  document.addEventListener("keydown",     _onSkip);

}());
