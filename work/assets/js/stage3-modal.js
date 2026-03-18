/* Stage 3 Modal Overlay (WORK / Dimension style)
   Minimal and reliable:
   - Opens Stage 3 in an iframe
   - Uses backdrop blur so Stage 2 stays visible
   - Injects ONLY small iframe overrides to:
       * rename brand text to "Personalize your composition" (NO DOT)
       * darken the topbar (remove white ribbon)
       * remove Guides toggle + debug footer
   - Does NOT change Stage 3 composition/layout logic.
*/
(() => {
  const BODY_OPEN_CLASS = "stage3-open";
  const LOCK_MS = 250;

  let locked = false;
  let openState = false;

  let overlay, backdrop, panel, titleEl, closeBtn, iframe;

  // ===== Handlers (single place) =====
  const TUNE = {
    creativeUrl: "assets/creative/creative-embed.html", // desktop stays untouched
    creativeMobileUrl: "assets/creative/creative-embed-mobile.html",
    headerLabel: "Project",

    // ✅ No dot
    personalizeText: "Personalize your composition",

    // Topbar tuning (keep dark, integrated)
    topbarBg: "rgba(27,31,34,0.85)",
    topbarBorder: "rgba(255,255,255,0.18)",
    topbarBlur: "10px",

    // Brand typography: match Stage 2 (Inter, normal case)
    brandColor: "rgba(255,255,255,0.92)",
    brandFont: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    brandSize: "12px",
    brandWeight: "600",
    brandLetterSpacing: "0.02em",
    brandTransform: "none",
  };


  function ensureSharedProjectsData(){
    const store = (window.PROJECTS && typeof window.PROJECTS === "object") ? window.PROJECTS : null;
    if (store && Object.keys(store).length) {
      return Promise.resolve(store);
    }

    if (window.__sharedProjectsDataPromise) {
      return window.__sharedProjectsDataPromise;
    }

    const candidates = [];
    const path = String(window.location.pathname || "").toLowerCase();

    if (path.indexOf("/work/") !== -1 || /\/work(?:\/index\.html)?$/.test(path)) {
      candidates.push("assets/js/projects-data.js");
      candidates.push("./assets/js/projects-data.js");
      candidates.push("../work/assets/js/projects-data.js");
      candidates.push("/work/assets/js/projects-data.js");
    } else {
      candidates.push("/work/assets/js/projects-data.js");
      candidates.push("work/assets/js/projects-data.js");
      candidates.push("./work/assets/js/projects-data.js");
      candidates.push("assets/js/projects-data.js");
    }

    window.__sharedProjectsDataPromise = new Promise((resolve) => {
      let idx = 0;

      const finish = () => {
        const loadedStore = (window.PROJECTS && typeof window.PROJECTS === "object") ? window.PROJECTS : {};
        resolve(loadedStore);
      };

      const tryNext = () => {
        const loadedStore = (window.PROJECTS && typeof window.PROJECTS === "object") ? window.PROJECTS : null;
        if (loadedStore && Object.keys(loadedStore).length) {
          finish();
          return;
        }

        if (idx >= candidates.length) {
          finish();
          return;
        }

        const src = candidates[idx++];
        if (!src) {
          tryNext();
          return;
        }

        const existing = Array.from(document.scripts || []).find((script) => {
          const scriptSrc = String(script.getAttribute("src") || script.src || "");
          return scriptSrc.indexOf("projects-data.js") !== -1 && scriptSrc.indexOf(src.replace(/^\.\//, "")) !== -1;
        });

        if (existing) {
          if ((window.PROJECTS && typeof window.PROJECTS === "object") && Object.keys(window.PROJECTS).length) {
            finish();
            return;
          }
          existing.addEventListener("load", finish, { once: true });
          existing.addEventListener("error", tryNext, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.dataset.sharedProjectsData = "1";
        script.addEventListener("load", () => {
          script.dataset.projectsReady = "1";
          finish();
        }, { once: true });
        script.addEventListener("error", tryNext, { once: true });
        document.head.appendChild(script);
      };

      tryNext();
    });

    return window.__sharedProjectsDataPromise;
  }



  function isMobileStage3(){
    try {
      return window.matchMedia("(max-width: 820px), (hover: none) and (pointer: coarse)").matches;
    } catch (_e) {
      return (window.innerWidth || 0) <= 820;
    }
  }

  function lock(fn){
    if (locked) return;
    locked = true;
    try { fn(); } finally { setTimeout(() => (locked = false), LOCK_MS); }
  }

  function ensure(){
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "stage3-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = `
      <div class="stage3-backdrop" aria-hidden="true"></div>
      <div class="stage3-panel" role="dialog" aria-modal="true">
        <div class="stage3-header">
          <div class="stage3-title">${TUNE.headerLabel}</div>
          <div class="stage3-actions">
            <button class="stage3-close" type="button" aria-label="Close">Close</button>
          </div>
        </div>
        <div class="stage3-body">
          <iframe class="stage3-iframe" title="Stage 3"></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    backdrop = overlay.querySelector(".stage3-backdrop");
    panel = overlay.querySelector(".stage3-panel");
    titleEl = overlay.querySelector(".stage3-title");
    closeBtn = overlay.querySelector(".stage3-close");
    iframe = overlay.querySelector("iframe.stage3-iframe");

    backdrop.addEventListener("click", () => close());
    panel.addEventListener("click", (e) => e.stopPropagation());
    closeBtn.addEventListener("click", () => close());

    window.addEventListener("keyup", (e) => {
      if (!openState) return;
      if (e.key === "Escape") close();
    });

    iframe.addEventListener("load", () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc) return;

        // Rename the top-left brand text (NO DOT)
        const brand = doc.querySelector(".brand");
        if (brand) brand.textContent = TUNE.personalizeText;

        // Remove Guides UI entirely
        const guidesToggle = doc.querySelector("#guidesToggle");
        if (guidesToggle) {
          const label = guidesToggle.closest("label");
          if (label) label.style.display = "none";
          guidesToggle.style.display = "none";
        }
        const guidesLayer = doc.querySelector("#guides");
        if (guidesLayer) guidesLayer.remove();

        // Inject minimal theme override (NO layout changes)
        const style = doc.createElement("style");
        style.setAttribute("data-stage3-injected", "true");
        style.textContent = `
          html, body{ background: transparent !important; }

          /* Dark integrated topbar (no white ribbon) */
          .topbar{
            background: ${TUNE.topbarBg} !important;
            border-bottom: 1px solid ${TUNE.topbarBorder} !important;
            backdrop-filter: blur(${TUNE.topbarBlur}) !important;
            -webkit-backdrop-filter: blur(${TUNE.topbarBlur}) !important;
          }

          /* Brand: match Stage 2 typography (Inter, normal case) */
          .brand{
            color: ${TUNE.brandColor} !important;
            font-family: ${TUNE.brandFont} !important;
            font-size: ${TUNE.brandSize} !important;
            font-weight: ${TUNE.brandWeight} !important;
            letter-spacing: ${TUNE.brandLetterSpacing} !important;
            text-transform: ${TUNE.brandTransform} !important;
          }

          /* Footer/debug off */
          footer, .footer{ display:none !important; }
        `;

        const prev = doc.head.querySelector("style[data-stage3-injected='true']");
        if (prev) prev.remove();
        doc.head.appendChild(style);
      } catch (_e) {}
    });
  }

  function open(project){
    ensure();
    ensureSharedProjectsData().then(() => {
      lock(() => {
      openState = true;
      document.body.classList.add(BODY_OPEN_CLASS);
      overlay.setAttribute("aria-hidden", "false");

      let projectTitle = "Project";
      let projectId = "";

      if (typeof project === "string") {
        projectTitle = project.trim() || "Project";
      } else if (project && typeof project === "object") {
        projectTitle = String(project.title || "").trim() || "Project";
        projectId = String(project.projectId || project.id || "").trim();
      }

      try {
        const store = (window.PROJECTS && typeof window.PROJECTS === "object") ? window.PROJECTS : {};
        if (projectId && store[projectId]) {
          projectTitle = String(store[projectId].title || projectTitle || "Project").trim() || "Project";
        } else if (projectTitle && projectTitle !== "Project") {
          const ids = Object.keys(store);
          for (let i = 0; i < ids.length; i++) {
            const item = store[ids[i]];
            if (!item || typeof item !== "object") continue;
            if (String(item.title || "").trim().toLowerCase() === projectTitle.toLowerCase()) {
              projectId = String(item.id || "").trim();
              projectTitle = String(item.title || projectTitle).trim() || "Project";
              break;
            }
          }
        }
      } catch (_e) {}

      if (titleEl) titleEl.textContent = projectTitle;

      let projectLink = "";
      try {
        const linkStore = (window.PROJECTS && typeof window.PROJECTS === "object") ? window.PROJECTS : {};
        if (projectId && linkStore[projectId] && typeof linkStore[projectId].link === "string") {
          projectLink = String(linkStore[projectId].link || "").trim();
        } else if (projectTitle) {
          const ids = Object.keys(linkStore);
          for (let i = 0; i < ids.length; i++) {
            const item = linkStore[ids[i]];
            if (!item || typeof item !== "object") continue;
            if (String(item.title || "").trim().toLowerCase() === projectTitle.toLowerCase()) {
              projectLink = String(item.link || "").trim();
              break;
            }
          }
        }
      } catch (_e) {}

      try {
        sessionStorage.setItem("work-stage3-current-project", JSON.stringify({
          projectId,
          projectTitle,
          projectLink
        }));
      } catch (_e) {}

      const qs = new URLSearchParams();
      qs.set("v", "20260307-1");
      if (projectId) qs.set("id", projectId);
      if (projectTitle) qs.set("project", projectTitle);
      qs.set("nonce", String(Date.now()));
      const targetUrl = isMobileStage3() ? TUNE.creativeMobileUrl : TUNE.creativeUrl;
      iframe.src = `${targetUrl}?${qs.toString()}`;
      });
    });
  }

  function close(){
    if (!overlay) return;
    lock(() => {
      openState = false;
      document.body.classList.remove(BODY_OPEN_CLASS);
      overlay.setAttribute("aria-hidden", "true");
      iframe.src = "about:blank";
    });
  }

  window.WorkStage3 = { open, close, isOpen: () => openState };
})();
