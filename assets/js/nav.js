// Shared top navigation
// - Renders a reliable inline nav (no external partial dependency)
// - Supports merged HOME / WORK / TEACHING root page
// - Supports standalone /work page links back to root sections

(() => {
  const container = document.getElementById("site-nav");
  if (!container) return;

  const isRootMerged = !!document.body
    && !!document.body.dataset
    && !!document.body.dataset.mode
    && !!document.querySelector("#home-spiderweb-canvas");

  const isStandaloneWork = !isRootMerged
    && (window.location.pathname.startsWith("/work") || document.body.classList.contains("work-page"));

  const buildNavHtml = () => {
    if (isRootMerged) {
      return `
        <nav class="top-nav" aria-label="Primary navigation">
          <a href="#top" data-nav="home" data-mode-link="home">HOME</a>
          <a href="#work" data-nav="work" data-mode-link="work">WORK</a>
          <a href="#teaching" data-nav="teaching" data-mode-link="teaching">TEACHING</a>
          <a href="#about" data-nav="about">ABOUT</a>
          <a href="#contact" data-nav="contact">CONTACT</a>
        </nav>
      `;
    }

    if (isStandaloneWork) {
      return `
        <nav class="top-nav" aria-label="Primary navigation">
          <a href="../index.html" data-nav="home">HOME</a>
          <a href="./index.html" data-nav="work">WORK</a>
          <a href="../index.html#teaching" data-nav="teaching">TEACHING</a>
          <a href="../index.html#about" data-nav="about">ABOUT</a>
          <a href="../index.html#contact" data-nav="contact">CONTACT</a>
        </nav>
      `;
    }

    return `
      <nav class="top-nav" aria-label="Primary navigation">
        <a href="/index.html" data-nav="home">HOME</a>
        <a href="/work/index.html" data-nav="work">WORK</a>
        <a href="/index.html#teaching" data-nav="teaching">TEACHING</a>
        <a href="/index.html#about" data-nav="about">ABOUT</a>
        <a href="/index.html#contact" data-nav="contact">CONTACT</a>
      </nav>
    `;
  };

  const updateActive = () => {
    const nav = container.querySelector(".top-nav");
    if (!nav) return;

    const hash = (window.location.hash || "").toLowerCase();
    const mode = window.PortfolioModes && typeof window.PortfolioModes.getMode === "function"
      ? window.PortfolioModes.getMode()
      : "home";

    nav.querySelectorAll("a[data-nav]").forEach((link) => {
      const key = (link.dataset.nav || "").toLowerCase();
      let active = false;

      if (isRootMerged) {
        if (["home", "work", "teaching"].includes(key)) {
          active = key === mode;
        } else if (key === "about") {
          active = hash === "#about";
        } else if (key === "contact") {
          active = hash === "#contact";
        }
      } else if (isStandaloneWork) {
        active = key === "work";
      } else {
        active = key === "home" && (window.location.pathname === "/" || window.location.pathname === "/index.html");
      }

      link.classList.toggle("is-active", active);
    });
  };

  container.innerHTML = buildNavHtml();

  if (isRootMerged) {
    container.querySelectorAll("a[data-mode-link]").forEach((link) => {
      link.addEventListener("click", (e) => {
        const mode = link.dataset.modeLink;
        if (!window.PortfolioModes || typeof window.PortfolioModes.setMode !== "function") return;
        e.preventDefault();
        window.PortfolioModes.setMode(mode, { writeHash: mode === "teaching" });
      });
    });

    window.addEventListener("portfolio:modechange", updateActive, { passive: true });
    window.addEventListener("hashchange", updateActive, { passive: true });
  }

  updateActive();
})();
