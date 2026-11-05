// Never inherit application configuration or invoke Next's environment loader.
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
const env = {};
for (const key of ["SystemRoot", "WINDIR", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "COMSPEC", "PATHEXT"]) {
  if (process.env[key]) env[key] = process.env[key];
}
env.PATH = `${dirname(process.execPath)};${env.SystemRoot}\\System32;${env.SystemRoot}`;
// Node's deferred package-type warning otherwise reaches tests that deliberately
// intercept console.error as JSON diagnostics. No application warning is hidden.
env.NODE_OPTIONS = `--disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import="${new URL("./offline-network.mjs", import.meta.url).href}"`;
const result = spawnSync(process.execPath, process.argv.slice(2), { env, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
