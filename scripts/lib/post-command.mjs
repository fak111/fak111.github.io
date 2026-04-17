import { resolve } from "node:path";

export async function runPostCommand({ argv, cwd, publish }) {
  if (!Array.isArray(argv) || argv.length === 0 || !argv[0]) {
    throw new Error("Usage: post <markdown-file>");
  }

  if (typeof publish !== "function") {
    throw new Error("publish function is required");
  }

  const sourcePath = resolve(cwd, argv[0]);
  return publish({ sourcePath });
}
