WEBSITE UPDATE (REPLACE PACKAGE)

What this update does:
- Removes the old section "page" UI completely.
- WORK page shows ONLY the stacked (UIverse-style) layered card.
- Background is full black.
- Card layers are transparent white glass.
- Clicking a layer opens a subsection (Animations / CG Art / Game Design / Projects / Articles).
- Each subsection contains 5 placeholder projects.
- Clicking a project opens its own project page (image placeholder + title + text).

How to install (simple):
1) Back up your current website folder first.
2) Copy EVERYTHING from this zip into your website folder.
3) If Windows asks to replace files, choose YES.
4) Open index.html with Live Server.

Where to edit content:
- Work categories on home: index.html
- Subsections: /work/*.html
- Project pages: /work/*-p1.html ... *-p5.html
- Styles:
  - assets/css/main.css
  - assets/css/work-card.css
  - assets/css/slider.css

Note:
- Your original uploaded template assets were copied into /_backup_original_assets inside this package.


v2 fix:
- HOME now works by scrolling to a real #home section.
- WORK scrolls to #work.
