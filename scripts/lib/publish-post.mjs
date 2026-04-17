import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, basename, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const REPO_ROOT = "/Users/zfc/code/fak111.github.io";
const SITE_URL = "https://fak111.github.io";
const REPO_URL = "https://github.com/fak111/fak111.github.io";
const SEARCH_HINT = "MCP”、“AI” 或 “方法论";
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const TAG_RULES = [
  { tag: "AI", patterns: [/\bai\b/i, /AI时代/, /模型/, /agent/i, /智能/] },
  { tag: "博客", patterns: [/\bblog\b/i, /博客/, /写文章/, /写作/, /内容阵地/] },
  { tag: "数字主权", patterns: [/数字主权/, /所有权/, /平台型工具/] },
  { tag: "方法论", patterns: [/方法论/, /工作流/, /系统/] },
  { tag: "学习复盘", patterns: [/学习/, /复盘/, /总结/] },
  { tag: "内容发布", patterns: [/发布/, /上传/, /GitHub Pages/, /文章/] },
];

export function createPostFromMarkdown({
  sourcePath,
  markdown,
  publishedAt,
  existingSlugs = [],
}) {
  const { frontMatter, body } = splitFrontMatter(markdown);
  const rawTitle = frontMatter.title ?? extractTitleFromFilename(sourcePath);
  const title = sanitizeTitle(rawTitle);
  const date = normalizeDate(frontMatter.date ?? publishedAt);
  const tags = normalizeTags(frontMatter.tags, `${title}\n${body}`);
  const excerpt = frontMatter.excerpt ?? extractExcerpt(body);
  const keywords = buildKeywords(title, excerpt, tags, body);
  const readingTime = formatReadingTime(body);
  const slug = ensureUniqueSlug(
    frontMatter.slug ?? slugify(frontMatter.slugSource ?? title),
    existingSlugs,
    title
  );
  const href = `/post/${slug}/`;
  const html = renderMarkdownToHtml(body);

  return {
    slug,
    href,
    title,
    excerpt,
    date,
    readingTime,
    tags,
    keywords,
    html,
    sourcePath,
  };
}

export function renderMarkdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const output = [];
  let paragraph = [];
  let listItems = [];
  let codeFence = null;
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) {
      return;
    }

    output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) {
      return;
    }

    output.push(`<ul>\n${listItems.map((item) => `  <li>${renderInline(item)}</li>`).join("\n")}\n</ul>`);
    listItems = [];
  };

  const flushCodeFence = () => {
    if (!codeFence) {
      return;
    }

    const className = codeFence.lang ? ` class="language-${escapeHtml(codeFence.lang)}"` : "";
    output.push(
      `<pre><code${className}>${escapeHtml(codeLines.join("\n"))}</code></pre>`
    );
    codeFence = null;
    codeLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (codeFence) {
      if (trimmed.startsWith("```")) {
        flushCodeFence();
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    if (trimmed.startsWith("```")) {
      flushParagraph();
      flushList();
      codeFence = { lang: trimmed.slice(3).trim() };
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = Math.min(6, headingMatch[1].length + 1);
      output.push(`<h${level}>${renderInline(headingMatch[2].trim())}</h${level}>`);
      continue;
    }

    const listMatch = /^-\s+(.+)$/.exec(trimmed);
    if (listMatch) {
      flushParagraph();
      listItems.push(listMatch[1]);
      continue;
    }

    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();
  flushCodeFence();

  return output.join("\n\n");
}

export function renderHomePage(posts) {
  const sortedPosts = sortPosts(posts);
  const latestPosts = sortedPosts.slice(0, 5);
  const postList = latestPosts
    .map((post) => {
      const tags = post.tags
        .slice(0, 4)
        .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
        .join("\n            ");

      return `        <article class="post-teaser">
          <h2><a href="${post.href}">${escapeHtml(post.title)}</a></h2>
          <p class="post-meta"><time datetime="${post.date}">${formatDisplayDate(post.date)}</time> · ${escapeHtml(
            post.readingTime
          )}</p>
          <p>${escapeHtml(post.excerpt)}</p>
          <div class="tag-list">
            ${tags}
          </div>
        </article>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>fak111 | 观点、方法与价值观</title>
  <meta name="description" content="fak111 的个人博客，长期输出观点文章、方法论和价值观，并为后续 AI 集成打基础。">
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="icon" href="/images/profile.jpg">
</head>

<body data-page="home">
  <div class="page-shell">
    ${renderHeader()}

    <main>
      <section class="profile-card">
        <img src="/images/profile.jpg" alt="fak111 头像" class="profile-card__avatar">
        <div>
          <h1>Hi, I&apos;m @fak111.</h1>
          <p>我在这里长期记录观点文章、方法论和价值观。当前阶段先把博客本身搭稳，再把它作为后续 AI 工作流的内容底座。</p>
          <div class="social-links">
            ${renderSocialLinks()}
          </div>
        </div>
      </section>

      <section class="post-list" aria-label="Latest posts">
${postList}
        <p class="post-list__more"><a href="/post/">All Posts →</a></p>
      </section>
    </main>

    ${renderFooter({
      message: "持续写作，持续校准自己的判断。",
      links: [
        { href: "https://github.com/fak111", label: "GitHub", external: true },
        { href: "https://x.com/DerbZhuli0411", label: "X", external: true },
        { href: "mailto:zhuliderb@gmail.com", label: "zhuliderb@gmail.com" },
      ],
    })}
  </div>

  <script type="module" src="/assets/site.mjs"></script>
</body>

</html>
`;
}

export function renderPostsIndexPage(posts) {
  const groupedByYear = groupPostsByYear(sortPosts(posts));
  const archiveSections = Object.entries(groupedByYear)
    .map(([year, yearPosts]) => {
      const months = groupPostsByMonth(yearPosts);
      const monthSections = Object.entries(months)
        .map(([monthIndex, monthPosts]) => {
          const monthName = MONTH_NAMES[Number(monthIndex)];
          const postItems = monthPosts
            .map(
              (post) => `            <article class="post-teaser">
              <h2><a href="${post.href}">${escapeHtml(post.title)}</a></h2>
              <p class="post-meta"><time datetime="${post.date}">${formatDisplayDate(post.date)}</time> · ${escapeHtml(
                post.readingTime
              )}</p>
              <p>${escapeHtml(post.excerpt)}</p>
            </article>`
            )
            .join("\n");

          return `        <section class="archive-month">
          <h3>${monthName} <span class="archive-count">${monthPosts.length}</span></h3>
          <div class="archive-month__list">
${postItems}
          </div>
        </section>`;
        })
        .join("\n\n");

      return `      <section class="archive-group">
        <div class="archive-group__header">
          <h2>${year}</h2>
          <span class="archive-count">${yearPosts.length}</span>
        </div>

${monthSections}
      </section>`;
    })
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Posts | fak111</title>
  <meta name="description" content="fak111 的文章列表，包含观点文章、学习复盘和方法论记录。">
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="icon" href="/images/profile.jpg">
</head>

<body data-page="post">
  <div class="page-shell">
    ${renderHeader()}

    <main>
      <section class="page-intro">
        <h1>All Posts</h1>
        <p>Browse all blog posts by year and month.</p>
      </section>

${archiveSections}
    </main>

    ${renderFooter({
      message: "文章先少而准，之后再慢慢长出来。",
      links: [
        { href: "/", label: "Index" },
        { href: "/about/", label: "About" },
        { href: "mailto:zhuliderb@gmail.com", label: "zhuliderb@gmail.com" },
      ],
    })}
  </div>

  <script type="module" src="/assets/site.mjs"></script>
</body>

</html>
`;
}

export function renderPostDetailPage(post) {
  return `<!DOCTYPE html>
<html lang="zh-CN">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(post.title)} | fak111</title>
  <meta name="description" content="${escapeHtml(post.excerpt)}">
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="icon" href="/images/profile.jpg">
</head>

<body data-page="post">
  <div class="page-shell">
    ${renderHeader()}

    <main>
      <article class="article-detail">
        <header class="article-detail__header">
          <h1>${escapeHtml(post.title)}</h1>
          <div class="article-detail__meta-row">
            <p class="post-meta"><time datetime="${post.date}">${formatDisplayDate(post.date)}</time> · ${escapeHtml(
              post.readingTime
            )}</p>
            <a class="article-detail__action" href="${REPO_URL}" target="_blank" rel="noreferrer">View on GitHub</a>
          </div>
        </header>

        <div class="article-detail__body">
${indentBlock(post.html, 10)}
        </div>
      </article>
    </main>

    ${renderFooter({
      message: `<a href="/post/">← Back to Posts</a>`,
      links: [
        { href: "/about/", label: "About" },
        { href: "https://github.com/fak111", label: "GitHub", external: true },
        { href: "mailto:zhuliderb@gmail.com", label: "zhuliderb@gmail.com" },
      ],
      allowHtmlMessage: true,
    })}
  </div>

  <script type="module" src="/assets/site.mjs"></script>
</body>

</html>
`;
}

export function renderPostsModule(posts) {
  return `export const POSTS = ${JSON.stringify(sortPosts(posts), null, 2)};\n`;
}

export async function loadPostsManifest(repoRoot = REPO_ROOT) {
  const filePath = resolve(repoRoot, "assets/posts.mjs");
  const module = await import(`${pathToFileURL(filePath).href}?t=${Date.now()}`);
  return sortPosts(module.POSTS ?? []);
}

export function writeGeneratedSite({ repoRoot = REPO_ROOT, posts, post }) {
  writeFileSync(resolve(repoRoot, "index.html"), renderHomePage(posts), "utf8");
  writeFileSync(resolve(repoRoot, "post/index.html"), renderPostsIndexPage(posts), "utf8");
  writeFileSync(resolve(repoRoot, "assets/posts.mjs"), renderPostsModule(posts), "utf8");

  const detailDir = resolve(repoRoot, "post", post.slug);
  mkdirSync(detailDir, { recursive: true });
  writeFileSync(resolve(detailDir, "index.html"), renderPostDetailPage(post), "utf8");
}

export function mergePostIntoManifest(existingPosts, nextPost) {
  const withoutDuplicate = existingPosts.filter((post) => post.slug !== nextPost.slug);
  return sortPosts([sanitizeStoredPost(nextPost), ...withoutDuplicate.map(sanitizeStoredPost)]);
}

export function sanitizeStoredPost(post) {
  return {
    slug: post.slug,
    href: post.href,
    title: post.title,
    excerpt: post.excerpt,
    date: post.date,
    readingTime: post.readingTime,
    tags: [...post.tags],
    keywords: [...post.keywords],
  };
}

export function getDirtyWorkingTreeEntries(statusOutput) {
  return statusOutput
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .filter((line) => {
      const filePath = line.slice(3).trim();
      return !filePath.startsWith(".codex/");
    });
}

export function buildCommitMessage(post) {
  return `feat: publish ${post.title}`;
}

export async function publishPost({
  sourcePath,
  repoRoot = REPO_ROOT,
  publishedAt = today(),
  waitForSite = true,
  fetchImpl = globalThis.fetch,
  exec = execFileAsync,
} = {}) {
  if (!sourcePath) {
    throw new Error("sourcePath is required");
  }

  const { stdout: statusOutput } = await exec("git", ["status", "--short"], { cwd: repoRoot });
  const dirtyEntries = getDirtyWorkingTreeEntries(statusOutput);
  if (dirtyEntries.length) {
    throw new Error(`working tree is dirty:\n${dirtyEntries.join("\n")}`);
  }

  const markdown = readFileSync(sourcePath, "utf8");
  const existingPosts = await loadPostsManifest(repoRoot);
  const post = createPostFromMarkdown({
    sourcePath,
    markdown,
    publishedAt,
    existingSlugs: existingPosts.map((item) => item.slug),
  });

  const mergedPosts = mergePostIntoManifest(existingPosts, post);
  writeGeneratedSite({ repoRoot, posts: mergedPosts, post });

  await exec("git", ["add", "assets/posts.mjs", "index.html", "post/index.html", join("post", post.slug, "index.html")], {
    cwd: repoRoot,
  });
  await exec("git", ["commit", "-m", buildCommitMessage(post)], { cwd: repoRoot });
  await exec("git", ["push", "origin", "main"], { cwd: repoRoot });

  const articleUrl = `${SITE_URL}${post.href}`;
  if (waitForSite) {
    await waitForArticle({
      articleUrl,
      title: post.title,
      fetchImpl,
    });
  }

  return {
    post,
    articleUrl,
    posts: mergedPosts,
  };
}

export async function waitForArticle({
  articleUrl,
  title,
  fetchImpl = globalThis.fetch,
  retries = 30,
  intervalMs = 10000,
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch implementation is required for GitHub Pages polling");
  }

  let lastError = null;
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetchImpl(articleUrl, {
        headers: {
          "cache-control": "no-cache",
        },
      });

      if (response.ok) {
        const html = await response.text();
        if (html.includes(title)) {
          return;
        }

        lastError = new Error("article page is reachable but title is not visible yet");
      } else {
        lastError = new Error(`unexpected status: ${response.status}`);
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < retries - 1) {
      await sleep(intervalMs);
    }
  }

  throw new Error(`GitHub Pages article did not become visible: ${lastError?.message ?? "unknown error"}`);
}

function splitFrontMatter(markdown) {
  if (!markdown.startsWith("---\n")) {
    return {
      frontMatter: {},
      body: markdown.trim(),
    };
  }

  const closingIndex = markdown.indexOf("\n---\n", 4);
  if (closingIndex === -1) {
    return {
      frontMatter: {},
      body: markdown.trim(),
    };
  }

  const frontMatterSource = markdown.slice(4, closingIndex).trim();
  const body = markdown.slice(closingIndex + 5).trim();
  return {
    frontMatter: parseFrontMatter(frontMatterSource),
    body,
  };
}

function parseFrontMatter(source) {
  const frontMatter = {};
  for (const line of source.split("\n")) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*):\s*(.+)$/.exec(line.trim());
    if (!match) {
      continue;
    }

    const [, key, value] = match;
    if (key === "tags") {
      frontMatter.tags = value
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    frontMatter[key] = value.trim().replace(/^['"]|['"]$/g, "");
  }
  return frontMatter;
}

function extractTitleFromFilename(sourcePath) {
  const filename = basename(sourcePath, extname(sourcePath));
  return filename.replace(/\s+/g, " ").trim();
}

function sanitizeTitle(title) {
  return title.replace(/\s+/g, " ").trim();
}

function normalizeDate(value) {
  if (!value) {
    return today();
  }
  return value;
}

function normalizeTags(rawTags, content) {
  if (Array.isArray(rawTags) && rawTags.length) {
    return rawTags.slice(0, 4);
  }

  const matches = TAG_RULES.filter(({ patterns }) => patterns.some((pattern) => pattern.test(content))).map(
    ({ tag }) => tag
  );

  if (matches.length) {
    return matches.slice(0, 4);
  }

  return ["随笔"];
}

function extractExcerpt(markdown) {
  const blocks = [];
  let current = [];

  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (current.length) {
        blocks.push(current.join(" "));
        current = [];
      }
      continue;
    }

    if (/^#+\s+/.test(trimmed) || trimmed.startsWith("- ") || trimmed.startsWith("```")) {
      if (current.length) {
        blocks.push(current.join(" "));
        current = [];
      }
      continue;
    }

    current.push(trimmed);
  }

  if (current.length) {
    blocks.push(current.join(" "));
  }

  const firstParagraph = blocks.find(Boolean) ?? "";
  const plainText = firstParagraph.replace(/\s+/g, " ").trim();
  if (plainText.length <= 120) {
    return plainText;
  }

  return `${plainText.slice(0, 117)}...`;
}

function buildKeywords(title, excerpt, tags, body) {
  const keywords = new Set();
  for (const tag of tags) {
    keywords.add(tag);
    keywords.add(tag.toLowerCase());
  }

  const asciiWords = `${title} ${excerpt}`
    .toLowerCase()
    .match(/[a-z0-9]{2,}/g);
  for (const word of asciiWords ?? []) {
    keywords.add(word);
  }

  const importantPhrases = ["数字主权", "工作流", "方法论", "写作", "博客", "AI"];
  for (const phrase of importantPhrases) {
    if (body.includes(phrase) || title.includes(phrase) || excerpt.includes(phrase)) {
      keywords.add(phrase);
    }
  }

  return [...keywords].slice(0, 12);
}

function formatReadingTime(markdown) {
  const latinWords = (markdown.match(/[A-Za-z0-9]+/g) ?? []).length;
  const cjkCharacters = (markdown.match(/[\u3400-\u9fff]/g) ?? []).length;
  const score = latinWords + cjkCharacters;
  const minutes = Math.max(1, Math.ceil(score / 280));
  return `${minutes} min read`;
}

function slugify(value) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized) {
    return normalized;
  }

  return "";
}

function ensureUniqueSlug(initialSlug, existingSlugs, fallbackSeed) {
  const slugs = new Set(existingSlugs);
  const baseSlug = initialSlug || slugify(fallbackSeed) || `post-${shortHash(fallbackSeed)}`;
  if (!slugs.has(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (slugs.has(`${baseSlug}-${counter}`)) {
    counter += 1;
  }

  return `${baseSlug}-${counter}`;
}

function shortHash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 8);
}

function sortPosts(posts) {
  return [...posts].sort((left, right) => {
    const dateSort = right.date.localeCompare(left.date);
    if (dateSort !== 0) {
      return dateSort;
    }
    return left.title.localeCompare(right.title, "zh-CN");
  });
}

function groupPostsByYear(posts) {
  return posts.reduce((groups, post) => {
    const year = post.date.slice(0, 4);
    groups[year] ??= [];
    groups[year].push(post);
    return groups;
  }, {});
}

function groupPostsByMonth(posts) {
  return posts.reduce((groups, post) => {
    const monthIndex = Number(post.date.slice(5, 7)) - 1;
    groups[monthIndex] ??= [];
    groups[monthIndex].push(post);
    return groups;
  }, {});
}

function renderHeader() {
  return `<header class="site-header">
      <div class="site-header__inner">
        <a class="site-brand" href="/">fak111</a>
        <div class="site-header__actions">
          <button class="site-header__toggle" type="button" data-menu-toggle aria-expanded="false"
            aria-controls="site-nav" aria-label="Open Menu">
            <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
            <svg class="close-icon hidden" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke-width="1.8" stroke-linecap="round"></path>
            </svg>
            <span class="sr-only">Open Menu</span>
          </button>
          <nav class="site-nav" id="site-nav" data-site-nav>
            <a href="/post/">Posts</a>
            <a href="/about/">About</a>
            <a class="nav-icon" href="/search/" aria-label="Search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" stroke-width="1.8"></circle>
                <path d="M16 16l4.5 4.5" stroke-width="1.8" stroke-linecap="round"></path>
              </svg>
            </a>
            <a class="site-nav__muted" href="/talk/">Talk</a>
          </nav>
        </div>
      </div>
    </header>`;
}

function renderSocialLinks() {
  return `<a href="https://github.com/fak111" target="_blank" rel="noreferrer" aria-label="GitHub">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 1.8a10.2 10.2 0 0 0-3.22 19.88c.5.09.69-.21.69-.48v-1.9c-2.8.61-3.39-1.19-3.39-1.19-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .08 1.53 1.03 1.53 1.03.9 1.54 2.35 1.1 2.92.84.09-.66.35-1.11.64-1.37-2.24-.25-4.6-1.12-4.6-4.98 0-1.1.39-1.99 1.03-2.69-.11-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03a9.47 9.47 0 0 1 5 0c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.21 2.4.1 2.65.64.7 1.03 1.59 1.03 2.69 0 3.87-2.37 4.72-4.62 4.97.36.31.68.93.68 1.88v2.79c0 .27.18.58.7.48A10.2 10.2 0 0 0 12 1.8Z"
                  stroke="none" fill="currentColor"></path>
              </svg>
            </a>
            <a href="https://x.com/DerbZhuli0411" target="_blank" rel="noreferrer" aria-label="X">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 4l6.2 7.85L4.4 20h2.7l4.4-6.1L16.2 20H20l-6.5-8.27L18.9 4h-2.7l-3.98 5.51L7.8 4H4Z"
                  stroke="none" fill="currentColor"></path>
              </svg>
            </a>
            <a href="https://space.bilibili.com/1617153613/lists" target="_blank" rel="noreferrer"
              aria-label="Bilibili">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="6.5" width="17" height="11" rx="3" stroke-width="1.8"></rect>
                <path d="M9 10.4v3.2l2.8-1.6L9 10.4Z" stroke="none" fill="currentColor"></path>
                <path d="M8 4.6l2.2 2.2M16 4.6l-2.2 2.2" stroke-width="1.8" stroke-linecap="round"></path>
              </svg>
            </a>
            <a href="mailto:zhuliderb@gmail.com" aria-label="Email">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" stroke-width="1.8"></rect>
                <path d="M5.5 8l6.5 5 6.5-5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>
            </a>`;
}

function renderFooter({ message, links, allowHtmlMessage = false }) {
  const renderedMessage = allowHtmlMessage ? message : escapeHtml(message);
  const linkHtml = links
    .map((link) => {
      const attrs = link.external ? ` target="_blank" rel="noreferrer"` : "";
      return `<a href="${link.href}"${attrs}>${escapeHtml(link.label)}</a>`;
    })
    .join("\n        ");

  return `<footer class="site-footer">
      <p>${renderedMessage}</p>
      <div class="site-footer__links">
        ${linkHtml}
      </div>
      <p>© <span data-current-year></span> fak111.github.io</p>
    </footer>`;
}

function renderInline(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function indentBlock(value, spaces) {
  const padding = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${padding}${line}`)
    .join("\n");
}

function formatDisplayDate(date) {
  const [year, month, day] = date.split("-");
  return `${Number(day)} ${MONTH_NAMES_SHORT[Number(month) - 1]}, ${year}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}
