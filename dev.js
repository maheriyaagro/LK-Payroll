/**
 * dev.js — Syncs source from G:\LK-Payroll to C:\Users\thesh\HajriBuild
 * and runs `next dev` from the NTFS mirror with live file watching.
 * Reason: G: is FAT32 which breaks readlink/symlinks that Next.js needs.
 */
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const SRC = __dirname;
const DEST = "C:\\Users\\thesh\\HajriBuild";

const CONFIG_FILES = [
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "eslint.config.mjs",
  "next-env.d.ts",
  ".npmrc",
  "package.json",
];

function syncAll() {
  console.log("Syncing source files to NTFS mirror...");
  const destSrc = path.join(DEST, "src");
  if (fs.existsSync(destSrc)) {
    fs.rmSync(destSrc, { recursive: true, force: true });
  }
  execSync(`xcopy /E /I /Y "${path.join(SRC, "src")}" "${destSrc}"`, { stdio: "ignore" });

  for (const f of CONFIG_FILES) {
    const s = path.join(SRC, f);
    if (fs.existsSync(s)) {
      try {
        fs.copyFileSync(s, path.join(DEST, f));
      } catch {}
    }
  }
  console.log("Initial sync complete.");
}

// Initial sync
syncAll();

// Start file watcher on src directory for live reload
const srcDir = path.join(SRC, "src");
if (fs.existsSync(srcDir)) {
  fs.watch(srcDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const srcFile = path.join(srcDir, filename);
    const destFile = path.join(DEST, "src", filename);
    try {
      if (fs.existsSync(srcFile)) {
        const dir = path.dirname(destFile);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(srcFile, destFile);
      } else if (fs.existsSync(destFile)) {
        fs.unlinkSync(destFile);
      }
    } catch (err) {
      // Ignore transient file lock errors during rapid typing
    }
  });
  console.log("Live file watcher active: changes in G:\\LK-Payroll\\src will sync automatically.");
}

// Start Next.js dev server from NTFS mirror
console.log("Starting Next.js development server...");
const nextDev = spawn("node", ["node_modules/next/dist/bin/next", "dev"], {
  cwd: DEST,
  stdio: "inherit",
  shell: true,
});

nextDev.on("close", (code) => {
  process.exit(code || 0);
});

process.on("SIGINT", () => {
  nextDev.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  nextDev.kill("SIGTERM");
  process.exit(0);
});
