// Local verification only: Next must never auto-load this repository's .env files.
import { cp, mkdtemp, rm, symlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const isolated = await mkdtemp(join(tmpdir(), "forge-interview-build-"));
const env = { NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "production" };
for (const name of ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "ComSpec", "PATHEXT"]) {
  if (process.env[name]) env[name] = process.env[name];
}
try {
  for (const name of ["src", "package.json", "package-lock.json", "tsconfig.json", "next-env.d.ts", "next.config.ts", "postcss.config.mjs"]) {
    await cp(join(root, name), join(isolated, name), {
      recursive: true, filter: path => !basename(path).startsWith(".env"),
    });
  }
  await symlink(resolve(root, "node_modules"), join(isolated, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  console.log("Isolated verification: no env files copied; child environment allowlisted; no connected checks.");
  for (const [tool, args] of [
    ["next/dist/bin/next", ["typegen"]],
    ["typescript/bin/tsc", ["--noEmit", "--incremental", "false"]],
    ["next/dist/bin/next", ["build", "--webpack"]],
  ]) {
    console.log(`node ${tool} ${args.join(" ")}`);
    const result = spawnSync(process.execPath, [join(isolated, "node_modules", tool), ...args], {
      cwd: isolated, env, stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
  }
} finally {
  await rm(isolated, { recursive: true, force: true });
}
