import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";

const modulePath = resolve("/Users/zfc/code/fak111.github.io", "scripts/lib/post-command.mjs");

async function loadModule() {
  return import(`${modulePath}?t=${Date.now()}`);
}

test("requires a markdown path argument", async () => {
  const { runPostCommand } = await loadModule();

  await assert.rejects(
    runPostCommand({
      argv: [],
      cwd: "/tmp",
      publish: async () => {
        throw new Error("should not publish");
      },
    }),
    /Usage: post <markdown-file>/
  );
});

test("resolves the source path from the current working directory before publishing", async () => {
  const { runPostCommand } = await loadModule();
  const calls = [];

  const result = await runPostCommand({
    argv: ["notes/new-idea.md"],
    cwd: "/Users/zfc/Desktop",
    publish: async (options) => {
      calls.push(options);
      return {
        articleUrl: "https://fak111.github.io/post/new-idea/",
        post: {
          title: "new-idea",
        },
      };
    },
  });

  assert.equal(result.articleUrl, "https://fak111.github.io/post/new-idea/");
  assert.deepEqual(calls, [
    {
      sourcePath: "/Users/zfc/Desktop/notes/new-idea.md",
    },
  ]);
});
