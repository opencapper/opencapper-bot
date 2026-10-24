/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "tsup";

const __dirname = dirname(fileURLToPath(import.meta.url));

// discordx registers handlers by import side effect, so a file missing from src/bot/index.ts silently never runs.
function checkBotImports() {
  const botDir = join(__dirname, "src/bot");

  const getFiles = (dir: string): string[] =>
    readdirSync(dir).flatMap((e) => {
      const p = join(dir, e);
      if (statSync(p).isDirectory()) return getFiles(p);
      return e.endsWith(".ts") && e !== "index.ts"
        ? [`./${relative(botDir, p).replace(/\.ts$/, "")}`]
        : [];
    });

  const expected = getFiles(join(botDir, "commands"));

  const actual: string[] = [];
  for (const line of readFileSync(join(botDir, "index.ts"), "utf-8").split(
    "\n",
  )) {
    const match = line.match(/^import\s+["']([^"']+)["']/)?.[1];
    if (match) actual.push(match);
  }

  const missing = expected.filter((i) => !actual.includes(i));
  const extra = actual.filter((i) => !expected.includes(i));

  if (missing.length || extra.length) {
    if (missing.length) console.error("Missing:", missing.join(", "));
    if (extra.length) console.error("Stale:", extra.join(", "));
    throw new Error("Bot imports check failed");
  }
  console.log("Bot imports verified.");
}

checkBotImports();

export default defineConfig({
  entry: ["src/main.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  splitting: false,
});
