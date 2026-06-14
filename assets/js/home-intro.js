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
    if (typeof gsap !== "undefined") {
      gsap.to(_el, {
        opacity: 0, duration: 0.55, ease: "power2.in",
        onComplete: function () { if (_el.parentNode) _el.parentNode.removeChild(_el); }
      });
    } else {
      if (_el.parentNode) _el.parentNode.removeChild(_el);
    }
  }

  /* Fade word in, hold, then fade everything out */
  if (typeof gsap !== "undefined") {
    gsap.to(_word, {
      opacity: 1, duration: 0.7, ease: "power2.out",
      onComplete: function () {
        /* Hold for 1s, then dismiss */
        setTimeout(_dismiss, 1000);
      }
    });
  } else {
    setTimeout(_dismiss, 1800);
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
