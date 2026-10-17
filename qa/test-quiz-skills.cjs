/* Real UI with an isolated Firebase-contract fixture. No live writes or SDK. */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const origin = "http://skills.thermpyx.test";
const questions = Array.from({length: 5}, (_, index) => ({question: "Teacher question " + (index + 1), options: ["Home", "Heat", "Work", "Energy"], correctAnswer: index % 4, explanation: "Teacher explanation"}));
let browser;
test.before(async () => { browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"]}); });
test.after(async () => { await browser?.close(); });
function fixture(input) {
  document.querySelectorAll(".tpx-page-transition").forEach(node => node.remove());
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const listeners = {};
  const uid = "student-1", roomId = "skills-room";
  const state = {
    room: {id: roomId, room_code: "123456", owner_id: "teacher", topic: "heat", status: "playing", is_custom: true, skills_enabled: input.enabled === undefined ? true : input.enabled, questions: input.questions},
    player: {id: uid, nickname: "Home", current_question: input.current || 0, question_started_at: new Date().toISOString()},
    uses: input.uses || [], answers: input.answers || []
  };
  Object.entries({roomId, roomCode: "123456", playerId: uid, nickname: "Home", userRole: input.role || "player"}).forEach(([key,value]) => sessionStorage.setItem(key,value));
  const fake = window.__skillsFixture = {state, calls: [], hold: false, fail: false, persistedReplyLost: false, pending: null, pendingTokenReads: [], language: "en"};
  window.TPX = {getLanguage: () => fake.language, t: (en,id) => fake.language === "id" ? id : en};
  const call = (name,...args) => fake.calls.push({name,args:clone(args)});
  const ok = data => Promise.resolve({data:clone(data),error:null});
  const watch = (kind,value,callback) => { (listeners[kind] ||= []).push(callback); queueMicrotask(() => callback({data:clone(value),error:null})); return () => {listeners[kind] = listeners[kind].filter(item => item !== callback);}; };
  fake.emit = (kind,value) => { for (const callback of listeners[kind] || []) callback({data:clone(value),error:null}); };
  fake.resolveUse = () => {
    const action = fake.pending; fake.pending = null;
    const used = {kind:"prism",question_index:action.index,used_at:Date.now(),player_id:uid};
    if (fake.persistedReplyLost || !fake.fail) state.uses = [used];
    action.resolve(fake.fail || fake.persistedReplyLost ? {data:null,error:{code:"offline"}} : {data:clone(used),error:null});
  };
  window.TPXContent = {session:async()=>({user:{id:"teacher"}}),mountAuth:()=>({}),onAuthChange:()=>()=>{},normalizeQuestions:clone};
  window.TPXLive = {
    getRoom:()=>ok(state.room),getPlayer:()=>ok(state.player),listAnswers:()=>ok(state.answers),listSkillUses:(id,player)=>{call("listSkillUses",id,player);return input.holdTokenRead?new Promise(resolve=>fake.pendingTokenReads.push(resolve)):ok(state.uses);},
    updateProgress:(id,player,payload)=>{Object.assign(state.player,payload);return ok(state.player);},
    useSkill:(id,player,payload)=>{
      call("useSkill",id,player,payload);
      return new Promise(resolve=>{fake.pending={resolve,index:payload.question_index};if(!fake.hold)fake.resolveUse();});
    },
    submitAnswer:(id,player,index,payload)=>{
      call("submitAnswer",id,player,index,payload);
      const answer={...payload,is_correct:payload.selected_answer===state.room.questions[index].correctAnswer,score:payload.selected_answer===state.room.questions[index].correctAnswer?100:0};
      state.answers.push(answer);return ok(answer);
    },
    watchRoom:(id,callback)=>watch("room",state.room,callback),
    watchPlayers:(id,callback)=>watch("players",[state.player],callback),
    watchAnswers:(id,callback)=>watch("answers",state.answers,callback),
    watchSkillUses:(id,player,callback)=>watch("uses",state.uses,callback),
    watchConnection:callback=>{queueMicrotask(()=>callback(true));return()=>{};},
    setRoomStatus:()=>ok(null),markLeft:()=>ok(state.player),
    createRoom:payload=>{call("createRoom",payload);return new Promise(()=>{});}
  };
}
async function setup(t, filename="play", options={}) {
  const context = await browser.newContext({viewport:options.viewport || {width:1000,height:900},reducedMotion:options.reducedMotion || "no-preference"});
  t.after(()=>context.close());
  await context.route("**/*",async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin){await route.abort();return;}
    if(route.request().resourceType()==="script"){await route.fulfill({contentType:"text/javascript",body:"/* isolated fixture */"});return;}
    const absolute=path.resolve(root,"."+decodeURIComponent(url.pathname));
    if(!absolute.startsWith(root+path.sep)){await route.abort();return;}
    try{await route.fulfill({body:await fs.readFile(absolute),contentType:absolute.endsWith(".html")?"text/html":absolute.endsWith(".css")?"text/css":"application/octet-stream"});}
    catch{await route.fulfill({status:404,body:"missing fixture file"});}
  });
  const page=await context.newPage();page.setDefaultTimeout(7000);
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  t.after(()=>assert.deepEqual(errors,[]));
  await page.goto(`${origin}/quiz/${filename}.html`);
  await page.evaluate(fixture,{questions,...options});
  for(const source of ["quiz/question-bank.js","quiz/score-utils.js","js/quiz-skills.js",`quiz/${filename}.js`])await page.addScriptTag({content:await fs.readFile(path.join(root,source),"utf8")});
  if(filename==="play")await page.locator("#answerOptions .answer-option").first().waitFor();
  return page;
}
const uses = page => page.evaluate(()=>__skillsFixture.calls.filter(call=>call.name==="useSkill").length);
const setLanguage = (page,language) => page.evaluate(value=>{__skillsFixture.language=value;window.dispatchEvent(new Event("thermpyx:languagechange"));},language);

test("Prism deterministically removes two wrong answers and always retains the true answer",async t=>{
  const page=await setup(t);
  assert.equal(await page.evaluate(()=>{
    for(let index=0;index<30;index++)for(let correct=0;correct<4;correct++){
      const item={options:["a","b","c","d"],correctAnswer:correct};
      const removed=TPXQuizSkills.eliminatedOptions(item,index);
      if(removed.length!==2||removed.includes(correct)||new Set(removed).size!==2||JSON.stringify(removed)!==JSON.stringify(TPXQuizSkills.eliminatedOptions(item,index)))return false;
    }return true;
  }),true);
});

test("Old or disabled rooms never grant a Prism token",async t=>{
  const page=await setup(t,"play",{enabled:null});
  assert.equal(await page.locator(".prism-button").isDisabled(),true);
  assert.match(await page.locator(".prism-status").textContent(),/turned off/);
  await page.locator(".prism-button").dispatchEvent("click");
  assert.equal(await uses(page),0);
  assert.equal(await page.evaluate(()=>__skillsFixture.calls.filter(call=>call.name==="listSkillUses").length),0);
});

test("A slow token read never blocks normal play or enables an assist after answering",async t=>{
  const page=await setup(t,"play",{holdTokenRead:true});
  assert.equal(await page.locator(".prism-button").isDisabled(),true);
  assert.equal(await page.locator("#answerOptions button:disabled").count(),0);
  await page.locator("#answerOptions button").first().click();
  await page.locator("#playMessage").filter({hasText:/Correct/}).waitFor();
  await page.evaluate(()=>__skillsFixture.pendingTokenReads.shift()({data:[],error:null}));
  await page.locator(".prism-button").dispatchEvent("click");
  assert.equal(await uses(page),0);
  assert.equal(await page.locator(".prism-button").isDisabled(),true);
});

test("Prism waits for confirmation, blocks overlapping answers and spends only one token",async t=>{
  const page=await setup(t);
  await page.evaluate(()=>{__skillsFixture.hold=true;});
  await page.locator(".prism-button").click();
  await page.locator(".prism-button").dispatchEvent("click");
  await page.locator("#answerOptions button").first().dispatchEvent("click");
  assert.equal(await uses(page),1);
  assert.equal(await page.locator(".prism-eliminated").count(),0);
  assert.equal(await page.evaluate(()=>__skillsFixture.calls.filter(call=>call.name==="submitAnswer").length),0);
  await page.evaluate(()=>__skillsFixture.resolveUse());
  await page.locator(".prism-eliminated").first().waitFor();
  assert.equal(await page.locator(".prism-eliminated").count(),2);
  assert.equal(await page.locator("#answerOptions button").first().isDisabled(),false);
  assert.equal(await page.locator(".prism-button").isDisabled(),true);
  if(process.env.TPX_SKILLS_SCREENSHOT)await page.screenshot({path:process.env.TPX_SKILLS_SCREENSHOT+"-desktop.png",fullPage:true});
  await setLanguage(page,"id");
  assert.match(await page.locator(".prism-status").textContent(),/Prisma terkonfirmasi/);
  assert.match(await page.locator("#answerOptions button").first().textContent(),/^Home$/);
  assert.equal(await page.locator("#answerOptions button").first().getAttribute("data-tpx-user-content"),"");
  await setLanguage(page,"en");
  await page.locator("#answerOptions button").first().click();
  assert.equal(await page.evaluate(()=>__skillsFixture.state.answers[0].score),100);
});

test("Failed use leaves all options intact and allows a confirmed retry",async t=>{
  const page=await setup(t);
  await page.evaluate(()=>{__skillsFixture.fail=true;});
  await page.locator(".prism-button").click();
  await page.locator(".prism-status").filter({hasText:/not confirmed/}).waitFor();
  assert.equal(await page.locator(".prism-eliminated").count(),0);
  assert.equal(await page.locator("#answerOptions button:disabled").count(),0);
  await page.evaluate(()=>{__skillsFixture.fail=false;});
  await page.locator(".prism-button").click();
  await page.locator(".prism-eliminated").first().waitFor();
  assert.equal(await uses(page),2);
  assert.equal(await page.evaluate(()=>__skillsFixture.state.uses.length),1);
});

test("Lost confirmation restores the persisted token instead of issuing another",async t=>{
  const page=await setup(t);
  await page.evaluate(()=>{__skillsFixture.persistedReplyLost=true;});
  await page.locator(".prism-button").click();
  await page.locator(".prism-eliminated").first().waitFor();
  assert.equal(await page.locator(".prism-button").isDisabled(),true);
  assert.equal(await uses(page),1);
});

test("Reloaded token reapplies only to its original question and cannot be used again",async t=>{
  const saved={kind:"prism",question_index:0,used_at:100,player_id:"student-1"};
  const first=await setup(t,"play",{uses:[saved]});
  assert.equal(await first.locator(".prism-eliminated").count(),2);
  assert.equal(await first.locator(".prism-button").isDisabled(),true);
  assert.equal(await uses(first),0);
  const second=await setup(t,"play",{uses:[saved],current:1,answers:[{question_index:0,is_correct:true,selected_answer:0,player_id:"student-1",score:100,response_time_ms:100}]});
  assert.equal(await second.locator(".prism-eliminated").count(),0);
  assert.equal(await second.locator(".prism-button").isDisabled(),true);
  assert.match(await second.locator(".prism-status").textContent(),/Used on question 1/);
});

test("Timer continues during a pending Prism write and expired use cannot restart time",async t=>{
  const page=await setup(t);
  await page.evaluate(()=>{__skillsFixture.hold=true;});
  await page.locator(".prism-button").click();
  await page.evaluate(()=>{startedMs=Date.now()-20001;refreshClock();});
  assert.equal(await page.locator("#quizTimer").textContent(),"0");
  await page.locator("#playMessage").filter({hasText:/Time is up/}).waitFor();
  const answer=await page.evaluate(()=>__skillsFixture.state.answers[0]);
  assert.equal(answer.selected_answer,-1);assert.equal(answer.score,0);assert.equal(answer.response_time_ms,20000);
  assert.match(await page.locator(".prism-status").textContent(),/No extra time/);
  await page.locator("#questionNumber").filter({hasText:/Question 2/}).waitFor();
  assert.equal(await page.locator("#answerOptions button:disabled").count(),0,"The pending assist on the old question must not lock the next question");
  await page.evaluate(()=>__skillsFixture.resolveUse());
  await page.locator(".prism-status").filter({hasText:/Used on question 1/}).waitFor();
  assert.equal(await page.locator(".prism-eliminated").count(),0,"A late confirmation cannot remove answers from a later question");
  await page.locator(".prism-button").dispatchEvent("click");
  assert.equal(await uses(page),1);
});

test("Reactor charges from confirmed correct answers only and resets every three",async t=>{
  const page=await setup(t,"play",{reducedMotion:"reduce"});
  await page.evaluate(()=>{
    skills.confirmAnswer({question_index:0,is_correct:false});
    skills.confirmAnswer({question_index:0,is_correct:true});
    skills.confirmAnswer({question_index:0,is_correct:true});
  });
  assert.equal(await page.locator(".reactor-count").textContent(),"1 / 3");
  await page.evaluate(()=>{skills.confirmAnswer({question_index:1,is_correct:true});skills.confirmAnswer({question_index:2,is_correct:true});});
  assert.equal(await page.locator(".reactor-count").textContent(),"3 / 3");
  assert.equal(await page.locator(".reactor-cells").evaluate(node=>getComputedStyle(node).animationName),"none");
  await page.waitForFunction(()=>document.querySelector(".reactor-count").textContent==="0 / 3");
});

test("Host sees assisted correct and incorrect answers without a score change",async t=>{
  const page=await setup(t,"host-view",{role:"host",uses:[{kind:"prism",question_index:0,used_at:100,player_id:"student-1"}],answers:[{question_index:0,is_correct:true,player_id:"student-1",score:100,response_time_ms:500}]});
  await page.locator(".host-assist-note").waitFor();
  assert.match(await page.locator(".host-assist-note").textContent(),/Prism · Question 1 · Correct with assist/);
  assert.match(await page.locator(".host-player-stats").textContent(),/100 pts/);
  await page.evaluate(()=>__skillsFixture.emit("answers",[{question_index:0,is_correct:false,player_id:"student-1",score:0,response_time_ms:500}]));
  assert.match(await page.locator(".host-assist-note").textContent(),/Incorrect with assist/);
  await setLanguage(page,"id");
  assert.match(await page.locator(".host-assist-note").textContent(),/Prisma · Soal 1 · Salah dengan bantuan/);
});

test("Teacher explicitly controls the immutable room skill setting",async t=>{
  const page=await setup(t,"host",{role:"host"});
  assert.equal(await page.locator("#skillsEnabled").isChecked(),true);
  await page.locator("#skillsEnabled").uncheck();
  await page.locator("#createRoomBtn").click();
  await page.waitForFunction(()=>__skillsFixture.calls.some(call=>call.name==="createRoom"));
  assert.equal(await page.evaluate(()=>__skillsFixture.calls.find(call=>call.name==="createRoom").args[0].skills_enabled),false);
  assert.equal(await page.locator("#skillsEnabled").isDisabled(),true);
});

test("Compact skill instruments keep the first answer visible on 320px and 390px phones",async t=>{
  const page=await setup(t,"play",{viewport:{width:320,height:800},reducedMotion:"reduce"});
  for(const width of [320,390]){
  await page.setViewportSize({width,height:800});
  for(const language of ["en","id"]){
    await setLanguage(page,language);
    for(const theme of ["dark","light"]){
      await page.evaluate(value=>{document.documentElement.setAttribute("data-theme",value);document.body.classList.toggle("light-mode",value==="light");},theme);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.equal(await page.locator(".quiz-skills").evaluate(node=>node.scrollWidth<=node.clientWidth),true);
      const panel=await page.locator(".quiz-skills").boundingBox();
      const question=await page.locator("#questionText").boundingBox();
      const answer=await page.locator("#answerOptions button").first().boundingBox();
      assert.ok(panel.height<=180,`${width}px ${language}: skill bar height ${panel.height} must be at most 180px`);
      assert.ok(question.y<640,`Question must remain within the mobile viewport; y=${question.y}`);
      assert.ok(answer.y+40<800,`First answer must be visible without scrolling; y=${answer.y}`);
    }
  }
  }
  await page.locator(".prism-button").click();
  await page.locator(".prism-eliminated").first().waitFor();
  assert.equal(await page.locator(".prism-eliminated").count(),2);
  assert.match(await page.locator(".prism-status").textContent(),/Prisma terkonfirmasi/);
  assert.equal(await page.locator(".prism-status").isVisible(),true);
  assert.equal(await page.locator("#answerOptions button").first().isDisabled(),false);
  if(process.env.TPX_SKILLS_SCREENSHOT)await page.screenshot({path:process.env.TPX_SKILLS_SCREENSHOT+"-mobile.png",fullPage:true});
});
