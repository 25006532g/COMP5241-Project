import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {dirname,join} from "node:path";
import ts from "typescript";
const require=createRequire(import.meta.url);
export const sources=Object.fromEntries([
  ["react","react","react.development.js"],["react/jsx-runtime","react","react-jsx-runtime.development.js"],
  ["react-dom","react-dom","react-dom.development.js"],["react-dom/client","react-dom","react-dom-client.development.js"],["scheduler","scheduler","scheduler.development.js"],
].map(([name,pkg,file])=>[name,readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)),"cjs",file),"utf8")]));
for(const [name,path] of [
  ["editor","src/components/presentation-editor.tsx"],["./presentation-canvas","src/components/presentation-canvas.tsx"],["./presentation-view","src/components/presentation-view.tsx"],
  ["@/lib/presentation","src/lib/presentation.ts"],["@/lib/presentation-fabric","src/lib/presentation-fabric.ts"],["@/lib/presentation-export","src/lib/presentation-export.ts"],
])sources[name]=ts.transpileModule(readFileSync(path,"utf8"),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
function bundle(path){
  if(sources[path])return path;sources[path]="loading";const local=createRequire(path);
  sources[path]=readFileSync(path,"utf8").replace(/require\(["']([^"']+)["']\)/g,(_,name)=>`require(${JSON.stringify(bundle(local.resolve(name)))})`);return path;
}
sources.zod=`module.exports=require(${JSON.stringify(bundle(require.resolve("zod")))});`;
export async function mountPresentation(page,props={}){
  const preflight=readFileSync(join(dirname(require.resolve("tailwindcss/package.json")),"preflight.css"),"utf8");
  const css=`@layer base {${preflight}}\n${readFileSync("src/app/globals.css","utf8").replace('@import "tailwindcss";',"")}`;
  // Fulfilled in memory, not a server/network connection; HTTPS gives real
  // secure-context randomUUID and browser export APIs.
  await page.route("https://forge.test/",route=>route.fulfill({contentType:"text/html",body:"<div></div>"}));
  await page.goto("https://forge.test/");
  // Match LearnerShell's controlling blocks, including the reserved 242px rail
  // and sticky topbar. Do not measure a fictitious full-viewport editor.
  await page.setContent(`<style>${css}</style>
    <div class="portal-shell">
      <aside class="portal-sidebar"><a class="portal-brand" href="/studio">FORGE / Learning studio</a>
        <nav class="portal-nav"><a href="/learn">My learning</a><a href="/catalog">Explore lessons</a><a href="/studio" class="active">Lesson studio</a></nav>
      </aside>
      <div class="portal-workspace">
        <header class="portal-topbar"><button class="portal-menu" type="button" aria-label="Open navigation">Menu</button><a class="catalog-shortcut" href="/catalog">Explore lessons</a><span class="portal-avatar">QA</span></header>
        <main class="portal-page studio-editor presentation-studio">
          <header class="portal-heading"><div><span class="eyebrow">LESSON STUDIO</span><h1>Write a lesson.</h1></div></header>
          <div id="root"></div>
        </main>
      </div>
    </div>`);
  await page.addScriptTag({path:join(process.cwd(),"node_modules/fabric/dist/index.min.js")});
  await page.addScriptTag({path:join(process.cwd(),"node_modules/pptxgenjs/dist/pptxgen.bundle.js")});
  await page.evaluate(({sources,props})=>{
    const OriginalCanvas=fabric.Canvas;
    fabric.Canvas=class extends OriginalCanvas {constructor(...args){super(...args);window.editCanvas=this;}};
    const modules={};
    function load(name){
      if(name==="./presentation")return load("@/lib/presentation");
      if(name==="fabric")return fabric;
      if(name==="pptxgenjs")return {__esModule:true,default:PptxGenJS};
      if(name==="next/navigation")return {useRouter:()=>({refresh(){window.refreshes=(window.refreshes??0)+1;}})};
      if(name==="@/app/learning/actions")return new Proxy({},{get:(_,name)=>(previous,form)=>persist(name,[...form.entries()])});
      if(name==="@/app/presentation/actions")return {
        beginPresentationDraft:lesson=>images("begin",lesson),
        uploadPresentationImage:async form=>images("upload",{draftId:form.get("draftId"),size:form.get("image").size}),
        discardPresentationDraft:id=>images("discard",id),cleanExpiredPresentationUploads:()=>images("clean"),
      };
      if(!modules[name]){if(!sources[name])throw new Error(`Unexpected browser dependency ${name}`);const mod={exports:{}};modules[name]=mod;new Function("require","module","exports","process",sources[name])(load,mod,mod.exports,{env:{NODE_ENV:"development"}});}
      return modules[name].exports;
    }
    window.presentationModules=load;
    window.presentationRoot=load("react-dom/client").createRoot(document.getElementById("root"));
    presentationRoot.render(load("react").createElement(load("editor").PresentationLessonEditor,props));
  },{sources,props});
  try{await page.waitForFunction(()=>window.editCanvas,{},{timeout:10000});}
  catch(error){throw new Error(`${error.message}; mounted text: ${await page.locator("body").innerText()}`);}
}
