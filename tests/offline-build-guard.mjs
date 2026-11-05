import "./offline-network.mjs";
import Module from "node:module";
// The build runs only in an allowlisted snapshot. Never run Next's real dotenv
// loader, even if a future version starts searching outside its project root.
const original = Module._load;
const env = {
  initialEnv: process.env, loadEnvConfig: () => ({ combinedEnv:process.env,parsedEnv:{},loadedEnvFiles:[] }),
  updateInitialEnv() {}, resetEnv() {}, processEnv: () => [process.env,{}],
};
Module._load = function(name,...args) {
  if (name === "@next/env" || /[/\\]@next[/\\]env[/\\]/.test(name)) return env;
  return original.call(this,name,...args);
};
