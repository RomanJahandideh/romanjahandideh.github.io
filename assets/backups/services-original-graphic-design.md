# Original "Services" content (graphic design voice)

Backed up 2026-09-15, before reframing the homepage Services section toward
research-focused categories for PhD lab applications. To restore any of this,
paste the matching block back into its original file/location.

## index.html — #seq-steps (scroll-triggered cards)

```html
<div id="seq-steps" aria-hidden="true">
  <div class="seq-step-card" data-step="0">
    <h3 class="seq-step-title">Brand Identity &amp; Visual Systems</h3>
    <p class="seq-step-desc">Complete identity systems — logo, typography, colour palette, layout grid — built for consistency across every touchpoint from print collateral to digital campaigns.</p>
    <a href="#" class="svc-view-work-link seq-step-link">View Work <span aria-hidden="true">&#8594;</span></a>
  </div>
  <div class="seq-step-card" data-step="1">
    <h3 class="seq-step-title">Motion Graphics &amp; 3D Production</h3>
    <p class="seq-step-desc">Concept-to-final motion work using Cinema 4D, Maya, and After Effects — animated campaigns, 3D visualisations, and visual storytelling built for branded platforms.</p>
    <a href="#" class="svc-view-work-link seq-step-link">View Work <span aria-hidden="true">&#8594;</span></a>
  </div>
  <div class="seq-step-card" data-step="2">
    <h3 class="seq-step-title">Print &amp; Campaign Design</h3>
    <p class="seq-step-desc">Production-ready deliverables — large-format print, social media graphics, poster and packaging design — prepped and proofed for campaigns that ship without revision rounds.</p>
    <a href="#" class="svc-view-work-link seq-step-link">View Work <span aria-hidden="true">&#8594;</span></a>
  </div>
  <div class="seq-step-card" data-step="3">
    <h3 class="seq-step-title">Spatial &amp; Immersive Design</h3>
    <p class="seq-step-desc">Environmental graphics and spatial visualisation bridging architecture and brand — VR/AR asset production, exhibition graphics, and experiential design informed by published research in depth perception.</p>
    <a href="#" class="svc-view-work-link seq-step-link">View Work <span aria-hidden="true">&#8594;</span></a>
  </div>
</div>
```

## index.html — #svc-balls-wrap (floating buttons)

```html
<div id="svc-balls-wrap" aria-hidden="true" role="group" aria-label="Services — click to learn more">
  <button class="svc-ball" data-idx="0" type="button" aria-label="Brand Identity and Visual Systems">
    <span class="svc-ball-label">Brand<br>Identity</span>
  </button>
  <button class="svc-ball" data-idx="1" type="button" aria-label="Motion Graphics and 3D Production">
    <span class="svc-ball-label">Motion &amp;<br>3D</span>
  </button>
  <button class="svc-ball" data-idx="2" type="button" aria-label="Print and Campaign Design">
    <span class="svc-ball-label">Print &amp;<br>Campaign</span>
  </button>
  <button class="svc-ball" data-idx="3" type="button" aria-label="Spatial and Immersive Design">
    <span class="svc-ball-label">Spatial &amp;<br>Immersive</span>
  </button>
</div>
```

## assets/js/services.js — the `c` data array (panel descriptions)

```js
c=[
  {idx:0,category:"Graphic Design",desc:"Brands need a visual identity that stays consistent everywhere it appears, from a single social post to a full campaign. I build complete graphic systems — logo, typography, color, layout, iconography — and ready-to-publish marketing assets that hold together across print and digital.",viewWork:!0},
  {idx:1,category:"Animation",desc:"Audiences scroll fast, so a brand has only seconds to land its message. I create advertisement videos and motion graphics from concept to final cut — blending 3D animation, editing, and visual storytelling into content that holds attention and moves people to act.",viewWork:!0},
  {idx:2,category:"Web Design",desc:"A brand often meets its audience first through its website. I design clean, on-brand web experiences built around clear visual hierarchy and an intuitive journey, so visitors understand the brand quickly and act with confidence.",viewWork:!0},
  {idx:3,category:"",desc:"Marketing teams are pushed to produce more in less time. I bring AI into the creative pipeline — generating and refining visual assets, building prompt-driven workflows, and automating repetitive design tasks — so campaigns ship faster without sacrificing quality.",viewWork:!1}
]
```

## index.html — About window, original single publication line

```html
<a class="abt-publication" href="https://www.researchgate.net/profile/Romman-Jahandideh" target="_blank" rel="noopener">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>
  Published in <em>Creating Immersive Virtual Landscapes</em>, eCAADe 2023
</a>
```

## Notes

- The `category` field in services.js (`"Graphic Design"`, `"Animation"`, `"Web Design"`, `""`) drives which
  Work-gallery items the "View Work" link filters to. When restoring, keep these values as-is unless you
  also want to change what each button links to.
- Full history is also in git — `git log -- index.html assets/js/services.js` — so any past version can be
  recovered with `git show <commit>:<file>` even without this backup.
