import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { chromium } from "@playwright/test";
import JSZip from "jszip";

const require = createRequire(import.meta.url);
export const reactSources = Object.fromEntries([
  ["react","react","react.development.js"],["react/jsx-runtime","react","react-jsx-runtime.development.js"],
  ["react-dom","react-dom","react-dom.development.js"],["react-dom/client","react-dom","react-dom-client.development.js"],
  ["scheduler","scheduler","scheduler.development.js"],
].map(([name,pkg,file]) => [name,readFileSync(join(dirname(require.resolve(`${pkg}/package.json`)),"cjs",file),"utf8")]));

test("Fabric 6 + React 19: native textbox composition and browser native PPTX text/shape/image", async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({offline:true,serviceWorkers:"block"});
  const errors = [], requests = [];
  await context.route("**/*",route => {requests.push(route.request().url()); return route.abort();});
  const page = await context.newPage();
  page.on("pageerror",error => errors.push(error.message));
  try {
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({path:join(process.cwd(),"node_modules/fabric/dist/index.min.js")});
    await page.addScriptTag({path:join(process.cwd(),"node_modules/pptxgenjs/dist/pptxgen.bundle.js")});
    await page.evaluate(sources => {
      const modules = {};
      function load(name) {
        if (!modules[name]) {
          const mod = {exports:{}}; modules[name] = mod;
          new Function("require","module","exports","process",sources[name])(load,mod,mod.exports,{env:{NODE_ENV:"development"}});
        }
        return modules[name].exports;
      }
      const React = load("react");
      function Gate() {
        const ref = React.useRef(null);
        React.useEffect(() => {
          const canvas = new fabric.Canvas(ref.current,{width:960,height:540});
          const text = new fabric.Textbox("Edit me",{left:40,top:40,width:400,fontSize:32});
          canvas.add(text); canvas.setActiveObject(text);
          window.gate = {canvas,text};
          return () => {void canvas.dispose();};
        },[]);
        return React.createElement("canvas",{ref});
      }
      load("react-dom/client").createRoot(document.getElementById("root")).render(React.createElement(Gate));
    },reactSources);
    await page.waitForFunction(() => window.gate);
    await page.evaluate(() => {gate.text.enterEditing(); gate.text.selectAll();});
    // Chromium's IME protocol commits composition through Fabric's real hidden textarea.
    const cdp = await context.newCDPSession(page);
    await cdp.send("Input.imeSetComposition",{text:"中文",selectionStart:2,selectionEnd:2});
    await cdp.send("Input.insertText",{text:"中文"});
    await page.keyboard.type(" text");
    const data = await page.evaluate(async () => {
      const {canvas,text} = gate;
      text.exitEditing();
      if(text.text !== "中文 text") throw new Error(`IME commit mismatch: ${text.text}`);
      text.selectionStart=0; text.selectionEnd=2;
      text.setSelectionStyles({fontWeight:"bold",fill:"#cc0000"},0,2);
      canvas.add(new fabric.Rect({left:30,top:200,width:160,height:80,fill:"#00ff00"}));
      const imageCanvas=document.createElement("canvas"); imageCanvas.width=2;imageCanvas.height=2;
      imageCanvas.getContext("2d").fillRect(0,0,2,2);
      const image=imageCanvas.toDataURL("image/png");
      canvas.add(await fabric.FabricImage.fromURL(image));
      const pptx = new PptxGenJS(); pptx.layout="LAYOUT_WIDE";
      const slide=pptx.addSlide();
      slide.addText([{text:"中文",options:{bold:true,color:"CC0000"}},{text:" text"}],{x:.55,y:.55,w:5.55,h:1,fontSize:32});
      slide.addShape(pptx.ShapeType.rect,{x:.4,y:2.7,w:2.2,h:1.1,fill:{color:"00FF00"}});
      slide.addImage({data:image,x:8,y:4,w:1,h:1});
      return {base64:await pptx.write({outputType:"base64"}),text:text.text,objects:canvas.getObjects().length};
    });
    const zip = await JSZip.loadAsync(data.base64,{base64:true});
    const xml = await zip.file("ppt/slides/slide1.xml").async("string");
    assert.match(xml,/<a:t>中文<\/a:t>/);
    assert.match(xml,/<a:rPr[^>]*b="1"/);
    assert.match(xml,/<a:prstGeom prst="rect"/);
    assert.match(xml,/<p:pic>/);
    assert.equal(Object.keys(zip.files).filter(n=>/^ppt\/media\/.+png$/.test(n)).length,1);
    assert.equal(data.objects,3);
    assert.deepEqual(errors,[]); assert.deepEqual(requests,[]);
    console.log("Compatibility evidence: React19 mounted Fabric6.7.1, Chromium IME 中文 text, native editable OOXML text/rect + embedded PNG; zero requests.");
  } finally {await context.close();await browser.close();}
});
