/* Browser integration: TPX_TEST_URL=http://localhost:8003/ node qa/test-simulator-history.cjs */
"use strict";
const assert=require("node:assert/strict"),{chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--no-sandbox"]});
 const context=await browser.newContext(),page=await context.newPage(),base=process.env.TPX_TEST_URL||"http://localhost:8003/",errors=[];
 await context.addInitScript(()=>sessionStorage.setItem("thermpyx-tutorial-auto","off"));
 page.on("pageerror",error=>errors.push(error.message));
 await context.route(/https:\/\/(fonts\.|www\.youtube|www\.youtube-nocookie|cdn\.jsdelivr)/,route=>route.abort());
 async function navigate(route){
  await page.evaluate(route=>window.TPXPersistentShell.navigate(new URL(route,window.TPXPersistentShell.baseURL).href),route);
  await page.waitForFunction(route=>{const child=document.querySelector("iframe")?.contentWindow;return child?.location.pathname.endsWith(route)&&child?.TPXHistory;},route);
  return page.frames().find(frame=>frame!==page.mainFrame());
 }
 const history=()=>page.evaluate(()=>window.TPXHistory.list());
 async function setInput(frame,id,value){await frame.evaluate(({id,value})=>{const input=document.getElementById(id);input.value=String(value);input.dispatchEvent(new Event("input",{bubbles:true}));},{id,value});}
 async function heatRun(frame,mass){
  await frame.locator("#reset").click();await setInput(frame,"m",mass);await setInput(frame,"q",299000);
  await frame.locator("#start").click();await frame.waitForFunction(()=>!state.running&&state.q===300000,{},{timeout:10000});
 }
 try{
  await page.goto(base+"app.html?page=simulator/heat-temperature.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.TPXHistory&&document.querySelector("iframe")?.contentWindow.TPXHistory);
  let frame=page.frames().find(frame=>frame!==page.mainFrame());await frame.waitForFunction(()=>document.getElementById("start")&&typeof startHeating==="function");
  await page.evaluate(()=>window.TPXHistory.clear());
  await setInput(frame,"m",1);await setInput(frame,"q",299000);assert.equal((await history()).length,0);
  await frame.locator("#start").click();await frame.waitForTimeout(200);await frame.locator("#pause").click();
  assert.equal((await history()).length,0,"Starting, advancing and pausing are not completion");
  await frame.locator("#start").click();await frame.waitForFunction(()=>!state.running&&state.q===300000,{},{timeout:10000});
  let results=await history();assert.equal(results.length,1);assert.equal(results[0].kind,"simulator");
  assert.equal(results[0].i18n.titleId,"Kalor & Temperatur");assert.match(results[0].detail,/Q = 300,000 J/);
  assert.match(results[0].i18n.detailId,/Selesai: Q = 300\.000 J/);
  await frame.locator("#start").click();await frame.waitForTimeout(300);assert.equal((await history()).length,1,"Starting an already completed heat experiment adds no result");
  await frame.locator("#reset").click();assert.equal((await history()).length,1,"Reset adds no result");
  await heatRun(frame,2);assert.equal((await history()).length,2,"A different completed physical result is retained");
  await heatRun(frame,2);assert.equal((await history()).length,2,"Identical rerun results coalesce within sixty seconds");
  console.log("PASS Heat: controls/start/pause/reset stay quiet; actual completion logs once; resume, distinct and identical reruns work");

  frame=await navigate("simulator/work&energy/index.html");await frame.waitForFunction(()=>document.getElementById("start")&&typeof startSimulation==="function");
  assert.equal(await frame.evaluate(()=>document.body.classList.contains("dark-mode")),true,"Legacy work page inherits the persistent dark theme");
  await frame.locator("#themeButton").click();
  await page.waitForFunction(()=>document.body.classList.contains("light-mode"));
  assert.equal(await frame.evaluate(()=>localStorage.getItem("thermpyx-theme")),"light");
  assert.equal(await frame.evaluate(()=>document.body.classList.contains("dark-mode")),false);
  await frame.locator("#themeButton").click();
  await page.waitForFunction(()=>!document.body.classList.contains("light-mode"));
  await frame.evaluate(()=>TPX.setLanguage("id",false));
  assert.match(await frame.locator("h1").textContent(),/Usaha/);
  assert.match(await frame.locator("#themeButton").textContent(),/Mode Terang/);
  await page.evaluate(()=>window.TPXHistory.clear());await setInput(frame,"force",100);await setInput(frame,"displacement",0.8);await setInput(frame,"energy",500);
  assert.equal((await history()).length,0);await frame.locator("#start").click();await frame.waitForTimeout(150);await frame.locator("#pause").click();
  assert.equal((await history()).length,0,"Partial work experiment is not complete");await frame.locator("#start").click();
  await frame.waitForFunction(()=>!state.running&&Math.abs(state.displacement-0.8)<1e-9,{},{timeout:10000});
  results=await history();assert.equal(results.length,1);assert.match(results[0].detail,/W = 80 J; U = 420 J/);assert.equal(results[0].i18n.titleId,"Usaha & Energi");
  await frame.locator("#reset").click();assert.equal((await history()).length,1);
  await setInput(frame,"force",200);await setInput(frame,"displacement",0.1);await setInput(frame,"energy",500);
  assert.equal((await history()).length,1);await frame.locator("#start").click();await frame.waitForFunction(()=>!state.running&&Math.abs(state.displacement-0.1)<1e-9);
  assert.equal((await history()).length,2);await frame.locator("#start").click();await frame.waitForFunction(()=>!state.running&&Math.abs(state.displacement-0.1)<1e-9);
  assert.equal((await history()).length,2);
  await frame.locator("#reset").click();await setInput(frame,"force",500);await setInput(frame,"displacement",2);await setInput(frame,"energy",100);
  await frame.locator("#start").click();await frame.waitForFunction(()=>!state.running&&Math.abs(state.displacement-0.2)<1e-9);
  results=await history();assert.equal(results.length,3);assert.match(results[0].detail,/W = 100 J; U = 0 J/);
  console.log("PASS Work: actual target and energy-limit completion use refreshed results; pause/reset/controls stay quiet; reruns coalesce");

  frame=await navigate("simulator/heat&temp/index.html");await frame.waitForFunction(()=>typeof startHeating==="function");
  await page.evaluate(()=>window.TPXHistory.clear());await heatRun(frame,1);assert.equal((await history()).length,1);
  console.log("PASS Accessible legacy Heat page records the same precise completion");
  assert.deepEqual(errors,[]);console.log("SIMULATOR HISTORY BROWSER SUITE: 3 / 3 passed");
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
