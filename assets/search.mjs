import { POSTS } from "/assets/posts.mjs";

const form = document.querySelector("[data-search-form]");
const input = document.querySelector("[data-search-input]");
const resultsNode = document.querySelector("[data-search-results]");
const metaNode = document.querySelector("[data-search-meta]");

function normalize(value) {
  return value.trim().toLowerCase();
}

function filterPosts(query) {
  if (!query) {
    return POSTS;
  }

  return POSTS.filter((post) => {
    const haystacks = [post.title, post.excerpt, ...post.tags, ...post.keywords]
      .join(" ")
      .toLowerCase();
    return haystacks.includes(query);
  });
}

function renderResults(items, query) {
  if (!resultsNode || !metaNode) {
    return;
  }

  if (query) {
    metaNode.textContent = `关键词 “${query}” 找到 ${items.length} 篇文章。`;
  } else {
    metaNode.textContent = `当前显示全部 ${items.length} 篇文章。`;
  }

  if (!items.length) {
    resultsNode.innerHTML = `
      <div class="search-empty">
        <p>还没有匹配结果。你可以试试 “MCP”、“AI” 或 “方法论”。</p>
      </div>
    `;
    return;
  }

  resultsNode.innerHTML = items
    .map(
      (post) => `
        <article class="search-result">
          <p class="post-card__meta">${post.date} · ${post.readingTime}</p>
          <h3><a href="${post.href}">${post.title}</a></h3>
          <p>${post.excerpt}</p>
          <div class="tag-list">
            ${post.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
          </div>
        </article>
      `
    )
    .join("");
}

function syncQuery(nextQuery) {
  const normalizedQuery = normalize(nextQuery);
  if (input) {
    input.value = nextQuery;
  }

  const url = new URL(window.location.href);
  if (normalizedQuery) {
    url.searchParams.set("q", nextQuery);
  } else {
    url.searchParams.delete("q");
  }
  window.history.replaceState({}, "", url);
  renderResults(filterPosts(normalizedQuery), nextQuery.trim());
}

if (form && input) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    syncQuery(input.value);
  });
}

const initialQuery = new URLSearchParams(window.location.search).get("q") ?? "";
syncQuery(initialQuery);
