import { cp, mkdtemp, symlink, unlink, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../",import.meta.url));
const snapshot = await mkdtemp(join(tmpdir(),"forge-slide-build-"));
let linked = false;
try {
  for (const name of ["src","package.json","package-lock.json","tsconfig.json","next-env.d.ts","next.config.ts","postcss.config.mjs","eslint.config.mjs"]) {
    await cp(join(root,name),join(snapshot,name),{recursive:true,filter:path=>!/^\.env/i.test(path.split(/[/\\]/).at(-1))});
  }
  if ((await readdir(snapshot)).some(name=>name.startsWith(".env"))) throw new Error("Snapshot is not environment-file-free");
  await symlink(join(root,"node_modules"),join(snapshot,"node_modules"),"junction"); linked = true;
  const os = {};
  for (const key of ["SystemRoot","WINDIR","TEMP","TMP","USERPROFILE","LOCALAPPDATA","APPDATA","COMSPEC","PATHEXT"]) if(process.env[key]) os[key]=process.env[key];
  const env = {
    ...os, PATH:`${dirname(process.execPath)};${os.SystemRoot}\\System32;${os.SystemRoot}`, NEXT_TELEMETRY_DISABLED:"1", CI:"1",
    NODE_OPTIONS:`--disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import="${new URL("./offline-build-guard.mjs",import.meta.url).href}"`,
  };
  for (const args of [
    [join(root,"node_modules","next","dist","bin","next"),"typegen"],
    [join(root,"node_modules","typescript","bin","tsc"),"--noEmit","--incremental","false"],
    [join(root,"node_modules","next","dist","bin","next"),"build","--webpack"],
  ]) {
    console.log("Isolated command:",args.slice(1).join(" "));
    const result = spawnSync(process.execPath,args,{cwd:snapshot,env,stdio:"inherit"});
    if(result.error) throw result.error;
    if(result.status !== 0){process.exitCode = result.status ?? 1;break;}
  }
} finally {
  if(linked) await unlink(join(snapshot,"node_modules"));
  await rm(snapshot,{recursive:true,force:true});
  console.log("Removed owned build snapshot and dependency junction:",snapshot);
}
