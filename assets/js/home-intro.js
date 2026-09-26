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
  /* Hold the welcome until the background artworks are ready (max 3s extra),
     so the page never appears empty behind it. */
  function finishWhenArtworkReady() {
    if (window.artworkBgReady) return finish();
    window.addEventListener("artwork-bg-ready", finish, { once: true });
    timer = setTimeout(finish, 3000);
  }
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      if (finished) return;
      word.style.opacity = "1";
      timer = setTimeout(finishWhenArtworkReady, 1100);
    });
  });
  document.addEventListener("pointerdown", finish);
  document.addEventListener("keydown", finish);
})();
