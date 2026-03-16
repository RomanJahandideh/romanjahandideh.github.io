(() => {
  const track = document.getElementById("track");
  const wrap = document.querySelector(".slider");
  const cards = Array.from(track.querySelectorAll(".project-card"));
  const prev = document.getElementById("prev");
  const next = document.getElementById("next");

  const isMobile = () => matchMedia("(max-width:767px)").matches;

  let current = 0;

  function center(i) {
    const card = cards[i];
    const axis = isMobile() ? "top" : "left";
    const size = isMobile() ? "clientHeight" : "clientWidth";
    const start = isMobile() ? card.offsetTop : card.offsetLeft;

    wrap.scrollTo({
      [axis]: start - (wrap[size] / 2 - card[size] / 2),
      behavior: "smooth"
    });
  }

  function toggleUI(i) {
    cards.forEach((c, k) => c.toggleAttribute("active", k === i));
    prev.disabled = i === 0;
    next.disabled = i === cards.length - 1;
  }

  function activate(i, scroll) {
    if (i === current) return;
    current = i;
    toggleUI(i);
    if (scroll) center(i);
  }

  function go(step) {
    activate(Math.min(Math.max(current + step, 0), cards.length - 1), true);
  }

  prev.onclick = () => go(-1);
  next.onclick = () => go(1);

  addEventListener("keydown", (e) => {
    if (["ArrowRight", "ArrowDown"].includes(e.key)) go(1);
    if (["ArrowLeft", "ArrowUp"].includes(e.key)) go(-1);
  }, { passive: true });

  cards.forEach((card, i) => {
    card.addEventListener("mouseenter", () => matchMedia("(hover:hover)").matches && activate(i, true));
    card.addEventListener("click", () => {
      // First click selects/activates.
      if (!card.hasAttribute("active")) {
        activate(i, true);
        return;
      }
      // Second click (or click on the Details button) goes to the project page.
      const href = card.getAttribute("data-href");
      if (href) location.href = href;
    });
  });

  // Touch swipe support
  let sx = 0, sy = 0;
  track.addEventListener("touchstart", (e) => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });

  track.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - sx;
    const dy = e.changedTouches[0].clientY - sy;
    if (isMobile() ? Math.abs(dy) > 60 : Math.abs(dx) > 60) {
      go((isMobile() ? dy : dx) > 0 ? -1 : 1);
    }
  }, { passive: true });

  addEventListener("resize", () => center(current));

  toggleUI(0);
  center(0);
})();