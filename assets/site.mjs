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

function normalizeCodeText(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  while (lines.length && !lines[0].trim()) {
    lines.shift();
  }

  while (lines.length && !lines.at(-1)?.trim()) {
    lines.pop();
  }

  if (!lines.length) {
    return "";
  }

  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.match(/^[ \t]*/)?.[0].length ?? 0);
  const positiveIndents = indents.filter((indent) => indent > 0);
  const hasZeroIndent = indents.some((indent) => indent === 0);
  const baselineIndent =
    hasZeroIndent && positiveIndents.length ? Math.min(...positiveIndents) : 0;
  const commonIndent = indents.length ? Math.min(...indents) : 0;
  const trimIndent = baselineIndent >= 4 ? baselineIndent : commonIndent;

  return lines
    .map((line) => {
      if (!line.trim()) {
        return "";
      }

      const currentIndent = line.match(/^[ \t]*/)?.[0].length ?? 0;
      const removeCount = currentIndent >= trimIndent ? trimIndent : commonIndent;
      return line.slice(removeCount).replace(/[ \t]+$/g, "");
    })
    .join("\n");
}

function upgradeLegacyCodeBlocks() {
  document.querySelectorAll(".article-detail__body pre").forEach((pre) => {
    if (pre.closest(".article-code-block")) {
      const code = pre.querySelector("code[data-copy-code-source]");
      if (code) {
        code.textContent = normalizeCodeText(code.textContent ?? "");
      }
      return;
    }

    const code = pre.querySelector("code");
    if (!code || !pre.parentElement) {
      return;
    }

    code.textContent = normalizeCodeText(code.textContent ?? "");
    code.setAttribute("data-copy-code-source", "");

    const shell = document.createElement("div");
    shell.className = "article-code-block";

    const toolbar = document.createElement("div");
    toolbar.className = "article-code-block__toolbar";

    const button = document.createElement("button");
    button.className = "article-code-block__copy";
    button.type = "button";
    button.textContent = "Copy";
    button.setAttribute("data-copy-code-button", "");
    button.setAttribute("aria-label", "Copy code");

    toolbar.append(button);
    pre.parentElement.insertBefore(shell, pre);
    shell.append(toolbar, pre);
  });
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.append(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("copy command was rejected");
  }
}

function bindCopyButtons() {
  document.querySelectorAll("[data-copy-code-button]").forEach((button) => {
    if (button.dataset.copyBound === "true") {
      return;
    }

    button.dataset.copyBound = "true";
    button.addEventListener("click", async () => {
      const block = button.closest(".article-code-block");
      const code = block?.querySelector("[data-copy-code-source]");
      const text = code?.textContent ?? "";
      if (!text) {
        return;
      }

      const reset = () => {
        button.textContent = "Copy";
        button.dataset.copyState = "idle";
      };

      window.clearTimeout(Number(button.dataset.copyResetTimer ?? "0"));

      try {
        await copyText(text);
        button.textContent = "Copied";
        button.dataset.copyState = "copied";
      } catch (error) {
        console.error(error);
        button.textContent = "Retry";
        button.dataset.copyState = "error";
      }

      const timeoutId = window.setTimeout(reset, 1800);
      button.dataset.copyResetTimer = String(timeoutId);
    });
  });
}

upgradeLegacyCodeBlocks();
bindCopyButtons();

document.querySelectorAll("[data-current-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});
