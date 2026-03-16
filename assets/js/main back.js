/*
  Dimension by HTML5 UP
  html5up.net | @ajlkn
*/

(function ($) {

  var $window = $(window),
      $body = $('body'),
      $wrapper = $('#wrapper'),
      $header = $('#header'),
      $footer = $('#footer'),
      $main = $('#main'),
      $main_articles = $main.children('article');

  // Breakpoints.
  breakpoints({
    xlarge:  ['1281px', '1680px'],
    large:   ['981px',  '1280px'],
    medium:  ['737px',  '980px'],
    small:   ['481px',  '736px'],
    xsmall:  ['361px',  '480px'],
    xxsmall: [null,     '360px']
  });

  // Preload anim.
  $window.on('load', function () {
    window.setTimeout(function () {
      $body.removeClass('is-preload');
    }, 100);
  });

  // IE flexbox fix.
  if (browser.name == 'ie') {
    var flexboxFixTimeoutId;

    $window.on('resize.flexbox-fix', function () {
      clearTimeout(flexboxFixTimeoutId);

      flexboxFixTimeoutId = setTimeout(function () {
        if ($wrapper.prop('scrollHeight') > $window.height())
          $wrapper.css('height', 'auto');
        else
          $wrapper.css('height', '100vh');
      }, 250);

    }).triggerHandler('resize.flexbox-fix');
  }

  // Nav alignment.
  var $nav = $header.children('nav'),
      $nav_li = $nav.find('li');

  if ($nav_li.length % 2 == 0) {
    $nav.addClass('use-middle');
    $nav_li.eq(($nav_li.length / 2)).addClass('is-middle');
  }

  /* =========================================================
     CUSTOM SECTION SYSTEM (NO POPUP ARTICLES)
     - JS sets body.is-section + body[data-section]
     - CSS controls backgrounds via --bg-image
     ========================================================= */

  var SECTION_CONFIG = {
    home: { items: [] },
    work: {
      items: [
        { id: 'articles',   label: 'Articles' },
        { id: 'animations', label: 'Animations' },
        { id: 'cg',         label: 'CG Art' },
        { id: 'projects',   label: 'Projects' },
        { id: 'gamedesign', label: 'Game Design' }
      ]
    },
    about: {
      items: [
        { id: 'bio',    label: 'Bio' },
        { id: 'skills', label: 'Skills' }
      ]
    },
    contact: {
      items: [
        { id: 'email',  label: 'Email' },
        { id: 'social', label: 'Social' }
      ]
    }
  };

  function renderSubnav(sectionKey) {
    var sub = document.getElementById('subnav');
    if (!sub) return;

    var conf = SECTION_CONFIG[sectionKey];
    if (!conf || !conf.items || conf.items.length === 0) {
      sub.innerHTML = '';
      return;
    }

    var html = '<ul>';
    conf.items.forEach(function (it) {
      html += `<li><a href="#${sectionKey}/${it.id}">${it.label}</a></li>`;
    });
    html += '</ul>';
    sub.innerHTML = html;
  }

  // Only allow these to enter "section mode"
  function normalizeSectionKey(key) {
    key = (key || '').toLowerCase().trim();

    // Dimension default hash is often "#intro" so treat that as home
    if (key === 'intro') key = 'home';

    // Anything unknown becomes home (prevents weird hashes from breaking your layout)
    if (!SECTION_CONFIG[key]) key = 'home';

    // Only these are true sections; everything else is home
    if (key !== 'work' && key !== 'about' && key !== 'contact') key = 'home';

    return key;
  }

  function openSection(sectionKey) {
    sectionKey = normalizeSectionKey(sectionKey);

    if (sectionKey === 'home') {
      document.body.classList.remove('is-section');
      document.body.removeAttribute('data-section');
      renderSubnav('home');
      return;
    }

    document.body.classList.add('is-section');
    document.body.setAttribute('data-section', sectionKey);
    renderSubnav(sectionKey);
  }

  // Click handling for main menu
  $header.on('click', 'a[data-section]', function (e) {
    e.preventDefault();
    var key = this.getAttribute('data-section');
    location.hash = '#' + key;
  });

  function routeFromHash() {
    var raw = (location.hash || '').replace('#', '').trim();
    if (!raw) raw = 'home';

    var parts = raw.split('/');
    var key = parts[0];

    openSection(key);
  }

  $window.on('hashchange.section', routeFromHash);
  $window.on('load.section', routeFromHash);

  // Kill popup articles completely (keep them hidden)
  $main.hide();
  $main_articles.hide();

})(jQuery);


/* =========================================================
   Spotlight / Mask mouse controls
   ========================================================= */
(() => {
  const root = document.documentElement;

  const setPos = (e) => {
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;
    root.style.setProperty("--mx", `${x}%`);
    root.style.setProperty("--my", `${y}%`);
  };

  window.addEventListener("mousemove", setPos, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!e.touches || !e.touches[0]) return;
    setPos(e.touches[0]);
  }, { passive: true });
})();


/* =========================================================
   BG SCROLL: wheel pans background (page stays locked)
   ========================================================= */
(() => {
  const root = document.documentElement;
  let panY = 0;
  let ticking = false;

  const apply = () => {
    root.style.setProperty("--bg-pan-y", `${panY}px`);
    ticking = false;
  };

  const schedule = () => {
    if (!ticking) {
      requestAnimationFrame(apply);
      ticking = true;
    }
  };

  window.addEventListener("wheel", (e) => {
    e.preventDefault();

    const speed =
      parseFloat(getComputedStyle(root).getPropertyValue("--bg-scroll-speed")) || 0.22;

    panY += -e.deltaY * speed;
    panY = Math.max(Math.min(panY, 600), -600);

    schedule();
  }, { passive: false });

  window.addEventListener("touchmove", (e) => {
    e.preventDefault();
  }, { passive: false });

  window.addEventListener("keydown", (e) => {
    const keys = ["ArrowUp","ArrowDown","PageUp","PageDown","Home","End"," ","Spacebar"];
    if (keys.includes(e.key)) e.preventDefault();
  }, { passive: false });

})();


/* =========================================
   COVERFLOW WHEEL (GAME CONTROLS ONLY)
   Left/Right buttons + Arrow keys
   Active card stays LOCKED at stage center
   ========================================= */
(() => {
  const body = document.body;
  const stage = document.getElementById("stage");
  const wheel = document.getElementById("wheel");
  const btnPrev = document.getElementById("wheelPrev");
  const btnNext = document.getElementById("wheelNext");

  if (!stage || !wheel) return;

  const cards = Array.from(wheel.querySelectorAll(".card"));
  if (cards.length === 0) return;

  let active = 0;
  let wheelShift = 0;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const isSectionMode = () => body.classList.contains("is-section");

  function applyShift(px) {
    wheelShift = px;
    wheel.style.setProperty("--wheel-shift", `${wheelShift}px`);
  }

  function updateActiveClasses() {
    cards.forEach((c, i) => c.classList.toggle("is-active", i === active));
  }

  function centerActiveCard() {
    if (!isSectionMode()) return;

    const a = cards[active];
    if (!a) return;

    const stageRect = stage.getBoundingClientRect();
    const aRect = a.getBoundingClientRect();

    const stageCenter = stageRect.left + stageRect.width / 2;
    const cardCenter = aRect.left + aRect.width / 2;

    const delta = stageCenter - cardCenter;
    applyShift(wheelShift + delta);
  }

  function update() {
    updateActiveClasses();

    requestAnimationFrame(() => {
      centerActiveCard();
      setTimeout(centerActiveCard, 60);
      setTimeout(centerActiveCard, 160);
    });
  }

  function go(dir) {
    if (!isSectionMode()) return;
    active = clamp(active + dir, 0, cards.length - 1);
    update();
  }

  if (btnPrev) btnPrev.addEventListener("click", () => go(-1));
  if (btnNext) btnNext.addEventListener("click", () => go(1));

  window.addEventListener("keydown", (e) => {
    if (!isSectionMode()) return;
    if (e.key === "ArrowLeft")  { e.preventDefault(); go(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
  }, { passive: false });

  // Optional: click cards to select them (KEEP or REMOVE)
  cards.forEach((card, idx) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      if (!isSectionMode()) return;
      active = idx;
      update();
    });
  });

  window.addEventListener("resize", centerActiveCard);
  window.addEventListener("hashchange", () => setTimeout(centerActiveCard, 50));

  applyShift(0);
  update();
})();
