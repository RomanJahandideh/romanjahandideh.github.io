/* Preserve full-size image viewing on standalone project pages. */
document.addEventListener("DOMContentLoaded", function () {
  if (window.GLightbox) {
    window.GLightbox({ selector: ".project-thumb", touchNavigation: true, loop: false });
  }
});
