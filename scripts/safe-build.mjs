#!/usr/bin/env node
/**
 * safe-build.mjs — wrapper around `next build` that prevents the
 * "Cannot find module './948.js'" trap.
 *
 * Root cause: when `next dev` is running on a port AND `next build` runs
 * in the same `.next/` directory, dev's HMR cache points to old chunk
 * paths while prod's build emits new ones. Dev shows chunk 404s on every
 * page until restarted.
 *
 * Fix: this script detects whether a dev server is listening on the
 * common ports (3000, 3103) and, if so, refuses to build until the user
 * kills it. Also cleans .next/ before building (defense in depth).
 *
 * Usage:
 *   node scripts/safe-build.mjs           # uses default next build
 *   node scripts/safe-build.mjs --no-clear  # skip .next/ cleanup
 *
 * Exit codes:
 *   0 = build succeeded
 *   2 = dev conflict (refused to build, must kill dev first)
 *   other = next build failed
 */
import { spawn } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PORTS_TO_CHECK = [3000, 3103];
const NEXT_DIR = path.join(ROOT, ".next");

function isPortListening(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1500);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
    socket.once("error", () => { socket.destroy(); resolve(false); });
    socket.connect(port, "127.0.0.1");
  });
}

async function findLiveDev() {
  for (const port of PORTS_TO_CHECK) {
    if (await isPortListening(port)) {
      return port;
    }
  }
  return null;
}

const skipClear = process.argv.includes("--no-clear");

async function main() {
  const livePort = await findLiveDev();
  if (livePort !== null) {
    console.error(`\n❌ Refusing to build: a "next dev" server is listening on port ${livePort}.`);
    console.error(`\n   The dev server caches chunk paths in .next/ that build will overwrite.`);
    console.error(`   Running build while dev is live causes "Cannot find module './XXX.js'" 404s.`);
    console.error(`\n   Fix:`);
    console.error(`     1. Stop the dev server (Ctrl+C in its terminal, or Stop-Process -Id <pid> -Force)`);
    console.error(`     2. Run "node scripts/safe-build.mjs" again\n`);
    process.exit(2);
  }

  if (!skipClear && existsSync(NEXT_DIR)) {
    const age = (Date.now() - statSync(NEXT_DIR).mtimeMs) / 1000;
    console.log(`Cleaning .next/ (last modified ${age.toFixed(0)}s ago)`);
    rmSync(NEXT_DIR, { recursive: true, force: true });
  }

  console.log("Running: next build\n");
  // Cross-platform: npx on macOS/Linux, npx.cmd on Windows.
  // Vercel's build environment is Linux (no .cmd), local dev may be either.
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const child = spawn(npxCmd, ["next", "build"], {
    stdio: "inherit",
    shell: true,
    cwd: ROOT,
  });
  child.on("exit", (code) => process.exit(code ?? 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});