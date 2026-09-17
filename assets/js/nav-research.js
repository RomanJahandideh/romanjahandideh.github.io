(() => {
  "use strict";

  function addResearchLink() {
    var nav = document.querySelector("#site-nav .top-nav");
    if (!nav) return false;
    if (nav.querySelector("#nav-research-link")) return true;

    var link = document.createElement("a");
    link.href = "#";
    link.id = "nav-research-link";
    link.setAttribute("data-nav", "research");
    link.textContent = "Research";
    link.addEventListener("click", function (e) {
      e.preventDefault();
      if (window.ProjectsOverlay && window.ProjectsOverlay.open) {
        window.ProjectsOverlay.open();
      }
    });

    var workLink = nav.querySelector('a[data-nav="work"]');
    if (workLink && workLink.parentNode) {
      workLink.parentNode.insertBefore(link, workLink);
    } else {
      nav.appendChild(link);
    }
    return true;
  }

  if (!addResearchLink()) {
    var retry = setInterval(function () {
      if (addResearchLink()) clearInterval(retry);
    }, 50);
    setTimeout(function () { clearInterval(retry); }, 5000);
  }
})();
