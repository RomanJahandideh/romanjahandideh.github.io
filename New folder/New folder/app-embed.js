(() => {
  "use strict";

  const titleEl = document.getElementById("s3Title");
  const categoryEl = document.getElementById("s3Category");
  const descriptionEl = document.getElementById("s3Description");
  const linkButton = document.getElementById("s3LinkButton");
  const metadataEl = document.getElementById("s3Metadata");

  const storyTextEls = [
    document.getElementById("s3Text1"),
    document.getElementById("s3Text2"),
    document.getElementById("s3Text3")
  ];

  const storyImageEls = [
    document.getElementById("s3Image1"),
    document.getElementById("s3Image2"),
    document.getElementById("s3Image3")
  ];

  const storyFallbackEls = [
    document.getElementById("s3ImageFallback1"),
    document.getElementById("s3ImageFallback2"),
    document.getElementById("s3ImageFallback3")
  ];

  const heroImage = document.getElementById("s3HeroImage");
  const heroFallback = document.getElementById("s3HeroFallback");
  const thumbButtons = Array.from(document.querySelectorAll(".s3-thumb"));
  const thumbImages = [
    document.getElementById("s3ThumbImage1"),
    document.getElementById("s3ThumbImage2")
  ];

  function getQueryValue(name) {
    try {
      const params = new URLSearchParams(window.location.search);
      return String(params.get(name) || "").trim();
    } catch (_e) {
      return "";
    }
  }

  function getStoredProjectPayload() {
    const sources = [];

    try { sources.push(window.sessionStorage); } catch (_e) {}
    try {
      if (window.parent && window.parent !== window && window.parent.sessionStorage) {
        sources.push(window.parent.sessionStorage);
      }
    } catch (_e) {}

    for (let i = 0; i < sources.length; i++) {
      try {
        const raw = sources[i].getItem("work-stage3-current-project");
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      } catch (_e) {}
    }

    return null;
  }

  function getProjectStore() {
    try {
      if (window.PROJECTS && typeof window.PROJECTS === "object" && Object.keys(window.PROJECTS).length) {
        return window.PROJECTS;
      }
    } catch (_e) {}

    try {
      if (
        window.parent &&
        window.parent !== window &&
        window.parent.PROJECTS &&
        typeof window.parent.PROJECTS === "object" &&
        Object.keys(window.parent.PROJECTS).length
      ) {
        return window.parent.PROJECTS;
      }
    } catch (_e) {}

    return {};
  }

  function loadLocalProjectStore() {
    return new Promise((resolve) => {
      const existing = getProjectStore();
      if (existing && Object.keys(existing).length) {
        resolve(existing);
        return;
      }

      const candidates = [
        "../js/projects-data.js?v=20260321-stage3-datafix",
        "../js/projects-data - Copy.js?v=20260321-stage3-datafix",
        "../../assets/js/projects-data.js?v=20260321-stage3-datafix",
        "../../assets/js/projects-data%20-%20Copy.js?v=20260321-stage3-datafix",
        "./projects-data.js?v=20260321-stage3-datafix"
      ];

      let index = 0;

      const finish = () => resolve(getProjectStore());

      const tryNext = () => {
        const store = getProjectStore();
        if (store && Object.keys(store).length) {
          finish();
          return;
        }

        if (index >= candidates.length) {
          finish();
          return;
        }

        const src = candidates[index++];
        const existingScript = Array.from(document.scripts || []).find((script) => {
          const scriptSrc = String(script.getAttribute("src") || script.src || "");
          return scriptSrc.indexOf(src.split("?")[0]) !== -1;
        });

        if (existingScript) {
          existingScript.addEventListener("load", finish, { once: true });
          existingScript.addEventListener("error", tryNext, { once: true });
          return;
        }

        const script = document.createElement("script");
        script.src = src;
        script.async = false;
        script.setAttribute("data-project-store-loader", "true");
        script.addEventListener("load", finish, { once: true });
        script.addEventListener("error", tryNext, { once: true });
        document.head.appendChild(script);
      };

      tryNext();
    });
  }

  function findProjectByTitle(store, title) {
    const wanted = String(title || "").trim().toLowerCase();
    if (!wanted || !store || typeof store !== "object") return null;

    const ids = Object.keys(store);
    for (let i = 0; i < ids.length; i++) {
      const item = store[ids[i]];
      if (!item || typeof item !== "object") continue;
      if (String(item.title || "").trim().toLowerCase() === wanted) return item;
    }
    return null;
  }

  function splitIntoParagraphs(text) {
    const raw = String(text || "").replace(/\r/g, "").trim();
    if (!raw) return [];

    const explicitParagraphs = raw
      .split(/\n\s*\n/g)
      .map((value) => value.replace(/\s+/g, " ").trim())
      .filter(Boolean);

    if (explicitParagraphs.length >= 2) return explicitParagraphs;

    return raw
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/)
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .reduce((chunks, sentence) => {
        if (!chunks.length) {
          chunks.push(sentence);
          return chunks;
        }
        const last = chunks[chunks.length - 1];
        if ((last + " " + sentence).length <= 320) {
          chunks[chunks.length - 1] = last + " " + sentence;
        } else {
          chunks.push(sentence);
        }
        return chunks;
      }, []);
  }

  function normalizeProjectImagePath(path) {
    const raw = String(path || "").trim();
    if (!raw) return "";

    let candidate = raw.replace(/\\/g, "/");
    if (/^(?:https?:|data:|blob:)/i.test(candidate)) return candidate;

    const origin = String(window.location.origin || "").replace(/\/$/, "");

    if (/^[a-zA-Z]:\//.test(candidate)) {
      const lower = candidate.toLowerCase();
      const marker = "/work/assets/projects/";
      const idx = lower.indexOf(marker);
      if (idx !== -1) return origin + candidate.slice(idx);
    }

    if (candidate.indexOf("/work/assets/projects/") !== -1) {
      return origin + candidate.slice(candidate.indexOf("/work/assets/projects/"));
    }

    if (candidate.indexOf("work/assets/projects/") !== -1) {
      return origin + "/" + candidate.slice(candidate.indexOf("work/assets/projects/"));
    }

    try {
      return new URL(candidate, window.location.href).href;
    } catch (_e) {}

    return candidate;
  }

  function swapImageExtension(path) {
    const raw = String(path || "").trim();
    if (!raw) return "";
    if (/\.jpg$/i.test(raw)) return raw.replace(/\.jpg$/i, ".jpeg");
    if (/\.jpeg$/i.test(raw)) return raw.replace(/\.jpeg$/i, ".jpg");
    return "";
  }

  function buildImageCandidates(path) {
    const raw = String(path || "").trim();
    if (!raw) return [];

    const variants = [];
    const seen = new Set();

    function add(value) {
      const v = normalizeProjectImagePath(value);
      if (!v || seen.has(v)) return;
      seen.add(v);
      variants.push(v);
    }

    add(raw);

    const swapped = swapImageExtension(raw);
    if (swapped) add(swapped);

    const cleaned = raw.replace(/^\.\//, "").replace(/^\.\.\//, "");
    if (cleaned && cleaned !== raw) add(cleaned);

    const swappedCleaned = swapImageExtension(cleaned);
    if (swappedCleaned) add(swappedCleaned);

    const fileName = raw.replace(/\\/g, "/").split("/").pop() || "";
    const folderMatch = raw.replace(/\\/g, "/").match(/projects\/([^\/]+)\/[^\/]+$/i);

    if (folderMatch && folderMatch[1] && fileName) {
      add("/work/assets/projects/" + folderMatch[1] + "/" + fileName);
      const swappedName = swapImageExtension(fileName);
      if (swappedName) add("/work/assets/projects/" + folderMatch[1] + "/" + swappedName);
    }

    return variants;
  }

  function attachImageWithFallback(imgEl, fallbackEl, path, altText) {
    if (!imgEl) return Promise.resolve(false);

    const candidates = buildImageCandidates(path);
    if (!candidates.length) {
      imgEl.removeAttribute("src");
      imgEl.alt = altText || "";
      if (fallbackEl) fallbackEl.style.display = "grid";
      return Promise.resolve(false);
    }

    return new Promise((resolve) => {
      let index = 0;

      const tryNext = () => {
        if (index >= candidates.length) {
          imgEl.removeAttribute("src");
          imgEl.alt = altText || "";
          if (fallbackEl) fallbackEl.style.display = "grid";
          resolve(false);
          return;
        }

        const src = candidates[index++];
        const probe = new Image();
        probe.onload = () => {
          imgEl.src = src;
          imgEl.alt = altText || "";
          if (fallbackEl) fallbackEl.style.display = "none";
          resolve(true);
        };
        probe.onerror = tryNext;
        probe.src = src;
      };

      tryNext();
    });
  }

  function buildStoryParagraphs(text) {
    const parts = splitIntoParagraphs(text).filter(Boolean);

    if (!parts.length) {
      return [
        "Project description will appear here once the selected item has written content.",
        "The Stage 3 layout is ready, but the selected project currently has no readable text in the data source.",
        "Use the project link below when available."
      ];
    }

    if (parts.length === 1) return [parts[0], parts[0], parts[0]];
    if (parts.length === 2) return [parts[0], parts[1], parts[1]];
    return parts.slice(0, 3);
  }

  function setParagraphs(paragraphs) {
    const storyParagraphs = buildStoryParagraphs((paragraphs || []).join("\n\n"));

    storyTextEls.forEach((el, index) => {
      if (!el) return;
      el.textContent = storyParagraphs[index] || storyParagraphs[storyParagraphs.length - 1] || "";
    });

    if (!descriptionEl) return;
    descriptionEl.innerHTML = "";
    storyParagraphs.forEach((paragraph) => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      descriptionEl.appendChild(p);
    });
  }

  function hideMetadata() {
    if (!metadataEl) return;
    metadataEl.innerHTML = "";
    metadataEl.setAttribute("hidden", "hidden");
    metadataEl.setAttribute("aria-hidden", "true");
    metadataEl.style.display = "none";
  }

  function setLink(url) {
    if (!linkButton) return;

    const href = String(url || "").trim();
    if (!href) {
      linkButton.setAttribute("aria-disabled", "true");
      linkButton.removeAttribute("href");
      linkButton.textContent = "Link Unavailable";
      return;
    }

    linkButton.removeAttribute("aria-disabled");
    linkButton.href = href;
    linkButton.textContent = "Open Project";
  }

  function setActiveThumb(index) {
    thumbButtons.forEach((button, i) => {
      button.classList.toggle("is-active", i === index);
    });
  }

  function wireLegacyGallery(images, title) {
    if (!heroImage) return;

    const galleryImages = [images[1] || "", images[2] || ""];
    const heroPool = [images[0] || "", images[1] || "", images[2] || ""].filter(Boolean);

    function showHero(path) {
      return attachImageWithFallback(heroImage, heroFallback, path, title ? title + " hero image" : "Project image");
    }

    thumbButtons.forEach((button, index) => {
      const imgEl = thumbImages[index];
      const path = galleryImages[index] || "";
      const fallback = button.querySelector(".s3-thumbFallback");

      attachImageWithFallback(imgEl, fallback, path, title ? title + " thumbnail " + (index + 1) : "Project thumbnail");

      button.addEventListener("click", () => {
        const wanted = path || heroPool[index + 1] || heroPool[0] || "";
        setActiveThumb(index);
        showHero(wanted);
      });
    });

    setActiveThumb(0);
    showHero(heroPool[0] || galleryImages[0] || "");
  }

  function wireStoryImages(images, title) {
    const normalized = [
      images[0] || "",
      images[1] || images[0] || "",
      images[2] || images[1] || images[0] || ""
    ];

    storyImageEls.forEach((imgEl, index) => {
      attachImageWithFallback(
        imgEl,
        storyFallbackEls[index],
        normalized[index],
        title ? title + " image " + (index + 1) : "Project image"
      );
    });
  }

  async function init() {
    const projectId = getQueryValue("id");
    const stored = getStoredProjectPayload();
    const fallbackTitle = getQueryValue("project") || ((stored && stored.projectTitle) ? String(stored.projectTitle).trim() : "Project");

    await loadLocalProjectStore();
    const store = getProjectStore();

    let project = null;
    const idCandidates = [
      projectId,
      stored && stored.projectId,
      stored && stored.id
    ].map((value) => String(value || "").trim()).filter(Boolean);

    for (let i = 0; i < idCandidates.length; i++) {
      if (store && store[idCandidates[i]]) {
        project = store[idCandidates[i]];
        break;
      }
    }

    if (!project && fallbackTitle) {
      project = findProjectByTitle(store, fallbackTitle);
    }

    const title = String((project && project.title) || fallbackTitle || "Project").trim() || "Project";
    const category = String((project && project.category) || "Project").trim() || "Project";
    const descriptionText = (project && (project.description || project.text)) || "";
    const paragraphs = splitIntoParagraphs(descriptionText).slice(0, 3);
    const images = (project && Array.isArray(project.images) ? project.images : [])
      .filter(Boolean)
      .map((value) => String(value || "").trim())
      .slice(0, 3);

    if (titleEl) titleEl.textContent = title;
    if (categoryEl) categoryEl.textContent = category;
    setParagraphs(paragraphs);
    setLink(project && project.link);
    hideMetadata();
    wireStoryImages(images, title);
    wireLegacyGallery(images, title);
  }

  init();
})();
