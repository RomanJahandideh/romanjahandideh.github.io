/* =========================================================
   PATH FIX SHIM (Stage 3 / Creative Embed)
   Fixes requests like:
     /assets/creative/creative-embed.html
   by rewriting them to:
     /work/assets/creative/creative-embed.html

   Why this exists:
   - Your Work (stage2/3) code was written assuming Work is the site root.
   - In your merged one-page site, Work lives under /work/ so /assets/... is wrong.
   - Some requests are fetch/XHR; others are direct iframe.src / link.href.

   Drop this file at:
     assets/js/path-fix.js
   and load it BEFORE the Work scripts.
   ========================================================= */
(() => {
  "use strict";

  const WORK_ASSET_PREFIX = "/work/assets/";
  const ROOT_ASSET_PREFIX = "/assets/";

  const shouldRewriteToWork = (urlStr) => {
    if (typeof urlStr !== "string") return false;
    if (!urlStr.startsWith(ROOT_ASSET_PREFIX)) return false;

    // Stage 3 embeds are typically html or inside /creative/
    const isHtml = urlStr.endsWith(".html");
    const isCreative = urlStr.includes("/creative/");
    const isEmbed = urlStr.toLowerCase().includes("embed");
    const isData = urlStr.includes("/data/") || urlStr.endsWith(".json");

    return isHtml || isCreative || isEmbed || isData;
  };

  const rewrite = (urlStr) => {
    if (!shouldRewriteToWork(urlStr)) return urlStr;
    return urlStr.replace(ROOT_ASSET_PREFIX, WORK_ASSET_PREFIX);
  };

  // ---------------------------
  // 1) Patch fetch()
  // ---------------------------
  if (typeof window.fetch === "function") {
    const _fetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      try {
        const url = (typeof input === "string")
          ? input
          : (input && typeof input.url === "string") ? input.url : "";

        if (shouldRewriteToWork(url)) {
          const rewritten = rewrite(url);
          const nextInput = (typeof input === "string")
            ? rewritten
            : new Request(rewritten, input);
          return _fetch(nextInput, init);
        }
      } catch (_) {}
      return _fetch(input, init);
    };
  }

  // ---------------------------
  // 2) Patch XHR
  // ---------------------------
  if (typeof window.XMLHttpRequest === "function") {
    const _open = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      try {
        if (shouldRewriteToWork(url)) url = rewrite(url);
      } catch (_) {}
      return _open.call(this, method, url, ...rest);
    };
  }

  // ---------------------------
  // 3) Patch setAttribute('src'/'href')
  // ---------------------------
  const _setAttribute = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function(name, value) {
    try {
      const n = String(name || "").toLowerCase();
      if ((n === "src" || n === "href" || n === "data-src") && typeof value === "string") {
        value = rewrite(value);
      }
    } catch (_) {}
    return _setAttribute.call(this, name, value);
  };

  // ---------------------------
  // 4) Patch property setters (iframe.src is the big one)
  // ---------------------------
  const patchProp = (proto, prop) => {
    try {
      const desc = Object.getOwnPropertyDescriptor(proto, prop);
      if (!desc || typeof desc.set !== "function" || typeof desc.get !== "function") return;

      Object.defineProperty(proto, prop, {
        configurable: true,
        enumerable: desc.enumerable,
        get: function() { return desc.get.call(this); },
        set: function(v) {
          try {
            if (typeof v === "string") v = rewrite(v);
          } catch (_) {}
          return desc.set.call(this, v);
        }
      });
    } catch (_) {}
  };

  if (window.HTMLIFrameElement) patchProp(HTMLIFrameElement.prototype, "src");
  if (window.HTMLScriptElement) patchProp(HTMLScriptElement.prototype, "src");
  if (window.HTMLImageElement) patchProp(HTMLImageElement.prototype, "src");
  if (window.HTMLLinkElement) patchProp(HTMLLinkElement.prototype, "href");
  if (window.HTMLAnchorElement) patchProp(HTMLAnchorElement.prototype, "href");

  // ---------------------------
  // 5) MutationObserver safety net
  // ---------------------------
  try {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (!m || !m.target) continue;
        if (m.type !== "attributes") continue;

        const attr = String(m.attributeName || "").toLowerCase();
        if (attr !== "src" && attr !== "href" && attr !== "data-src") continue;

        const el = m.target;
        const val = el.getAttribute(attr);
        if (typeof val === "string" && shouldRewriteToWork(val)) {
          el.setAttribute(attr, rewrite(val));
        }
      }
    });

    obs.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "href", "data-src"]
    });
  } catch (_) {}
})();