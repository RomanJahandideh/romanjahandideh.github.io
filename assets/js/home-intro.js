(function () {
  "use strict";
  var intro = document.getElementById("site-intro");
  var word = document.getElementById("site-intro-word");
  var finished = false;
  var timer;
  function remove() {
    window.siteIntroPlaying = false;
    document.documentElement.classList.remove("show-site-intro");
    if (intro) intro.remove();
  }
  if (!intro || !word || !window.siteIntroShouldPlay) {
    remove();
    return;
  }
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    document.removeEventListener("pointerdown", finish);
    document.removeEventListener("keydown", finish);
    word.style.transition = "opacity 1s ease";
    word.style.opacity = "0";
    setTimeout(remove, 1050);
  }
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      if (finished) return;
      word.style.opacity = "1";
      timer = setTimeout(finish, 1100);
    });
  });
  document.addEventListener("pointerdown", finish);
  document.addEventListener("keydown", finish);
})();
