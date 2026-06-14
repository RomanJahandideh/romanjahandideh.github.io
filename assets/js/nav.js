// Shared top navigation
// Root merged page: pill bar with eye socket in centre, links split left/right.
// Standalone work page: flat pill with all links.

(() => {
  const container = document.getElementById("site-nav");
  if (!container) return;

  const isRootMerged =
    !!document.body?.dataset?.mode &&
    !!document.querySelector("#home-spiderweb-canvas");

  const isStandaloneWork =
    !isRootMerged &&
    (window.location.pathname.startsWith("/work") ||
      document.body.classList.contains("work-page"));

  /* ── HTML builders ── */

  const buildRootMergedNav = () => `
    <nav class="top-nav top-nav--eye-socket" aria-label="Primary navigation">
      <div class="nav-left">
        <a href="#top"      data-nav="home"     data-mode-link="home">HOME</a>
        <a href="#teaching" data-nav="teaching" data-mode-link="teaching">TEACHING</a>
      </div>

      <button
        class="nav-eye-socket"
        id="about-trigger"
        aria-label="About"
        aria-haspopup="dialog"
        aria-expanded="false"
        type="button"
      >
        <!-- #eyes is moved here by JS below -->
        <span class="socket-dot socket-dot-l" aria-hidden="true"></span>
        <span class="socket-dot socket-dot-r" aria-hidden="true"></span>
      </button>

      <div class="nav-right">
        <a href="#work"    data-nav="work"    data-mode-link="work">WORK</a>
        <a href="#contact" data-nav="contact">CONTACT</a>
      </div>
    </nav>
  `;

  const buildStandaloneWorkNav = () => `
    <nav class="top-nav" aria-label="Primary navigation">
      <a href="../index.html"          data-nav="home">HOME</a>
      <a href="./index.html"           data-nav="work">WORK</a>
      <a href="../index.html#teaching" data-nav="teaching">TEACHING</a>
      <a href="../index.html#about"    data-nav="about">ABOUT</a>
      <a href="../index.html#contact"  data-nav="contact">CONTACT</a>
    </nav>
  `;

  const buildFallbackNav = () => `
    <nav class="top-nav" aria-label="Primary navigation">
      <a href="/index.html"          data-nav="home">HOME</a>
      <a href="/work/index.html"     data-nav="work">WORK</a>
      <a href="/index.html#teaching" data-nav="teaching">TEACHING</a>
      <a href="/index.html#about"    data-nav="about">ABOUT</a>
      <a href="/index.html#contact"  data-nav="contact">CONTACT</a>
    </nav>
  `;

  /* ── Inject HTML ── */
  if (isRootMerged) {
    container.innerHTML = buildRootMergedNav();

    /* Move the static #eyes element from the hero into the socket.
       main.js grabs a reference to #eyes .eye before nav.js runs —
       moving the element keeps that reference valid. */
    const existingEyes = document.getElementById("eyes");
    const socket       = container.querySelector(".nav-eye-socket");
    if (existingEyes && socket) {
      /* Insert before the first dot so the eye sits between the dots */
      const firstDot = socket.querySelector(".socket-dot-l");
      socket.insertBefore(existingEyes, firstDot || null);
      /* Pin eye in socket with inline styles — immune to CSS cascade.
         Prevents body:has(#home-spiderweb-canvas) #eyes absolute positioning
         from escaping the socket when Services or other panels animate. */
      existingEyes.style.position = "relative";
      existingEyes.style.top = "auto";
      existingEyes.style.left = "auto";
      existingEyes.style.transform = "none";
      existingEyes.style.filter = "none";
      existingEyes.style.willChange = "auto";
      existingEyes.style.opacity = "";
    }
  } else if (isStandaloneWork) {
    container.innerHTML = buildStandaloneWorkNav();
  } else {
    container.innerHTML = buildFallbackNav();
  }

  /* ── Active state ── */
  const updateActive = () => {
    const nav = container.querySelector(".top-nav");
    if (!nav) return;

    const hash = (window.location.hash || "").toLowerCase();
    const mode =
      window.PortfolioModes?.getMode?.() ?? "home";

    nav.querySelectorAll("a[data-nav]").forEach((link) => {
      const key = (link.dataset.nav || "").toLowerCase();
      let active = false;

      if (isRootMerged) {
        if (["home", "work", "teaching"].includes(key)) {
          active = key === mode;
        } else if (key === "contact") {
          active = hash === "#contact";
        }
        /* "about" link is gone from root nav; eye socket handles it */
      } else if (isStandaloneWork) {
        active = key === "work";
      } else {
        active =
          key === "home" &&
          (window.location.pathname === "/" ||
            window.location.pathname === "/index.html");
      }

      link.classList.toggle("is-active", active);
    });
  };

  /* ── Mode-link click handlers (root merged only) ── */
  if (isRootMerged) {
    container.querySelectorAll("a[data-mode-link]").forEach((link) => {
      link.addEventListener("click", (e) => {
        const mode = link.dataset.modeLink;
        if (!window.PortfolioModes?.setMode) return;
        e.preventDefault();
        const opts = { writeHash: mode === "teaching" };
        if (typeof window._triggerModeTransition === "function") {
          window._triggerModeTransition(mode, null, opts);
        } else {
          window.PortfolioModes.setMode(mode, opts);
        }
      });
    });

    window.addEventListener("portfolio:modechange", updateActive, { passive: true });
    window.addEventListener("hashchange",            updateActive, { passive: true });
  }

  updateActive();
})();
