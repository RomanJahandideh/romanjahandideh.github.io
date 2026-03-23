/*
  MAIN.JS (HOME + ONE-PAGE MODE SWITCH + TEACHING)
  - Keeps your HOME behavior intact
  - Preserves WORK behavior intact
  - Extends mode switching to HOME <-> WORK <-> TEACHING
  - Adds a self-contained TEACHING mode and teaching detail overlay
  - Fixes Stage 3 lost content by rewriting /assets/... fetches to /work/assets/...
*/

(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const MODE_ORDER = ["home", "work", "teaching"];

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const ensureSharedTiltState = () => {
    if (window.__portfolioTiltState) return window.__portfolioTiltState;

    const tilt = {
      rawX: 0,
      rawY: 0,
      active: false,
      permission: "unknown",
      attached: false,
      lastUpdate: 0
    };

    const normalize = (value, limit) => clamp((Number(value) || 0) / limit, -1, 1);

    const handleOrientation = (event) => {
      if (typeof event.gamma !== "number" || typeof event.beta !== "number") return;
      tilt.rawX = normalize(event.gamma, 28);
      tilt.rawY = normalize(event.beta, 28);
      tilt.active = true;
      tilt.lastUpdate = performance.now();
    };

    const attachListener = () => {
      if (tilt.attached || !("DeviceOrientationEvent" in window)) return;
      window.addEventListener("deviceorientation", handleOrientation, true);
      tilt.attached = true;
    };

    const requestAccess = () => {
      if (!("DeviceOrientationEvent" in window)) return Promise.resolve(false);

      try {
        if (typeof DeviceOrientationEvent.requestPermission === "function") {
          return DeviceOrientationEvent.requestPermission()
            .then((state) => {
              tilt.permission = state;
              if (state === "granted") {
                attachListener();
                return true;
              }
              return false;
            })
            .catch(() => false);
        }
      } catch {}

      tilt.permission = "granted";
      attachListener();
      return Promise.resolve(true);
    };

    const primeAccess = () => {
      requestAccess().finally(() => {
        window.removeEventListener("pointerdown", primeAccess);
        window.removeEventListener("touchstart", primeAccess);
        window.removeEventListener("click", primeAccess);
      });
    };

    if ("DeviceOrientationEvent" in window) {
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        window.addEventListener("pointerdown", primeAccess, { once: true, passive: true });
        window.addEventListener("touchstart", primeAccess, { once: true, passive: true });
        window.addEventListener("click", primeAccess, { once: true, passive: true });
      } else {
        attachListener();
      }
    }

    window.__portfolioTiltState = tilt;
    return tilt;
  };


  const readCssNumber = (name, fallback) => {
    try {
      const raw = getComputedStyle(root).getPropertyValue(name);
      const n = parseFloat(String(raw).trim());
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  };

  // =========================================================
  // A) PATH FIX SHIM (RESTORE STAGE 3 CONTENT)
  // =========================================================
  const WORK_ASSET_PREFIX = "/work/assets/";
  const ROOT_ASSET_PREFIX = "/assets/";

  const shouldRewriteToWork = (urlStr) => {
    if (typeof urlStr !== "string") return false;
    if (!urlStr.startsWith(ROOT_ASSET_PREFIX)) return false;

    const isHtml = urlStr.endsWith(".html");
    const isCreative = urlStr.includes("/creative/");
    const isEmbed = urlStr.includes("embed");
    const isData = urlStr.includes("/data/") || urlStr.endsWith(".json");

    return isHtml || isCreative || isEmbed || isData;
  };

  if (typeof window.fetch === "function") {
    const _fetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      try {
        const url = (typeof input === "string") ? input : (input && input.url) ? input.url : "";
        if (typeof url === "string" && shouldRewriteToWork(url)) {
          const rewritten = url.replace(ROOT_ASSET_PREFIX, WORK_ASSET_PREFIX);
          const nextInput = (typeof input === "string") ? rewritten : new Request(rewritten, input);
          return _fetch(nextInput, init);
        }
      } catch {}
      return _fetch(input, init);
    };
  }

  if (typeof window.XMLHttpRequest === "function") {
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      try {
        if (typeof url === "string" && shouldRewriteToWork(url)) {
          url = url.replace(ROOT_ASSET_PREFIX, WORK_ASSET_PREFIX);
        }
      } catch {}
      return _open.call(this, method, url, ...rest);
    };
  }

  // =========================================================
  // B) MODE SYSTEM + TEACHING SETUP
  // =========================================================
  const isMergedRoot = !!document.querySelector("#home-spiderweb-canvas")
    && !!document.querySelector(".hero")
    && !!document.getElementById("main");

  const normalizeMode = (mode) => {
    const clean = String(mode || "home").toLowerCase().trim();
    return MODE_ORDER.includes(clean) ? clean : "home";
  };

  const getMode = () => normalizeMode(body.dataset.mode || "home");

  const TEACHING_DATA = {
    iat313: {
      key: "iat313",
      title: "IAT 313 Narrative and New Media",
      subtitle: "Teaching Assistant, Simon Fraser University",
      description:
        "Over two consecutive terms as a Teaching Assistant for IAT 313, I facilitated student learning in narrative design for interactive and digital media. I led weekly discussions, provided structured feedback on story-driven assignments, and supported students in translating narrative concepts into interactive artifacts such as games and experiential digital works.",
      responsibilities: [
        "Led weekly discussions and learning support sessions across Summer and Fall 2025 cohorts.",
        "Provided structured feedback on story-driven assignments, concept development, and project direction.",
        "Coached students on branching narrative frameworks, media theory, and transmedia storytelling.",
        "Supported the translation of narrative ideas into interactive artifacts, including games and experiential digital works.",
        "Emphasized clarity, thematic depth, and critical thinking throughout iterative project development."
      ],
      bannerImage: "IAT3131"
    },
    iat343: {
      key: "iat343",
      title: "IAT 343 Animation",
      subtitle: "Teaching Assistant, Simon Fraser University",
      description:
        "As a Teaching Assistant for IAT 343 across Summer and Fall 2025, I supported multiple cohorts in advanced 3D animation production. I provided instruction and troubleshooting in modeling, rigging, texturing, and animation using Autodesk Maya, and mentored project teams through full animated short pipelines from storyboarding to rendering.",
      responsibilities: [
        "Provided instruction and troubleshooting in modeling, rigging, texturing, and animation using Autodesk Maya.",
        "Delivered in-class demonstrations on professional 3D animation workflows.",
        "Mentored project teams through full animated short pipelines from storyboarding to rendering.",
        "Reinforced best practices in topology, UV mapping, and production-ready asset development.",
        "Guided students in building industry-standard animation skills across Summer and Fall 2025 cohorts."
      ],
      bannerImage: "IAT3431"
    }
  };

  const teaching = {
    ready: false,
    rootEl: null,
    stackEl: null,
    items: [],
    hoverKey: null,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    rafId: 0,
    tiltX: 0,
    tiltY: 0,
    overlay: null,
    overlayBackdrop: null,
    overlayPanel: null,
    overlayClose: null,
    overlayTitle: null,
    overlaySubtitle: null,
    overlayDescription: null,
    overlayList: null,
    overlayHero: null,
    imageCache: new Map()
  };

  const dispatchModeChange = (mode) => {
    window.dispatchEvent(new CustomEvent("portfolio:modechange", {
      detail: { mode }
    }));
  };

  const clearTeachingHash = () => {
    if ((location.hash || "").toLowerCase() !== "#teaching") return;
    try {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    } catch {}
  };

  const setTeachingHash = () => {
    if ((location.hash || "").toLowerCase() === "#teaching") return;
    try {
      history.replaceState(null, "", `${location.pathname}${location.search}#teaching`);
    } catch {}
  };

  const isHashPanelOpen = () => {
    const h = (location.hash || "").toLowerCase();
    return h === "#about" || h === "#contact";
  };

  const isWorkLockedOpen = () => {
    return body.classList.contains("stage3-open")
      || body.classList.contains("mode3-active")
      || root.classList.contains("mode3-active");
  };

  const isTeachingDetailOpen = () => body.classList.contains("teaching-detail-open");

  const isPanelOpen = () => isHashPanelOpen() || isWorkLockedOpen() || isTeachingDetailOpen();

  const closeTeachingDetail = () => {
    if (!teaching.overlay) return;
    teaching.overlay.setAttribute("aria-hidden", "true");
    body.classList.remove("teaching-detail-open");
  };

  const testImageCandidate = (src) => new Promise((resolve) => {
    const img = new Image();
    let finished = false;

    const done = (ok) => {
      if (finished) return;
      finished = true;
      resolve(ok ? src : null);
    };

    const timer = setTimeout(() => done(false), 2500);

    img.onload = () => {
      clearTimeout(timer);
      done(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      done(false);
    };
    img.src = src;
  });

  const resolveTeachingImage = async (baseName) => {
    if (teaching.imageCache.has(baseName)) {
      return teaching.imageCache.get(baseName);
    }

    const prefixes = ["Teaching/", "./Teaching/", "/Teaching/"];
    const exts = [".jpeg", ".jpg", ".png", ".webp", ".JPEG", ".JPG", ".PNG", ".WEBP"];

    for (const prefix of prefixes) {
      for (const ext of exts) {
        const candidate = `${prefix}${baseName}${ext}`;
        const ok = await testImageCandidate(candidate);
        if (ok) {
          teaching.imageCache.set(baseName, ok);
          return ok;
        }
      }
    }

    teaching.imageCache.set(baseName, null);
    return null;
  };

  const fillTeachingOverlay = async (courseKey) => {
    const item = TEACHING_DATA[courseKey];
    if (!item || !teaching.overlay) return;

    teaching.overlayTitle.textContent = item.title;
    teaching.overlaySubtitle.textContent = item.subtitle;
    teaching.overlayDescription.textContent = item.description;

    teaching.overlayList.innerHTML = "";
    (item.responsibilities || []).forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = entry;
      teaching.overlayList.appendChild(li);
    });

    const slot = teaching.overlayHero;
    if (!slot) return;

    slot.figure.dataset.empty = "true";
    slot.img.removeAttribute("src");
    slot.img.alt = item.title;

    const src = await resolveTeachingImage(item.bannerImage);
    if (!src) return;

    slot.figure.dataset.empty = "false";
    slot.img.src = src;
    slot.img.alt = `${item.title} banner image`;
  };

  const openTeachingDetail = async (courseKey) => {
    ensureTeachingMode();
    if (!teaching.overlay) return;
    await fillTeachingOverlay(courseKey);
    teaching.overlay.setAttribute("aria-hidden", "false");
    body.classList.add("teaching-detail-open");
  };

  const updateTeachingLayers = (timeMs) => {
    if (!teaching.stackEl || getMode() !== "teaching") {
      teaching.rafId = requestAnimationFrame(updateTeachingLayers);
      return;
    }

    const rect = teaching.stackEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const nx = clamp((teaching.mouseX - cx) / (rect.width / 2 || 1), -1, 1);
    const ny = clamp((teaching.mouseY - cy) / (rect.height / 2 || 1), -1, 1);

    const sharedTilt = ensureSharedTiltState();
    const targetTiltX = sharedTilt.active ? sharedTilt.rawX : 0;
    const targetTiltY = sharedTilt.active ? sharedTilt.rawY : 0;

    teaching.tiltX += (targetTiltX - teaching.tiltX) * 0.085;
    teaching.tiltY += (targetTiltY - teaching.tiltY) * 0.085;

    const t = timeMs * 0.001;

    teaching.items.forEach((item, index) => {
      const orbitX = Math.sin(t * item.speed + item.phase) * item.floatX;
      const orbitY = Math.cos(t * (item.speed * 0.92) + item.phase) * item.floatY;
      const mousePushX = nx * item.mouseX;
      const mousePushY = ny * item.mouseY;
      const tiltPushX = teaching.tiltX * item.tiltX;
      const tiltPushY = teaching.tiltY * item.tiltY;
      const hoverScale = teaching.hoverKey === item.key ? 1.85 : 1.0;
      const hoverGlow = teaching.hoverKey === item.key ? 1 : 0;
      const x = item.baseX + orbitX + mousePushX + tiltPushX;
      const y = item.baseY + orbitY + mousePushY + tiltPushY;

      item.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${hoverScale})`;
      item.el.style.setProperty("--teaching-glow", hoverGlow ? "1" : "0");
      item.el.style.zIndex = teaching.hoverKey === item.key ? "3" : String(1 + index);
    });

    teaching.rafId = requestAnimationFrame(updateTeachingLayers);
  };

  const ensureTeachingMode = () => {
    if (!isMergedRoot || teaching.ready) return teaching;

    const workRoot = document.getElementById("main");
    if (!workRoot) return teaching;

    const teachingRoot = document.createElement("section");
    teachingRoot.id = "teaching-mode";
    teachingRoot.setAttribute("aria-hidden", "true");
    teachingRoot.innerHTML = `
      <div class="teaching-wrap">
        <div id="teaching-stack" class="teaching-scale-wrap" aria-label="Teaching courses">
          <div id="teaching-main-stack">
            <button class="teaching-layer" type="button" data-course="iat313" aria-label="IAT 313 Narrative and New Media">
              <span class="label">IAT 313 Narrative and New Media</span>
            </button>
            <button class="teaching-layer" type="button" data-course="iat343" aria-label="IAT 343 Animation">
              <span class="label">IAT 343 Animation</span>
            </button>
          </div>
        </div>
      </div>
    `;

    workRoot.insertAdjacentElement("afterend", teachingRoot);

    const overlay = document.createElement("div");
    overlay.id = "teaching-detail-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="teaching-detail-backdrop" data-teaching-close="1"></div>
      <div class="teaching-detail-panel" role="dialog" aria-modal="true" aria-labelledby="teaching-detail-title">
        <button class="teaching-detail-close" type="button" aria-label="Close teaching detail" data-teaching-close="1">Close</button>
        <div class="teaching-detail-inner">
          <figure class="teaching-detail-hero teaching-image-slot" data-empty="true">
            <img alt="" />
          </figure>
          <div class="teaching-detail-copy">
            <div class="teaching-detail-kicker" id="teaching-detail-subtitle"></div>
            <h2 class="teaching-detail-title" id="teaching-detail-title"></h2>
            <p class="teaching-detail-text"></p>
            <div class="teaching-detail-section-title">Responsibilities</div>
            <ul class="teaching-detail-list"></ul>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    teaching.ready = true;
    teaching.rootEl = teachingRoot;
    teaching.stackEl = teachingRoot.querySelector("#teaching-stack");
    teaching.overlay = overlay;
    teaching.overlayBackdrop = overlay.querySelector(".teaching-detail-backdrop");
    teaching.overlayPanel = overlay.querySelector(".teaching-detail-panel");
    teaching.overlayClose = overlay.querySelector(".teaching-detail-close");
    teaching.overlayTitle = overlay.querySelector(".teaching-detail-title");
    teaching.overlaySubtitle = overlay.querySelector("#teaching-detail-subtitle");
    teaching.overlayDescription = overlay.querySelector(".teaching-detail-text");
    teaching.overlayList = overlay.querySelector(".teaching-detail-list");

    const heroFigure = overlay.querySelector(".teaching-detail-hero");
    teaching.overlayHero = heroFigure ? {
      figure: heroFigure,
      img: heroFigure.querySelector("img")
    } : null;

    const teachingEls = Array.from(teachingRoot.querySelectorAll(".teaching-layer"));
    const layout = [
      { key: "iat313", baseX: -112, baseY: -10, phase: 0.2, speed: 1.0, floatX: 14, floatY: 11, mouseX: 20, mouseY: 14, tiltX: 34, tiltY: 28 },
      { key: "iat343", baseX: 112, baseY: 18, phase: 1.6, speed: 1.15, floatX: 13, floatY: 15, mouseX: 20, mouseY: 16, tiltX: 34, tiltY: 28 }
    ];

    teaching.items = teachingEls.map((el, index) => {
      const conf = layout[index];
      el.addEventListener("mouseenter", () => {
        teaching.hoverKey = conf.key;
        el.classList.add("is-hover");
      });
      el.addEventListener("mouseleave", () => {
        if (teaching.hoverKey === conf.key) teaching.hoverKey = null;
        el.classList.remove("is-hover");
      });
      el.addEventListener("focus", () => {
        teaching.hoverKey = conf.key;
        el.classList.add("is-hover");
      });
      el.addEventListener("blur", () => {
        if (teaching.hoverKey === conf.key) teaching.hoverKey = null;
        el.classList.remove("is-hover");
      });
      el.addEventListener("click", () => {
        openTeachingDetail(conf.key);
      });
      return { ...conf, el };
    });

    teachingRoot.addEventListener("mousemove", (e) => {
      teaching.mouseX = e.clientX;
      teaching.mouseY = e.clientY;
    }, { passive: true });

    window.addEventListener("mousemove", (e) => {
      if (getMode() !== "teaching") return;
      teaching.mouseX = e.clientX;
      teaching.mouseY = e.clientY;
    }, { passive: true });

    overlay.addEventListener("click", (e) => {
      const closeTarget = e.target && e.target.closest ? e.target.closest("[data-teaching-close='1']") : null;
      if (closeTarget) closeTeachingDetail();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isTeachingDetailOpen()) {
        closeTeachingDetail();
      }
    });

    if (!teaching.rafId) {
      teaching.rafId = requestAnimationFrame(updateTeachingLayers);
    }

    return teaching;
  };

  const canLeaveCurrentMode = (targetMode) => {
    const currentMode = getMode();

    if (currentMode === "teaching" && targetMode !== "teaching" && isTeachingDetailOpen()) {
      closeTeachingDetail();
    }

    if (currentMode === "work" && targetMode !== "work" && isWorkLockedOpen()) {
      return false;
    }

    return true;
  };

  const applyModeDom = (mode, options = {}) => {
    const nextMode = normalizeMode(mode);
    const currentMode = getMode();

    if (currentMode === nextMode && !options.force) {
      dispatchModeChange(nextMode);
      return nextMode;
    }

    if (isMergedRoot) ensureTeachingMode();

    body.dataset.mode = nextMode;
    body.classList.toggle("mode-home", nextMode === "home");
    body.classList.toggle("mode-work", nextMode === "work");
    body.classList.toggle("mode-teaching", nextMode === "teaching");

    const workRoot = document.getElementById("main");
    if (workRoot) {
      const active = nextMode === "work";
      workRoot.setAttribute("aria-hidden", active ? "false" : "true");
      workRoot.style.pointerEvents = active ? "auto" : "none";
    }

    const hero = document.querySelector(".hero");
    if (hero) {
      const active = nextMode === "home";
      hero.setAttribute("aria-hidden", active ? "false" : "true");
      hero.style.pointerEvents = active ? "auto" : "none";
    }

    if (teaching.rootEl) {
      const active = nextMode === "teaching";
      teaching.rootEl.setAttribute("aria-hidden", active ? "false" : "true");
      teaching.rootEl.style.pointerEvents = active ? "auto" : "none";
    }

    if (nextMode !== "teaching") {
      closeTeachingDetail();
      clearTeachingHash();
    } else if (options.writeHash) {
      setTeachingHash();
    }

    dispatchModeChange(nextMode);
    return nextMode;
  };

  const setMode = (mode, options = {}) => {
    const nextMode = normalizeMode(mode);
    if (!canLeaveCurrentMode(nextMode)) return getMode();
    return applyModeDom(nextMode, options);
  };

  const stepMode = (dir) => {
    const current = getMode();
    const index = MODE_ORDER.indexOf(current);
    const nextIndex = (index + dir + MODE_ORDER.length) % MODE_ORDER.length;
    return setMode(MODE_ORDER[nextIndex]);
  };

  window.PortfolioModes = {
    getMode,
    setMode,
    stepMode,
    isMergedRoot
  };

  if (isMergedRoot) {
    ensureTeachingMode();

    const initialHash = (location.hash || "").toLowerCase();
    const initialMode = initialHash === "#teaching" ? "teaching" : getMode();
    applyModeDom(initialMode, { force: true, writeHash: initialHash === "#teaching" });

    window.addEventListener("hashchange", () => {
      const h = (location.hash || "").toLowerCase();
      if (h === "#teaching") {
        setMode("teaching", { writeHash: false });
      }
    }, { passive: true });
  } else {
    applyModeDom(getMode(), { force: true });
  }

  const normalizeWheel = (e) => {
    let dy = e.deltaY || 0;
    if (!dy) return 0;

    if (e.deltaMode === 1) dy *= 28;
    else if (e.deltaMode === 2) dy *= 320;

    return clamp(dy, -900, 900);
  };

  let lockUntil = 0;

  window.addEventListener("wheel", (e) => {
    if (!isMergedRoot) return;
    if (isPanelOpen()) return;

    const now = performance.now();
    if (now < lockUntil) return;

    const dy = normalizeWheel(e);
    if (!dy) return;

    const TRIGGER = 18;
    if (Math.abs(dy) < TRIGGER) return;

    if (dy > 0) stepMode(1);
    else if (dy < 0) stepMode(-1);

    lockUntil = now + 650;
  }, { passive: true, capture: true });

  // =========================================================
  // C) ORIGINAL HOME SCRIPT
  // =========================================================
  const isHome = !!document.querySelector("#home-spiderweb-canvas") || !!document.querySelector("#eyes");

  window.addEventListener("load", () => {
    document.body.classList.remove("is-preload");
  });

  if (!isHome) return;

  const setSpotlight = (x, y) => {
    root.style.setProperty("--mx", `${x}px`);
    root.style.setProperty("--my", `${y}px`);
  };

  const setVibe = (x, y) => {
    const amp = readCssNumber("--vib-amp", 10);
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    const nx = clamp((x - cx) / cx, -1, 1);
    const ny = clamp((y - cy) / cy, -1, 1);

    root.style.setProperty("--vib-x", `${(nx * amp).toFixed(2)}px`);
    root.style.setProperty("--vib-y", `${(ny * amp).toFixed(2)}px`);
  };

  const setBgParallax = (x, y) => {
    const maxShift = 14;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;

    const nx = clamp((x - cx) / cx, -1, 1);
    const ny = clamp((y - cy) / cy, -1, 1);

    root.style.setProperty("--bg-shift-x", `${(-nx * maxShift).toFixed(2)}px`);
    root.style.setProperty("--bg-shift-y", `${(-ny * maxShift).toFixed(2)}px`);
  };

  const SMOOTHING = 0.18;

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let curX = targetX;
  let curY = targetY;
  let rafId = null;

  const eye = document.querySelector("#eyes .eye");
  if (!eye) return;

  const ensureLayers = (eyeEl) => {
    if (!eyeEl.querySelector(".iris")) {
      const d = document.createElement("div");
      d.className = "iris";
      eyeEl.appendChild(d);
    }
    if (!eyeEl.querySelector(".waterline")) {
      const d = document.createElement("div");
      d.className = "waterline";
      eyeEl.appendChild(d);
    }
    if (!eyeEl.querySelector(".specular")) {
      const d = document.createElement("div");
      d.className = "specular";
      eyeEl.appendChild(d);
    }
  };
  ensureLayers(eye);

  const setLid = (v) => {
    const vv = clamp(v, 0, 1);
    root.style.setProperty("--lid-1", String(vv));

    const top = clamp(vv * 1.08, 0, 1);
    const bot = clamp(vv * 0.92, 0, 1);
    root.style.setProperty("--lid-1-top", String(top));
    root.style.setProperty("--lid-1-bot", String(bot));
  };

  const kickTrianglePulse = (amount = 1.0) => {
    const current = readCssNumber("--tri-blink-pulse", 0);
    const next = clamp(Math.max(current, amount), 0, 1);
    root.style.setProperty("--tri-blink-pulse", String(next));
  };

  let blinkCooldownUntil = 0;
  let nextIdleBlinkAt = performance.now() + 1200 + Math.random() * 2200;

  const doBlink = () => {
    const now = performance.now();
    if (now < blinkCooldownUntil) return;

    blinkCooldownUntil = now + 420;

    kickTrianglePulse(1.0);

    setLid(1);
    setTimeout(() => setLid(0), 95 + Math.random() * 40);

    if (Math.random() < 0.10) {
      setTimeout(() => {
        kickTrianglePulse(0.85);
        setLid(1);
        setTimeout(() => setLid(0), 80);
      }, 220);
    }
  };

  window.addEventListener("pointerdown", (e) => {
    const t = e.target;
    const tag = t && t.tagName ? String(t.tagName).toLowerCase() : "";
    if (tag === "a" || tag === "button") return;
    doBlink();
  }, { passive: true });

  let pupilRot = 0;
  let pupilRotVel = 0;

  let ringRot = 0;
  let ringRotVel = 0;

  window.addEventListener("wheel", (e) => {
    const dy = e.deltaY || 0;
    if (!dy) return;

    const dir = dy > 0 ? 1 : -1;
    const mag = Math.min(1, Math.abs(dy) / 120);

    pupilRotVel += dir * (2.8 + mag * 2.4);
    pupilRotVel = clamp(pupilRotVel, -16, 16);

    ringRotVel += dir * (1.2 + mag * 0.9);
    ringRotVel = clamp(ringRotVel, -10, 10);
  }, { passive: true });

  let pupilScaleCur = 1;

  const updatePupilScale = (speedPxPerFrame) => {
    const r = eye.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const dx = curX - cx;
    const dy = curY - cy;
    const d = Math.hypot(dx, dy);

    const prox = clamp(1 - d / 260, 0, 1);
    const alert = clamp(speedPxPerFrame / 6, 0, 1);

    const target = clamp(1.05 - prox * 0.22 - alert * 0.10, 0.78, 1.18);
    pupilScaleCur += (target - pupilScaleCur) * 0.16;
    root.style.setProperty("--pupil-scale", pupilScaleCur.toFixed(3));
  };

  const gaze = {
    ox: 0, oy: 0,
    sx: 0, sy: 0,
    sUntil: 0,
    nextS: performance.now() + 800 + Math.random() * 1400
  };

  const updateEye = (clientX, clientY) => {
    const pupil = eye.querySelector(".pupil");
    if (!pupil) return;

    const r = eye.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const dx = clientX - cx;
    const dy = clientY - cy;

    const pupilMul = readCssNumber("--pupil-size-mul", 1);
    const eyeRadius = r.width / 2;
    const derivedPupilRadius = (r.width * 0.33 * pupilMul) / 2;
    const pupilRadius = derivedPupilRadius || 9;
    const max = Math.max(0, eyeRadius - pupilRadius - 6);

    const dist = Math.hypot(dx, dy) || 1;
    const tx = (dx / dist) * Math.min(dist, max);
    const ty = (dy / dist) * Math.min(dist, max);

    const now = performance.now();
    if (now > gaze.nextS) {
      gaze.sx = (Math.random() * 2 - 1) * (1 + Math.random() * 2);
      gaze.sy = (Math.random() * 2 - 1) * (1 + Math.random() * 2);
      gaze.sUntil = now + (70 + Math.random() * 70);
      gaze.nextS = now + (900 + Math.random() * 1400);
    }
    if (now > gaze.sUntil) { gaze.sx *= 0.86; gaze.sy *= 0.86; }

    gaze.ox += (tx - gaze.ox) * 0.18;
    gaze.oy += (ty - gaze.oy) * 0.18;

    const nx = gaze.ox + gaze.sx;
    const ny = gaze.oy + gaze.sy;

    pupil.style.transform =
      `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px)) rotate(${pupilRot}deg) scale(${pupilScaleCur.toFixed(3)})`;

    const ring = eye.querySelector(".glasses-ring");
    if (ring) ring.style.transform = `translate(-50%, -50%) rotate(${ringRot}deg)`;
  };

  const tick = () => {
    const px = curX, py = curY;

    curX += (targetX - curX) * SMOOTHING;
    curY += (targetY - curY) * SMOOTHING;

    setSpotlight(curX, curY);
    setVibe(curX, curY);
    setBgParallax(curX, curY);

    const speed = Math.hypot(curX - px, curY - py);
    updatePupilScale(speed);

    pupilRot += pupilRotVel;
    pupilRotVel *= 0.90;

    ringRot += ringRotVel;
    ringRotVel *= 0.92;

    updateEye(curX, curY);

    if (performance.now() > nextIdleBlinkAt) {
      doBlink();
      nextIdleBlinkAt = performance.now() + 1600 + Math.random() * 3600;
    }

    rafId = requestAnimationFrame(tick);
  };

  const requestUpdate = (x, y) => {
    targetX = x;
    targetY = y;
    if (rafId == null) rafId = requestAnimationFrame(tick);
  };

  window.addEventListener("mousemove", (e) => requestUpdate(e.clientX, e.clientY), { passive: true });
  window.addEventListener("touchmove", (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    requestUpdate(t.clientX, t.clientY);
  }, { passive: true });

  window.addEventListener("resize", () => {
    requestUpdate(
      clamp(targetX, 0, window.innerWidth),
      clamp(targetY, 0, window.innerHeight)
    );
  });

  requestUpdate(window.innerWidth / 2, window.innerHeight / 2);
})();