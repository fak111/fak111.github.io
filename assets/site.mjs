const menuToggle = document.querySelector("[data-menu-toggle]");
const siteNav = document.querySelector("[data-site-nav]");
const menuIcon = menuToggle?.querySelector(".menu-icon");
const closeIcon = menuToggle?.querySelector(".close-icon");

function syncMenuState(isOpen) {
  if (!menuToggle || !siteNav) {
    return;
  }

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close Menu" : "Open Menu");

  if (menuIcon && closeIcon) {
    menuIcon.classList.toggle("hidden", isOpen);
    closeIcon.classList.toggle("hidden", !isOpen);
  }
}

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    syncMenuState(isOpen);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      syncMenuState(false);
    });
  });

  syncMenuState(false);
}

const activePage = document.body.dataset.page;
const activeMap = {
  post: "/post/",
  search: "/search/",
  about: "/about/",
  talk: "/talk/",
};

const activeHref = activeMap[activePage];
if (activeHref && siteNav) {
  siteNav.querySelectorAll("a").forEach((link) => {
    if (link.getAttribute("href") === activeHref) {
      link.setAttribute("aria-current", "page");
    }
  });
}

document.querySelectorAll("[data-current-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
