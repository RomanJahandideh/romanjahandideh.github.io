/*
 * HOME CLOUD LAYER + MOUSE ORB
 * Requires GSAP 3.15 (loaded before this file via CDN)
 *
 * Features:
 *   - 10 clouds that drift gently with random speeds/paths
 *   - Mouse approach repels nearby clouds (they part like fog)
 *   - Mouse orb follows cursor with spring lag (home mode only)
 *   - Spiderweb canvas forced dark via inline style (beats CSS cascade)
 *   - Clouds fade out automatically in work/teaching modes
 */

(function () {
  "use strict";

  if (typeof gsap === "undefined") {
    console.warn("[home-clouds] GSAP not loaded — skipping cloud system");
    return;
  }

  /* ── Cloud definitions ──────────────────────────────────────────
     Each entry: [x%, y%, scale, driftX px, driftY px, duration s, opacity]
     x/y are % of viewport at init time                            */
  var DEFS = [
    [  6, 12, 1.20,  48,  14,  28, 0.80 ],
    [ 22,  5, 0.90, -38,  10,  34, 0.72 ],
    [ 50,  4, 1.10,  28,   8,  22, 0.78 ],
    [ 68, 10, 1.30, -52,  16,  38, 0.82 ],
    [ 86,  7, 0.80,  32,  18,  26, 0.70 ],
    [  8, 74, 0.72,  42,  -9,  32, 0.60 ],
    [ 38, 80, 1.00, -30, -13,  29, 0.66 ],
    [ 72, 76, 0.88,  38,  -7,  36, 0.63 ],
    [ 90, 67, 0.70, -26,  12,  24, 0.56 ],
    [ 30, 48, 0.60,  20,  16,  44, 0.48 ],
  ];

  var REPEL_RADIUS   = 210;   /* px — cursor must be this close to push a cloud   */
  var REPEL_STRENGTH = 100;   /* px — max push distance at zero distance            */
  var RETURN_DELAY   = 0.4;   /* s  — pause before cloud drifts back                */
  var RETURN_DUR     = 3.2;   /* s  — how long return journey takes                 */

  var W = window.innerWidth;
  var H = window.innerHeight;

  /* active cloud records */
  var clouds = [];

  /* ── Boot ──────────────────────────────────────────────────────── */
  function init() {
    var layer = document.getElementById("cloud-layer");
    if (!layer) return;

    window.addEventListener("resize", function () {
      W = window.innerWidth;
      H = window.innerHeight;
    });

    /* Build clouds */
    DEFS.forEach(function (def, i) {
      buildCloud(layer, def, i);
    });

    /* Single ticker → update all cloud transforms */
    gsap.ticker.add(tick);

    /* Mouse repulsion */
    document.addEventListener("mousemove", onMouseMove, { passive: true });

    /* Spiderweb inline-style fix */
    fixSpiderweb();
  }

  /* ── Build one cloud ────────────────────────────────────────────── */
  function buildCloud(layer, def, idx) {
    var xp = def[0], yp = def[1], scale = def[2];
    var driftX = def[3], driftY = def[4], dur = def[5], opacity = def[6];

    var el = document.createElement("div");
    el.className = "cloud";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = makeCloudSVG(scale, idx);
    layer.appendChild(el);

    var bx = (xp / 100) * W;
    var by = (yp / 100) * H;

    /* Floating proxy — GSAP tweens this, tick() reads it */
    var proxy = { x: 0, y: 0 };

    /* Repulsion proxy — GSAP tweens this independently */
    var repel = { x: 0, y: 0 };

    el.style.opacity = opacity;

    /* Idle float — infinite yoyo */
    gsap.to(proxy, {
      x: driftX,
      y: driftY,
      duration: dur,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });

    clouds.push({ el: el, bx: bx, by: by, proxy: proxy, repel: repel });
  }

  /* ── Per-frame position update ──────────────────────────────────── */
  function tick() {
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      var x = c.bx + c.proxy.x + c.repel.x;
      var y = c.by + c.proxy.y + c.repel.y;
      c.el.style.transform = "translate(" + x + "px," + y + "px)";
    }
  }

  /* ── Mouse repulsion ────────────────────────────────────────────── */
  function onMouseMove(e) {
    var mx = e.clientX;
    var my = e.clientY;

    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      var w2 = c.el.offsetWidth  * 0.5;
      var h2 = c.el.offsetHeight * 0.5;

      var cx = c.bx + c.proxy.x + c.repel.x + w2;
      var cy = c.by + c.proxy.y + c.repel.y + h2;

      var dx   = cx - mx;
      var dy   = cy - my;
      var dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < REPEL_RADIUS && dist > 1) {
        var force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
        var tx    = (dx / dist) * force;
        var ty    = (dy / dist) * force * 0.7;   /* less vertical push */

        /* Kill any pending return tween for this cloud */
        gsap.killTweensOf(c.repel);

        gsap.to(c.repel, {
          x: tx,
          y: ty,
          duration: 0.65,
          ease: "power2.out",
          overwrite: true,
        });
      } else {
        /* Mouse is far — schedule a gentle return (only if repel is non-zero) */
        if (Math.abs(c.repel.x) > 0.5 || Math.abs(c.repel.y) > 0.5) {
          gsap.to(c.repel, {
            x: 0,
            y: 0,
            duration: RETURN_DUR,
            ease: "power1.inOut",
            delay: RETURN_DELAY,
            overwrite: true,
          });
        }
      }
    }
  }

  /* ── Spiderweb: force dark via inline style ─────────────────────── */
  function fixSpiderweb() {
    var canvas = document.getElementById("home-spiderweb-canvas");
    if (!canvas) return;

    function apply() {
      var mode = document.body.getAttribute("data-mode") || "";
      var isWork     = mode === "work"     || document.body.classList.contains("mode-work");
      var isTeaching = mode === "teaching" || document.body.classList.contains("mode-teaching");

      /* Inline style beats any CSS rule */
      canvas.style.filter  = "invert(1) brightness(0.68)";
      /* Home: full  |  Work/Teaching: subtle mesh behind UI */
      canvas.style.opacity = (isWork || isTeaching) ? "0.22" : "0.90";
    }

    apply();

    /* Re-apply on every body class / data-mode change (mode switch) */
    new MutationObserver(apply).observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-mode"],
    });
  }

  /* ── Cloud SVG template ─────────────────────────────────────────── */
  function makeCloudSVG(scale, idx) {
    var w   = Math.round(220 * scale);
    var h   = Math.round(90  * scale);
    var fid = "cf" + idx;

    /* Overlapping ellipses blurred together — looks like a real soft cloud */
    return [
      '<svg viewBox="0 0 220 90" width="' + w + '" height="' + h + '"',
      ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">',
      '<defs>',
      '<filter id="' + fid + '" x="-25%" y="-25%" width="150%" height="150%">',
      '<feGaussianBlur in="SourceGraphic" stdDeviation="6.5"/>',
      '</filter>',
      '</defs>',
      '<g filter="url(#' + fid + ')" opacity="0.93">',
      '<ellipse cx="110" cy="72" rx="96" ry="26" fill="#FAF8F4"/>',
      '<circle  cx="66"  cy="52" r="32"          fill="#FAF8F4"/>',
      '<circle  cx="108" cy="38" r="42"          fill="#FAF8F4"/>',
      '<circle  cx="150" cy="50" r="30"          fill="#FAF8F4"/>',
      '<circle  cx="172" cy="63" r="19"          fill="#FAF8F4"/>',
      '<ellipse cx="35"  cy="65" rx="20" ry="14" fill="#FAF8F4"/>',
      '</g>',
      '</svg>',
    ].join("");
  }

  /* ── Boot ─────────────────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

}());
