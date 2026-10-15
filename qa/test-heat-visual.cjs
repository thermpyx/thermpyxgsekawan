/* Run against the HTTP site on :8003. Verifies actual lab artwork, rather than
   passing a page that only retains its headings and controls. Remote services
   are never written. */
"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const {chromium} = require("playwright");
const root = path.resolve(__dirname,"..");
const baseline = require("./simulator-source-integrity.json");
const routes = ["simulator/heat-temperature.html","simulator/heat&temp/index.html"];
const digest = text => crypto.createHash("sha256").update(text).digest("hex");
for (const file of ["simulator/modules/heat-temperature/js/script.js","simulator/heat&temp/js/script.js"]) {
  assert.equal(digest(fs.readFileSync(path.join(root,file))),baseline.js[file],file+": physics, controls, particles, graph and heating loop unchanged");
}
for (const route of routes) {
  const source=fs.readFileSync(path.join(root,route),"utf8");
  assert.deepEqual((source.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi)||[]).map(digest),baseline.htmlScripts[route],route+": original script tags unchanged");
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--no-sandbox"]});
 const context=await browser.newContext();
 await context.addInitScript(()=>sessionStorage.setItem("thermpyx-tutorial-auto","off"));
 await context.route(/https:\/\/(fonts\.|www\.youtube|www\.youtube-nocookie|cdn\.jsdelivr)/,route=>route.abort());
 const page=await context.newPage(),errors=[],failedCss=[];
 page.on("pageerror",error=>errors.push(error.message));
 page.on("response",response=>{if(response.url().startsWith(process.env.TPX_TEST_URL||"http://localhost:8003/")&&/\.css(?:\?|$)/.test(response.url())&&response.status()>=400)failedCss.push(response.url());});
 let checks=0;
 try {
  for (const route of routes) for (const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:1400});
   await page.goto((process.env.TPX_TEST_URL||"http://localhost:8003/")+"app.html?page="+encodeURIComponent(route),{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof document.querySelector("iframe")?.contentWindow?.calculateTemperature==="function"&&document.querySelector("iframe")?.contentWindow?.TPX);
   const frame=page.frames().find(frame=>frame!==page.mainFrame());
   for (const theme of ["dark","light"]) for (const language of ["id","en"]) {
    await frame.evaluate(({theme,language})=>{
     localStorage.setItem("thermpyx-theme",theme);
     document.body.classList.toggle("light-mode",theme==="light");
     document.documentElement.dataset.theme=theme;
     TPX.setLanguage(language);
    },{theme,language});
    await page.waitForFunction(()=>!document.querySelector(".tpx-page-transition")||(getComputedStyle(document.querySelector(".tpx-page-transition")).visibility==="hidden"&&getComputedStyle(document.querySelector(".tpx-page-transition")).opacity==="0"));
    await frame.waitForFunction(()=>!document.querySelector(".tpx-page-transition")||(getComputedStyle(document.querySelector(".tpx-page-transition")).visibility==="hidden"&&getComputedStyle(document.querySelector(".tpx-page-transition")).opacity==="0"));
    for (const material of ["water","aluminum","iron","copper"]) {
     await frame.evaluate(material=>{
      const select=document.getElementById("material");select.value=material;select.dispatchEvent(new Event("change",{bubbles:true}));
      const heat=document.getElementById("q");heat.value="300000";heat.dispatchEvent(new Event("input",{bubbles:true}));
     },material);
     const expectedMaterial=language==="id"?{water:"Air",aluminum:"Aluminium",iron:"Besi",copper:"Tembaga"}[material]:{water:"Water",aluminum:"Aluminum",iron:"Iron",copper:"Copper"}[material];
     await frame.waitForFunction(name=>document.querySelector("#materialName").textContent===name,expectedMaterial);
     const result=await frame.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      const measured=Object.fromEntries(["#scene","#beaker","#liquid","#particles","#thermometer","#materialLabel",".heater-assembly",".heat-source-info","#heatSourceValue","#thermoRead"].map(selector=>[selector,rect(selector)]));
      return {isLight:document.body.classList.contains("light-mode"),rect:measured,liquidBackground:getComputedStyle(document.querySelector("#liquid")).backgroundImage,
       particles:document.querySelectorAll("#particles .particle").length,
       sourceOpacity:getComputedStyle(document.querySelector(".heat-source-info")).opacity,
       heatText:document.querySelector("#heatSourceValue").textContent,
       sourceLabel:document.querySelector(".heat-source-info > span").textContent,
       heatValueClip:document.querySelector("#heatSourceValue").scrollWidth-document.querySelector("#heatSourceValue").clientWidth,
       readoutClip:document.querySelector("#thermoRead").scrollWidth-document.querySelector("#thermoRead").clientWidth,
       bodyOverflow:document.documentElement.scrollWidth-innerWidth,
       sheets:[...document.styleSheets].filter(sheet=>sheet.href&&new URL(sheet.href).origin===location.origin).map(sheet=>({href:sheet.href,rules:sheet.cssRules.length})),
       temperature:state.temperature,expected:25+state.q/(state.m*state.c),
       glass:getComputedStyle(document.querySelector("#beaker")).borderLeftWidth,
       hotplate:getComputedStyle(document.querySelector(".fire")).backgroundImage,
       flameEmoji:document.querySelector(".fire").textContent.includes("🔥")};
     });
     const label=`${route}, ${width}px, ${theme}, ${language}, ${material}`;
     assert.equal(result.isLight,theme==="light",label+": chosen theme remains active");
     assert.ok(result.bodyOverflow<=1,label+": no horizontal overflow");
     const s=result.rect["#scene"],b=result.rect["#beaker"],t=result.rect["#thermometer"],ml=result.rect["#materialLabel"];
     assert.ok(b.width>=140&&b.height>=190,label+": substantial beaker artwork remains rendered");
     assert.ok(result.rect["#particles"].width>=110&&result.rect["#particles"].height>=120,label+": particles retain a visible liquid region");
     assert.equal(result.particles,40,label+": all particles initialized");
     assert.match(result.liquidBackground,/gradient/,label+": material retains filled glass artwork");
     assert.notEqual(result.glass,"0px",label+": glass vessel edge remains visible");
     assert.match(result.hotplate,/gradient/,label+": heater retains mechanical artwork");
     assert.equal(result.flameEmoji,false,label+": heater uses lab artwork");
     for (const selector of ["#beaker","#thermometer","#materialLabel",".heater-assembly",".heat-source-info","#heatSourceValue","#thermoRead"]) {
      const r=result.rect[selector];
      assert.ok(r.left>=s.left+6&&r.right<=s.right-6&&r.top>=s.top+6&&r.bottom<=s.bottom-6,label+": "+selector+" stays inside the scene with breathing room");
     }
     assert.ok(ml.bottom+12<=b.top,label+": material caption stays above the vessel");
     assert.ok(b.right+12<=t.left,label+": vessel does not overlap the thermometer");
     assert.ok(b.bottom+4<=result.rect[".heater-assembly"].top,label+": vessel and heater have separate silhouettes");
     assert.equal(result.sourceOpacity,"1",label+": heat labels remain readable independently of heater intensity");
     assert.equal(result.heatValueClip,0,label+": longest heat value remains fully visible");
     assert.ok(result.readoutClip<=1,label+": temperature value remains fully visible");
     assert.equal(result.heatText,"300,000 J",label+": heat readout updates");
     assert.equal(result.sourceLabel,language==="id"?"Kalor diberikan":"Heat supplied",label+": authored readout switches language");
     assert.ok(Math.abs(result.temperature-result.expected)<1e-8,label+": Q=mcΔT calculation preserved");
     assert.ok(result.sheets.some(sheet=>sheet.href.endsWith("/heat-apparatus.css")&&sheet.rules>40),label+": apparatus stylesheet is loaded and parsed");
     assert.ok(result.sheets.some(sheet=>/heat(?:%26|&)temp\/css\/style.css|modules\/heat-temperature\/css\/style.css/.test(sheet.href)&&sheet.rules>80),label+": base stylesheet is loaded and parsed");
     checks++;
    }
    if (route===routes[0]&&language==="id"&&[320,1440].includes(width)) {
     await frame.evaluate(()=>{const select=document.querySelector("#material");select.value="water";select.dispatchEvent(new Event("change",{bubbles:true}));});
     await frame.locator("#reset").click();
     await frame.waitForFunction(()=>document.querySelector("#materialName").textContent==="Air");
     const zero=await frame.evaluate(()=>({value:document.querySelector("#heatSourceValue").textContent,opacity:getComputedStyle(document.querySelector(".heat-source-info")).opacity}));
     assert.deepEqual(zero,{value:"0 J",opacity:"1"},"Unheated readout remains clear");
     await frame.evaluate(()=>scrollTo(0,0));
     await page.mouse.move(0,0);
     await frame.locator("#scene").screenshot({path:`/tmp/thermpyx-heat-${width}-${theme}.png`,animations:"disabled"});
    }
   }
  }
  // Mobile tooltip placement is tested on the real hover handlers. Its old
  // 190px cursor offset produced negative x positions and clipped text.
  await page.setViewportSize({width:320,height:1400});
  let heatFrame=page.frames().find(frame=>frame!==page.mainFrame());
  await heatFrame.evaluate(()=>scrollTo(0,0));
  await heatFrame.locator("#beaker").hover({position:{x:70,y:110}});
  const hover=await heatFrame.evaluate(()=>({scene:document.querySelector("#scene").getBoundingClientRect().toJSON(),tip:document.querySelector("#simulationTooltip").getBoundingClientRect().toJSON(),display:getComputedStyle(document.querySelector("#simulationTooltip")).display}));
  assert.equal(hover.display,"block","Original apparatus hover still shows its tooltip");
  assert.ok(hover.tip.left>=hover.scene.left+10&&hover.tip.right<=hover.scene.right-10&&hover.tip.top>=hover.scene.top+10&&hover.tip.bottom<=hover.scene.bottom-10,"Mobile tooltip remains contained with readable padding");
  await page.mouse.move(0,0);
  // A real run must still advance particles, temperature and graph data.
  const frame=page.frames().find(frame=>frame!==page.mainFrame());
  await frame.locator("#reset").click();
  const start=await frame.evaluate(()=>({q:state.q,temp:state.temperature,x:particleData[0].x}));
  await frame.locator("#start").click();
  await frame.waitForFunction(()=>state.q>=200&&state.graphData.length>=2);
  await frame.locator("#pause").click();
  const advanced=await frame.evaluate(()=>({q:state.q,temp:state.temperature,x:particleData[0].x,running:state.running,graph:state.graphData.length}));
  assert.ok(advanced.q>start.q&&advanced.temp>start.temp&&advanced.graph>=2,"Heat run updates energy, temperature and graph");
  assert.notEqual(advanced.x,start.x,"Particle animation still advances");
  assert.equal(advanced.running,false,"Pause control still stops heating");
  assert.deepEqual(failedCss,[],"All local simulator stylesheets load successfully");
  assert.deepEqual(errors,[],"No uncaught browser errors");
  console.log(`HEAT VISUAL: ${checks} route/viewport/theme/language/material checks passed; apparatus, captions, source integrity and live heating verified`);
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
