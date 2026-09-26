/* Decide before first paint: the welcome plays on every direct visit or reload of the homepage,
   but not when arriving from another page of the site, via back/forward, or on a hash link. */
(function () {
  "use strict";
  var root = document.documentElement;
  var hash = location.hash.toLowerCase();
  var internal = false;
  try { internal = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (_) {}
  var navigation = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  var returning = navigation && navigation.type === "back_forward";
  var reload = navigation && navigation.type === "reload";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.siteIntroShouldPlay = (reload || !internal) && !returning && !hash && !reduced;
  window.siteIntroPlaying = window.siteIntroShouldPlay;
  if (hash === "#projects") root.classList.add("projects-entry");
  if (window.siteIntroShouldPlay) root.classList.add("show-site-intro");
})();
