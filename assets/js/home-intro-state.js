/* Decide before first paint so returning visitors never see the welcome overlay. */
(function () {
  "use strict";
  var root = document.documentElement;
  var hash = location.hash.toLowerCase();
  var seen = false;
  var internal = false;
  try { seen = localStorage.getItem("portfolio.welcomeSeen.v2") === "1"; } catch (_) {}
  try { internal = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (_) {}
  var navigation = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  var returning = navigation && (navigation.type === "back_forward" || navigation.type === "reload");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.siteIntroShouldPlay = !seen && !internal && !returning && !hash && !reduced;
  window.siteIntroPlaying = window.siteIntroShouldPlay;
  if (hash === "#projects") root.classList.add("projects-entry");
  if (window.siteIntroShouldPlay) {
    root.classList.add("show-site-intro");
    try { localStorage.setItem("portfolio.welcomeSeen.v2", "1"); } catch (_) {}
  }
})();
