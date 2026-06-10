/*
 * HOME FOG TRAIL
 * Canvas-based fog with a cursor/finger wake that fades back.
 * Replaces the CSS radial-gradient fog mask on the home page.
 * No dependencies — vanilla JS + Canvas 2D only.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("fog-trail-canvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");

  /* ── Config ──────────────────────────────────────────────────── */
  var FOG_RGB      = "250,248,244";
  var FOG_ALPHA    = 0.84;    /* base fog opacity  */
  var TRAIL_R      = 84;      /* px — dab radius   */
  var TRAIL_LIFE   = 2400;    /* ms — full fade    */
  var MAX_PTS      = 240;     /* max stored points */

  /* ── State ───────────────────────────────────────────────────── */
  var trail = [];
  var W = 0, H = 0;

  /* ── Resize ──────────────────────────────────────────────────── */
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  /* ── Mode guard ──────────────────────────────────────────────── */
  function isHome() {
    return document.body.classList.contains("mode-home") ||
           document.body.getAttribute("data-mode") === "home";
  }

  /* ── Add trail point ─────────────────────────────────────────── */
  function addPoint(x, y) {
    if (!isHome()) return;
    trail.push({ x: x, y: y, t: performance.now() });
    if (trail.length > MAX_PTS) trail.splice(0, trail.length - MAX_PTS);
  }

  document.addEventListener("mousemove", function (e) {
    addPoint(e.clientX, e.clientY);
  }, { passive: true });

  document.addEventListener("touchmove", function (e) {
    var t = e.touches && e.touches[0];
    if (t) addPoint(t.clientX, t.clientY);
  }, { passive: true });

  /* ── Draw loop ───────────────────────────────────────────────── */
  function draw() {
    requestAnimationFrame(draw);

    if (!isHome()) {
      /* Clear so no ghost fog appears when switching back */
      ctx.clearRect(0, 0, W, H);
      return;
    }

    var now = performance.now();

    /* Prune expired points from the front */
    while (trail.length > 0 && (now - trail[0].t) > TRAIL_LIFE) {
      trail.shift();
    }

    /* ── Full fog fill ─────────────────────────────────────────── */
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(" + FOG_RGB + "," + FOG_ALPHA + ")";
    ctx.fillRect(0, 0, W, H);

    if (trail.length === 0) return;

    /* ── Erase dabs along trail ────────────────────────────────── */
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";

    for (var i = 0; i < trail.length; i++) {
      var pt  = trail[i];
      var age = (now - pt.t) / TRAIL_LIFE;
      if (age >= 1) continue;

      /* Ease-out: newest points clear the most */
      var alpha = Math.pow(1 - age, 1.7);

      /* Dab radius shrinks slightly as it ages */
      var r = TRAIL_R * (0.68 + 0.32 * (1 - age));

      var g = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
      g.addColorStop(0,    "rgba(0,0,0," + alpha       + ")");
      g.addColorStop(0.38, "rgba(0,0,0," + (alpha * 0.60) + ")");
      g.addColorStop(0.70, "rgba(0,0,0," + (alpha * 0.18) + ")");
      g.addColorStop(1,    "rgba(0,0,0,0)");

      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }

    ctx.restore();
  }

  draw();
}());
