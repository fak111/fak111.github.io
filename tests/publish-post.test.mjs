import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const modulePath = resolve("/Users/zfc/code/fak111.github.io", "scripts/lib/publish-post.mjs");

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}`);
}

const sampleMarkdown = `# 缘由
AI时代，细节传授的价值在下降，而“知道什么工具能解决什么问题”变得更重要。

但平台型工具（如飞书、X）本质上限制了创作者：链接、分发、所有权都不在自己手里，长期看等于放弃数字主权。

# 特性
- 发布：我只需要 一行命令就可以把本地文档上传到网站，让我自由自在发布文章在我的设备上。
- 获取：方便人类/用ai的人轻松获取，也是一行命令。`;

test("creates a post record from markdown without front matter", async () => {
  const { createPostFromMarkdown } = await loadModule();

  const post = createPostFromMarkdown({
    sourcePath:
      "/Users/zfc/code/llm-wiki/raw/articles/I want to build a blog to express my ideas and track my growth..md",
    markdown: sampleMarkdown,
    publishedAt: "2026-04-17",
    existingSlugs: [],
  });

  assert.equal(post.title, "I want to build a blog to express my ideas and track my growth.");
  assert.equal(post.date, "2026-04-17");
  assert.equal(post.slug, "i-want-to-build-a-blog-to-express-my-ideas-and-track-my-growth");
  assert.equal(
    post.excerpt,
    "AI时代，细节传授的价值在下降，而“知道什么工具能解决什么问题”变得更重要。"
  );
  assert.match(post.readingTime, /^\d+ min read$/);
  assert.deepEqual(post.tags.slice(0, 3), ["AI", "博客", "数字主权"]);
  assert.equal(post.href, "/post/i-want-to-build-a-blog-to-express-my-ideas-and-track-my-growth/");
  assert.match(post.html, /<h2>缘由<\/h2>/);
  assert.match(post.html, /<ul>/);
});

test("deduplicates colliding slugs", async () => {
  const { createPostFromMarkdown } = await loadModule();

  const post = createPostFromMarkdown({
    sourcePath:
      "/Users/zfc/code/llm-wiki/raw/articles/I want to build a blog to express my ideas and track my growth..md",
    markdown: sampleMarkdown,
    publishedAt: "2026-04-17",
    existingSlugs: [
      "i-want-to-build-a-blog-to-express-my-ideas-and-track-my-growth",
      "i-want-to-build-a-blog-to-express-my-ideas-and-track-my-growth-2",
    ],
  });

  assert.equal(post.slug, "i-want-to-build-a-blog-to-express-my-ideas-and-track-my-growth-3");
});

test("renders the home page, posts archive, detail page, and posts module from one manifest", async () => {
  const {
    createPostFromMarkdown,
    renderHomePage,
    renderPostsIndexPage,
    renderPostDetailPage,
    renderPostsModule,
  } = await loadModule();

  const publishedPost = createPostFromMarkdown({
    sourcePath:
      "/Users/zfc/code/llm-wiki/raw/articles/I want to build a blog to express my ideas and track my growth..md",
    markdown: sampleMarkdown,
    publishedAt: "2026-04-17",
    existingSlugs: ["mcp-learning-journey"],
  });

  const existingPost = {
    slug: "mcp-learning-journey",
    href: "/post/mcp-learning-journey/",
    title: "四期视频后，我终于搞懂了 MCP",
    excerpt: "从概念模糊到真正理解 MCP 的位置。",
    date: "2026-04-16",
    readingTime: "6 min read",
    tags: ["MCP", "AI", "学习复盘"],
    keywords: ["mcp", "ai", "学习复盘"],
  };

  const posts = [publishedPost, existingPost];
  const homeHtml = renderHomePage(posts);
  const archiveHtml = renderPostsIndexPage(posts);
  const detailHtml = renderPostDetailPage(publishedPost);
  const postsModule = renderPostsModule(posts);

  assert.match(homeHtml, /I want to build a blog to express my ideas and track my growth\./);
  assert.ok(
    homeHtml.indexOf(publishedPost.title) < homeHtml.indexOf(existingPost.title),
    "newest post should appear first on the home page"
  );
  assert.match(archiveHtml, /2026/);
  assert.match(archiveHtml, /April/);
  assert.match(archiveHtml, new RegExp(publishedPost.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(detailHtml, /View on GitHub/);
  assert.match(detailHtml, /<a href="\/post\/">← Back to Posts<\/a>/);
  assert.match(postsModule, /export const POSTS = \[/);
  assert.match(postsModule, /"i-want-to-build-a-blog-to-express-my-ideas-and-track-my-growth"/);
});

test("refuses to mutate the repo when tracked site files are dirty", async () => {
  const { publishPost } = await loadModule();
  const repoRoot = createTempRepo();
  const sourcePath = writeTempMarkdown(repoRoot, "Dirty check.md", sampleMarkdown);
  const originalIndexHtml = readFileSync(join(repoRoot, "index.html"), "utf8");

  await assert.rejects(
    publishPost({
      sourcePath,
      repoRoot,
      waitForSite: false,
      exec: async (command, args) => {
        assert.equal(command, "git");
        assert.deepEqual(args, ["status", "--short"]);
        return { stdout: " M index.html\n" };
      },
    }),
    /working tree is dirty/
  );

  assert.equal(readFileSync(join(repoRoot, "index.html"), "utf8"), originalIndexHtml);
  assert.equal(existsSync(join(repoRoot, "post", "dirty-check", "index.html")), false);
});

test("publishes generated files, commits, pushes, and waits for the article URL", async () => {
  const { publishPost } = await loadModule();
  const repoRoot = createTempRepo();
  const sourcePath = writeTempMarkdown(repoRoot, "Launch sequence.md", sampleMarkdown);
  const gitCalls = [];
  const fetchCalls = [];

  const result = await publishPost({
    sourcePath,
    repoRoot,
    publishedAt: "2026-04-17",
    exec: async (command, args) => {
      gitCalls.push([command, ...args]);
      if (args[0] === "status") {
        return { stdout: "" };
      }
      return { stdout: "" };
    },
    fetchImpl: async (url) => {
      fetchCalls.push(url);
      return {
        ok: true,
        async text() {
          return "Launch sequence.";
        },
      };
    },
  });

  assert.equal(result.post.slug, "launch-sequence");
  assert.equal(result.articleUrl, "https://fak111.github.io/post/launch-sequence/");
  assert.match(readFileSync(join(repoRoot, "index.html"), "utf8"), /Launch sequence/);
  assert.match(readFileSync(join(repoRoot, "post/index.html"), "utf8"), /Launch sequence/);
  assert.match(readFileSync(join(repoRoot, "assets/posts.mjs"), "utf8"), /launch-sequence/);
  assert.equal(existsSync(join(repoRoot, "post", "launch-sequence", "index.html")), true);
  assert.deepEqual(gitCalls, [
    ["git", "status", "--short"],
    ["git", "add", "-A"],
    ["git", "commit", "-m", "feat: publish Launch sequence"],
    ["git", "push", "origin", "main"],
  ]);
  assert.deepEqual(fetchCalls, ["https://fak111.github.io/post/launch-sequence/"]);
});

test("keeps a newly published same-day post ahead of older same-day posts", async () => {
  const { createPostFromMarkdown, mergePostIntoManifest, renderHomePage } = await loadModule();

  const newPost = createPostFromMarkdown({
    sourcePath: "/tmp/Zen and publishing.md",
    markdown: sampleMarkdown,
    publishedAt: "2026-04-17",
    existingSlugs: ["alpha-existing"],
  });
  const existingPost = {
    slug: "alpha-existing",
    href: "/post/alpha-existing/",
    title: "Alpha existing",
    excerpt: "older post",
    date: "2026-04-17",
    readingTime: "1 min read",
    tags: ["旧文"],
    keywords: ["old"],
  };

  const mergedPosts = mergePostIntoManifest([existingPost], newPost);
  const homeHtml = renderHomePage(mergedPosts);

  assert.equal(mergedPosts[0].slug, newPost.slug);
  assert.ok(
    homeHtml.indexOf(newPost.title) < homeHtml.indexOf(existingPost.title),
    "new same-day post should stay ahead of older same-day post"
  );
});

test("resolves obsidian image embeds from ancestor folders and copies them into the site", async () => {
  const { createPostFromMarkdown, writeGeneratedSite } = await loadModule();
  const repoRoot = createTempRepo();
  const vaultRoot = mkdtempSync(join(tmpdir(), "fak111-vault-"));
  const articleDir = join(vaultRoot, "raw", "articles");
  mkdirSync(articleDir, { recursive: true });

  const imageOnePath = join(vaultRoot, "Pasted image 20260417181951.png");
  const imageTwoPath = join(vaultRoot, "Pasted image 20260417182424.png");
  writeFileSync(imageOnePath, "image-one", "utf8");
  writeFileSync(imageTwoPath, "image-two", "utf8");

  const sourcePath = join(articleDir, "how i work with codex to solve a CD problem.md");
  const markdown = `## 背景
第一段说明。
![[Pasted image 20260417181951.png]]
第二段说明。
![[Pasted image 20260417182424.png]]`;
  writeFileSync(sourcePath, markdown, "utf8");

  const post = createPostFromMarkdown({
    sourcePath,
    markdown,
    publishedAt: "2026-04-17",
    existingSlugs: [],
  });

  assert.equal(post.assets.length, 2);
  assert.equal(post.assets[0].sourcePath, imageOnePath);
  assert.equal(post.assets[0].outputPath, "images/posts/how-i-work-with-codex-to-solve-a-cd-problem/pasted-image-20260417181951.png");
  assert.match(post.html, /<figure class="article-image">/);
  assert.match(post.html, /src="\/images\/posts\/how-i-work-with-codex-to-solve-a-cd-problem\/pasted-image-20260417181951\.png"/);
  assert.match(post.html, /src="\/images\/posts\/how-i-work-with-codex-to-solve-a-cd-problem\/pasted-image-20260417182424\.png"/);

  writeGeneratedSite({ repoRoot, posts: [post], post });

  assert.equal(
    readFileSync(
      join(repoRoot, "images", "posts", "how-i-work-with-codex-to-solve-a-cd-problem", "pasted-image-20260417181951.png"),
      "utf8"
    ),
    "image-one"
  );
  assert.equal(
    readFileSync(
      join(repoRoot, "images", "posts", "how-i-work-with-codex-to-solve-a-cd-problem", "pasted-image-20260417182424.png"),
      "utf8"
    ),
    "image-two"
  );
});

test("preserves heading levels and ordered lists for article readability", async () => {
  const { createPostFromMarkdown } = await loadModule();

  const post = createPostFromMarkdown({
    sourcePath: "/tmp/readability.md",
    markdown: `## 问题背景
我先描述现象。

1. 第一条原因
2. 第二条原因
3. 第三条原因`,
    publishedAt: "2026-04-17",
    existingSlugs: [],
  });

  assert.match(post.html, /<h2>问题背景<\/h2>/);
  assert.doesNotMatch(post.html, /<h3>问题背景<\/h3>/);
  assert.match(post.html, /<ol>/);
  assert.match(post.html, /<li>第一条原因<\/li>/);
  assert.match(post.html, /<li>第二条原因<\/li>/);
  assert.match(post.html, /<li>第三条原因<\/li>/);
});

test("renders fenced code blocks with copy controls and normalized indentation", async () => {
  const { renderMarkdownToHtml } = await loadModule();

  const html = renderMarkdownToHtml(`\`\`\`
        执行规则：

          1. 先检查现有连接。
          2. 能复用就复用。
        \`\`\``);

  assert.match(html, /class="article-code-block"/);
  assert.match(html, /data-copy-code-button/);
  assert.match(html, /data-copy-code-source/);
  assert.match(
    html,
    /<code data-copy-code-source>执行规则：\n\n  1\. 先检查现有连接。\n  2\. 能复用就复用。<\/code>/
  );
  assert.doesNotMatch(html, /\n        执行规则：/);
});

test("removes accidental baseline indentation from mixed-indent prompt blocks", async () => {
  const { normalizeCodeFenceContent } = await loadModule();

  const normalized = normalizeCodeFenceContent([
    "你现在接管的是一个真实 Chrome 会话。",
    "",
    "          目标：继续使用当前浏览器会话。",
    "",
    "          1. 先检查现有连接。",
    "            2. 能复用就复用。",
  ]);

  assert.equal(
    normalized,
    [
      "你现在接管的是一个真实 Chrome 会话。",
      "",
      "目标：继续使用当前浏览器会话。",
      "",
      "1. 先检查现有连接。",
      "  2. 能复用就复用。",
    ].join("\n")
  );
});

test("renders post detail pages with copy buttons for each code block", async () => {
  const { createPostFromMarkdown, renderPostDetailPage } = await loadModule();

  const post = createPostFromMarkdown({
    sourcePath: "/tmp/code-ui.md",
    markdown: `## 命令
\`\`\`
post xxx.md
\`\`\`

\`\`\`
get 你喷飞书和 x 的那篇
\`\`\``,
    publishedAt: "2026-04-17",
    existingSlugs: [],
  });

  const detailHtml = renderPostDetailPage(post);
  const copyButtons = detailHtml.match(/data-copy-code-button/g) ?? [];

  assert.equal(copyButtons.length, 2);
});

test("reuses the canonical slug and removes duplicate entries when republishing the same title", async () => {
  const { createPostFromMarkdown, mergePostIntoManifest } = await loadModule();

  const existingPosts = [
    {
      slug: "how-i-work-with-codex-to-solve-a-cd-problem",
      href: "/post/how-i-work-with-codex-to-solve-a-cd-problem/",
      title: "how i work with codex to solve a CD problem",
      excerpt: "old excerpt",
      date: "2026-04-17",
      readingTime: "4 min read",
      tags: ["AI"],
      keywords: ["codex"],
    },
    {
      slug: "how-i-work-with-codex-to-solve-a-cd-problem-2",
      href: "/post/how-i-work-with-codex-to-solve-a-cd-problem-2/",
      title: "how i work with codex to solve a CD problem",
      excerpt: "duplicate excerpt",
      date: "2026-04-17",
      readingTime: "4 min read",
      tags: ["AI"],
      keywords: ["codex"],
    },
  ];

  const post = createPostFromMarkdown({
    sourcePath: "/tmp/how i work with codex to solve a CD problem.md",
    markdown: "## 问题背景\n这是一版更好的正文。",
    publishedAt: "2026-04-17",
    existingSlugs: existingPosts.map((item) => item.slug),
    existingPosts,
  });

  const mergedPosts = mergePostIntoManifest(existingPosts, post);

  assert.equal(post.slug, "how-i-work-with-codex-to-solve-a-cd-problem");
  assert.equal(mergedPosts.filter((item) => item.title === post.title).length, 1);
  assert.equal(mergedPosts[0].slug, "how-i-work-with-codex-to-solve-a-cd-problem");
});

function createTempRepo() {
  const repoRoot = mkdtempSync(join(tmpdir(), "fak111-publish-"));
  mkdirSync(join(repoRoot, "assets"), { recursive: true });
  mkdirSync(join(repoRoot, "post"), { recursive: true });

  writeFileSync(
    join(repoRoot, "assets/posts.mjs"),
    `export const POSTS = [
  {
    "slug": "mcp-learning-journey",
    "href": "/post/mcp-learning-journey/",
    "title": "四期视频后，我终于搞懂了 MCP",
    "excerpt": "从概念模糊到真正理解 MCP 的位置。",
    "date": "2026-04-16",
    "readingTime": "6 min read",
    "tags": ["MCP", "AI"],
    "keywords": ["mcp", "ai"]
  }
];
`,
    "utf8"
  );
  writeFileSync(join(repoRoot, "index.html"), "<html><body>original home</body></html>\n", "utf8");
  writeFileSync(join(repoRoot, "post/index.html"), "<html><body>original archive</body></html>\n", "utf8");

  return repoRoot;
}

function writeTempMarkdown(repoRoot, filename, markdown) {
  const sourcePath = join(repoRoot, filename);
  writeFileSync(sourcePath, markdown, "utf8");
  return sourcePath;
}
