/**
 * build.js
 * Universal build script:
 * - On Vercel, CI, Linux, or environments without local NTFS mirror: runs standard `next build` directly.
 * - On local Windows with FAT32: syncs source to C:\Users\thesh\HajriBuild to bypass FAT32 symlink limitations.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SRC = __dirname;
const DEST = "C:\\Users\\thesh\\HajriBuild";

// If in Vercel, CI, non-Windows, or destination mirror doesn't exist, run standard next build directly
if (process.env.VERCEL || process.env.CI || process.platform !== "win32" || !fs.existsSync(DEST)) {
  console.log("> Running standard next build...");
  execSync("next build", { stdio: "inherit", cwd: SRC });
  process.exit(0);
}

// Local Windows FAT32 mirror build
const FILES = [
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "next-env.d.ts",
  ".npmrc",
  "package.json",
];

function run(cmd, opts = {}) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

// Clean destination src first
const destSrc = path.join(DEST, "src");
if (fs.existsSync(destSrc)) {
  fs.rmSync(destSrc, { recursive: true, force: true });
}

// Sync source files
run(`xcopy /E /I /Y "${path.join(SRC, "src")}" "${destSrc}"`);
for (const f of FILES) {
  const src = path.join(SRC, f);
  try {
    fs.accessSync(src);
    run(`copy /Y "${src}" "${DEST}\\"`);
  } catch { /* skip missing */ }
}

// Build from NTFS mirror
run(`node node_modules/next/dist/bin/next build`, { cwd: DEST });
