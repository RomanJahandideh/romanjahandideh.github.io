/* =========================================================
   TEACHING OVERLAY REDESIGN
   Minimal black/white layout with image divider
   STRICT Teaching-folder image loading
   ========================================================= */

(function () {
  "use strict";

  const COURSE_DATA = {
    iat313: {
      title: "IAT 313 Narrative and New Media",
      lead:
        "Across two consecutive terms as a Teaching Assistant for IAT 313, I supported students in narrative design for interactive and digital media. I helped students move from early concept formation toward stronger experiential structure, clearer thematic direction, and more coherent narrative systems inside their projects. My role focused on making narrative design feel usable and actionable, so students could translate abstract ideas into story-driven interactive work with more confidence and clarity.",
      meta: [
        { label: "Role", value: "Teaching Assistant" },
        { label: "Course", value: "IAT 313 Narrative and New Media" },
        { label: "Department", value: "School of Interactive Arts and Technology" },
        { label: "Institution", value: "Simon Fraser University" },
        { label: "Focus", value: "Narrative design, critique, story structure, interactive media" },
        { label: "Format", value: "Discussion support, critique, assignment feedback, concept development" },
        { label: "Software / Context", value: "Figma, Miro, HTML, CSS, JavaScript, Unity, Autodesk Maya, Processing" }
      ],
      imageName: "IAT3131",
      imageAlt: "IAT 313 course image",
      bottomTitle: "Teaching Approach",
      bottomText:
        "In this course, I supported students in understanding how narrative works not only as written content, but as a system of pacing, framing, interaction, mood, and progression. I regularly helped students refine the relationship between concept and execution, especially where an idea was promising but the structure around it was still unclear. My feedback often focused on how a user or player experiences information over time, how participation changes meaning, and how interface, sequencing, and visual communication shape the story being told. I ran targeted workshops based on each team’s project direction, helping students identify appropriate production workflows and design strategies for their specific narrative goals. These workshops often focused on practical implementation and prototyping using tools such as Figma, Miro, HTML/CSS/JavaScript, Unity, Autodesk Maya, and Processing, allowing students to translate conceptual ideas into interactive and visual outcomes.",
      responsibilitiesTitle: "Responsibilities",
      responsibilities: [
  "Led weekly discussion and support sessions, helping students unpack course concepts and apply them directly to their own narrative and interactive media projects while referencing storytelling frameworks from Save the Cat! and The Anatomy of Story to examine pacing, character motivation, and narrative progression.",
  "Provided detailed critique on assignments related to storytelling, concept development, thematic clarity, pacing, and the overall coherence of project structure, encouraging students to strengthen narrative beats, character goals, and audience engagement.",
  "Helped students translate early ideas into stronger project proposals by identifying where narrative intent, user experience, and formal execution were either aligned or in conflict, using structured narrative analysis to clarify story logic and interaction flow.",
  "Supported iterative development by giving feedback across multiple stages of production, from initial framing and brainstorming to revision, refinement, and final presentation, helping teams develop clearer narrative arcs and project structures.",
  "Guided students in connecting theoretical ideas from narrative and media studies to practical design decisions in interactive and digital contexts, emphasizing how narrative structure shapes pacing, interaction, and user experience.",
  "Encouraged stronger articulation of creative intent so students could explain not only what they made, but why their narrative and design choices supported the experience they intended to create."
]
    },

    iat343: {
      title: "IAT 343 Animation",
      lead:
        "As a Teaching Assistant for IAT 343, I supported students across the 3D animation pipeline, including modeling, rigging, texturing, animation, and technical troubleshooting in Autodesk Maya. My role combined creative guidance with production-oriented problem solving, helping students build stronger workflows and more reliable project structures while developing confidence in both technical execution and visual decision-making.",
      meta: [
        { label: "Role", value: "Teaching Assistant" },
        { label: "Course", value: "IAT 343 Animation" },
        { label: "Department", value: "School of Interactive Arts and Technology" },
        { label: "Institution", value: "Simon Fraser University" },
        { label: "Focus", value: "Modeling, rigging, texturing, animation, Maya support" },
        { label: "Format", value: "Technical troubleshooting, workflow feedback, production guidance" },
        { label: "Software / Context", value: "Autodesk Maya, 3D production pipeline, animation workflow" }
      ],
      imageName: "IAT3431",
      imageAlt: "IAT 343 course image",
      bottomTitle: "Teaching Approach",
      bottomText:
        "My teaching approach in this course emphasized workflow clarity, technical discipline, and the connection between each step of the production pipeline. I helped students understand how decisions in modeling, scene organization, UVs, rigs, and timing influence the final animation outcome. Rather than only fixing isolated problems, I focused on helping students understand why those problems happened, how they affected later stages, and what habits would make their projects more stable, efficient, and visually convincing.I also emphasized the importance of production-ready workflows commonly expected in professional animation and game development environments. Students were encouraged to maintain clean scene organization, consistent naming conventions, efficient topology, and well-structured rigs so their work could move smoothly through a collaborative pipeline. In critiques and technical support sessions, I highlighted how industry studios evaluate animation work not only by visual quality, but also by technical reliability, file organization, and the animator’s ability to iterate quickly without breaking the production setup.",
      responsibilitiesTitle: "Responsibilities",
      responsibilities: [
        "Supported students across modeling, rigging, texturing, animation, and scene troubleshooting in Autodesk Maya, helping them navigate both creative and technical challenges throughout production.",
        "Provided detailed feedback on asset preparation, workflow organization, and animation development so students could move through the pipeline with stronger technical consistency.",
        "Helped diagnose and resolve common production issues related to topology, UV mapping, rig setup, deformation behavior, scene hierarchy, file management, and render readiness.",
        "Guided students in understanding how one production stage affects the next, reinforcing the importance of clean setups, efficient iteration, and reliable project structure.",
        "Supported critique and revision by identifying where animation choices, technical execution, or workflow problems were weakening the final result, then offering concrete steps for improvement.",
        "Encouraged students to approach animation projects with stronger production awareness, clearer organization, and more professional habits across the full 3D pipeline."
      ]
    }
  };

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderMeta(items) {
    return items.map((item) => `
      <div class="teach-meta-item">
        <div class="teach-meta-label">${escapeHtml(item.label)}</div>
        <div class="teach-meta-value">${escapeHtml(item.value)}</div>
      </div>
    `).join("");
  }

  function renderList(items) {
    return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function buildMarkup(course) {
    return `
      <div class="teach-minimal-root">
        <div class="teach-minimal-page">
          <button class="teach-minimal-close" type="button" data-teaching-close="1" aria-label="Close teaching detail">Close</button>

          <section class="teach-minimal-section teach-minimal-top">
            <div class="teach-top-grid">
              <div class="teach-top-copy">
                <h1 class="teach-course-title">${escapeHtml(course.title)}</h1>
                <p class="teach-copy">${escapeHtml(course.lead)}</p>
              </div>

              <div class="teach-meta-wrap">
                <aside class="teach-meta" aria-label="Course details">
                  <h2 class="teach-meta-title">Course Overview</h2>
                  <div class="teach-meta-list">
                    ${renderMeta(course.meta)}
                  </div>
                </aside>
              </div>
            </div>
          </section>

          <section class="teach-minimal-section teach-minimal-mid" aria-label="Course image">
            <div class="teach-image-stage">
              <img data-course-image-name="${escapeHtml(course.imageName)}" alt="${escapeHtml(course.imageAlt)}">
              <div class="teach-image-fade-top"></div>
              <div class="teach-image-fade-bottom"></div>
            </div>
          </section>

          <section class="teach-minimal-section teach-minimal-bottom">
            <div class="teach-bottom-grid">
              <section class="teach-card">
                <h3>${escapeHtml(course.bottomTitle)}</h3>
                <p>${escapeHtml(course.bottomText)}</p>
              </section>

              <aside class="teach-card">
                <h3>${escapeHtml(course.responsibilitiesTitle)}</h3>
                <ul class="teach-list">
                  ${renderList(course.responsibilities)}
                </ul>
              </aside>
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function detectCourseKey(button) {
    if (!button) return null;
    const key = button.getAttribute("data-course");
    return COURSE_DATA[key] ? key : null;
  }

  function detectFromTitle() {
    const titleEl = document.querySelector("#teaching-detail-title");
    const text = (titleEl && titleEl.textContent ? titleEl.textContent : "").toLowerCase();
    if (text.includes("313")) return "iat313";
    if (text.includes("343")) return "iat343";
    return null;
  }

  function applyRedesign(courseKey) {
    const overlay = document.querySelector("#teaching-detail-overlay");
    if (!overlay) return;

    const panel = overlay.querySelector(".teaching-detail-panel");
    if (!panel) return;

    const course = COURSE_DATA[courseKey];
    if (!course) return;

    panel.classList.add("teaching-template-panel");
    panel.innerHTML = buildMarkup(course);

    resolveCourseImages(panel);
  }

  function resolveCourseImages(scope) {
    const images = scope.querySelectorAll("[data-course-image-name]");
    const cacheBust = `v=${Date.now()}`;

    images.forEach((img) => {
      const imageName = img.getAttribute("data-course-image-name");
      if (!imageName) return;

      /* ONLY search inside Teaching folder */
      const candidates = [
        `Teaching/${imageName}.jpg?${cacheBust}`,
        `Teaching/${imageName}.jpeg?${cacheBust}`,
        `Teaching/${imageName}.png?${cacheBust}`,
        `./Teaching/${imageName}.jpg?${cacheBust}`,
        `./Teaching/${imageName}.jpeg?${cacheBust}`,
        `./Teaching/${imageName}.png?${cacheBust}`,
        `/Teaching/${imageName}.jpg?${cacheBust}`,
        `/Teaching/${imageName}.jpeg?${cacheBust}`,
        `/Teaching/${imageName}.png?${cacheBust}`
      ];

      let index = 0;

      function tryNext() {
        if (index >= candidates.length) {
          img.removeAttribute("src");
          img.style.display = "none";
          return;
        }

        const candidate = candidates[index++];
        img.onload = function () {
          img.onload = null;
          img.onerror = null;
          img.style.display = "block";
        };
        img.onerror = function () {
          tryNext();
        };
        img.src = candidate;
      }

      tryNext();
    });
  }

  document.addEventListener("click", function (event) {
    const teachingButton = event.target.closest(".teaching-layer[data-course]");
    if (teachingButton) {
      const key = detectCourseKey(teachingButton);
      if (!key) return;

      setTimeout(() => {
        applyRedesign(key);
      }, 70);
      return;
    }

    const closeBtn = event.target.closest("[data-teaching-close='1']");
    if (closeBtn) {
      const panel = document.querySelector("#teaching-detail-overlay .teaching-detail-panel");
      if (panel) {
        panel.classList.remove("teaching-template-panel");
      }
    }
  });

  const observer = new MutationObserver(() => {
    const overlay = document.querySelector("#teaching-detail-overlay[aria-hidden='false']");
    if (!overlay) return;

    const panel = overlay.querySelector(".teaching-detail-panel");
    if (!panel) return;

    if (panel.classList.contains("teaching-template-panel")) return;

    const guessed = detectFromTitle();
    if (guessed) {
      applyRedesign(guessed);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-hidden"]
  });
})();