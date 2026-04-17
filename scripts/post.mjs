#!/usr/bin/env node

import { publishPost } from "./lib/publish-post.mjs";
import { runPostCommand } from "./lib/post-command.mjs";

async function main() {
  const result = await runPostCommand({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    publish: ({ sourcePath }) => publishPost({ sourcePath }),
  });

  process.stdout.write(`Published "${result.post.title}"\n${result.articleUrl}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
