const menuToggle = document.querySelector("[data-menu-toggle]");
const siteNav = document.querySelector("[data-site-nav]");

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      siteNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const activePage = document.body.dataset.page;
const activeMap = {
  home: "/",
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
