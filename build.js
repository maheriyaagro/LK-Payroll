/**
 * build.js — Syncs source from G:\LK-Payroll to C:\Users\thesh\HajriBuild
 * and runs `next build` from the NTFS mirror.
 * Reason: G: is FAT32 which breaks readlink/symlinks that Next.js needs.
 */
const { execSync } = require("child_process");
const path = require("path");

const SRC = __dirname;
const DEST = "C:\\Users\\thesh\\HajriBuild";

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

// Clean destination src first so deleted/moved files don't remain as orphans
const destSrc = path.join(DEST, "src");
if (require("fs").existsSync(destSrc)) {
  require("fs").rmSync(destSrc, { recursive: true, force: true });
}

// Sync source files
run(`xcopy /E /I /Y "${path.join(SRC, "src")}" "${destSrc}"`);
for (const f of FILES) {
  const src = path.join(SRC, f);
  try {
    require("fs").accessSync(src);
    run(`copy /Y "${src}" "${DEST}\\"`);
  } catch { /* skip missing */ }
}

// Build from NTFS
run(`node node_modules/next/dist/bin/next build`, { cwd: DEST });
