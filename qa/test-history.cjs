/* node qa/test-history.cjs [--browser] — meaningful, bounded activity history. */
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const code=fs.readFileSync(path.join(__dirname,"../js/site-experience.js"),"utf8");
const KEY="thermpyx-activity-v1",MIGRATION="thermpyx-activity-migrated-v1",POLICY="thermpyx-activity-policy-v2";
let checks=0;
function check(name,fn){fn();checks++;console.log("PASS "+name);}
function storage(entries={}){
 const memory=new Map(Object.entries(entries)),reads=new Map(),writes=new Map();
 return {memory,reads,writes,getItem(key){reads.set(key,(reads.get(key)||0)+1);return memory.get(key)??null;},setItem(key,value){writes.set(key,(writes.get(key)||0)+1);memory.set(key,String(value));},removeItem(key){memory.delete(key);}};
}
function node(tag="div"){
 return {tagName:tag.toUpperCase(),children:[],dataset:{},className:"",textContent:"",handlers:{},
 append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;this.replaces=(this.replaces||0)+1;},
 addEventListener(name,handler){this.handlers[name]=handler;}};
}
function app(store=storage(),options={}){
 const events={},documentEvents={},elements=options.elements||{},state={now:Date.now()},observers=[];
 class Clock extends Date {constructor(...args){super(...(args.length?args:[state.now]));}static now(){return state.now;}}
 class Event{constructor(type){this.type=type;}}
 const window={TPX:{getLanguage:()=>options.lang||"en"},frames:[],location:{origin:"https://thermpyx.test"},Event,
  addEventListener(name,handler){(events[name]??=[]).push(handler);},dispatchEvent(event){for(const handler of events[event.type]||[])handler(event);}};
 window.parent=options.parent||window;
 const document={currentScript:null,scripts:[],getElementById:id=>elements[id]||null,
  addEventListener(name,handler){(documentEvents[name]??=[]).push(handler);},
  createElement:node,createDocumentFragment:()=>node("fragment")};
 const context={window,document,localStorage:store,location:{href:"https://thermpyx.test/index.html",origin:"https://thermpyx.test",pathname:"/index.html"},Date:Clock,URL,console,confirm:()=>true};
 if(options.lazy)context.IntersectionObserver=class {constructor(callback){this.callback=callback;observers.push(this);}observe(target){this.target=target;}};
 vm.runInNewContext(code,context);
 return {window,document,events,documentEvents,elements,store,state,observers,api:window.TPXHistory,
  fire(name,event={}){for(const handler of events[name]||[])handler(event);},
  ready(){documentEvents.DOMContentLoaded[0]?.();}};
}
const entry=(kind,title,detail,date=new Date().toISOString(),url="")=>({kind,title,detail,date,url});

check("Legacy calculator results migrate once without deleting the original data",()=>{
 const old=JSON.stringify([{type:"Heat",formula:"Q=mcΔT",result:"200 J",time:"previous"}]),store=storage({"thermpyx-history":old});
 const first=app(store);assert.equal(first.api.list().length,1);assert.equal(first.api.list()[0].kind,"calculation");
 assert.equal(store.memory.get("thermpyx-history"),old);assert.equal(store.memory.get(MIGRATION),"1");
 assert.equal(app(store).api.list().length,1);
});
check("Old page, video, navigation and control noise is pruned, real completed results survive",()=>{
 const rows=[entry("calculation","Converter","Page opened"),entry("quiz","Quiz","Halaman dibuka"),entry("simulator","First Law","Experiment control adjusted"),entry("simulator","First Law","Reset"),entry("simulator","Heat","▶ Start"),entry("simulator","Heat","⏸ Pause"),entry("simulator","Heat","↻ Reset"),entry("video","First Law","YouTube video"),entry("theory","First Law","Page opened"),entry("navigation","Home","Explore"),entry("calculation","Heat","200 J"),entry("quiz","Heat","Score: 3/5"),entry("simulator","Heat","Q = 200 J"),entry("calculation","Page opened","5 J")];
 const store=storage({[KEY]:JSON.stringify(rows),[MIGRATION]:"1"}),client=app(store);
 assert.deepEqual(Array.from(client.api.list(),row=>row.title),["Heat","Heat","Heat","Page opened"]);
 assert.equal(JSON.parse(store.memory.get(KEY)).length,4);assert.equal(store.memory.get(POLICY),"1");
 const writes=store.writes.get(KEY);app(store);assert.equal(store.writes.get(KEY),writes);
});
check("Fifty navigation clicks, page opens, range and select changes add no journal entries",()=>{
 const client=app();client.ready();const writes=client.store.writes.get(KEY)||0;
 for(let i=0;i<50;i++){
  for(const handler of client.documentEvents.click||[])handler({target:{closest:()=>null}});
  for(const handler of client.documentEvents.change||[])handler({target:{matches:()=>true}});
  client.api.log("navigation","Navigate","Opened from navigation");client.api.log("video","Video","YouTube video");
  client.api.log("calculation","Unit Converter","Page opened");client.api.log("simulator","Experiment","Kontrol eksperimen diubah");
  client.api.log("simulator","Experiment","Start Simulation");client.api.log("simulator","Experiment","Pause");client.api.log("simulator","Experiment","Reset");
 }
 assert.equal(client.api.list().length,0);assert.equal(client.store.writes.get(KEY)||0,writes);
});
check("Only the latest fifty meaningful results are kept in memory and browser storage",()=>{
 const client=app();for(let i=0;i<75;i++)client.api.log("calculation","Heat",i+" J");
 const results=client.api.list();assert.equal(results.length,50);assert.equal(results[0].detail,"74 J");assert.equal(results[49].detail,"25 J");
 assert.equal(JSON.parse(client.store.memory.get(KEY)).length,50);
});
check("Duplicate results within sixty seconds coalesce even across intervening events",()=>{
 const client=app();client.api.log("calculation","Heat","200 J","/calculators.html#heat");
 client.api.log("quiz","Heat","3/5","/quiz/practice.html");client.api.log("calculation","Heat","200 J","/calculators.html#heat");
 assert.equal(client.api.list().length,2);client.api.log("calculation","Heat","201 J","/calculators.html#heat");assert.equal(client.api.list().length,3);
 client.state.now+=61000;client.api.log("calculation","Heat","200 J","/calculators.html#heat");assert.equal(client.api.list().length,4);
});
check("Ordinary list reads stay cached, do not rewrite storage and cannot mutate cached records",()=>{
 const client=app();client.api.log("calculation","Heat","200 J");const reads=client.store.reads.get(KEY),writes=client.store.writes.get(KEY);
 for(let i=0;i<100;i++){const records=client.api.list();records[0].title="Changed externally";records.push({kind:"video"});}
 assert.equal(client.store.reads.get(KEY),reads);assert.equal(client.store.writes.get(KEY),writes);assert.equal(client.api.list()[0].title,"Heat");
});
check("Changes from another tab refresh the cached list without writing back",()=>{
 const client=app(),writes=client.store.writes.get(KEY)||0;
 client.fire("storage",{key:KEY,newValue:JSON.stringify([entry("quiz","Heat","4/5")])});assert.equal(client.api.list()[0].detail,"4/5");
 assert.equal(client.store.writes.get(KEY)||0,writes);client.fire("storage",{key:null,newValue:null});assert.equal(client.api.list().length,0);
});
check("The persistent shell and child share fresh results and deduplication immediately",()=>{
 const store=storage(),shell=app(store);shell.window.TPXPersistentShell={owns:()=>true,pauseMusic(){}};
 const child=app(store,{parent:shell.window});shell.window.frames=[child.window];
 const reads=store.reads.get(KEY);child.api.log("calculation","Heat","200 J");
 assert.equal(shell.api.list()[0].detail,"200 J");shell.api.log("quiz","Heat","5/5");assert.equal(child.api.list()[0].detail,"5/5");
 const writes=store.writes.get(KEY);child.api.log("calculation","Heat","200 J");assert.equal(store.writes.get(KEY),writes);assert.equal(store.reads.get(KEY),reads);
 child.api.clear();assert.equal(shell.api.list().length,0);assert.equal(child.api.list().length,0);
});
check("History DOM stays untouched offscreen and mounts at most fifty safe text records",()=>{
 const history=node(),filter=node();filter.value="all";
 const client=app(storage(),{elements:{historyList:history,historyFilter:filter},lazy:true});client.ready();
 for(let i=0;i<55;i++)client.api.log("calculation","<img src=x onerror=alert(1)>",i+" J","javascript:alert(1)");
 assert.equal(history.replaces,undefined);client.observers[0].callback([{isIntersecting:true}]);
 assert.equal(history.children[0].children.length,50);const result=history.children[0].children[0];
 assert.equal(result.children[1].textContent,"<img src=x onerror=alert(1)>");assert.ok(!result.children.some(child=>child.tagName==="A"));
 const replaces=history.replaces;client.api.render();assert.equal(history.replaces,replaces);
});
check("Malformed and oversized storage is bounded without silently overwriting original data",()=>{
 for(const raw of ['{invalid',JSON.stringify({kind:"calculation"}),"x".repeat(256001)]){
  const store=storage({[KEY]:raw}),client=app(store);assert.equal(client.api.list().length,0);assert.equal(store.memory.get(KEY),raw);assert.equal(store.memory.has(POLICY),false);
 }
 const store=storage({"thermpyx-history":"{bad"});app(store);assert.equal(store.memory.has(MIGRATION),false);
});
check("Clearing meaningful history does not remigrate old calculator entries",()=>{
 const store=storage({"thermpyx-history":JSON.stringify([{type:"Heat",result:"100 J"}])}),client=app(store);client.api.clear();
 assert.equal(client.api.list().length,0);assert.ok(store.memory.has("thermpyx-history"));assert.equal(app(store).api.list().length,0);
});
check("Only explicit authored translation pairs translate; user titles and content stay intact",()=>{
 const history=node(),filter=node();filter.value="all";
 const options={elements:{historyList:history,historyFilter:filter},lang:"en"},client=app(storage(),options);client.ready();
 client.api.log("calculation","Heat","200 J","",{titleEn:"Heat",titleId:"Kalor"});
 client.api.log("quiz","Heat","Question authored by a user");client.api.log("flashcard","Heat","Reviewed 5 cards","",{detailEn:"Reviewed 5 cards",detailId:"Mengulas 5 kartu"});
 options.lang="id";client.fire("thermpyx:languagechange");
 const rows=history.children[0].children;
 assert.equal(rows[0].children[1].textContent,"Heat");assert.equal(rows[0].children[2].textContent,"Mengulas 5 kartu");
 assert.equal(rows[1].children[1].textContent,"Heat");assert.equal(rows[1].children[2].textContent,"Question authored by a user");
 assert.equal(rows[2].children[1].textContent,"Kalor");
 const copy=client.api.list();copy[2].i18n.titleId="Overwritten";assert.equal(client.api.list()[2].i18n.titleId,"Kalor");
 const store=client.store,next=app(store,{lang:"id"});assert.equal(next.api.list()[2].i18n.titleId,"Kalor");
});
console.log(`HISTORY UNIT SUITE: ${checks} / ${checks} passed`);

if(process.argv.includes("--browser")){
 (async()=>{
  const {chromium}=require("playwright"),browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||"/usr/bin/chromium",args:["--no-sandbox"]});
  const context=await browser.newContext(),page=await context.newPage(),base=process.env.TPX_TEST_URL||"http://localhost:8003/";
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await context.route(/https:\/\/(fonts\.|www\.youtube|www\.youtube-nocookie|cdn\.jsdelivr)/,route=>route.abort());
  try{
   await page.goto(base+"app.html?page=index.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("iframe")?.contentWindow.TPXHistory&&window.TPXMusic);
   await page.evaluate(()=>{window.TPXHistory.clear();document.querySelector(".tpx-audio-play").click();});
   await page.waitForFunction(()=>{const audio=document.querySelector("audio");return audio&&!audio.paused&&audio.currentTime>.15;});
   await page.evaluate(()=>window.__historyTestAudio=document.querySelector("audio"));
   let frame=page.frames().find(frame=>frame!==page.mainFrame());
   for(const route of ["theory/heat.html","simulator/hkm3.html","quiz/quiz.html","unit-converter.html","calculators.html"]){
    await page.evaluate(route=>window.TPXPersistentShell.navigate(new URL(route,window.TPXPersistentShell.baseURL).href),route);
    await page.waitForFunction(route=>{const child=document.querySelector("iframe")?.contentWindow;return child?.location.pathname.endsWith(route)&&child?.TPXHistory;},route);
    assert.equal(await page.evaluate(()=>window.TPXHistory.list().length),0,"Page opening should not create results: "+route);
    assert.ok(await page.evaluate(()=>document.querySelector("audio")===window.__historyTestAudio&&!window.__historyTestAudio.paused),"Audio instance persists through "+route);
   }
   frame=page.frames().find(frame=>frame!==page.mainFrame());
   await frame.evaluate(()=>{
    const card=document.querySelector('[data-calculator="heat"]'),form=card.querySelector("form");
    for(const [name,value] of Object.entries({m:2,c:4200,dt:10}))form.querySelector('[name="'+name+'"]').value=value;
    form.requestSubmit();
   });
   assert.equal(await page.evaluate(()=>window.TPXHistory.list().length),1,"Successful result reaches shared parent cache");
   await page.evaluate(()=>window.TPXPersistentShell.navigate(new URL("index.html#history",window.TPXPersistentShell.baseURL).href));
   await page.waitForFunction(()=>document.querySelector("iframe")?.contentWindow.location.pathname.endsWith("index.html"));
   frame=page.frames().find(frame=>frame!==page.mainFrame());await frame.locator("#historyList").scrollIntoViewIfNeeded();
   await frame.waitForFunction(()=>document.querySelectorAll("#historyList .tpx-activity").length===1);
   assert.match(await frame.locator("#historyList").innerText(),/84,000|84\.000/);
   assert.ok(await page.evaluate(()=>document.querySelector("audio")===window.__historyTestAudio&&!window.__historyTestAudio.paused));
   assert.deepEqual(errors,[]);console.log("PASS Browser navigation stays quiet, successful results render, persistent audio identity and playback survive");
  }finally{await browser.close();}
 })().catch(error=>{console.error(error);process.exitCode=1;});
}
