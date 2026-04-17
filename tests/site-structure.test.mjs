import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = "/Users/zfc/code/fak111.github.io";

const navLinks = ["/", "/post/", "/search/", "/about/", "/talk/"];

const pages = [
  {
    file: "index.html",
    title: "fak111 | 观点、方法与价值观",
  },
  {
    file: "about/index.html",
    title: "About | fak111",
  },
  {
    file: "post/index.html",
    title: "Posts | fak111",
  },
  {
    file: "search/index.html",
    title: "Search | fak111",
  },
  {
    file: "talk/index.html",
    title: "Talk | fak111",
  },
  {
    file: "post/mcp-learning-journey/index.html",
    title: "四期视频后，我终于搞懂了 MCP | fak111",
  },
];

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("creates the required site pages with steipete-like minimal nav", () => {
  for (const page of pages) {
    const absolutePath = resolve(root, page.file);
    assert.equal(existsSync(absolutePath), true, `${page.file} should exist`);

    const html = read(page.file);
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1.0">/);
    assert.match(html, new RegExp(`<title>${page.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</title>`));

    for (const href of navLinks) {
      assert.match(html, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    }

    assert.match(html, />fak111</);
    assert.match(html, />Posts</);
    assert.match(html, />About</);
    assert.match(html, /aria-label="Search"/);
    assert.match(html, />Talk</);
    assert.doesNotMatch(html, />Home</);
  }
});

test("uses author-card home layout instead of landing-page modules", () => {
  const homeHtml = read("index.html");

  assert.match(homeHtml, /href="\/assets\/styles\.css"/);
  assert.match(homeHtml, /src="\/assets\/site\.mjs"/);
  assert.match(homeHtml, /class="profile-card"/);
  assert.match(homeHtml, /class="post-list"/);
  assert.doesNotMatch(homeHtml, /hero__actions/);
  assert.doesNotMatch(homeHtml, /feature-grid/);
  assert.doesNotMatch(homeHtml, /section--split/);
});

test("wires the shared assets and search hooks", () => {
  const searchHtml = read("search/index.html");

  assert.match(searchHtml, /data-search-form/);
  assert.match(searchHtml, /data-search-input/);
  assert.match(searchHtml, /data-search-results/);
  assert.match(searchHtml, /src="\/assets\/search\.mjs"/);
  assert.match(searchHtml, /aria-label="Search"/);
});

test("provides shared data for search and post discovery", () => {
  const postsModulePath = resolve(root, "assets/posts.mjs");
  assert.equal(existsSync(postsModulePath), true, "assets/posts.mjs should exist");

  const postsModuleSource = read("assets/posts.mjs");
  assert.match(postsModuleSource, /slug:\s*"mcp-learning-journey"/);
  assert.match(postsModuleSource, /title:\s*"四期视频后，我终于搞懂了 MCP"/);
  assert.match(postsModuleSource, /href:\s*"\/post\/mcp-learning-journey\/"/);
});
