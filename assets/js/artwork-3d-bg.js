(() => {
  'use strict';

  window.artworkBgActive = true;
  document.body.classList.add('has-artwork-bg');

  const FOV         = 700;
  const CYCLE       = 3800;
  const LOAD_D      = 2800;
  const SPRING_K    = 0.11;
  const SPRING_DAMP = 0.70;
  const MAX_VISIBLE = 60;
  const PUSH_R      = 190;   // mouse repulsion radius px
  const PUSH_STR    = 1.4;   // repulsion strength per frame

  function makeRng(seed) {
    let s = (seed | 0) >>> 0;
    return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
  }

  function init() {
    const gd = window.GALLERY_DATA?.['Graphic Design'];
    if (!gd?.artworks?.length) return;
    const artworks = gd.artworks.filter(a => a.image);

    const canvas = document.getElementById('artwork-3d-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    /* ── All state before resize() ── */
    let W = 0, H = 0;
    let veilGrad    = null, navVeilGrad = null;
    let cameraZ     = 0, velocity = 0;
    let mouseX      = 0, mouseY   = 0;
    let parX        = 0, parY     = 0, parTX = 0, parTY = 0;
    let hoveredObj  = null, hoverT = 0;
    let hoverTiltB  = 0, hoverTiltC = 0;   // smooth 3-D skew for hovered image
    let autoDrift   = true, driftTimer = null;
    let lineOffsets = Array.from({ length: 18 }, () => Math.random());
    let dragObj     = null;
    let dragStartMX = 0, dragStartMY = 0;
    let dragStartDX = 0, dragStartDY = 0;
    let dragVelX    = 0, dragVelY   = 0;
    let prevDragMX  = 0, prevDragMY = 0;
    let lastDrawT   = 0;
    let wasDragging = false;
    const shockwaves = [];   // { x, y, r, life }
    const sparkles   = [];   // mouse trail particles { x, y, vx, vy, life, size }

    /* ── Veil + resize ── */
    function buildVeil() {
      const cx = W / 2, cy = H / 2;
      veilGrad = ctx.createRadialGradient(cx, cy, 50, cx, cy, 300);
      veilGrad.addColorStop(0,    'rgba(245,244,242,0.95)');
      veilGrad.addColorStop(0.25, 'rgba(245,244,242,0.76)');
      veilGrad.addColorStop(0.50, 'rgba(245,244,242,0.40)');
      veilGrad.addColorStop(0.75, 'rgba(245,244,242,0.12)');
      veilGrad.addColorStop(1,    'rgba(245,244,242,0)');

      /* nav toolbar veil — small soft halo at top-centre */
      const nx = W / 2, ny = 115;
      navVeilGrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, 210);
      navVeilGrad.addColorStop(0,    'rgba(245,244,242,0.92)');
      navVeilGrad.addColorStop(0.35, 'rgba(245,244,242,0.60)');
      navVeilGrad.addColorStop(0.65, 'rgba(245,244,242,0.22)');
      navVeilGrad.addColorStop(1,    'rgba(245,244,242,0)');
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width  = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildVeil();
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    /* ── Artworks ── */
    const rand = makeRng(0xdeadbeef);
    const objects = artworks.map((art, i) => {
      const t = i / Math.max(artworks.length - 1, 1);
      const z = -(350 + t * (CYCLE - 350));
      const a = rand() * Math.PI * 2;
      const r = 380 + rand() * 520;
      return {
        src: art.image, img: null, loaded: false, loading: false,
        x: Math.cos(a) * r, y: Math.sin(a) * r,
        z, w: 220 + rand() * 180, h: 0,
        floatPhase: rand() * Math.PI * 2,
        floatAmp:   6 + rand() * 12,
        floatFreq:  0.10 + rand() * 0.20,
        dispX: 0, dispY: 0, velX: 0, velY: 0,
      };
    });

    /* ── Dust particles ── */
    const pRng = makeRng(0xf00dbabe);
    const particles = Array.from({ length: 40 }, () => {
      const a = pRng() * Math.PI * 2;
      const r = 120 + pRng() * 820;
      return {
        x: Math.cos(a) * r, y: Math.sin(a) * r,
        z: -(pRng() * CYCLE),
        size: 0.7 + pRng() * 2.2, baseAlpha: 0.06 + pRng() * 0.14,
        floatPhase: pRng() * Math.PI * 2,
        floatAmp: 4 + pRng() * 10, floatFreq: 0.06 + pRng() * 0.18,
      };
    });

    /* ── effZ ── */
    function effZ(obj) {
      const raw = obj.z + cameraZ;
      return ((raw % CYCLE) + CYCLE) % CYCLE - CYCLE;
    }

    /* ── Hit-test ── */
    function findArtworkAt(cx, cy, t) {
      const CX = W / 2 + parX, CY = H / 2 + parY;
      const front2back = objects
        .map(obj => ({ obj, ez: effZ(obj) }))
        .filter(({ ez }) => ez < -25 && ez > -CYCLE * 0.93)
        .sort((a, b) => b.ez - a.ez);
      for (const { obj, ez } of front2back) {
        if (!obj.img) continue;
        const sc = FOV / (FOV - ez);
        if (sc <= 0 || sc > 5 || !isFinite(sc)) continue;
        const fy = Math.sin(t * obj.floatFreq + obj.floatPhase) * obj.floatAmp;
        const sx = CX + obj.x * sc + obj.dispX;
        const sy = CY + (obj.y + fy) * sc + obj.dispY;
        const sw = obj.w * sc, sh = obj.h * sc;
        if (cx >= sx - sw / 2 && cx <= sx + sw / 2 &&
            cy >= sy - sh / 2 && cy <= sy + sh / 2) return obj;
      }
      return null;
    }

    /* ── Auto-drift ── */
    function resetDrift() {
      autoDrift = false;
      clearTimeout(driftTimer);
      driftTimer = setTimeout(() => { autoDrift = true; }, 2000);
    }

    /* ── Input ── */
    window.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      if (e.target.closest('a, button, input, select, textarea, [role="button"]')) return;
      wasDragging = false;
      const hit = findArtworkAt(e.clientX, e.clientY, lastDrawT);
      if (!hit) return;
      e.stopPropagation(); e.preventDefault();
      dragObj = hit;
      dragStartDX = hit.dispX; dragStartDY = hit.dispY;
      dragStartMX = e.clientX; dragStartMY = e.clientY;
      prevDragMX  = e.clientX; prevDragMY  = e.clientY;
      dragVelX = 0; dragVelY = 0;
      hit.velX = 0; hit.velY = 0;
    }, { capture: true, passive: false });

    window.addEventListener('mousemove', e => {
      mouseX = e.clientX; mouseY = e.clientY;
      parTX  = (e.clientX - W / 2) * 0.055;
      parTY  = (e.clientY - H / 2) * 0.032;
      if (!dragObj && Math.random() < 0.55) {
        sparkles.push({
          x: e.clientX + (Math.random() - 0.5) * 8,
          y: e.clientY + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 1.3,
          vy: -0.6 - Math.random() * 1.6,
          life: 1.0, size: 1.0 + Math.random() * 2.2,
        });
        if (sparkles.length > 55) sparkles.shift();
      }
      if (dragObj) {
        wasDragging = true;
        dragVelX = e.clientX - prevDragMX;
        dragVelY = e.clientY - prevDragMY;
        dragObj.dispX = dragStartDX + (e.clientX - dragStartMX);
        dragObj.dispY = dragStartDY + (e.clientY - dragStartMY);
        prevDragMX = e.clientX; prevDragMY = e.clientY;
      }
    }, { passive: true });

    window.addEventListener('mouseup', () => {
      if (!dragObj) return;
      dragObj.velX = dragVelX * 0.45;
      dragObj.velY = dragVelY * 0.45;
      dragObj = null;
    });

    window.addEventListener('mouseleave', () => {
      if (!dragObj) return;
      dragObj.velX = 0; dragObj.velY = 0; dragObj = null;
    });

    /* click on empty space → shockwave */
    window.addEventListener('click', e => {
      if (e.target.closest('a, button, input, select, textarea, [role="button"]')) return;
      if (wasDragging) return;
      const hit = findArtworkAt(e.clientX, e.clientY, lastDrawT);
      if (hit) return;
      if (shockwaves.length < 4) {
        shockwaves.push({ x: e.clientX, y: e.clientY, r: 0, life: 1.0 });
      }
    }, { passive: true });

    window.addEventListener('wheel', e => {
      if (window.isPanelOpen && window.isPanelOpen()) return;
      if (dragObj) return;
      velocity -= e.deltaY * 0.18;
      resetDrift();
    }, { passive: true });

    let ty0 = 0;
    window.addEventListener('touchstart', e => {
      if (window.isPanelOpen && window.isPanelOpen()) return;
      const tx = e.touches[0].clientX, ty_ = e.touches[0].clientY;
      ty0 = ty_;
      const hit = findArtworkAt(tx, ty_, lastDrawT);
      if (hit) {
        dragObj = hit;
        dragStartDX = hit.dispX; dragStartDY = hit.dispY;
        dragStartMX = tx; dragStartMY = ty_;
        prevDragMX  = tx; prevDragMY  = ty_;
        dragVelX = 0; dragVelY = 0; hit.velX = 0; hit.velY = 0;
      }
      resetDrift();
    }, { passive: true });

    window.addEventListener('touchmove', e => {
      if (window.isPanelOpen && window.isPanelOpen()) return;
      const tx = e.touches[0].clientX, ty_ = e.touches[0].clientY;
      if (dragObj) {
        dragVelX = tx - prevDragMX; dragVelY = ty_ - prevDragMY;
        dragObj.dispX = dragStartDX + (tx - dragStartMX);
        dragObj.dispY = dragStartDY + (ty_ - dragStartMY);
        prevDragMX = tx; prevDragMY = ty_;
      } else {
        velocity += (ty0 - ty_) * 1.4; ty0 = ty_;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (!dragObj) return;
      dragObj.velX = dragVelX * 0.45; dragObj.velY = dragVelY * 0.45; dragObj = null;
    });

    resetDrift();

    /* ── Lazy load ── */
    function loadNearby() {
      objects.forEach(obj => {
        if (obj.loaded || obj.loading) return;
        if (effZ(obj) < -LOAD_D) return;
        obj.loading = true;
        const img = new Image();
        img.onload = () => {
          obj.h = obj.w / (img.naturalWidth / img.naturalHeight);
          obj.img = img; obj.loaded = true;
        };
        img.onerror = () => { obj.loading = false; };
        img.src = obj.src;
      });
    }

    /* ── Draw ── */
    function draw(t) {
      lastDrawT = t;
      const CX = W / 2 + parX, CY = H / 2 + parY;
      const svcOpen = document.body.classList.contains('svc-open') ||
                      document.body.classList.contains('svc-detail-open') ||
                      document.body.classList.contains('mode-work') ||
                      document.body.classList.contains('mode-teaching');

      /* ── Spring physics + mouse repulsion ── */
      objects.forEach(obj => {
        if (obj === dragObj) return;

        /* spring back toward rest */
        if (obj.dispX !== 0 || obj.dispY !== 0 || obj.velX !== 0 || obj.velY !== 0) {
          obj.velX = obj.velX * SPRING_DAMP - obj.dispX * SPRING_K;
          obj.velY = obj.velY * SPRING_DAMP - obj.dispY * SPRING_K;
          obj.dispX += obj.velX;
          obj.dispY += obj.velY;
          if (Math.abs(obj.dispX) < 0.05 && Math.abs(obj.velX) < 0.05) { obj.dispX = 0; obj.velX = 0; }
          if (Math.abs(obj.dispY) < 0.05 && Math.abs(obj.velY) < 0.05) { obj.dispY = 0; obj.velY = 0; }
        }

        /* mouse repulsion — skip hovered image & skip when svc panel open */
        if (obj === hoveredObj) return;
        if (svcOpen) return;
        const ez_ = effZ(obj);
        if (ez_ > -25 || ez_ < -CYCLE * 0.93) return;
        const sc_ = FOV / (FOV - ez_);
        if (sc_ <= 0 || sc_ > 5 || !isFinite(sc_)) return;
        const fy_ = Math.sin(t * obj.floatFreq + obj.floatPhase) * obj.floatAmp;
        const sx_ = CX + obj.x * sc_ + obj.dispX;
        const sy_ = CY + (obj.y + fy_) * sc_ + obj.dispY;
        const dist = Math.hypot(mouseX - sx_, mouseY - sy_);
        if (dist < PUSH_R && dist > 4) {
          const push = Math.pow(1 - dist / PUSH_R, 1.6) * PUSH_STR * Math.sqrt(sc_);
          const angle = Math.atan2(sy_ - mouseY, sx_ - mouseX);
          obj.velX += Math.cos(angle) * push;
          obj.velY += Math.sin(angle) * push;
        }
      });

      /* ── Clear ── */
      ctx.globalAlpha = 1; ctx.filter = 'none';
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
      ctx.fillStyle = '#f5f4f2';
      ctx.fillRect(0, 0, W, H);

      const speed = Math.abs(velocity);

      /* ── Cursor warmth glow (drawn before artworks, suppressed in svc mode) ── */
      if (!dragObj && !svcOpen) {
        const gw = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 280);
        gw.addColorStop(0,   'rgba(217,101,53,0.08)');
        gw.addColorStop(0.4, 'rgba(217,101,53,0.03)');
        gw.addColorStop(1,   'rgba(217,101,53,0)');
        ctx.fillStyle = gw;
        ctx.fillRect(0, 0, W, H);
      }

      /* ── Cull + sort back→front ── */
      let items = objects
        .map(obj => ({ obj, ez: effZ(obj) }))
        .filter(({ ez }) => ez < -25 && ez > -CYCLE * 0.93)
        .sort((a, b) => a.ez - b.ez);
      if (items.length > MAX_VISIBLE) items = items.slice(items.length - MAX_VISIBLE);

      /* ── Hover detection ── */
      let newHover = null;
      if (!dragObj) {
        for (let i = items.length - 1; i >= 0; i--) {
          const { obj, ez } = items[i];
          if (!obj.img) continue;
          const sc = FOV / (FOV - ez);
          if (sc <= 0 || sc > 5 || !isFinite(sc)) continue;
          const fy = Math.sin(t * obj.floatFreq + obj.floatPhase) * obj.floatAmp;
          const sx = CX + obj.x * sc + obj.dispX;
          const sy = CY + (obj.y + fy) * sc + obj.dispY;
          const sw = obj.w * sc, sh = obj.h * sc;
          if (mouseX >= sx - sw / 2 && mouseX <= sx + sw / 2 &&
              mouseY >= sy - sh / 2 && mouseY <= sy + sh / 2) {
            newHover = obj; break;
          }
        }
      }
      hoveredObj = newHover;
      hoverT    += ((hoveredObj ? 1 : 0) - hoverT) * 0.10;
      if      (dragObj)    document.body.style.cursor = 'grabbing';
      else if (hoveredObj) document.body.style.cursor = 'grab';
      else                 document.body.style.cursor = '';

      /* ── Smooth 3-D tilt for hovered image ──
         canvas ctx.transform(1, b, c, 1, 0, 0) after translate(cx,cy):
           b = y-shear per x  → Y-axis rotation look (left-right lean)
           c = x-shear per y  → X-axis rotation look (up-down lean)
      ── */
      if (hoveredObj) {
        const ez_ = effZ(hoveredObj);
        const sc_ = FOV / (FOV - ez_);
        const fy_ = Math.sin(t * hoveredObj.floatFreq + hoveredObj.floatPhase) * hoveredObj.floatAmp;
        const sx_ = CX + hoveredObj.x * sc_ + hoveredObj.dispX;
        const sy_ = CY + (hoveredObj.y + fy_) * sc_ + hoveredObj.dispY;
        const sw_ = hoveredObj.w * sc_, sh_ = hoveredObj.h * sc_;
        const nx = Math.max(-1, Math.min(1, (mouseX - sx_) / (sw_ / 2)));
        const ny = Math.max(-1, Math.min(1, (mouseY - sy_) / (sh_ / 2)));
        hoverTiltB += (nx * 0.13 - hoverTiltB) * 0.12;   // Y-axis look
        hoverTiltC += (-ny * 0.09 - hoverTiltC) * 0.12;  // X-axis look
      } else {
        hoverTiltB *= 0.85;
        hoverTiltC *= 0.85;
      }

      /* ── Dust particles ── */
      particles.forEach(p => {
        const ez = ((p.z + cameraZ) % CYCLE + CYCLE) % CYCLE - CYCLE;
        if (ez > -10 || ez < -CYCLE * 0.93) return;
        const sc = FOV / (FOV - ez);
        if (!isFinite(sc) || sc <= 0 || sc > 5) return;
        const fy = Math.sin(t * p.floatFreq + p.floatPhase) * p.floatAmp;
        const px = CX + p.x * sc, py = CY + (p.y + fy) * sc;
        if (px < -4 || px > W + 4 || py < -4 || py > H + 4) return;
        const da = Math.min(1, Math.max(0, 1 + ez / (CYCLE * 0.78)));
        ctx.globalAlpha = p.baseAlpha * da;
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.3, p.size * sc), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      /* ── Mouse sparkle trail ── */
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const sp = sparkles[i];
        sp.x += sp.vx; sp.y += sp.vy;
        sp.vy *= 0.96; sp.vx *= 0.98;
        sp.life -= 0.038;
        if (sp.life <= 0) { sparkles.splice(i, 1); continue; }
        const r = sp.size * sp.life;
        if (r > 0.15) {
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(217,101,53,${(sp.life * 0.58).toFixed(2)})`;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      /* ── Artwork renderer ── */
      const anyHover = hoverT > 0.02;
      const BG = '#f5f4f2';

      function renderObj({ obj, ez }) {
        const sc = FOV / (FOV - ez);
        if (sc <= 0 || sc > 5 || !isFinite(sc)) return;

        const fy  = Math.sin(t * obj.floatFreq + obj.floatPhase) * obj.floatAmp;
        const sx  = CX + obj.x * sc + obj.dispX;
        const sy  = CY + (obj.y + fy) * sc + obj.dispY;
        const sw  = obj.w * sc, sh = obj.h * sc;

        if (sx + sw / 2 < 0 || sx - sw / 2 > W ||
            sy + sh / 2 < 0 || sy - sh / 2 > H) return;

        const depthA    = Math.min(1, Math.max(0, 1 + ez / (CYCLE * 0.78)));
        const isDragged = obj === dragObj;
        const isHovered = obj === hoveredObj;
        const spotlight = anyHover && !isHovered && !isDragged ? 1 - hoverT * 0.50 : 1;
        const finalA    = depthA * spotlight;
        const lift      = isDragged ? 1.12 : (isHovered ? 1 + hoverT * 0.08 : 1);
        const dsw       = sw * lift, dsh = sh * lift;
        const distC     = Math.hypot(sx - W / 2, sy - H / 2);
        const sat       = (isHovered || isDragged) ? 1 : Math.min(1, Math.max(0, (distC - 80) / 280));

        /* ── Approach glow — warm halo grows as cursor nears image ── */
        if (!isHovered && !isDragged && obj.img) {
          const proxDist = Math.hypot(mouseX - sx, mouseY - sy);
          if (proxDist < 230) {
            const proxA = (1 - proxDist / 230) * 0.22 * depthA;
            if (proxA > 0.01) {
              const gr = Math.max(dsw, dsh) * 0.70 + 20;
              const pg = ctx.createRadialGradient(sx, sy, Math.min(dsw, dsh) * 0.15, sx, sy, gr);
              pg.addColorStop(0,   `rgba(217,101,53,${proxA.toFixed(3)})`);
              pg.addColorStop(1,   'rgba(217,101,53,0)');
              ctx.globalAlpha = 1;
              ctx.fillStyle = pg;
              ctx.fillRect(sx - gr, sy - gr, gr * 2, gr * 2);
            }
          }
        }

        if (obj.img) {
          ctx.save();
          ctx.translate(sx, sy);

          /* 3-D perspective tilt (affine skew approximation) */
          if (isHovered && (Math.abs(hoverTiltB) > 0.002 || Math.abs(hoverTiltC) > 0.002)) {
            ctx.transform(1, hoverTiltB, hoverTiltC, 1, 0, 0);
          } else if (isDragged) {
            const db = dragVelX * 0.007, dc = dragVelY * 0.005;
            if (Math.abs(db) > 0.001 || Math.abs(dc) > 0.001) ctx.transform(1, dc, db, 1, 0, 0);
          }

          /* B&W when services panel open — hovered/dragged images stay full colour */
          const showGray = svcOpen && !isHovered && !isDragged;
          if (showGray) ctx.filter = 'grayscale(1)';

          /* shadow */
          if (sc > 0.42) {
            if (isDragged) {
              ctx.shadowColor   = 'rgba(217,101,53,0.55)';
              ctx.shadowBlur    = 22 * sc;
              ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 6 * sc;
            } else if (isHovered && hoverT > 0.1) {
              ctx.shadowColor   = `rgba(217,101,53,${(hoverT * 0.50).toFixed(2)})`;
              ctx.shadowBlur    = 18 * sc;
              ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
            } else {
              ctx.shadowColor   = showGray ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.10)';
              ctx.shadowBlur    = 8 * sc;
              ctx.shadowOffsetX = 1 * sc; ctx.shadowOffsetY = 3 * sc;
            }
          }

          ctx.globalAlpha = isDragged ? Math.min(depthA * 1.05, 1) : finalA;
          ctx.drawImage(obj.img, -dsw / 2, -dsh / 2, dsw, dsh);
          ctx.restore();   // also clears filter + shadow

          /* desaturation overlay (normal mode only — grayscale filter handles svc mode) */
          if (!showGray && sat < 0.94) {
            ctx.globalAlpha = finalA * (1 - sat) * 0.58;
            ctx.fillStyle = BG;
            ctx.fillRect(sx - dsw / 2, sy - dsh / 2, dsw, dsh);
          }
        } else {
          if (sc > 0.30) {
            ctx.globalAlpha = finalA * 0.45;
            ctx.fillStyle = '#d0cbc4';
            ctx.fillRect(sx - sw / 2, sy - sh / 2, sw, sh);
          }
        }
        ctx.globalAlpha = 1;
      }

      /* render pass 1: everything except the dragged image */
      items.forEach(it => { if (it.obj !== dragObj) renderObj(it); });

      /* render pass 2: dragged image always on top */
      if (dragObj) {
        const dez = effZ(dragObj);
        if (dez < -25 && dez > -CYCLE * 0.93) renderObj({ obj: dragObj, ez: dez });
      }

      /* ── Constellation web — threads between nearby images ── */
      {
        const CMAX = 14, CTHR = 265;
        let lineCount = 0;
        const pts = items.map(({ obj, ez }) => {
          if (!obj.img) return null;
          const sc = FOV / (FOV - ez);
          if (sc <= 0 || sc > 5 || !isFinite(sc)) return null;
          const fy = Math.sin(t * obj.floatFreq + obj.floatPhase) * obj.floatAmp;
          const sx = CX + obj.x * sc + obj.dispX;
          const sy = CY + (obj.y + fy) * sc + obj.dispY;
          if (sx < -60 || sx > W + 60 || sy < -60 || sy > H + 60) return null;
          return { sx, sy };
        });
        for (let a = 0; a < pts.length && lineCount < CMAX; a++) {
          if (!pts[a]) continue;
          for (let b = a + 1; b < pts.length && lineCount < CMAX; b++) {
            if (!pts[b]) continue;
            const d = Math.hypot(pts[a].sx - pts[b].sx, pts[a].sy - pts[b].sy);
            if (d < CTHR) {
              const al = (1 - d / CTHR) * 0.16;
              ctx.globalAlpha = al;
              ctx.strokeStyle = 'rgba(217,101,53,1)';
              ctx.lineWidth   = (1 - d / CTHR) * 1.5;
              ctx.beginPath();
              ctx.moveTo(pts[a].sx, pts[a].sy);
              ctx.lineTo(pts[b].sx, pts[b].sy);
              ctx.stroke();
              lineCount++;
            }
          }
        }
        ctx.globalAlpha = 1;
      }

      /* ── Shockwave rings ── */
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const s = shockwaves[i];
        s.r    += 14;
        s.life *= 0.91;

        /* push visible artworks as wavefront passes */
        items.forEach(({ obj, ez }) => {
          const sc_ = FOV / (FOV - ez);
          const fy_ = Math.sin(t * obj.floatFreq + obj.floatPhase) * obj.floatAmp;
          const sx_ = CX + obj.x * sc_ + obj.dispX;
          const sy_ = CY + (obj.y + fy_) * sc_ + obj.dispY;
          const d   = Math.hypot(sx_ - s.x, sy_ - s.y);
          const wd  = Math.abs(d - s.r);
          if (wd < 65) {
            const impulse = (1 - wd / 65) * 0.9 * s.life;
            const ang     = Math.atan2(sy_ - s.y, sx_ - s.x);
            obj.velX += Math.cos(ang) * impulse;
            obj.velY += Math.sin(ang) * impulse;
          }
        });

        /* outer ring */
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(217,101,53,${(s.life * 0.28).toFixed(2)})`;
        ctx.lineWidth   = 2.5 * s.life;
        ctx.stroke();

        /* inner echo ring */
        if (s.r > 40) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(217,101,53,${(s.life * 0.10).toFixed(2)})`;
          ctx.lineWidth   = 1.5 * s.life;
          ctx.stroke();
        }

        if (s.life < 0.02 || s.r > Math.hypot(W, H)) shockwaves.splice(i, 1);
      }

      /* ── Speed lines at high velocity ── */
      if (speed > 8) {
        const lineA = Math.min(0.18, (speed - 8) / 30);
        ctx.globalAlpha = lineA;
        ctx.strokeStyle = 'rgba(245,244,242,0.95)';
        lineOffsets.forEach((off, i) => {
          const a   = ((i / lineOffsets.length) + off * 0.05) * Math.PI * 2;
          const cos = Math.cos(a), sin = Math.sin(a);
          const in0 = 200 + off * 80, len = 70 + off * 200;
          ctx.lineWidth = 0.5 + off * 0.8;
          ctx.beginPath();
          ctx.moveTo(W / 2 + cos * in0, H / 2 + sin * in0);
          ctx.lineTo(W / 2 + cos * (in0 + len), H / 2 + sin * (in0 + len));
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
        for (let i = 0; i < lineOffsets.length; i++) lineOffsets[i] = 0.2 + Math.random() * 0.8;
      }

      /* ── Bottom hint veil — tight ellipse behind "Scroll…" + © text ── */
      {
        const bx = W / 2, by = H + 20;
        const bv = ctx.createRadialGradient(bx, by, 0, bx, by, 320);
        bv.addColorStop(0,    'rgba(245,244,242,0.92)');
        bv.addColorStop(0.35, 'rgba(245,244,242,0.70)');
        bv.addColorStop(0.65, 'rgba(245,244,242,0.25)');
        bv.addColorStop(1,    'rgba(245,244,242,0)');
        ctx.fillStyle = bv;
        ctx.fillRect(W / 2 - 320, H - 300, 640, 320);
      }

      /* ── Nav toolbar veil — top-centre halo ── */
      ctx.filter = 'none'; ctx.globalAlpha = 1;
      if (navVeilGrad) { ctx.fillStyle = navVeilGrad; ctx.fillRect(W / 2 - 210, 0, 420, 325); }

      /* ── Centre veil — always last ── */
      if (veilGrad) { ctx.fillStyle = veilGrad; ctx.fillRect(0, 0, W, H); }
    }

    /* ── Tick ── */
    let lastLoad = 0;
    (function tick(now) {
      requestAnimationFrame(tick);
      if (autoDrift) velocity -= 0.05 + Math.sin(now * 0.00072) * 0.042 + Math.sin(now * 0.00193) * 0.018;
      velocity *= 0.88;
      cameraZ  += velocity;
      parX += (parTX - parX) * 0.055;
      parY += (parTY - parY) * 0.055;
      draw(now * 0.001);
      if (now - lastLoad > 80) { loadNearby(); lastLoad = now; }
    })(0);

    loadNearby();
  }

  Promise.resolve().then(init);
})();
