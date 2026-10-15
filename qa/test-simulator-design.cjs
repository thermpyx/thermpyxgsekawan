/* Run with the site on :8003; checks presentation and the preserved simulator sources. */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {chromium} = require("playwright");
const root = path.resolve(__dirname,"..");
const baseline = require("./simulator-source-integrity.json");
const uploaded = require("./simulator-uploaded-source-integrity.json");
const hash = source => crypto.createHash("sha256").update(source).digest("hex");
assert.deepEqual(Object.keys(baseline.authorizedExceptions || {}),["simulator/js hkm 1/script.js"],"Only the user-approved Hukum I control fix may differ from the uploaded scripts");
for (const [file,original] of Object.entries(uploaded.js)) {
  if (baseline.authorizedExceptions[file]) assert.notEqual(baseline.js[file],original,`${file}: approved control fix is explicitly recorded`);
  else assert.equal(baseline.js[file],original,`${file}: no other source integrity baseline was changed`);
}
assert.deepEqual(baseline.htmlScripts,uploaded.htmlScripts,"Original script loading and inline logic remain unchanged");
for (const [file,expected] of Object.entries(baseline.js)) {
  assert.equal(hash(fs.readFileSync(path.join(root,file))),expected,`${file}: original simulator behavior is preserved`);
}
for (const [file,expected] of Object.entries(baseline.htmlScripts)) {
  const scripts = fs.readFileSync(path.join(root,file),"utf8").match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) || [];
  assert.deepEqual(scripts.map(hash),expected,`${file}: simulator script loading and inline logic are preserved`);
}
console.log("PASS Simulator source integrity: only the user-authorized Hukum I control fix differs from the uploaded scripts");

(async()=>{
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--no-sandbox"]});
 const base = process.env.TPX_TEST_URL || "http://localhost:8003/";
 const routes = Object.keys(baseline.htmlScripts);
 const context = await browser.newContext();
 await context.addInitScript(()=>sessionStorage.setItem("thermpyx-tutorial-auto","off"));
 await context.route(/https:\/\/(fonts\.|www\.youtube|www\.youtube-nocookie|cdn\.jsdelivr)/,route=>route.abort());
 const page = await context.newPage(), errors = [];
 page.on("pageerror",error=>errors.push(error.message));
 let checks = 0;
 try {
  for (const width of [320,390,1440]) {
   await page.setViewportSize({width,height:900});
   for (const theme of ["dark","light"]) {
    for (const route of routes) {
     await page.goto(base+"app.html?page="+encodeURIComponent(route),{waitUntil:"domcontentloaded"});
     await page.waitForFunction(()=>document.querySelector("iframe")?.contentWindow?.TPX);
     const frame = page.frames().find(frame=>frame!==page.mainFrame());
     await frame.evaluate(({theme,width})=>{
       TPX.setLanguage(width===320?"id":"en");
       if(typeof setTheme==="function")setTheme(theme);
       else {localStorage.setItem("thermpyx-theme",theme);document.body.classList.toggle("light-mode",theme==="light");}
     },{theme,width});
     await frame.waitForFunction(language=>TPX.getLanguage()===language&&document.querySelector(".sim-learning-link")?.textContent===(language==="id"?"Alur Belajar":"Learning Path"),width===320?"id":"en");
     const result = await frame.evaluate(()=>{
       const textNodes = [...document.querySelectorAll("main *,header *")].filter(node=>
         node.getBoundingClientRect().width && [...node.childNodes].some(child=>child.nodeType===3&&child.textContent.trim()));
       return {
         overflow:document.documentElement.scrollWidth-innerWidth,
         bodyFont:getComputedStyle(document.body).fontFamily,
         foreignFonts:textNodes.filter(node=>/Inter|Space Grotesk|Times New Roman|Arial/.test(getComputedStyle(node).fontFamily))
           .map(node=>node.tagName+"."+node.className+"#"+node.id),
         clippedControls:[...document.querySelectorAll("main button,main input,main select,main h1,main h2,main h3,header button,header a")]
           .filter(node=>{const rect=node.getBoundingClientRect();return rect.width>0&&(rect.left< -1||rect.right>innerWidth+1)&&getComputedStyle(node).visibility!=="hidden";})
           .map(node=>node.tagName+"."+node.className+"#"+node.id),
         surfaces:[...document.querySelectorAll(".simulation-panel,.control-panel,.data-panel,.card,.panel")]
           .filter(node=>node.getBoundingClientRect().width)
           .map(node=>getComputedStyle(node).backgroundColor)
       };
     });
     const label = `${route}, ${width}px, ${theme}`;
     assert.ok(result.overflow<=1,`${label}: no horizontal document overflow (${result.overflow}px)`);
     assert.match(result.bodyFont,/IBM Plex Sans/,`${label}: shared body font`);
     assert.deepEqual(result.foreignFonts,[],`${label}: all visible simulator text uses THERMPYX fonts`);
     assert.deepEqual(result.clippedControls,[],`${label}: no headings or controls are clipped outside the screen`);
     const learningLink=frame.locator("a.sim-learning-link");
     assert.equal(await learningLink.count(),1,`${label}: one visible return to the learning path`);
     assert.equal(await learningLink.textContent(),width===320?"Alur Belajar":"Learning Path",`${label}: learning link follows the chosen language`);
     if (route==="simulator/heat-temperature.html") {
      assert.equal(await frame.evaluate(()=>{
        const badge=document.querySelector(".hero .badge").getBoundingClientRect();
        const title=document.querySelector(".hero h1").getBoundingClientRect();
        const intro=document.querySelector(".hero > p").getBoundingClientRect();
        return title.top>=badge.bottom&&intro.top>=title.bottom;
      }),true,`${label}: heat title and description follow the badge vertically`);
     }
     checks++;
    }
   }
  }
  // The four process targets still obey the original first-law conventions.
  await page.goto(base+"app.html?page=simulator/hkm1.html");
  await page.waitForFunction(()=>typeof document.querySelector("iframe")?.contentWindow?.calculateTarget==="function");
  const frame=page.frames().find(frame=>frame!==page.mainFrame());
  const targets=await frame.evaluate(()=>{
    return ["isobaric","isochoric","isothermal","adiabatic"].map(value=>{
      const select=document.getElementById("processSelect");select.value=value;select.dispatchEvent(new Event("change",{bubbles:true}));
      const input=document.getElementById("heatInput");input.value="300";input.dispatchEvent(new Event("input",{bubbles:true}));
      calculateTarget();return {process:value,initial:{...initial},target:{...target}};
    });
  });
  for(const {process,initial,target} of targets){
    assert.ok(Math.abs(target.U-(target.Q-target.W))<1e-7,`${process}: ΔU = Q − W`);
    if(process==="isobaric"){assert.equal(target.P,initial.P);assert.equal(target.Q,300);assert.ok(target.W>0&&target.U>0);}
    if(process==="isochoric"){assert.equal(target.V,initial.V);assert.equal(target.Q,300);assert.equal(target.W,0);assert.equal(target.U,300);}
    if(process==="isothermal")assert.equal(target.T,initial.T);
    if(process==="adiabatic")assert.equal(target.Q,0);
  }
  assert.deepEqual(errors,[],"No uncaught browser errors");
  console.log(`SIMULATOR DESIGN: ${checks} page/viewport/theme checks and all four first-law process invariants passed`);
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
